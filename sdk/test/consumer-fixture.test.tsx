// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_POLICY } from '@ally/react/core';
import { ConsumerFixture } from './fixtures/consumer.js';

let container: HTMLDivElement;
let root: Root;

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
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('runs a three-step package fixture with scoped DOM events and anonymous planner body', async () => {
  const policy = { ...DEFAULT_POLICY, llm: { ...DEFAULT_POLICY.llm, enabled: true } };
  const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
    new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
  act(() => root.render(<ConsumerFixture policy={policy} />));
  const scope = container.querySelector<HTMLElement>('[data-ally-root]')!;
  const cartButton = scope.querySelector<HTMLElement>('[data-ally-step="cart"] [data-ally-slot="primaryAction"]')!;
  vi.spyOn(cartButton, 'getBoundingClientRect').mockReturnValue({
    left: 100, top: 100, right: 140, bottom: 140,
    x: 100, y: 100, width: 40, height: 40, toJSON: () => ({}),
  });
  act(() => { pointer(scope, 90, 110); pointer(scope, 90, 110); pointer(scope, 90, 110); });
  expect(scope.getAttribute('data-ally-status')).toBe('applied');
  expect(scope.style.getPropertyValue('--ally-target')).toBe('56px');
  expect(scope.querySelector('[data-ally-slot="payButton"]')?.textContent).toBe('Pay');

  act(() => scope.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ctrlKey: true, deltaY: -10 })));
  act(() => vi.advanceTimersByTime(600));
  act(() => scope.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ctrlKey: true, deltaY: -10 })));
  await act(async () => {
    vi.advanceTimersByTime(9400);
    await Promise.resolve();
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const body = String(fetchMock.mock.calls[0]?.[1]?.body);
  expect(body).not.toContain('SENTINEL_VALUE_DO_NOT_SEND');
  expect(body).not.toContain('SENTINEL_TEXT_DO_NOT_SEND');
  expect(JSON.parse(body).summary.counts).toMatchObject({ missTap: 3, zoomEvent: 2 });

  act(() => cartButton.click());
  expect(scope.querySelector('[data-ally-step="shipping"]')?.hasAttribute('hidden')).toBe(false);
  const input = scope.querySelector<HTMLInputElement>('#ally-fixture-email')!;
  act(() => { input.focus(); input.blur(); input.focus(); input.blur(); });
  act(() => vi.advanceTimersByTime(10000));
  expect(scope.querySelector('[data-test-summary]')?.textContent).toBe('shipping:1');
});
