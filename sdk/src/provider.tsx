'use client';

import { useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AllyContext } from './context.js';
import { AllyRuntime, initialRuntimeView } from './runtime.js';
import type { RuntimeView } from './runtime.js';
import type { AllyContextValue, AllyProviderProps } from './types.js';
import { Toast } from './ui/Toast.js';
import { WhyPanel } from './ui/WhyPanel.js';

export function AllyProvider({ children, policy, config, onDecision }: AllyProviderProps) {
  if (useContext(AllyContext)) throw new Error('Nested AllyProvider is not supported');
  const rootRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<AllyRuntime | null>(null);
  const [view, setView] = useState<RuntimeView>(() => initialRuntimeView(policy, config.enabled !== false));
  const [whyOpen, setWhyOpen] = useState(false);
  const whyId = useId();
  const previousStorageConfig = useRef<{ persistence: 'memory' | 'local';
    storageKey: string } | null>(null);
  const configKey = JSON.stringify({ steps: config.steps, allowedFields: config.allowedFields,
    errorCategories: config.errorCategories, endpoint: config.endpoint,
    storageKey: config.storageKey, persistence: config.persistence });
  const storageConfigKey = JSON.stringify({ persistence: config.persistence ?? 'memory',
    storageKey: config.storageKey ?? 'ally:pref:v1' });
  const policyKey = JSON.stringify(policy);

  useEffect(() => {
    const next = JSON.parse(storageConfigKey) as { persistence: 'memory' | 'local';
      storageKey: string };
    const previous = previousStorageConfig.current;
    if (previous && (previous.persistence !== next.persistence ||
        previous.storageKey !== next.storageKey)) {
      if (previous.persistence === 'local') {
        try { rootRef.current?.ownerDocument.defaultView?.localStorage.removeItem(previous.storageKey); }
        catch { /* A denied storage adapter is already memory-only. */ }
      }
      if (next.persistence === 'local') {
        try { rootRef.current?.ownerDocument.defaultView?.localStorage.removeItem(next.storageKey); }
        catch { /* A denied storage adapter is already memory-only. */ }
      }
    }
    previousStorageConfig.current = next;
  }, [storageConfigKey]);

  useEffect(() => {
    const scope = rootRef.current;
    if (!scope) return;
    const runtime = new AllyRuntime(scope, policy, config, setView, onDecision);
    runtimeRef.current = runtime;
    runtime.start();
    return () => {
      runtime.stop();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
    // The runtime is rebuilt only when host sensor configuration changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  useEffect(() => { runtimeRef.current?.setPolicy(policy); }, [policyKey]);
  useEffect(() => { runtimeRef.current?.setEnabled(config.enabled !== false); }, [config.enabled]);
  useEffect(() => { runtimeRef.current?.setDecisionCallback(onDecision); }, [onDecision]);
  useEffect(() => { if (!view.helpVisible) setWhyOpen(false); }, [view.helpVisible]);

  const context = useMemo<AllyContextValue>(() => ({
    plan: view.plan,
    profile: view.profile,
    summary: view.summary,
    explanation: view.explanation,
    status: view.status,
    plannerStatus: view.plannerStatus,
    outcome: view.outcome,
    keep: () => runtimeRef.current?.keep(),
    undo: () => runtimeRef.current?.undo(),
    resetPreferences: () => runtimeRef.current?.resetPreferences(),
    reportStep: (step) => runtimeRef.current?.reportStep(step),
    reportError: (error) => runtimeRef.current?.reportError(error),
  }), [view]);

  return <AllyContext.Provider value={context}>
    <div ref={rootRef} data-ally-root="" data-ally-status={view.status}>
      {children}
      <Toast visible={view.toastVisible} explanation={view.explanation} />
      {view.plan && view.helpVisible && <div className="ally-controls" data-ally-ui="" aria-label="Kontrol Ally">
        {view.status !== 'kept' && <button type="button" onClick={() => context.keep()}>Keep</button>}
        <button type="button" onClick={() => context.undo()}>Undo</button>
        <button type="button" aria-expanded={whyOpen} aria-controls={whyId}
          onClick={() => setWhyOpen((open) => !open)}>Why</button>
        {whyOpen && view.explanation && <WhyPanel id={whyId} explanation={view.explanation} />}
      </div>}
    </div>
  </AllyContext.Provider>;
}
