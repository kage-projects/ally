// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPreferenceStorage } from '../src/preference-storage.js';
import { PreferenceStore, policyFingerprint } from '../src/preferences.js';
import { AllyRuntime } from '../src/runtime.js';
import { DEFAULT_POLICY } from '../src/schema.js';
import type { FrictionSummary } from '../src/schema.js';
import type { SensorSnapshot } from '../src/sensor.js';
import type { AllyDecisionEvent } from '../src/types.js';
import { candidatePlan, combinedSummary, emptySummary, motorSummary,
  strictPolicy } from './fixtures.js';

const policy = { ...DEFAULT_POLICY, llm: { ...DEFAULT_POLICY.llm, enabled: true } };
let scope: HTMLDivElement | null;
let runtime: AllyRuntime | null;
let decisions: AllyDecisionEvent[];

function snapshot(summary: FrictionSummary, windowId = 1,
  reason: SensorSnapshot['reason'] = 'window'): SensorSnapshot {
  return { source: 'live', sequence: windowId, windowId, reason,
    summary: { ...summary, counts: { ...summary.counts },
      context: { ...summary.context } },
    capabilities: { zoomScale: false, zoomWheel: true,
      slowTargeting: false, scrollThrash: false }, samples: { targetSizes: 0 } };
}

function mount() {
  runtime?.stop();
  scope?.remove();
  scope = document.createElement('div');
  scope.innerHTML = '<button data-ally-slot="primaryAction">Next</button>' +
    '<input value="secret-form-value" />';
  document.body.append(scope);
  decisions = [];
  runtime = new AllyRuntime(scope, policy, { steps: ['cart', 'payment'],
    persistence: 'local', endpoint: '/api/ally/plan' },
  () => {}, (event) => decisions.push(event));
  runtime.start();
  return runtime;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
  window.localStorage.clear();
  scope = null;
  runtime = null;
  decisions = [];
});

