import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPreferenceStorage } from '../src/preference-storage.js';
import {
  MAX_PREFERENCE_RECORDS, PREFERENCE_EXPIRY_MS, PreferenceStore,
  compareOutcomeWindows, planFromPreference, policyFingerprint,
} from '../src/preferences.js';
import type { PreferenceContext } from '../src/preferences.js';
import { DEFAULT_POLICY } from '../src/schema.js';
import type { SensorSnapshot } from '../src/sensor.js';
import { candidatePlan, emptySummary, strictPolicy } from './fixtures.js';

const context: PreferenceContext = { step: 'cart', modality: 'touch', preset: 'motor',
  policyFingerprint: policyFingerprint(DEFAULT_POLICY) };

function windowSnapshot(windowId: number, taps: number, misses: number): SensorSnapshot {
  return { windowId, sequence: windowId, reason: 'window', source: 'live',
    summary: { ...emptySummary,
      counts: { ...emptySummary.counts, taps, missTap: misses },
      context: { ...emptySummary.context } },
    capabilities: { zoomScale: false, zoomWheel: true,
      slowTargeting: false, scrollThrash: false }, samples: { targetSizes: 0 } };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('device preference store', () => {
  it('corrects Keep to Undo for the same decision and ignores duplicate actions', () => {
    const store = new PreferenceStore();
    expect(store.recordFeedback(1, context, candidatePlan, 'kept')).toBe(true);
    expect(store.recordFeedback(1, context, candidatePlan, 'kept')).toBe(false);
    expect(store.recordsFor(context)[0]).toMatchObject({ keptCount: 1, undoneCount: 0 });
    expect(store.recordFeedback(1, context, candidatePlan, 'undone')).toBe(true);
    expect(store.recordFeedback(1, context, candidatePlan, 'undone')).toBe(false);
    expect(store.recordsFor(context)[0]).toMatchObject({ keptCount: 0, undoneCount: 1 });
    expect(store.preferred(context)).toBeNull();
  });

  it('filters by step, modality, preset, policy and expiry', () => {
    const store = new PreferenceStore();
    store.recordFeedback(1, context, candidatePlan, 'kept');
    expect(store.preferred(context)).not.toBeNull();
    expect(store.preferred({ ...context, step: 'payment' })).toBeNull();
    expect(store.preferred({ ...context, modality: 'keyboard' })).toBeNull();
    expect(store.preferred({ ...context, preset: 'visual' })).toBeNull();
    expect(store.preferred({ ...context, policyFingerprint: policyFingerprint(strictPolicy) })).toBeNull();
    vi.advanceTimersByTime(PREFERENCE_EXPIRY_MS + 1);
    expect(store.preferred(context)).toBeNull();
  });

  it('caps history at 20 and sends at most three sanitized summaries', () => {
    const store = new PreferenceStore();
    for (let i = 0; i < MAX_PREFERENCE_RECORDS + 5; i++) {
      vi.advanceTimersByTime(1);
      store.recordFeedback(i, context, { ...candidatePlan,
        tokens: { ...candidatePlan.tokens, targetMinSize: 45 + i } }, 'kept');
    }
    expect(store.count()).toBe(MAX_PREFERENCE_RECORDS);
    const summaries = store.summaries(context);
    expect(summaries).toHaveLength(3);
    expect(summaries[0].choice.tokens.targetMinSize).toBe(69);
    expect(JSON.stringify(summaries)).not.toMatch(/updatedAt|expiresAt|policyFingerprint|explanation|storageKey|deviceId/);
    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    expect(store.summaries(context, 1)[0].ageBucket).toBe('older');
  });

  it('persists only when local mode is chosen and survives corrupt or denied storage', () => {
    const values = new Map<string, string>();
    const local = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); } } as Storage;
    const adapter = createPreferenceStorage('local', 'ally:test', () => local);
    const store = new PreferenceStore(adapter);
    store.load();
    store.recordFeedback(1, context, candidatePlan, 'kept');
    expect(values.has('ally:test')).toBe(true);
    const restored = new PreferenceStore(createPreferenceStorage('local', 'ally:test', () => local));
    restored.load();
    expect(restored.preferred(context)?.keptCount).toBe(1);
    values.set('ally:test', '{broken');
    restored.load();
    expect(restored.count()).toBe(0);
    expect(values.has('ally:test')).toBe(false);
    const denied = createPreferenceStorage('local', 'ally:denied', () => { throw new Error('denied'); });
    const fallback = new PreferenceStore(denied);
    fallback.load();
    fallback.recordFeedback(1, context, candidatePlan, 'kept');
    expect(fallback.preferred(context)?.keptCount).toBe(1);
    fallback.reset();
    expect(denied.load()).toBeNull();

    const stale = { getItem: () => '{"old":true}',
      setItem: () => { throw new Error('write denied'); },
      removeItem: () => { throw new Error('remove denied'); } } as unknown as Storage;
    const partial = createPreferenceStorage('local', 'ally:partial', () => stale);
    partial.save('current-memory-value');
    expect(partial.load()).toBe('current-memory-value');
  });

  it('rebuilds a fresh guarded plan using current evidence, not stored explanation', () => {
    const store = new PreferenceStore();
    store.recordFeedback(1, context, candidatePlan, 'kept');
    const record = store.preferred(context)!;
    const plan = planFromPreference(record, { motor: 0.9, visual: 0, cognitive: 0 },
      0.9, ['miss_tap'], strictPolicy);
    expect(plan.profile.motor).toBe(0.9);
    expect(plan.tokens.targetMinSize).toBe(48);
    expect(plan.layout.hideNonEssential).toEqual(['recommendations']);
    expect(plan.assist.voiceOffer).toBe(false);
    expect(plan.ttlSeconds).toBe(120);
    expect(plan.explanation).toMatch(/ketukan meleset/);
    expect(plan.explanation).not.toBe(candidatePlan.explanation);
  });

  it('resets memory and local storage without leaking old decisions', () => {
    const adapter = createPreferenceStorage();
    const store = new PreferenceStore(adapter);
    store.recordFeedback(1, context, candidatePlan, 'kept');
    store.reset();
    expect(store.count()).toBe(0);
    expect(adapter.load()).toBeNull();
    expect(store.recordFeedback(1, context, candidatePlan, 'undone')).toBe(true);
    expect(store.recordsFor(context)[0]).toMatchObject({ keptCount: 0, undoneCount: 1 });
  });
});

describe('outcome observation', () => {
  it('compares rates only for complete consecutive equal-duration windows with enough taps', () => {
    expect(compareOutcomeWindows(windowSnapshot(1, 10, 4), windowSnapshot(2, 10, 2)))
      .toEqual({ status: 'measured', beforeRate: 0.4, afterRate: 0.2,
        beforeTaps: 10, afterTaps: 10, delta: -0.2 });
    expect(compareOutcomeWindows(windowSnapshot(1, 4, 2), windowSnapshot(2, 10, 2)))
      .toEqual({ status: 'unknown', reason: 'samples' });
    expect(compareOutcomeWindows(windowSnapshot(1, 10, 4), windowSnapshot(1, 10, 2)))
      .toEqual({ status: 'unknown', reason: 'overlap' });
    const differentStep = windowSnapshot(2, 10, 2);
    differentStep.summary.context.step = 'payment';
    expect(compareOutcomeWindows(windowSnapshot(1, 10, 4), differentStep))
      .toEqual({ status: 'unknown', reason: 'context' });
  });
});
