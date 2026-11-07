// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createHighlighter } from '../src/highlight.js';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function animatedButton(reducedMotion: boolean) {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reducedMotion })));
  const scope = document.createElement('div');
  const button = document.createElement('button');
  button.style.fontSize = '14px';
  scope.append(button);
  document.body.append(scope);
  vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({ width: 40, height: 40 } as DOMRect);
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel, finished: new Promise<Animation>(() => {}) }));
  Object.defineProperty(button, 'animate', { value: animate });
  return { button, animate, cancel, highlighter: createHighlighter(scope) };
}

it('highlights actual style changes and excludes unchanged elements and Ally controls', () => {
  vi.useFakeTimers();
  const scope = document.createElement('div');
  scope.innerHTML = '<button id="changed" style="font-size:14px">Next</button>' +
    '<input id="unchanged"/><div data-ally-ui><button id="control">Keep</button></div>';
  document.body.append(scope);
  for (const element of scope.querySelectorAll<HTMLElement>('button,input')) {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width: 40, height: 40 } as DOMRect);
  }
  const changed = scope.querySelector<HTMLElement>('#changed')!;
  const control = scope.querySelector<HTMLElement>('#control')!;
  const highlighter = createHighlighter(scope);
  const before = highlighter.capture();
  changed.style.fontSize = '18px';
  control.style.fontSize = '18px';
  highlighter.show(before);
  vi.advanceTimersByTime(20);
  expect(changed.hasAttribute('data-ally-highlighted')).toBe(true);
  expect(scope.querySelector('#unchanged')?.hasAttribute('data-ally-highlighted')).toBe(false);
  expect(control.hasAttribute('data-ally-highlighted')).toBe(false);
  vi.advanceTimersByTime(4000);
  expect(changed.hasAttribute('data-ally-highlighted')).toBe(false);
  const next = highlighter.capture();
  changed.style.fontSize = '20px';
  highlighter.show(next);
  highlighter.clear();
  vi.advanceTimersByTime(20);
  expect(changed.hasAttribute('data-ally-highlighted')).toBe(false);
});

it('interpolates changed styles with a gentle fade and cancels it on clear', () => {
  const { button, animate, cancel, highlighter } = animatedButton(false);
  const before = highlighter.capture();
  button.style.fontSize = '18px';
  highlighter.show(before);
  vi.advanceTimersByTime(20);
  expect(animate).toHaveBeenCalledWith([
    { fontSize: '14px', opacity: 0.82 },
    { fontSize: '18px', opacity: 1 },
  ], { duration: 240, easing: 'ease-out' });
  highlighter.clear();
  expect(cancel).toHaveBeenCalledOnce();

  const adapted = highlighter.capture();
  button.style.fontSize = '14px';
  highlighter.show(adapted, false);
  vi.advanceTimersByTime(20);
  expect(animate).toHaveBeenCalledTimes(2);
  expect(button.hasAttribute('data-ally-highlighted')).toBe(false);
  highlighter.clear();
});

it('keeps highlighting but skips animations when reduced motion is requested', () => {
  const { button, animate, highlighter } = animatedButton(true);
  const before = highlighter.capture();
  button.style.fontSize = '18px';
  highlighter.show(before);
  vi.advanceTimersByTime(20);
  expect(animate).not.toHaveBeenCalled();
  expect(button.hasAttribute('data-ally-highlighted')).toBe(true);
  highlighter.clear();
});
