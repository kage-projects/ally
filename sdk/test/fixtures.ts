import type { AdaptationPlan, AllyPolicy, FrictionSummary } from '../src/schema.js';
import { DEFAULT_POLICY } from '../src/schema.js';

// Synthetic contract fixtures; they never represent real user activity.
export const emptySummary: FrictionSummary = {
  windowMs: 10000,
  viewport: { w: 390, h: 844, dpr: 2 },
  inputModality: 'touch',
  counts: {
    taps: 0, missTap: 0, rageClick: 0, hesitation: 0, backtrack: 0,
    errorLoop: 0, zoomEvent: 0, scrollThrash: 0, slowTargeting: 0,
  },
  timings: { avgTargetSize: 0, avgTimeToTarget: 0, stepDurations: [] },
  context: { step: 'cart', priorPreset: null, undoCount: 0 },
};

export const motorSummary: FrictionSummary = {
  ...emptySummary,
  counts: { ...emptySummary.counts, taps: 3, missTap: 3 },
};

export const combinedSummary: FrictionSummary = {
  ...motorSummary,
  counts: { ...motorSummary.counts, zoomEvent: 2, errorLoop: 1 },
};

export const strictPolicy: AllyPolicy = {
  ...DEFAULT_POLICY,
  limits: {
    targetMinSize: [44, 48],
    spacingScale: [1, 1.2],
    fontScale: [1, 1.2],
  },
  allowHide: ['recommendations'],
};

export const candidatePlan: AdaptationPlan = {
  profile: { motor: 0.75, visual: 0.6, cognitive: 0 },
  tokens: {
    targetMinSize: 80,
    spacingScale: 2.5,
    fontScale: 1.8,
    contrast: 'high',
    density: 'spacious',
  },
  layout: {
    stepMode: 'default',
    hideNonEssential: ['promoBanner', 'recommendations'],
    primaryActionSticky: true,
    confirmDestructive: false,
  },
  assist: { inlineHints: false, voiceOffer: true },
  confidence: 0.7,
  explanation: 'Tombol diperbesar agar lebih mudah ditekan.',
  ttlSeconds: 120,
};

export const invalidPlan = {
  ...candidatePlan,
  tokens: { ...candidatePlan.tokens, fontScale: Number.POSITIVE_INFINITY },
  html: '<script>unsafe</script>',
};
