import type { FrictionSummary, Preset } from './schema.js';

export interface SensorClock { now(): number }
export const systemClock: SensorClock = { now: () => Date.now() };

export interface SensorConfig {
  steps: string[];
  allowedFields?: string[];
  errorCategories?: string[];
  priorPreset?: Preset;
  undoCount?: number;
  // Simulation is reserved for SDK fixtures; it never attaches DOM input listeners.
  source?: 'live' | 'simulation';
}

export interface SensorSnapshot {
  sequence: number;
  windowId: number;
  reason: 'fast' | 'window';
  source: 'live' | 'simulation';
  summary: FrictionSummary;
  capabilities: {
    zoomScale: boolean;
    zoomWheel: boolean;
    slowTargeting: false;
    scrollThrash: false;
  };
  samples: { targetSizes: number };
}

export type SimulatedSignal =
  | { kind: 'tap' | 'missTap' | 'rageClick' | 'hesitation' | 'zoomEvent'; modality?: 'touch' | 'mouse' | 'keyboard' }
  | { kind: 'step'; step: string }
  | { kind: 'error'; field: string; category: string };

export interface Sensor {
  start(): void;
  stop(): void;
  reportStep(step: string): void;
  reportError(error: { field: string; category: string }): void;
  updateContext(context: { priorPreset: Preset; undoCount: number }): void;
  beginObservation(): void;
  inject(signal: SimulatedSignal): void;
}

const interactiveSelector = 'button, a, input, select, [role="button"]';
const fieldSelector = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/;

function emptyCounts(): FrictionSummary['counts'] {
  return { taps: 0, missTap: 0, rageClick: 0, hesitation: 0, backtrack: 0,
    errorLoop: 0, zoomEvent: 0, scrollThrash: 0, slowTargeting: 0 };
}

function elementFromEvent(event: Event): Element | null {
  const target = event.target;
  return target && 'nodeType' in target && target.nodeType === 1 ? target as Element : null;
}

