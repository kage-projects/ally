import { z } from 'zod';
import { scoreProfile } from './rules.js';
import {
  AdaptationPlanSchema, DecisionInputSchema, ProfileSchema,
} from './schema.js';
import type {
  AllyPolicy, DecisionInput, FrictionSummary, PreferenceSummary, Profile,
} from './schema.js';

export const PlannerResponseSchema = z.strictObject({
  schemaVersion: z.literal(1),
  plan: AdaptationPlanSchema,
  source: z.literal('llm'),
  latencyMs: z.number().finite().nonnegative(),
});

export type PlannerResponse = z.infer<typeof PlannerResponseSchema>;

export function buildDecisionInput(
  summary: FrictionSummary,
  profile: Profile,
  policy: AllyPolicy,
  preferences: PreferenceSummary[],
  allowedSteps: readonly string[],
): DecisionInput {
  if (!allowedSteps.includes(summary.context.step)) {
    throw new Error('Planner step is not registered by the host');
  }
  const parsedProfile = ProfileSchema.parse(profile);
  const recomputed = scoreProfile(summary);
  if (Object.keys(recomputed).some((key) =>
    Math.abs(recomputed[key as keyof Profile] - parsedProfile[key as keyof Profile]) > 1e-9)) {
    throw new Error('Planner profile does not match the summary');
  }
  return DecisionInputSchema.parse({ schemaVersion: 1, summary, profile: parsedProfile,
    policy, preferences });
}

export function serializeDecisionInput(input: DecisionInput): string {
  const body = JSON.stringify(DecisionInputSchema.parse(input));
  if (new TextEncoder().encode(body).byteLength > 16 * 1024) {
    throw new Error('Planner request exceeds 16 KB');
  }
  return body;
}
