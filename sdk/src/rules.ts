import { AllyPolicySchema, FrictionSummarySchema } from './schema.js';
import type { AllyPolicy, FrictionSummary, Preset, Profile } from './schema.js';
import { createPresetPlan } from './presets.js';
import type { GuardResult } from './guard.js';

export interface RuleDecision {
  kind: 'none' | 'single' | 'combined' | 'ambiguous';
  profile: Profile;
  strength: number;
  confidence: number;
  preset: Preset;
  requestPlanner: boolean;
  candidate: GuardResult | null;
  reasonCodes: string[];
}

const cap = (value: number) => Math.min(1, value);

function signalReasons(summary: FrictionSummary, preset: Exclude<Preset, 'combined' | null>): string[] {
  const { counts } = summary;
  if (preset === 'motor') return [counts.missTap && 'miss_tap', counts.rageClick && 'rage_click'].filter(Boolean) as string[];
  if (preset === 'visual') return [counts.zoomEvent && 'zoom_event', counts.errorLoop && 'error_loop'].filter(Boolean) as string[];
  return [counts.hesitation && 'hesitation', counts.backtrack && 'backtrack',
    counts.errorLoop && 'error_loop'].filter(Boolean) as string[];
}

export function scoreProfile(summary: FrictionSummary): Profile {
  FrictionSummarySchema.parse(summary);
  const { missTap, rageClick, zoomEvent, errorLoop, hesitation, backtrack } = summary.counts;
  return {
    motor: cap(missTap * 0.25 + rageClick * 0.1),
    visual: cap(zoomEvent * 0.3 + errorLoop * 0.15),
    cognitive: cap(hesitation * 0.2 + backtrack * 0.25 + errorLoop * 0.1),
  };
}

export function decideRule(summary: FrictionSummary, policy: AllyPolicy): RuleDecision {
  AllyPolicySchema.parse(policy);
  const profile = scoreProfile(summary);
  const ranked = (Object.entries(profile) as [Exclude<Preset, 'combined' | null>, number][])
    .sort((a, b) => b[1] - a[1]);
  const strength = ranked[0][1];
  const confidence = strength - ranked[1][1];
  const combined = ranked.filter(([, score]) => score >= 0.5).length >= 2;
  const evidence = strength >= 0.6 || combined;
  if (!evidence) {
    return { kind: 'none', profile, strength, confidence, preset: null,
      requestPlanner: false, candidate: null, reasonCodes: ['insufficient_evidence'] };
  }
  if (combined) {
    return { kind: 'combined', profile, strength, confidence, preset: 'combined',
      requestPlanner: policy.llm.enabled, candidate: null,
      reasonCodes: ['combined_friction', ...signalReasons(summary, ranked[0][0]),
        ...signalReasons(summary, ranked[1][0])] };
  }
  const preset = ranked[0][0];
  const reasonCodes = signalReasons(summary, preset);
  if (confidence >= policy.thresholds.apply) {
    return { kind: 'single', profile, strength, confidence, preset,
      requestPlanner: false,
      candidate: createPresetPlan(preset, profile, confidence, policy, reasonCodes),
      reasonCodes };
  }
  return { kind: 'ambiguous', profile, strength, confidence, preset,
    requestPlanner: policy.llm.enabled && confidence < policy.thresholds.llm,
    candidate: null, reasonCodes: ['ambiguous_friction', ...reasonCodes] };
}
