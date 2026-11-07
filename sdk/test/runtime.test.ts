// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AllyRuntime } from '../src/runtime.js';
import { transitionStatus } from '../src/state.js';
import { DEFAULT_POLICY } from '../src/schema.js';
import type { AllyDecisionEvent } from '../src/types.js';
import { candidatePlan, strictPolicy } from './fixtures.js';

let scope: HTMLDivElement;
let runtime: AllyRuntime;
let events: AllyDecisionEvent[];

const plan2 = { ...candidatePlan,
  tokens: { ...candidatePlan.tokens, targetMinSize: 60, fontScale: 1.4 },
  explanation: 'Tampilan kedua.',
};

function createRuntime() {
  events = [];
  runtime = new AllyRuntime(scope, DEFAULT_POLICY,
    { steps: ['cart', 'payment'], allowedFields: ['email'], errorCategories: ['required'] },
    () => {}, (event) => events.push(event));
  runtime.start();
  return runtime;
}

function candidate(plan: unknown = candidatePlan, source: 'rule' | 'llm' = 'rule', epoch?: number) {
  return { plan, source, preset: 'motor' as const, reasonCodes: ['miss_tap'], contextEpoch: epoch };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  scope = document.createElement('div');
  scope.innerHTML = '<button data-ally-slot="primaryAction">Next</button>' +
    '<button data-ally-slot="payButton">Pay</button>' +
    '<aside data-ally-optional="promoBanner">Promo</aside>' +
    '<aside data-ally-optional="recommendations">Recommendations</aside>';
  scope.style.setProperty('--ally-font', '1.2', 'important');
  scope.setAttribute('data-ally-hide', 'host-value');
  scope.setAttribute('data-host-owned', 'keep-me');
  document.body.append(scope);
});

