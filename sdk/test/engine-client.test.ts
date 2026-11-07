import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDecisionInput, serializeDecisionInput } from '../src/planner-contract.js';
import { PlannerClient, plannerCacheKey, requestPlan } from '../src/engine-client.js';
import { DEFAULT_POLICY } from '../src/schema.js';
import { scoreProfile } from '../src/rules.js';
import { candidatePlan, combinedSummary, emptySummary } from './fixtures.js';

const enabledPolicy = { ...DEFAULT_POLICY,
  llm: { ...DEFAULT_POLICY.llm, enabled: true } };
const summary = combinedSummary;
const profile = scoreProfile(summary);
const input = buildDecisionInput(summary, profile, enabledPolicy, [], ['cart']);
const responsePlan = { ...candidatePlan, profile };
const envelope = { schemaVersion: 1, plan: responsePlan, source: 'llm', latencyMs: 100 };

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status,
    headers: { 'content-type': 'application/json' } });
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('planner request contract', () => {
  it('allows only registered steps, strict anonymous fields and matching profiles', () => {
    expect(input).toMatchObject({ schemaVersion: 1, preferences: [], profile });
    expect(() => buildDecisionInput(summary, profile, enabledPolicy, [], ['shipping']))
      .toThrow(/not registered/);
    expect(() => buildDecisionInput(summary, { ...profile, motor: 0 }, enabledPolicy, [], ['cart']))
      .toThrow(/does not match/);
    const leaked = { ...summary, formValue: 'secret-form-value' };
    expect(() => buildDecisionInput(leaked, profile, enabledPolicy, [], ['cart'])).toThrow();
    expect(serializeDecisionInput(input)).not.toContain('secret-form-value');
    const huge = { ...input, summary: { ...summary,
      timings: { ...summary.timings, stepDurations: Array(10000).fill(1) } } };
    expect(() => serializeDecisionInput(huge)).toThrow(/16 KB/);
  });

  it('rejects non-local endpoints before fetch', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    for (const endpoint of ['https://evil.test/plan', '//evil.test/plan', '/\\evil.test',
      '/api/plan?key=secret']) {
      expect(await requestPlan({ endpoint, input, fetchImpl })).toEqual({ kind: 'error', reason: 'endpoint' });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects oversized requests before fetch', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const hugeInput = { ...input, summary: { ...summary,
      timings: { ...summary.timings, stepDurations: Array(10000).fill(1) } } };
    expect(await requestPlan({ endpoint: '/api/ally/plan', input: hugeInput, fetchImpl }))
      .toEqual({ kind: 'error', reason: 'request' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('handles 200 with strict schema, profile check, and policy guard', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(envelope)) as unknown as typeof fetch;
    const result = await requestPlan({ endpoint: '/api/ally/plan', input, fetchImpl });
    expect(result).toMatchObject({ kind: 'plan', source: 'llm', latencyMs: 100,
      plan: { tokens: { targetMinSize: 72, spacingScale: 2, fontScale: 1.6 },
        assist: { voiceOffer: false } } });
    if (result.kind !== 'plan') throw new Error('Expected plan');
    expect(result.plan.explanation).toMatch(/kebijakan/);
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/ally/plan');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin' });
    expect(JSON.parse(init.body).preferences).toEqual([]);
    expect(init.body).not.toContain('secret-form-value');
  });

  it('treats 204 as no-op without parsing body and handles error statuses', async () => {
    const none = new Response(null, { status: 204 });
    const parse = vi.spyOn(none, 'json');
    expect(await requestPlan({ endpoint: '/api/ally/plan', input,
      fetchImpl: vi.fn(async () => none) as unknown as typeof fetch })).toEqual({ kind: 'none' });
    expect(parse).not.toHaveBeenCalled();
    for (const status of [400, 429, 500]) {
      expect(await requestPlan({ endpoint: '/api/ally/plan', input,
        fetchImpl: vi.fn(async () => new Response(null, { status })) as unknown as typeof fetch }))
        .toEqual({ kind: 'error', reason: 'http', status });
    }
  });

  it('rejects bad JSON, wrong version, refusal envelope and profile mismatch', async () => {
    const bad = [
      new Response('{', { status: 200 }),
      jsonResponse({ ...envelope, schemaVersion: 2 }),
      jsonResponse({ schemaVersion: 1, action: 'none' }),
      jsonResponse({ ...envelope, plan: { ...responsePlan, profile: { ...profile, motor: 0 } } }),
      jsonResponse({ ...envelope, html: '<script>bad</script>' }),
    ];
    for (const response of bad) {
      expect(await requestPlan({ endpoint: '/api/ally/plan', input,
        fetchImpl: vi.fn(async () => response) as unknown as typeof fetch }))
        .toEqual({ kind: 'error', reason: 'invalid-response' });
    }
  });

  it('enforces the 2000ms timeout and aborts even if fetch ignores the signal', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_url, init) => {
      signal = init.signal;
      return new Promise<Response>(() => {});
    }) as unknown as typeof fetch;
    const pending = requestPlan({ endpoint: '/api/ally/plan', input, fetchImpl });
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toEqual({ kind: 'error', reason: 'timeout' });
    expect(signal?.aborted).toBe(true);
  });

  it('aborts promptly when the parent signal is cancelled', async () => {
    const controller = new AbortController();
    const pending = requestPlan({ endpoint: '/api/ally/plan', input,
      signal: controller.signal, fetchImpl: vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch });
    controller.abort();
    expect(await pending).toEqual({ kind: 'error', reason: 'aborted' });
  });
});

