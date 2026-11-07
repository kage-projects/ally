import { describe, expect, it } from 'vitest';
import {
  AdaptationPlanJsonSchema,
  AdaptationPlanSchema,
  AllyPolicySchema,
  DecisionInputSchema,
  FrictionSummarySchema,
  ProfileSchema,
} from '../src/schema.js';
import { candidatePlan, combinedSummary, emptySummary, invalidPlan, motorSummary, strictPolicy } from './fixtures.js';

describe('contract schemas', () => {
  it('accepts the synthetic empty, motor, and combined fixtures', () => {
    for (const fixture of [emptySummary, motorSummary, combinedSummary]) {
      expect(FrictionSummarySchema.safeParse(fixture).success).toBe(true);
    }
    expect(DecisionInputSchema.safeParse({
      schemaVersion: 1,
      summary: emptySummary,
      profile: { motor: 0, visual: 0, cognitive: 0 },
      policy: strictPolicy,
      preferences: [],
    }).success).toBe(true);
  });

  it('rejects additional fields and malformed values', () => {
    expect(FrictionSummarySchema.safeParse({ ...emptySummary, userId: 'private' }).success).toBe(false);
    expect(FrictionSummarySchema.safeParse({
      ...emptySummary,
      counts: { ...emptySummary.counts, taps: Number.NaN },
    }).success).toBe(false);
    expect(ProfileSchema.safeParse({ motor: 1.2, visual: 0, cognitive: 0 }).success).toBe(false);
    expect(AdaptationPlanSchema.safeParse(invalidPlan).success).toBe(false);
  });

  it('rejects invalid policy ranges and hide names', () => {
    expect(AllyPolicySchema.safeParse({
      ...strictPolicy,
      limits: { ...strictPolicy.limits, fontScale: [1.5, 1] },
    }).success).toBe(false);
    expect(AllyPolicySchema.safeParse({
      ...strictPolicy,
      allowHide: ['totalAmount'],
    }).success).toBe(false);
    expect(AllyPolicySchema.safeParse({
      ...strictPolicy,
      limits: { ...strictPolicy.limits, targetMinSize: [44.1, 44.9] },
    }).success).toBe(false);
  });

  it('derives a strict planner JSON schema from the runtime schema', () => {
    const json = AdaptationPlanJsonSchema as Record<string, unknown>;
    expect(json.type).toBe('object');
    expect(json.additionalProperties).toBe(false);
    expect(json.required).toContain('tokens');
    expect(json.properties).toHaveProperty('layout');
    expect(json).not.toHaveProperty('$schema');
  });
});
