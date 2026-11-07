'use client';

import { createContext, useContext, useMemo } from 'react';
import { AllyPolicySchema } from './schema.js';
import type { AllyContextValue, AllyProviderProps } from './types.js';

const AllyContext = createContext<AllyContextValue | null>(null);
const noop = () => {};

// Phase 0 scaffold: observation, adaptation, and persistence arrive in phases 1–4.
export function AllyProvider({ children, policy, config }: AllyProviderProps) {
  const policyIsValid = AllyPolicySchema.safeParse(policy).success;
  const status = config.enabled === false || !policyIsValid ? 'disabled' : 'observing';
  const value = useMemo<AllyContextValue>(() => ({
    plan: null,
    profile: null,
    summary: null,
    explanation: null,
    status,
    plannerStatus: 'idle',
    keep: noop,
    undo: noop,
    resetPreferences: noop,
    reportStep: noop,
    reportError: noop,
  }), [status]);

  return (
    <AllyContext.Provider value={value}>
      <div data-ally-root="" data-ally-status={status}>{children}</div>
    </AllyContext.Provider>
  );
}

export function useAlly(): AllyContextValue {
  const context = useContext(AllyContext);
  if (!context) throw new Error('useAlly must be used inside AllyProvider');
  return context;
}