afterEach(() => {
  runtime?.stop();
  scope.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('UI state machine', () => {
  it('supports explicit transitions and disables from every state', () => {
    expect(transitionStatus('observing', 'defer')).toBe('pending');
    expect(transitionStatus('pending', 'apply')).toBe('applied');
    expect(transitionStatus('applied', 'keep')).toBe('kept');
    expect(transitionStatus('kept', 'restore')).toBe('observing');
    expect(transitionStatus('applied', 'disable')).toBe('disabled');
    expect(transitionStatus('disabled', 'apply')).toBe('disabled');
  });
});

describe('single adaptation transaction', () => {
  it('applies a guarded rule, replaces it with AI, and undoes to exact initial values', () => {
    createRuntime();
    expect(runtime.acceptCandidate(candidate())).toBe(true);
    expect(scope.style.getPropertyValue('--ally-target')).toBe('72px');
    expect(scope.style.getPropertyValue('--ally-font')).toBe('1.6');
    expect(scope.getAttribute('data-ally-sticky')).toBe('true');
    expect(scope.getAttribute('data-ally-confirm-destructive')).toBe('true');
    expect(runtime.getView().status).toBe('applied');
    expect(runtime.acceptCandidate(candidate(plan2, 'llm', runtime.getEpoch()))).toBe(true);
    expect(scope.style.getPropertyValue('--ally-target')).toBe('60px');
    runtime.undo();
    expect(runtime.getView().status).toBe('observing');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('');
    expect(scope.style.getPropertyValue('--ally-font')).toBe('1.2');
    expect(scope.style.getPropertyPriority('--ally-font')).toBe('important');
    expect(scope.getAttribute('data-ally-hide')).toBe('host-value');
    expect(scope.getAttribute('data-host-owned')).toBe('keep-me');
    expect(events.map((event) => event.action)).toEqual(['applied', 'applied', 'undone']);
    expect(runtime.acceptCandidate(candidate(plan2))).toBe(false);
    vi.advanceTimersByTime(60000);
    expect(runtime.acceptCandidate(candidate(plan2))).toBe(true);
  });

  it('makes Keep the next baseline and allows Undo of Keep before a new plan', () => {
    createRuntime();
    runtime.acceptCandidate(candidate());
    runtime.keep();
    runtime.keep();
    expect(runtime.getView().status).toBe('kept');
    vi.advanceTimersByTime(120000);
    expect(runtime.getView().status).toBe('kept');
    runtime.undo();
    expect(scope.style.getPropertyValue('--ally-target')).toBe('');
    expect(events.map((event) => event.action)).toEqual(['applied', 'kept', 'undone']);
  });

  it('restores the kept plan after a subsequent automatic plan is undone', () => {
    createRuntime();
    runtime.acceptCandidate(candidate());
    runtime.keep();
    expect(runtime.acceptCandidate(candidate(plan2))).toBe(false);
    runtime.reportStep('payment');
    vi.advanceTimersByTime(10000);
    runtime.acceptCandidate(candidate(plan2));
    runtime.undo();
    expect(scope.style.getPropertyValue('--ally-target')).toBe('72px');
    expect(scope.style.getPropertyValue('--ally-font')).toBe('1.6');
  });

  it('waits for blur and composition end, then drops a stale epoch', () => {
    createRuntime();
    const input = document.createElement('input');
    scope.append(input);
    input.focus();
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    expect(runtime.acceptCandidate(candidate())).toBe(true);
    expect(runtime.getView().status).toBe('pending');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('');
    input.blur();
    vi.advanceTimersByTime(0);
    expect(runtime.getView().status).toBe('pending');
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    vi.advanceTimersByTime(0);
    expect(runtime.getView().status).toBe('applied');
    const oldEpoch = runtime.getEpoch();
    runtime.reportStep('payment');
    expect(runtime.acceptCandidate(candidate(plan2, 'llm', oldEpoch))).toBe(false);
  });

  it('expires without interpreting toast timeout as Keep and defers restore while typing', () => {
    createRuntime();
    runtime.acceptCandidate(candidate());
    vi.advanceTimersByTime(8000);
    expect(runtime.getView().toastVisible).toBe(false);
    expect(events.map((event) => event.action)).toEqual(['applied']);
    const input = document.createElement('input');
    scope.append(input);
    input.focus();
    vi.advanceTimersByTime(112000);
    expect(runtime.getView().status).toBe('pending');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('72px');
    input.blur();
    vi.advanceTimersByTime(0);
    expect(runtime.getView().status).toBe('observing');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('');
    expect(events.map((event) => event.action)).toEqual(['applied', 'expired']);
  });

  it('removes unsafe hide names before apply and when host markup changes', async () => {
    createRuntime();
    const promo = scope.querySelector('[data-ally-optional="promoBanner"]')!;
    promo.innerHTML = '<strong data-ally-slot="totalAmount">Total</strong>';
    runtime.acceptCandidate(candidate());
    expect(runtime.getView().plan?.layout.hideNonEssential).toEqual(['recommendations']);
    expect(scope.getAttribute('data-ally-hide')).toBe('recommendations');
    expect(console.error).toHaveBeenCalledWith('Ally integration: protected-slot-inside-promoBanner');
    const total = document.createElement('strong');
    total.dataset.allySlot = 'price';
    scope.querySelector('[data-ally-optional="recommendations"]')!.append(total);
    await Promise.resolve();
    expect(scope.hasAttribute('data-ally-hide')).toBe(false);
    expect(runtime.getView().plan?.layout.hideNonEssential).toEqual([]);
    expect(events.at(-1)?.action).toBe('corrected');
  });

  it('rejects sticky when primaryAction overlaps payButton or is missing', () => {
    scope.querySelector('[data-ally-slot="primaryAction"]')!.remove();
    createRuntime();
    runtime.acceptCandidate(candidate());
    expect(scope.hasAttribute('data-ally-sticky')).toBe(false);
    expect(console.error).toHaveBeenCalledWith('Ally integration: primaryAction-missing-or-overlaps-payButton');
  });

  it('removes a hide name before a new optional ancestor can hide focused content', async () => {
    createRuntime();
    runtime.acceptCandidate(candidate());
    const wrapper = document.createElement('div');
    const focusedButton = document.createElement('button');
    wrapper.append(focusedButton);
    scope.append(wrapper);
    focusedButton.focus();
    wrapper.dataset.allyOptional = 'recommendations';
    await Promise.resolve();
    expect(scope.getAttribute('data-ally-hide')).toBe('promoBanner');
    expect(document.activeElement).toBe(focusedButton);
    focusedButton.blur();
    vi.advanceTimersByTime(0);
    expect(scope.getAttribute('data-ally-hide')).toBe('promoBanner recommendations');
  });

  it('disables and restores on invalid policy, then restarts with valid policy', () => {
    createRuntime();
    runtime.acceptCandidate(candidate());
    runtime.setPolicy(strictPolicy);
    expect(scope.style.getPropertyValue('--ally-target')).toBe('48px');
    expect(scope.getAttribute('data-ally-hide')).toBe('recommendations');
    runtime.setPolicy({ invalid: true });
    expect(runtime.getView().status).toBe('disabled');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('');
    runtime.setPolicy(DEFAULT_POLICY);
    expect(runtime.getView().status).toBe('observing');
    runtime.setEnabled(false);
    expect(runtime.getView().status).toBe('disabled');
  });

  it('drops a pending candidate when its TTL ends and restores on unmount', () => {
    createRuntime();
    const input = document.createElement('input');
    scope.append(input);
    input.focus();
    runtime.acceptCandidate(candidate());
    vi.advanceTimersByTime(120000);
    input.blur();
    vi.advanceTimersByTime(0);
    expect(runtime.getView().status).toBe('observing');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('');
    runtime.acceptCandidate(candidate());
    expect(events.map((event) => event.action)).toEqual(['applied']);
    runtime.stop();
    expect(scope.style.getPropertyValue('--ally-font')).toBe('1.2');
    expect(scope.style.getPropertyPriority('--ally-font')).toBe('important');
    vi.advanceTimersByTime(120000);
    expect(events.map((event) => event.action)).toEqual(['applied']);
  });
});
