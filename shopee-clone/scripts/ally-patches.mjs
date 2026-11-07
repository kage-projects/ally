// Host snapshot customizations. Exact anchors fail closed if upstream changes.
function replaceOnce(source,anchor,replacement) {
  if(source.split(anchor).length!==2)throw new Error(`SDK patch requires review: ${anchor}`);
  return source.replace(anchor,replacement);
}

export function patchTransport(source) {
  return replaceOnce(source,'}, 2000);','}, Math.min(30000, Math.max(2000, input.policy.llm.timeoutMs)));');
}

export function patchSensor(source) {
  source=replaceOnce(source,'  sequence: number;','  at?: number;\n  sequence: number;');
  source=replaceOnce(source,'      sequence: ++sequence,','      at: now,\n      sequence: ++sequence,');
  const patches=[
    ["new Set<'miss' | 'rage' | 'error'>()", "new Set<'miss' | 'rage' | 'error' | 'zoom'>()"],
    ["counts.errorLoop >= 5 && !fastEmitted.has('error')", "counts.errorLoop >= 6 && !fastEmitted.has('error')"],
    [": counts.rageClick >= 1 && !fastEmitted.has('rage') ? 'rage' : null;", ": counts.zoomEvent >= 2 && !fastEmitted.has('zoom') ? 'zoom'\n          : counts.rageClick >= 1 && !fastEmitted.has('rage') ? 'rage' : null;"],
    ['    wheelEpisodeUntil = now + 500;','    wheelEpisodeUntil = now + 500;\n    maybeFast();'],
    ['    previousScale = scale;','    previousScale = scale;\n    maybeFast();'],
  ];
  for(const [anchor,replacement] of patches)source=replaceOnce(source,anchor,replacement);
  return source;
}

export function patchPresets(source) {
  source=replaceOnce(source,"export type SinglePreset = 'motor' | 'visual' | 'cognitive';","export type SinglePreset = 'motor' | 'visual' | 'cognitive';\ntype HostPreset = SinglePreset | 'combined';");
  source=replaceOnce(source,'Record<SinglePreset,','Record<HostPreset,');
  source=replaceOnce(source,'  preset: SinglePreset,','  preset: HostPreset,');
  return replaceOnce(source,'  motor: {',`  combined: {
    tokens: { targetMinSize: 48, spacingScale: 1.15, fontScale: 1.1,
      contrast: 'high', density: 'comfortable' },
    layout: { stepMode: 'default', hideNonEssential: [], primaryActionSticky: false,
      confirmDestructive: true },
    assist: { inlineHints: true, voiceOffer: false },
    explanation: 'Teks, jarak, dan petunjuk diperjelas berdasarkan interaksi berulang.',
  },
  motor: {`);
}

export function patchRules(source) {
  return replaceOnce(source,'requestPlanner: policy.llm.enabled, candidate: null,',
    // A combined preset addresses both supported dimensions. Its confidence is
    // bounded by the weaker one, and must satisfy the merchant's apply threshold.
    "requestPlanner: policy.llm.enabled, candidate: ranked[1][1] >= policy.thresholds.apply ? createPresetPlan('combined', profile, ranked[1][1], policy) : null,");
}

export function patchTelemetryTypes(source) {
  source=replaceOnce(source,"import type { OutcomeObservation } from './preferences.js';","import type { OutcomeObservation } from './preferences.js';\nimport type { SensorSnapshot } from './sensor.js';");
  source=replaceOnce(source,'export interface AllyDecisionEvent {','export interface AllyDecisionEvent {\n  at?: number;\n  decisionId?: number;\n  transactionId?: number;\n  latencyMs?: number;');
  source=replaceOnce(source,'export interface AllyContextValue {','export interface AllyContextValue {\n  helpVisible: boolean;');
  return replaceOnce(source,'export interface AllyConfig {','export interface AllyConfig {\n  observationOnly?: boolean;\n  onObservation?: (snapshot: SensorSnapshot) => void;');
}

export function patchTelemetryProvider(source) {
  source=replaceOnce(source,'    status: view.status,','    helpVisible: view.helpVisible,\n    status: view.status,');
  return replaceOnce(source,'storageKey: config.storageKey, persistence: config.persistence });',
    'storageKey: config.storageKey, persistence: config.persistence, observationOnly: config.observationOnly });');
}

export function patchTelemetryRuntime(source) {
  const patches=[
    ['export interface CandidateRequest {','export interface CandidateRequest {\n  latencyMs?: number;'],
    ['interface ActiveDecision {','interface ActiveDecision {\n  latencyMs: number;\n  transactionId: number;'],
    ['private decisionCounter = 0;','private decisionCounter = 0;\n  private transactionCounter = 0;'],
    ['if (!this.active || this.active.kept) this.baseline = captureScope(this.scope);',`if (!this.active || this.active.kept) {
      this.baseline = captureScope(this.scope);
      this.transactionCounter++;
    }`],
    ['this.baseline = captureScope(this.scope);\n      this.active.kept = false;','this.baseline = captureScope(this.scope);\n      this.active.transactionId = ++this.transactionCounter;\n      this.active.kept = false;'],
    ['    this.sensor?.reportStep(step);','    const stepStartedAt = performance.now();\n    this.sensor?.reportStep(step);'],
    ['this.active.decisionId = ++this.decisionCounter;','this.active.decisionId = ++this.decisionCounter;\n      this.active.latencyMs = Math.max(0, Math.round(performance.now() - stepStartedAt));'],
    ['this.onDecision?.({ action, source: active.source, plan: active.result.plan,',`this.onDecision?.({ at: Date.now(), decisionId: active.decisionId,
        transactionId: active.transactionId, latencyMs: active.latencyMs,
        action, source: active.source, plan: active.result.plan,`],
    ['    const previousStatus = this.view.plannerStatus;','    const plannerStartedAt = performance.now();\n    const previousStatus = this.view.plannerStatus;'],
    ['preset, reasonCodes, contextEpoch: epoch,','preset, reasonCodes, contextEpoch: epoch,\n              latencyMs: Math.max(0, Math.round(performance.now() - plannerStartedAt)),'],
    ['    const decision = decideRule(snapshot.summary, effectivePolicy);',`    const ruleStartedAt = performance.now();
    const decision = decideRule(snapshot.summary, effectivePolicy);
    const ruleLatencyMs = Math.max(0, Math.round(performance.now() - ruleStartedAt));
    try { this.config.onObservation?.(snapshot); }
    catch { console.error('Ally integration: observation callback failed'); }`],
    ["    if (this.active?.kept && snapshot.windowId <= this.keptWindowId) return;", "    if (this.config.observationOnly) return;\n    if (this.active?.kept && snapshot.windowId <= this.keptWindowId) return;"],
    ['signature: pending.signature, kept: false,','signature: pending.signature, kept: false, latencyMs: pending.request.latencyMs ?? 0, transactionId: this.transactionCounter,'],
    ["reasonCodes: [...decision.reasonCodes, 'preference_reuse'],", "reasonCodes: [...decision.reasonCodes, 'preference_reuse'], latencyMs: ruleLatencyMs,"],
    ['preset: decision.preset, reasonCodes: decision.reasonCodes,','preset: decision.preset, reasonCodes: decision.reasonCodes, latencyMs: ruleLatencyMs,'],
    ["this.active.beforeWindow = null;\n      this.view.status = 'applied';", "this.active.beforeWindow = null;\n      this.view.status = 'applied';\n      this.log('applied', this.active);"],
  ];
  for(const [anchor,replacement] of patches)source=replaceOnce(source,anchor,replacement);
  return source;
}
