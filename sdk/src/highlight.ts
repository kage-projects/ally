const selector = 'button, a, input, textarea, select, [role="button"], [data-ally-slot], [data-ally-adapt]';
const properties = ['font-size', 'line-height', 'font-weight', 'color', 'background-color',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'gap',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'];

export function createHighlighter(scope: HTMLElement) {
  const win = scope.ownerDocument.defaultView!;
  let frame: number | null = null;
  let frameIsTimeout = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const marked = new Map<HTMLElement, string | null>();

  function fingerprint(element: HTMLElement): string | null {
    if (!scope.contains(element) || element.closest('[data-ally-ui], [hidden], [inert]')) return null;
    const style = win.getComputedStyle(element);
    const box = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || !box.width || !box.height) return null;
    return JSON.stringify([box.width, box.height, ...properties.map(name => style.getPropertyValue(name))]);
  }

  function clear() {
    if (frame !== null) {
      if (frameIsTimeout) win.clearTimeout(frame);
      else win.cancelAnimationFrame(frame);
    }
    if (timer !== null) clearTimeout(timer);
    frame = null;
    timer = null;
    for (const [element, previous] of marked) {
      if (previous === null) element.removeAttribute('data-ally-highlighted');
      else element.setAttribute('data-ally-highlighted', previous);
    }
    marked.clear();
  }

  return {
    capture() {
      clear();
      const before = new Map<HTMLElement, string>();
      for (const element of scope.querySelectorAll<HTMLElement>(selector)) {
        const value = fingerprint(element);
        if (value !== null) before.set(element, value);
      }
      return before;
    },
    show(before: Map<HTMLElement, string>) {
      // React must commit data-ally-status before host CSS can be compared.
      const reveal = () => {
        frame = null;
        for (const [element, previous] of before) {
          const current = fingerprint(element);
          if (current === null || current === previous) continue;
          marked.set(element, element.getAttribute('data-ally-highlighted'));
          element.setAttribute('data-ally-highlighted', '');
        }
        if (marked.size) timer = setTimeout(clear, 4000);
      };
      frameIsTimeout = typeof win.requestAnimationFrame !== 'function';
      frame = frameIsTimeout ? win.setTimeout(reveal, 0) : win.requestAnimationFrame(reveal);
    },
    clear,
  };
}
