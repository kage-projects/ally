import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY } from '../src/schema.js';
import { decideRule, scoreProfile } from '../src/rules.js';
import { combinedSummary, emptySummary, motorSummary, strictPolicy } from './fixtures.js';

describe('evidence and local rules', () => {
  it('keeps an empty or weak window at no-op without a planner request', () => {
    expect(decideRule(emptySummary, { ...DEFAULT_POLICY, llm: { ...DEFAULT_POLICY.llm, enabled: true } }))
      .toMatchObject({ kind: 'none', requestPlanner: false, candidate: null });
    expect(decideRule({ ...emptySummary, counts: { ...emptySummary.counts, missTap: 2 } }, DEFAULT_POLICY).kind)
      .toBe('none');
  });

  it('scores three misses as motor 0.75 and guards its preset', () => {
    const decision = decideRule(motorSummary, strictPolicy);
    expect(scoreProfile(motorSummary)).toEqual({ motor: 0.75, visual: 0, cognitive: 0 });
    expect(decision).toMatchObject({ kind: 'single', preset: 'motor', strength: 0.75,
      confidence: 0.75, requestPlanner: false });
    expect(decision.candidate?.plan.tokens.targetMinSize).toBe(48);
    expect(decision.candidate?.plan.layout.primaryActionSticky).toBe(true);
    expect(decision.candidate?.corrections).toContain('targetMinSize');
    expect(decision.reasonCodes).toContain('miss_tap');
  });

  it('routes two strong dimensions to combined even with a small score gap', () => {
    const policy = { ...DEFAULT_POLICY, llm: { ...DEFAULT_POLICY.llm, enabled: true } };
    const decision = decideRule(combinedSummary, policy);
    expect(decision).toMatchObject({ kind: 'combined', preset: 'combined', requestPlanner: true,
      candidate: null });
    expect(decision.profile.motor).toBe(0.75);
    expect(decision.profile.visual).toBeCloseTo(0.75);
    const equalScores = { ...emptySummary, counts: { ...emptySummary.counts,
      missTap: 2, rageClick: 1, zoomEvent: 2 } };
    expect(decideRule(equalScores, policy)).toMatchObject({ kind: 'combined', confidence: 0,
      requestPlanner: true });
  });

  it('uses confidence only after the evidence gate and preserves no-op for uncertainty band', () => {
    const policy = { ...DEFAULT_POLICY, llm: { ...DEFAULT_POLICY.llm, enabled: true } };
    const uncertain = { ...emptySummary, counts: { ...emptySummary.counts, missTap: 3, errorLoop: 2 } };
    expect(decideRule(uncertain, policy)).toMatchObject({ kind: 'ambiguous',
      requestPlanner: false, candidate: null });
    const lowGapPolicy = { ...policy, thresholds: { apply: 0.7, llm: 0.7 } };
    expect(decideRule(uncertain, lowGapPolicy).requestPlanner).toBe(true);
  });

  it('maps visual and cognitive presets to bounded, explainable plans', () => {
    const visual = decideRule({ ...emptySummary, counts: { ...emptySummary.counts, zoomEvent: 2 } }, DEFAULT_POLICY);
    expect(visual.candidate?.plan).toMatchObject({
      tokens: { fontScale: 1.35, contrast: 'high' },
      layout: { hideNonEssential: ['promoBanner', 'recommendations'] },
      ttlSeconds: 120,
    });
    const cognitive = decideRule({ ...emptySummary, counts: { ...emptySummary.counts, backtrack: 3 } }, DEFAULT_POLICY);
    expect(cognitive.candidate?.plan).toMatchObject({
      layout: { stepMode: 'one-per-screen' }, assist: { inlineHints: true },
    });
    const repeatedClicks = decideRule({ ...emptySummary,
      counts: { ...emptySummary.counts, rageClick: 6 } }, DEFAULT_POLICY);
    expect(repeatedClicks.candidate?.plan.explanation).toMatch(/klik berulang/);
    expect(repeatedClicks.reasonCodes).toEqual(['rage_click']);
  });
});
