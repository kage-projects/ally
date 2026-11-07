// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AllyRuntime } from '../src/runtime.js';
import { DEFAULT_POLICY } from '../src/schema.js';
import { scoreProfile } from '../src/rules.js';
import type { SensorSnapshot } from '../src/sensor.js';
import type { AllyDecisionEvent } from '../src/types.js';
import { candidatePlan, combinedSummary, emptySummary, motorSummary } from './fixtures.js';

const policy = { ...DEFAULT_POLICY, llm: { ...DEFAULT_POLICY.llm, enabled: true } };
let scope: HTMLDivElement;
let runtime: AllyRuntime;
let decisions: AllyDecisionEvent[];

function snapshot(summary: SensorSnapshot['summary'], windowId = 1): SensorSnapshot {
  return { source: 'live', sequence: windowId, windowId, reason: 'window', summary,
    capabilities: { zoomScale: false, zoomWheel: true, slowTargeting: false,
      scrollThrash: false }, samples: { targetSizes: 0 } };
}

function planResponse(summary: SensorSnapshot['summary']) {
  return new Response(JSON.stringify({ schemaVersion: 1, source: 'llm', latencyMs: 50,
    plan: { ...candidatePlan, profile: scoreProfile(summary) } }), { status: 200 });
}

function createRuntime() {
  decisions = [];
  runtime = new AllyRuntime(scope, policy,
    { steps: ['cart', 'payment'], endpoint: '/api/ally/plan' },
    () => {}, (event) => decisions.push(event));
  runtime.start();
}

async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
  scope = document.createElement('div');
  scope.innerHTML = '<button data-ally-slot="primaryAction">Next</button>' +
    '<button data-ally-slot="payButton">Pay</button>' +
    '<input value="secret-form-value" />';
  document.body.append(scope);
});

afterEach(() => {
  runtime?.stop();
  scope.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('runtime planner integration', () => {
  it('keeps zero evidence local and applies a confident single rule without fetch', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    createRuntime();
    runtime.ingest(snapshot(emptySummary));
    expect(runtime.getView().plannerStatus).toBe('idle');
    runtime.ingest(snapshot(motorSummary));
    expect(runtime.getView().status).toBe('applied');
    expect(decisions.at(-1)?.source).toBe('rule');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests combined evidence, validates response and replaces a local plan', async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    createRuntime();
    runtime.ingest(snapshot(motorSummary));
    expect(scope.style.getPropertyValue('--ally-target')).toBe('56px');
    runtime.ingest(snapshot(combinedSummary));
    expect(runtime.getView().plannerStatus).toBe('loading');
    expect(runtime.getView().status).toBe('applied');
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ schemaVersion: 1, preferences: [], summary: combinedSummary });
    expect(JSON.stringify(body)).not.toContain('secret-form-value');
    resolveFetch(planResponse(combinedSummary));
    await settle();
    expect(runtime.getView().plannerStatus).toBe('idle');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('72px');
    expect(decisions.map((event) => event.source)).toEqual(['rule', 'llm']);
    runtime.undo();
    expect(scope.style.getPropertyValue('--ally-target')).toBe('');
  });

  it('sets fallback on HTTP error without removing the valid rule plan', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
    createRuntime();
    runtime.ingest(snapshot(motorSummary));
    runtime.ingest(snapshot(combinedSummary));
    await settle();
    expect(runtime.getView().plannerStatus).toBe('fallback');
    expect(runtime.getView().status).toBe('applied');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('56px');
  });

  it('treats 204 as no plan and rejects a late result after Undo', async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    createRuntime();
    runtime.ingest(snapshot(combinedSummary, 1));
    await settle();
    expect(runtime.getView().status).toBe('observing');
    expect(runtime.getView().plannerStatus).toBe('idle');
    vi.advanceTimersByTime(10000);
    runtime.ingest(snapshot(combinedSummary, 2));
    expect(runtime.getView().plannerStatus).toBe('loading');
    runtime.undo();
    resolveFetch(planResponse(combinedSummary));
    await settle();
    expect(runtime.getView().plannerStatus).toBe('idle');
    expect(runtime.getView().plan).toBeNull();
    expect(decisions).toHaveLength(0);
  });

  it('drops stale response after step/policy changes and keeps no old request active', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; })));
    createRuntime();
    runtime.ingest(snapshot(combinedSummary));
    runtime.reportStep('payment');
    resolveFetch(planResponse(combinedSummary));
    await settle();
    expect(runtime.getView().plan).toBeNull();
    expect(runtime.getView().plannerStatus).toBe('idle');
    runtime.setPolicy({ ...policy, allowHide: [] });
    expect(runtime.getView().plan).toBeNull();
  });

  it('keeps the local plan when Keep cancels a pending planner result', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; })));
    createRuntime();
    runtime.ingest(snapshot(motorSummary));
    runtime.ingest(snapshot(combinedSummary));
    expect(runtime.getView().plannerStatus).toBe('loading');
    runtime.keep();
    resolveFetch(planResponse(combinedSummary));
    await settle();
    expect(runtime.getView().status).toBe('kept');
    expect(runtime.getView().plannerStatus).toBe('idle');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('56px');
    expect(decisions.map((event) => event.action)).toEqual(['applied', 'kept']);
  });
});
