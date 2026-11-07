import type { ReactNode } from 'react';
import type {
  AdaptationPlan,
  AllyPolicy,
  FrictionSummary,
  Profile,
  Preset,
} from './schema.js';
import type { OutcomeObservation } from './preferences.js';

export type AllyStatus = 'disabled' | 'observing' | 'pending' | 'applied' | 'kept';
export type PlannerStatus = 'idle' | 'loading' | 'fallback';
export type DecisionSource = 'rule' | 'llm' | 'cache';

export interface AllyDecisionEvent {
  action: 'applied' | 'kept' | 'undone' | 'expired' | 'corrected';
  source: DecisionSource;
  plan: AdaptationPlan;
  corrections: string[];
  reasonCodes: string[];
  preset: Preset;
}

export interface AllyConfig {
  enabled?: boolean;
  endpoint?: string;
  storageKey?: string;
  persistence?: 'memory' | 'local';
  steps: string[];
  allowedFields?: string[];
  errorCategories?: string[];
}

export interface AllyProviderProps {
  children: ReactNode;
  policy: AllyPolicy;
  config: AllyConfig;
  onDecision?: (event: AllyDecisionEvent) => void;
}

export interface AllyContextValue {
  plan: AdaptationPlan | null;
  profile: Profile | null;
  summary: FrictionSummary | null;
  explanation: string | null;
  status: AllyStatus;
  plannerStatus: PlannerStatus;
  outcome: OutcomeObservation | null;
  keep: () => void;
  undo: () => void;
  resetPreferences: () => void;
  reportStep: (step: string) => void;
  reportError: (error: { field: string; category: string }) => void;
}
