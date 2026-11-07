// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSensor, systemClock } from '../src/sensor.js';
import { FrictionSummarySchema } from '../src/schema.js';
import { decideRule } from '../src/rules.js';
import { DEFAULT_POLICY } from '../src/schema.js';
import type { SensorSnapshot } from '../src/sensor.js';

let scope: HTMLElement;
let snapshots: SensorSnapshot[];
const config = { steps: ['cart', 'shipping', 'payment'], allowedFields: ['email'],
  errorCategories: ['required'] };

function rect(left: number, top: number, width = 40, height = 40): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height,
    x: left, y: top, toJSON: () => ({}) };
}

function pointer(target: Element, x: number, y: number, pointerType = 'touch') {
  const event = new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y });
  Object.defineProperties(event, { pointerType: { value: pointerType }, isPrimary: { value: true } });
  target.dispatchEvent(event);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
  scope = document.createElement('div');
  document.body.append(scope);
  snapshots = [];
});

afterEach(() => {
  scope.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('scoped live sensor', () => {
  it('counts a child hit, near misses once, and excludes far, disabled, other scope and Ally UI', () => {
    const button = document.createElement('button');
    button.innerHTML = '<span>Go</span>';
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(rect(100, 100));
    const disabled = document.createElement('button');
    disabled.disabled = true;
    vi.spyOn(disabled, 'getBoundingClientRect').mockReturnValue(rect(200, 100));
    const allyUi = document.createElement('div');
    allyUi.dataset.allyUi = '';
    const outside = document.createElement('div');
    document.body.append(outside);
    scope.append(button, disabled, allyUi);
    const sensor = createSensor(scope, systemClock, (value) => snapshots.push(value), config);
    sensor.start();
    pointer(button.querySelector('span')!, 110, 110);
    pointer(scope, 90, 110);
    pointer(scope, 90, 110);
    pointer(scope, 90, 110);
    pointer(scope, 70, 110);
    pointer(disabled, 210, 110);
    pointer(outside, 90, 110);
    pointer(allyUi, 90, 110);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ source: 'live', reason: 'fast', sequence: 1,
      summary: { counts: { missTap: 3, taps: 4 }, timings: { avgTargetSize: 40 } } });
    expect(FrictionSummarySchema.safeParse(snapshots[0].summary).success).toBe(true);
    expect(decideRule(snapshots[0].summary, DEFAULT_POLICY).profile.motor).toBe(0.75);
    vi.advanceTimersByTime(10000);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1].summary.counts.missTap).toBe(3);
    expect(snapshots[1].summary.windowMs).toBe(10000);
    sensor.stop();
    outside.remove();
  });

  it('counts one rage episode and one hesitation per focus episode', () => {
    const button = document.createElement('button');
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(rect(10, 10));
    const input = document.createElement('input');
    scope.append(button, input);
    const sensor = createSensor(scope, systemClock, (value) => snapshots.push(value), config);
    sensor.start();
    button.click(); button.click(); button.click(); button.click();
    expect(snapshots[0].summary.counts.rageClick).toBe(1);
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(4000);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(6000);
    expect(snapshots[1].summary.counts.hesitation).toBe(0);
    vi.advanceTimersByTime(2000);
    vi.advanceTimersByTime(8000);
    expect(snapshots[1].summary.counts.hesitation).toBe(0);
    expect(snapshots[2].summary.counts.hesitation).toBe(1);
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    sensor.stop();
  });

  it('uses host allowlists, step order and resets repeated errors on step change', () => {
    const sensor = createSensor(scope, systemClock, (value) => snapshots.push(value), config);
    sensor.start();
    sensor.reportError({ field: 'other', category: 'required' });
    sensor.reportError({ field: 'email', category: 'private-message' });
    sensor.reportError({ field: 'email', category: 'required' });
    sensor.reportError({ field: 'email', category: 'required' });
    sensor.reportStep('shipping');
    sensor.reportError({ field: 'email', category: 'required' });
    sensor.reportError({ field: 'email', category: 'required' });
    sensor.reportStep('cart');
    sensor.reportStep('unknown');
    vi.advanceTimersByTime(10000);
    expect(snapshots[0].summary.counts).toMatchObject({ errorLoop: 2, backtrack: 1 });
    expect(snapshots[0].summary.context.step).toBe('cart');
    expect(JSON.stringify(snapshots[0])).not.toContain('email');
    expect(JSON.stringify(snapshots[0])).not.toContain('private-message');
    sensor.stop();
  });

  it('pauses on hidden tab, drops partial windows and stops all emit on unmount', () => {
    let hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    const sensor = createSensor(scope, systemClock, (value) => snapshots.push(value), config);
    sensor.start();
    sensor.reportStep('shipping');
    vi.advanceTimersByTime(4000);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(20000);
    expect(snapshots).toHaveLength(0);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(10000);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].summary.windowMs).toBe(10000);
    expect(snapshots[0].summary.counts.backtrack).toBe(0);
    sensor.stop();
    vi.advanceTimersByTime(20000);
    expect(snapshots).toHaveLength(1);
  });

  it('deduplicates ctrl-wheel zoom and reports unavailable scale capability', () => {
    const sensor = createSensor(scope, systemClock, (value) => snapshots.push(value), config);
    sensor.start();
    scope.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ctrlKey: true, deltaY: -10 }));
    scope.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ctrlKey: true, deltaY: -10 }));
    vi.advanceTimersByTime(600);
    scope.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ctrlKey: true, deltaY: 10 }));
    scope.dispatchEvent(new WheelEvent('wheel', { bubbles: true, ctrlKey: true, deltaY: -10 }));
    vi.advanceTimersByTime(9400);
    expect(snapshots[0].summary.counts.zoomEvent).toBe(2);
    expect(snapshots[0].capabilities).toMatchObject({ zoomWheel: true,
      slowTargeting: false, scrollThrash: false });
    sensor.stop();
  });

  it('counts scale increases once per zoom episode', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'visualViewport');
    const viewport = new EventTarget() as VisualViewport;
    Object.defineProperty(viewport, 'scale', { value: 1, writable: true, configurable: true });
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    try {
      const sensor = createSensor(scope, systemClock, (value) => snapshots.push(value), config);
      sensor.start();
      Object.defineProperty(viewport, 'scale', { value: 1.2, configurable: true });
      viewport.dispatchEvent(new Event('resize'));
      Object.defineProperty(viewport, 'scale', { value: 1.4, configurable: true });
      viewport.dispatchEvent(new Event('resize'));
      Object.defineProperty(viewport, 'scale', { value: 1, configurable: true });
      viewport.dispatchEvent(new Event('resize'));
      Object.defineProperty(viewport, 'scale', { value: 1.3, configurable: true });
      viewport.dispatchEvent(new Event('resize'));
      vi.advanceTimersByTime(10000);
      expect(snapshots[0].summary.counts.zoomEvent).toBe(2);
      expect(snapshots[0].capabilities.zoomScale).toBe(true);
      sensor.stop();
    } finally {
      if (original) Object.defineProperty(window, 'visualViewport', original);
      else Reflect.deleteProperty(window, 'visualViewport');
    }
  });
});

describe('simulation sensor', () => {
  it('labels fixture signals and ignores DOM events', () => {
    const sensor = createSensor(scope, systemClock, (value) => snapshots.push(value),
      { ...config, source: 'simulation' });
    sensor.start();
    pointer(scope, 10, 10);
    sensor.inject({ kind: 'missTap', modality: 'touch' });
    sensor.inject({ kind: 'missTap', modality: 'touch' });
    sensor.inject({ kind: 'missTap', modality: 'touch' });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ source: 'simulation', reason: 'fast',
      summary: { inputModality: 'touch', counts: { missTap: 3, taps: 3 } } });
    sensor.stop();
  });

  it('rejects injection into a live sensor', () => {
    const sensor = createSensor(scope, systemClock, () => {}, config);
    sensor.start();
    expect(() => sensor.inject({ kind: 'missTap' })).toThrow(/simulation mode/);
    sensor.stop();
  });
});
