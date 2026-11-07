import { describe, expect, it } from 'vitest';
import { guardPlan } from '../src/guard.js';
import { candidatePlan, strictPolicy } from './fixtures.js';

describe('guardPlan', () => {
  it('clamps values, filters hide flags, and protects the payment button', () => {
    const result = guardPlan(candidatePlan, strictPolicy);
    expect(result.plan.tokens).toMatchObject({
      targetMinSize: 48, spacingScale: 1.2, fontScale: 1.2,
    });
    expect(result.plan.layout.hideNonEssential).toEqual(['recommendations']);
    expect(result.plan.layout.primaryActionSticky).toBe(true);
    expect(result.plan.layout.confirmDestructive).toBe(true);
    expect(result.plan.assist.voiceOffer).toBe(false);
    expect(result.corrections).toContain('hideNonEssential');
    expect(candidatePlan.tokens.targetMinSize).toBe(80);
  });

  it('is idempotent for a guarded plan', () => {
    const first = guardPlan(candidatePlan, strictPolicy);
    const second = guardPlan(first.plan, strictPolicy);
    expect(second.plan).toEqual(first.plan);
    expect(second.corrections).toEqual([]);
  });

  it('rejects malformed plans and invalid integer policy ranges', () => {
    expect(() => guardPlan({ ...candidatePlan, html: '<script />' }, strictPolicy)).toThrow();
    expect(() => guardPlan(candidatePlan, {
      ...strictPolicy,
      limits: { ...strictPolicy.limits, targetMinSize: [44.1, 44.9] },
    })).toThrow();
  });
});
