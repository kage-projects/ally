// @vitest-environment jsdom
import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AllyProvider } from '../src/provider.js';
import { useAlly } from '../src/useAlly.js';
import { DEFAULT_POLICY } from '../src/schema.js';
import type { AllyDecisionEvent } from '../src/types.js';

let container: HTMLDivElement;
let root: Root;
let events: AllyDecisionEvent[];

function HostFixture() {
  const ally = useAlly();
  return <section>
    <output data-testid="status">{ally.status}</output>
    <button data-ally-slot="primaryAction">Next</button>
    <button data-ally-slot="payButton">Pay</button>
    <strong data-ally-slot="totalAmount">Total</strong>
    <aside data-ally-optional="promoBanner">Promo</aside>
    <input aria-label="Email" defaultValue="secret-form-value" />
  </section>;
}

function pointer(target: Element, x: number, y: number) {
  const event = new MouseEvent('pointerdown', { bubbles: true, button: 0,
    clientX: x, clientY: y });
  Object.defineProperties(event, { pointerType: { value: 'touch' }, isPrimary: { value: true } });
  target.dispatchEvent(event);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  window.localStorage.clear();
  root = createRoot(container);
  events = [];
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('AllyProvider integration', () => {
  it('observes DOM friction, exposes Why/Keep/Undo, and treats toast timeout as neutral', () => {
    act(() => root.render(<AllyProvider policy={DEFAULT_POLICY}
      config={{ steps: ['cart', 'payment'] }} onDecision={(event) => events.push(event)}>
      <HostFixture />
    </AllyProvider>));
    const scope = container.querySelector<HTMLElement>('[data-ally-root]')!;
    const button = scope.querySelector<HTMLElement>('[data-ally-slot="primaryAction"]')!;
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 100, right: 140, bottom: 140, x: 100, y: 100,
      width: 40, height: 40, toJSON: () => ({}),
    });
    act(() => {
      pointer(scope, 90, 110);
      pointer(scope, 90, 110);
      pointer(scope, 90, 110);
    });
    expect(scope.getAttribute('data-ally-status')).toBe('applied');
    expect(scope.style.getPropertyValue('--ally-target')).toBe('56px');
    expect(scope.querySelector('[role="status"]')?.textContent).toContain('Ally menyesuaikan');
    expect(events.map((event) => event.action)).toEqual(['applied']);
    expect(JSON.stringify(events)).not.toContain('secret-form-value');
    const why = [...scope.querySelectorAll('button')].find((item) => item.textContent === 'Why')!;
    why.focus();
    act(() => why.click());
    expect(document.activeElement).toBe(why);
    expect(scope.querySelector('[aria-label="Alasan penyesuaian"]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(8000));
    expect(scope.querySelector('[role="status"]')?.textContent).toBe('');
    expect(events.map((event) => event.action)).toEqual(['applied']);
    const keep = [...scope.querySelectorAll('button')].find((item) => item.textContent === 'Keep')!;
    act(() => keep.click());
    expect(scope.getAttribute('data-ally-status')).toBe('kept');
    const undo = [...scope.querySelectorAll('button')].find((item) => item.textContent === 'Undo')!;
    act(() => undo.click());
    expect(scope.getAttribute('data-ally-status')).toBe('observing');
    expect(events.map((event) => event.action)).toEqual(['applied', 'kept', 'undone']);
  });

  it('cleans up extra Strict Mode setup and rejects nested providers', () => {
    act(() => root.render(<StrictMode><AllyProvider policy={DEFAULT_POLICY}
      config={{ steps: ['cart'] }} onDecision={(event) => events.push(event)}>
      <HostFixture />
    </AllyProvider></StrictMode>));
    const scope = container.querySelector<HTMLElement>('[data-ally-root]')!;
    const button = scope.querySelector<HTMLElement>('[data-ally-slot="primaryAction"]')!;
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 100, right: 140, bottom: 140, x: 100, y: 100,
      width: 40, height: 40, toJSON: () => ({}),
    });
    act(() => { pointer(scope, 90, 110); pointer(scope, 90, 110); pointer(scope, 90, 110); });
    expect(events.filter((event) => event.action === 'applied')).toHaveLength(1);
    expect(() => renderToStaticMarkup(<AllyProvider policy={DEFAULT_POLICY} config={{ steps: ['cart'] }}>
      <AllyProvider policy={DEFAULT_POLICY} config={{ steps: ['cart'] }}>
        <p>nested</p>
      </AllyProvider>
    </AllyProvider>)).toThrow(/Nested AllyProvider/);
  });

  it('throws a useful error when useAlly is outside the provider', () => {
    expect(() => renderToStaticMarkup(createElement(HostFixture))).toThrow(/inside AllyProvider/);
  });

  it('clears device preference storage when persistence mode changes', () => {
    const render = (persistence: 'memory' | 'local') =>
      root.render(<AllyProvider policy={DEFAULT_POLICY}
        config={{ steps: ['cart'], persistence }}><HostFixture /></AllyProvider>);
    act(() => render('local'));
    window.localStorage.setItem('ally:pref:v1', 'stale-local-choice');
    act(() => render('memory'));
    expect(window.localStorage.getItem('ally:pref:v1')).toBeNull();
    window.localStorage.setItem('ally:pref:v1', 'stale-local-choice');
    act(() => render('local'));
    expect(window.localStorage.getItem('ally:pref:v1')).toBeNull();
  });
});
