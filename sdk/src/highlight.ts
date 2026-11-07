const selector = 'button, a, input, textarea, select, [role="button"], [data-ally-slot], [data-ally-adapt]';
const properties = ['font-size', 'line-height', 'font-weight', 'color', 'background-color',
  'width', 'height', 'min-width', 'min-height',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'gap',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'];

interface Appearance {
  signature: string;
  styles: Record<string, string>;
  opacity: number;
}

export function createHighlighter(scope: HTMLElement) {
  const win = scope.ownerDocument.defaultView!;
  let frame: number | null = null;
  let frameIsTimeout = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const marked = new Map<HTMLElement, string | null>();
  const animations = new Set<Animation>();

  function appearance(element: HTMLElement): Appearance | null {
    if (!scope.contains(element) || element.closest('[data-ally-ui], [hidden], [inert]')) return null;
    const style = win.getComputedStyle(element);
    const box = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || !box.width || !box.height) return null;
    const styles = Object.fromEntries(properties.map(name => [name, style.getPropertyValue(name)]));
    const opacity = Number.parseFloat(style.opacity);
    return { signature: JSON.stringify([box.width, box.height, ...Object.values(styles)]),
      styles, opacity: Number.isFinite(opacity) ? opacity : 1 };
  }

  function fade(element: HTMLElement, previous: Appearance, current: Appearance) {
    if (typeof element.animate !== 'function' ||
        win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const from: Keyframe = {};
    const to: Keyframe = {};
    for (const property of properties) {
      const start = previous.styles[property], end = current.styles[property];
      if (!start || !end || start === end || /^(auto|normal|none)$/.test(start) ||
          /^(auto|normal|none)$/.test(end)) continue;
      const name = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      from[name] = start;
      to[name] = end;
    }
    // Keep the component readable throughout the transition instead of hiding it.
    from.opacity = current.opacity * 0.82;
    to.opacity = current.opacity;
    try {
      const animation = element.animate([from, to], { duration: 240, easing: 'ease-out' });
      animations.add(animation);
      void animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    } catch { /* Animation support must not prevent highlighting or applying a plan. */ }
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
    for (const animation of animations) animation.cancel();
    animations.clear();
  }

  return {
    capture() {
      clear();
      const before = new Map<HTMLElement, Appearance>();
      for (const element of scope.querySelectorAll<HTMLElement>(selector)) {
        const value = appearance(element);
        if (value !== null) before.set(element, value);
      }
      return before;
    },
    show(before: Map<HTMLElement, Appearance>, highlight = true) {
      // React must commit data-ally-status before host CSS can be compared.
      const reveal = () => {
        frame = null;
        for (const [element, previous] of before) {
          const current = appearance(element);
          if (current === null || current.signature === previous.signature) continue;
          fade(element, previous, current);
          if (highlight) {
            marked.set(element, element.getAttribute('data-ally-highlighted'));
            element.setAttribute('data-ally-highlighted', '');
          }
        }
        if (marked.size) timer = setTimeout(clear, 4000);
      };
      frameIsTimeout = typeof win.requestAnimationFrame !== 'function';
      frame = frameIsTimeout ? win.setTimeout(reveal, 0) : win.requestAnimationFrame(reveal);
    },
    clear,
  };
}