describe('per-provider planner cache', () => {
  it('keys by step, modality, signal bucket, policy and preferences', () => {
    expect(plannerCacheKey(input)).not.toBe(plannerCacheKey({ ...input,
      summary: { ...summary, inputModality: 'mouse' } }));
    expect(plannerCacheKey(input)).not.toBe(plannerCacheKey({ ...input,
      policy: { ...enabledPolicy, allowHide: [] } }));
    expect(plannerCacheKey(input)).not.toBe(plannerCacheKey({ ...input,
      summary: { ...summary, context: { ...summary.context, step: 'payment' } } }));
    expect(plannerCacheKey(input)).not.toBe(plannerCacheKey({ ...input,
      summary: { ...summary, counts: { ...summary.counts, zoomEvent: 3 } } }));
    expect(plannerCacheKey(input)).not.toBe(plannerCacheKey({ ...input,
      profile: { ...input.profile, visual: 0.9 } }));
    expect(plannerCacheKey(input)).not.toBe(plannerCacheKey({ ...input,
      preferences: [{ step: 'cart', modality: 'touch', preset: 'motor',
        choice: { tokens: responsePlan.tokens, layout: responsePlan.layout,
          assist: responsePlan.assist }, keptCount: 1, undoneCount: 0, ageBucket: 'recent' }] }));
  });

  it('uses guarded cache for at most 60 seconds and revalidates on hit', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
    const fetchImpl = vi.fn(async () => jsonResponse(envelope)) as unknown as typeof fetch;
    const client = new PlannerClient(fetchImpl);
    expect((await client.plan('/api/ally/plan', input, 1)).kind).toBe('plan');
    expect(await client.plan('/api/ally/plan', input, 2)).toMatchObject({ kind: 'plan', source: 'cache' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60000);
    expect((await client.plan('/api/ally/plan', input, 3)).kind).toBe('plan');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    client.clearCache();
    vi.advanceTimersByTime(10000);
    expect((await client.plan('/api/ally/plan', input, 4)).kind).toBe('plan');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('allows one network request per window and enforces network cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    const client = new PlannerClient(fetchImpl);
    expect(await client.plan('/api/ally/plan', input, 1)).toEqual({ kind: 'none' });
    vi.advanceTimersByTime(10000);
    expect(await client.plan('/api/ally/plan', input, 1)).toEqual({ kind: 'skipped', reason: 'window' });
    expect(await client.plan('/api/ally/plan', input, 2)).toEqual({ kind: 'none' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(await client.plan('/api/ally/plan', input, 3)).toEqual({ kind: 'skipped', reason: 'cooldown' });
  });

  it('discards a late result after abort and does not cache it', async () => {
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    const fetchImpl = fetchMock as unknown as typeof fetch;
    const client = new PlannerClient(fetchImpl);
    const pending = client.plan('/api/ally/plan', input, 1);
    client.abort();
    resolveFetch(jsonResponse(envelope));
    expect(await pending).toEqual({ kind: 'error', reason: 'aborted' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
