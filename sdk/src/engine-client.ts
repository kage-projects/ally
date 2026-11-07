import { guardPlan } from './guard.js';
import { PlannerResponseSchema, serializeDecisionInput } from './planner-contract.js';
import type { AdaptationPlan, DecisionInput } from './schema.js';

export type PlannerOutcome =
  | { kind: 'plan'; source: 'llm' | 'cache'; plan: AdaptationPlan;
      corrections: string[]; latencyMs: number }
  | { kind: 'none' }
  | { kind: 'error'; reason: 'endpoint' | 'request' | 'timeout' | 'aborted' |
      'network' | 'http' | 'invalid-response'; status?: number }
  | { kind: 'skipped'; reason: 'inflight' | 'cooldown' | 'window' };

export interface RequestPlanOptions {
  endpoint: string;
  input: DecisionInput;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export function validPlannerEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/') && !endpoint.startsWith('//') &&
    !endpoint.includes('\\') && !endpoint.includes('?') && !endpoint.includes('#');
}

export async function requestPlan({ endpoint, input, signal,
  fetchImpl = fetch }: RequestPlanOptions): Promise<PlannerOutcome> {
  if (!validPlannerEndpoint(endpoint)) return { kind: 'error', reason: 'endpoint' };
  let body: string;
  try { body = serializeDecisionInput(input); }
  catch { return { kind: 'error', reason: 'request' }; }
  if (signal?.aborted) return { kind: 'error', reason: 'aborted' };

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<PlannerOutcome>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      resolve({ kind: 'error', reason: 'timeout' });
    }, 2000);
  });
  const cancelled = new Promise<PlannerOutcome>((resolve) => {
    controller.signal.addEventListener('abort', () => {
      resolve({ kind: 'error', reason: timedOut ? 'timeout' : 'aborted' });
    }, { once: true });
  });
  const operation = (async (): Promise<PlannerOutcome> => {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (response.status === 204) return { kind: 'none' };
      if (response.status !== 200) return { kind: 'error', reason: 'http', status: response.status };
      let raw: unknown;
      try { raw = await response.json(); }
      catch { return { kind: 'error', reason: 'invalid-response' }; }
      const parsed = PlannerResponseSchema.safeParse(raw);
      if (!parsed.success) return { kind: 'error', reason: 'invalid-response' };
      const { plan, latencyMs } = parsed.data;
      if (Object.keys(input.profile).some((key) =>
        Math.abs(plan.profile[key as keyof typeof plan.profile] -
          input.profile[key as keyof typeof input.profile]) > 1e-9)) {
        return { kind: 'error', reason: 'invalid-response' };
      }
      const guarded = guardPlan(plan, input.policy);
      return { kind: 'plan', source: 'llm', latencyMs,
        corrections: guarded.corrections,
        plan: guarded.corrections.length
          ? { ...guarded.plan, explanation: 'Tampilan disesuaikan sesuai kebijakan dan batas keamanan.' }
          : guarded.plan };
    } catch {
      return { kind: 'error', reason: signal?.aborted ? 'aborted' :
        timedOut ? 'timeout' : 'network' };
    }
  })();
  try {
    return await Promise.race([operation, timeout, cancelled]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onAbort);
  }
}

const signalNames = [
  'missTap', 'rageClick', 'hesitation', 'backtrack', 'errorLoop', 'zoomEvent',
] as const;

export function plannerCacheKey(input: DecisionInput): string {
  const { summary } = input;
  const signalBucket = signalNames.map((name) => Math.min(summary.counts[name], 4));
  const viewportBucket = [Math.floor(summary.viewport.w / 100),
    Math.floor(summary.viewport.h / 100), Math.floor(summary.viewport.dpr * 2)];
  return JSON.stringify([input.schemaVersion, summary.context.step, summary.inputModality,
    summary.context.priorPreset, summary.context.undoCount,
    signalBucket, input.profile, viewportBucket, input.policy, input.preferences]);
}

interface CacheEntry { plan: AdaptationPlan; latencyMs: number; expiresAt: number }

export class PlannerClient {
  private readonly fetchImpl: typeof fetch;
  private cache = new Map<string, CacheEntry>();
  private current: AbortController | null = null;
  private lastNetworkAt = Number.NEGATIVE_INFINITY;
  private lastWindowKey: string | null = null;

  constructor(fetchImpl: typeof fetch = fetch) { this.fetchImpl = fetchImpl; }

  async plan(endpoint: string, input: DecisionInput, windowId: number): Promise<PlannerOutcome> {
    const key = plannerCacheKey(input);
    const cached = this.cache.get(key);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        try {
          if (Object.keys(input.profile).some((name) =>
            Math.abs(cached.plan.profile[name as keyof typeof input.profile] -
              input.profile[name as keyof typeof input.profile]) > 1e-9)) {
            throw new Error('Cached profile no longer matches the summary');
          }
          const guarded = guardPlan(cached.plan, input.policy);
          return { kind: 'plan', source: 'cache', plan: guarded.plan,
            corrections: guarded.corrections, latencyMs: cached.latencyMs };
        } catch { this.cache.delete(key); }
      } else this.cache.delete(key);
    }
    if (this.current) return { kind: 'skipped', reason: 'inflight' };
    const windowKey = `${input.summary.context.step}:${windowId}`;
    if (this.lastWindowKey === windowKey) return { kind: 'skipped', reason: 'window' };
    if (Date.now() - this.lastNetworkAt < 10000) return { kind: 'skipped', reason: 'cooldown' };
    const controller = new AbortController();
    this.current = controller;
    this.lastWindowKey = windowKey;
    this.lastNetworkAt = Date.now();
    try {
      const outcome = await requestPlan({ endpoint, input,
        signal: controller.signal, fetchImpl: this.fetchImpl });
      if (this.current !== controller) return { kind: 'error', reason: 'aborted' };
      if (outcome.kind === 'plan') {
        this.cache.set(key, { plan: outcome.plan, latencyMs: outcome.latencyMs,
          expiresAt: Date.now() + Math.min(outcome.plan.ttlSeconds, 60) * 1000 });
        if (this.cache.size > 32) this.cache.delete(this.cache.keys().next().value!);
      }
      return outcome;
    } finally {
      if (this.current === controller) this.current = null;
    }
  }

  abort() {
    this.current?.abort();
    this.current = null;
  }

  clearCache() { this.cache.clear(); }

  reset() {
    this.abort();
    this.clearCache();
    this.lastWindowKey = null;
    this.lastNetworkAt = Number.NEGATIVE_INFINITY;
  }
}