export function createSensor(
  scope: HTMLElement,
  clock: SensorClock,
  emit: (snapshot: SensorSnapshot) => void,
  config: SensorConfig,
): Sensor {
  if (!config.steps.length || config.steps.some((step) => !namePattern.test(step)) ||
      new Set(config.steps).size !== config.steps.length) {
    throw new Error('Sensor steps must be unique short names');
  }
  const doc = scope.ownerDocument;
  const browserWindow = doc.defaultView;
  if (!browserWindow) throw new Error('Sensor requires a browser document');
  const win: Window = browserWindow;
  const source = config.source ?? 'live';
  const allowedFields = new Set(config.allowedFields ?? []);
  const errorCategories = new Set(config.errorCategories ?? []);
  let active = false;
  let paused = doc.hidden;
  let windowStart = clock.now();
  let currentStep = config.steps[0];
  let priorPreset = config.priorPreset ?? null;
  let undoCount = config.undoCount ?? 0;
  let stepStart = windowStart;
  let counts = emptyCounts();
  let stepDurations: number[] = [];
  let targetSizeTotal = 0;
  let targetSizeSamples = 0;
  let modalities = new Set<'touch' | 'mouse' | 'keyboard'>();
  let sequence = 0;
  let windowId = 0;
  let fastEmitted = new Set<'miss' | 'rage' | 'error'>();
  let interval: ReturnType<typeof setInterval> | null = null;
  let focusTimer: ReturnType<typeof setTimeout> | null = null;
  let focusedField: Element | null = null;
  let hesitationCounted = false;
  let clickTarget: Element | null = null;
  let clickTimes: number[] = [];
  let rageCounted = false;
  let wheelEpisodeUntil = 0;
  let scaleEpisode = false;
  let previousScale = win.visualViewport?.scale ?? 1;
  const seenErrors = new Set<string>();

  function clearFocusTimer() {
    if (focusTimer !== null) clearTimeout(focusTimer);
    focusTimer = null;
  }

  function armFocusTimer() {
    clearFocusTimer();
    if (!active || paused || !focusedField || hesitationCounted) return;
    focusTimer = setTimeout(() => {
      focusTimer = null;
      if (!active || paused || !focusedField || hesitationCounted) return;
      hesitationCounted = true;
      counts.hesitation++;
      maybeFast();
    }, 8000);
  }

  function resetWindow(now: number) {
    windowId++;
    windowStart = now;
    stepStart = now;
    counts = emptyCounts();
    stepDurations = [];
    targetSizeTotal = 0;
    targetSizeSamples = 0;
    modalities = new Set();
    fastEmitted = new Set();
    clickTarget = null;
    clickTimes = [];
    rageCounted = false;
    wheelEpisodeUntil = 0;
    scaleEpisode = false;
    previousScale = win.visualViewport?.scale ?? 1;
  }

  function snapshot(reason: SensorSnapshot['reason']): SensorSnapshot {
    const now = clock.now();
    const modality = modalities.size > 1 ? 'mixed' : [...modalities][0] ?? 'mouse';
    return {
      sequence: ++sequence,
      windowId,
      reason,
      source,
      summary: {
        windowMs: Math.max(0, now - windowStart),
        viewport: {
          w: Math.max(0, win.innerWidth),
          h: Math.max(0, win.innerHeight),
          dpr: Math.max(0, win.devicePixelRatio || 1),
        },
        inputModality: modality,
        counts: { ...counts },
        timings: {
          avgTargetSize: targetSizeSamples ? targetSizeTotal / targetSizeSamples : 0,
          avgTimeToTarget: 0,
          stepDurations: [...stepDurations],
        },
        context: { step: currentStep, priorPreset, undoCount },
      },
      capabilities: {
        zoomScale: Boolean(win.visualViewport), zoomWheel: true,
        slowTargeting: false, scrollThrash: false,
      },
      samples: { targetSizes: targetSizeSamples },
    };
  }

  function maybeFast() {
    const trigger = counts.missTap >= 3 && !fastEmitted.has('miss') ? 'miss'
      : counts.errorLoop >= 5 && !fastEmitted.has('error') ? 'error'
        : counts.rageClick >= 1 && !fastEmitted.has('rage') ? 'rage' : null;
    if (!trigger) return;
    fastEmitted.add(trigger);
    emit(snapshot('fast'));
  }

  function flush() {
    if (!active || paused) return;
    emit(snapshot('window'));
    resetWindow(clock.now());
  }

  function eligible(target: HTMLElement): DOMRect | null {
    if (!scope.contains(target) || target.closest('[data-ally-ui], [hidden], [inert], [aria-hidden="true"]')) return null;
    if (target.matches(':disabled') || target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return null;
    const style = win.getComputedStyle(target);
    if (style.display === 'none' || style.visibility === 'hidden') return null;
    const rect = target.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? rect : null;
  }

  function onPointerDown(event: Event) {
    if (!active || paused || source !== 'live') return;
    const pointer = event as PointerEvent;
    if (pointer.button !== 0 || pointer.isPrimary === false) return;
    const origin = elementFromEvent(event);
    if (!origin || !scope.contains(origin) || origin.closest('[data-ally-ui]')) return;
    const modality = pointer.pointerType === 'touch' ? 'touch' : 'mouse';
    modalities.add(modality);
    counts.taps++;
    const direct = origin.closest<HTMLElement>(interactiveSelector);
    if (direct) {
      if (!eligible(direct)) return;
      const rect = direct.getBoundingClientRect();
      targetSizeTotal += Math.min(rect.width, rect.height);
      targetSizeSamples++;
      return;
    }
    let nearest = Number.POSITIVE_INFINITY;
    let nearestRect: DOMRect | null = null;
    for (const candidate of scope.querySelectorAll<HTMLElement>(interactiveSelector)) {
      const rect = eligible(candidate);
      if (!rect) continue;
      const dx = Math.max(rect.left - pointer.clientX, 0, pointer.clientX - rect.right);
      const dy = Math.max(rect.top - pointer.clientY, 0, pointer.clientY - rect.bottom);
      const distance = Math.hypot(dx, dy);
      if (distance < nearest) { nearest = distance; nearestRect = rect; }
    }
    if (nearest > 0 && nearest <= 24 && nearestRect) {
      counts.missTap++;
      targetSizeTotal += Math.min(nearestRect.width, nearestRect.height);
      targetSizeSamples++;
      maybeFast();
    }
  }

  function onClick(event: Event) {
    if (!active || paused || source !== 'live') return;
    const origin = elementFromEvent(event);
    if (!origin || !scope.contains(origin) || origin.closest('[data-ally-ui]')) return;
    const target = origin.closest<HTMLElement>(interactiveSelector);
    if (!target || !eligible(target)) return;
    const now = clock.now();
    if (clickTarget !== target || !clickTimes.length || now - clickTimes[clickTimes.length - 1] > 1000) {
      clickTarget = target;
      clickTimes = [];
      rageCounted = false;
    }
    clickTimes = [...clickTimes.filter((time) => now - time <= 1000), now];
    if (clickTimes.length >= 3 && !rageCounted) {
      counts.rageClick++;
      rageCounted = true;
      maybeFast();
    }
  }

  function onFocusIn(event: Event) {
    if (!active || paused || source !== 'live') return;
    const target = elementFromEvent(event);
    if (!target?.matches(fieldSelector) || !scope.contains(target) || target.closest('[data-ally-ui]')) return;
    focusedField = target;
    hesitationCounted = false;
    armFocusTimer();
  }

  function onFocusOut(event: Event) {
    if (elementFromEvent(event) !== focusedField) return;
    focusedField = null;
    clearFocusTimer();
  }

  function onInput(event: Event) {
    if (elementFromEvent(event) !== focusedField) return;
    armFocusTimer();
  }

  function onKeyDown(event: Event) {
    const target = elementFromEvent(event);
    if (active && !paused && target && scope.contains(target) && !target.closest('[data-ally-ui]')) {
      modalities.add('keyboard');
    }
  }

  function onWheel(event: Event) {
    const wheel = event as WheelEvent;
    const target = elementFromEvent(event);
    if (!active || paused || source !== 'live' || !wheel.ctrlKey || wheel.deltaY >= 0 || !target ||
        !scope.contains(target) || target.closest('[data-ally-ui]')) return;
    const now = clock.now();
    if (now >= wheelEpisodeUntil) counts.zoomEvent++;
    wheelEpisodeUntil = now + 500;
  }

  function onScale() {
    if (!active || paused || source !== 'live') return;
    const scale = win.visualViewport?.scale ?? 1;
    if (scale <= 1.01) scaleEpisode = false;
    else if (!scaleEpisode && scale > previousScale + 0.05) {
      if (clock.now() >= wheelEpisodeUntil) counts.zoomEvent++;
      scaleEpisode = true;
    }
    previousScale = scale;
  }

  function onVisibility() {
    paused = doc.hidden;
    clearFocusTimer();
    if (interval !== null) clearInterval(interval);
    interval = !paused && active ? setInterval(flush, 10000) : null;
    resetWindow(clock.now());
    if (!paused && focusedField) {
      hesitationCounted = false;
      armFocusTimer();
    }
  }

  function reportStep(step: string) {
    if (!active || paused || !config.steps.includes(step) || step === currentStep) return;
    const now = clock.now();
    const completedDuration = Math.max(0, now - stepStart);
    const backtrack = counts.backtrack +
      Number(config.steps.indexOf(step) < config.steps.indexOf(currentStep));
    currentStep = step;
    resetWindow(now);
    counts.backtrack = backtrack;
    stepDurations.push(completedDuration);
    seenErrors.clear();
  }

  function reportError({ field, category }: { field: string; category: string }) {
    if (!active || paused || !allowedFields.has(field) || !errorCategories.has(category)) return;
    const key = JSON.stringify([field, category]);
    if (seenErrors.has(key)) { counts.errorLoop++; maybeFast(); }
    else seenErrors.add(key);
  }

  function inject(signal: SimulatedSignal) {
    if (source !== 'simulation') throw new Error('Sensor injection is available only in simulation mode');
    if (!active || paused) return;
    if (signal.kind === 'step') return reportStep(signal.step);
    if (signal.kind === 'error') return reportError(signal);
    if (signal.modality) modalities.add(signal.modality);
    if (signal.kind === 'tap' || signal.kind === 'missTap') counts.taps++;
    if (signal.kind !== 'tap') counts[signal.kind]++;
    maybeFast();
  }

  return {
    start() {
      if (active) return;
      active = true;
      paused = doc.hidden;
      resetWindow(clock.now());
      doc.addEventListener('visibilitychange', onVisibility);
      if (source === 'live') {
        scope.addEventListener('pointerdown', onPointerDown);
        scope.addEventListener('click', onClick);
        scope.addEventListener('focusin', onFocusIn);
        scope.addEventListener('focusout', onFocusOut);
        scope.addEventListener('input', onInput);
        scope.addEventListener('keydown', onKeyDown);
        scope.addEventListener('wheel', onWheel);
        win.visualViewport?.addEventListener('resize', onScale);
      }
      if (!paused) interval = setInterval(flush, 10000);
    },
    stop() {
      if (!active) return;
      active = false;
      clearFocusTimer();
      if (interval !== null) clearInterval(interval);
      interval = null;
      doc.removeEventListener('visibilitychange', onVisibility);
      scope.removeEventListener('pointerdown', onPointerDown);
      scope.removeEventListener('click', onClick);
      scope.removeEventListener('focusin', onFocusIn);
      scope.removeEventListener('focusout', onFocusOut);
      scope.removeEventListener('input', onInput);
      scope.removeEventListener('keydown', onKeyDown);
      scope.removeEventListener('wheel', onWheel);
      win.visualViewport?.removeEventListener('resize', onScale);
      focusedField = null;
    },
    reportStep,
    reportError,
    beginObservation() {
      if (!active) return;
      resetWindow(clock.now());
      seenErrors.clear();
      hesitationCounted = false;
      armFocusTimer();
    },
    updateContext(context) {
      priorPreset = context.priorPreset;
      undoCount = context.undoCount;
    },
    inject,
  };
}
