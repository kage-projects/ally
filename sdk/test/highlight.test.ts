// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { createHighlighter } from '../src/highlight.js';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.useRealTimers(); });

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