afterEach(() => {
  runtime?.stop();
  scope?.remove();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('runtime preferences', () => {
  it('waits for current friction before reusing a kept choice from local storage', () => {
    vi.stubGlobal('fetch', vi.fn());
    let current = mount();
    current.ingest(snapshot(motorSummary));
    current.keep();
    expect(window.localStorage.getItem('ally:pref:v1')).toContain('keptCount');

    current = mount();
    current.ingest(snapshot(emptySummary, 1));
    expect(current.getView().plan).toBeNull();
    current.ingest(snapshot(motorSummary, 2));
    expect(current.getView().status).toBe('applied');
    expect(decisions[0]?.reasonCodes).toContain('preference_reuse');
    expect(scope?.style.getPropertyValue('--ally-target')).toBe('56px');
  });

  it('sends at most sanitized matching summaries when planner is needed', () => {
    const store = new PreferenceStore(createPreferenceStorage('local'));
    store.load();
    store.recordFeedback(1, { step: 'cart', modality: 'touch', preset: 'combined',
      policyFingerprint: policyFingerprint(policy) }, candidatePlan, 'undone');
    const fetchMock = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const current = mount();
    current.ingest(snapshot(combinedSummary));
    expect(current.getView().plannerStatus).toBe('loading');
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.preferences).toHaveLength(1);
    expect(body.preferences[0]).toMatchObject({ step: 'cart', modality: 'touch',
      preset: 'combined', keptCount: 0, undoneCount: 1 });
    expect(JSON.stringify(body)).not.toMatch(/secret-form-value|updatedAt|expiresAt|policyFingerprint|storageKey/);
  });

  it('does not reuse a cart preference on another step or after a policy change', () => {
    vi.stubGlobal('fetch', vi.fn());
    let current = mount();
    current.ingest(snapshot(motorSummary));
    current.keep();

    current = mount();
    current.reportStep('payment');
    current.ingest(snapshot({ ...motorSummary,
      context: { ...motorSummary.context, step: 'payment' } }));
    expect(decisions[0]?.reasonCodes).not.toContain('preference_reuse');

    current = mount();
    current.setPolicy({ ...strictPolicy,
      llm: { ...strictPolicy.llm, enabled: true } });
    current.ingest(snapshot(motorSummary));
    expect(decisions[0]?.reasonCodes).not.toContain('preference_reuse');
  });

  it('does not record an old visible plan as feedback for a new step or policy', () => {
    vi.stubGlobal('fetch', vi.fn());
    let current = mount();
    current.ingest(snapshot(motorSummary));
    current.reportStep('payment');
    current.keep();
    expect(window.localStorage.getItem('ally:pref:v1')).toBeNull();

    current = mount();
    current.ingest(snapshot(motorSummary));
    current.setPolicy({ ...strictPolicy,
      llm: { ...strictPolicy.llm, enabled: true } });
    current.keep();
    expect(window.localStorage.getItem('ally:pref:v1')).toBeNull();
  });

  it('invalidates an outcome comparison when the policy changes between windows', () => {
    vi.stubGlobal('fetch', vi.fn());
    const current = mount();
    const summary = { ...motorSummary, counts: { ...motorSummary.counts,
      taps: 10, missTap: 3 } };
    current.ingest(snapshot(summary, 1));
    current.setPolicy({ ...strictPolicy,
      llm: { ...strictPolicy.llm, enabled: true } });
    current.ingest(snapshot(summary, 2));
    expect(current.getView().outcome).toEqual({ status: 'unknown', reason: 'context' });
  });

  it('drops a pending planner result when preferences are reset', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })));
    const current = mount();
    current.ingest(snapshot(combinedSummary));
    expect(current.getView().plannerStatus).toBe('loading');
    current.resetPreferences();
    resolveFetch(new Response(JSON.stringify({ schemaVersion: 1, source: 'llm',
      latencyMs: 50, plan: candidatePlan }), { status: 200 }));
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(current.getView().plannerStatus).toBe('idle');
    expect(current.getView().plan).toBeNull();
    expect(decisions).toHaveLength(0);
  });

  it('corrects Keep to Undo and reset clears storage without undoing the active display', () => {
    vi.stubGlobal('fetch', vi.fn());
    let current = mount();
    current.ingest(snapshot(motorSummary));
    current.keep();
    current.undo();
    let records = JSON.parse(window.localStorage.getItem('ally:pref:v1')!).records;
    expect(records).toMatchObject([{ keptCount: 0, undoneCount: 1 }]);

    current = mount();
    current.ingest(snapshot(motorSummary));
    current.keep();
    current.resetPreferences();
    expect(window.localStorage.getItem('ally:pref:v1')).toBeNull();
    expect(current.getView().status).toBe('kept');
    expect(scope?.style.getPropertyValue('--ally-target')).toBe('56px');
    records = JSON.parse(window.localStorage.getItem('ally:pref:v1') ?? 'null');
    expect(records).toBeNull();
  });

  it('treats expiry as neutral and measures only complete nonoverlapping windows', () => {
    vi.stubGlobal('fetch', vi.fn());
    let current = mount();
    const before = { ...motorSummary, counts: { ...motorSummary.counts,
      taps: 10, missTap: 3 } };
    const after = { ...motorSummary, counts: { ...motorSummary.counts,
      taps: 10, missTap: 1 } };
    current.ingest(snapshot(before, 1));
    expect(current.getView().outcome).toEqual({ status: 'unknown', reason: 'missing-window' });
    current.ingest(snapshot(after, 2));
    expect(current.getView().outcome).toMatchObject({ status: 'measured',
      beforeRate: 0.3, afterRate: 0.1, beforeTaps: 10, afterTaps: 10 });
    expect(current.getView().outcome).toHaveProperty('delta',
      expect.closeTo(-0.2));
    current.reportStep('payment');
    expect(current.getView().outcome).toEqual({ status: 'unknown', reason: 'context' });
    vi.advanceTimersByTime(120000);
    expect(window.localStorage.getItem('ally:pref:v1')).toBeNull();

    current = mount();
    current.ingest(snapshot(before, 1, 'fast'));
    current.ingest(snapshot(after, 2));
    expect(current.getView().outcome).toEqual({ status: 'unknown', reason: 'overlap' });
  });
});
