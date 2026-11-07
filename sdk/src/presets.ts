import { guardPlan } from './guard.js';
import type { GuardResult } from './guard.js';
import type { AdaptationPlan, AllyPolicy, Profile } from './schema.js';

export type SinglePreset = 'motor' | 'visual' | 'cognitive';

const templates: Record<SinglePreset, Pick<AdaptationPlan, 'tokens' | 'layout' | 'assist' | 'explanation'>> = {
  motor: {
    tokens: { targetMinSize: 56, spacingScale: 1.5, fontScale: 1,
      contrast: 'normal', density: 'spacious' },
    layout: { stepMode: 'default', hideNonEssential: [], primaryActionSticky: true,
      confirmDestructive: true },
    assist: { inlineHints: false, voiceOffer: false },
    explanation: 'Target interaktif diperbesar agar lebih mudah digunakan.',
  },
  visual: {
    tokens: { targetMinSize: 48, spacingScale: 1.25, fontScale: 1.35,
      contrast: 'high', density: 'comfortable' },
    layout: { stepMode: 'default', hideNonEssential: ['promoBanner', 'recommendations'],
      primaryActionSticky: false, confirmDestructive: true },
    assist: { inlineHints: false, voiceOffer: false },
    explanation: 'Teks dan kontras disesuaikan agar lebih mudah dilihat.',
  },
  cognitive: {
    tokens: { targetMinSize: 48, spacingScale: 1.25, fontScale: 1.1,
      contrast: 'normal', density: 'comfortable' },
    layout: { stepMode: 'one-per-screen',
      hideNonEssential: ['promoBanner', 'recommendations', 'voucherCarousel', 'socialProof'],
      primaryActionSticky: false, confirmDestructive: true },
    assist: { inlineHints: true, voiceOffer: false },
    explanation: 'Langkah dan petunjuk disederhanakan agar lebih mudah diikuti.',
  },
};

const explanations: Partial<Record<string, string>> = {
  miss_tap: 'Target interaktif diperbesar karena beberapa ketukan meleset.',
  rage_click: 'Target interaktif diperbesar karena klik berulang pada tombol yang sama.',
  zoom_event: 'Teks dan kontras disesuaikan karena tampilan beberapa kali diperbesar.',
  error_loop: 'Teks dan petunjuk disesuaikan karena kesalahan berulang.',
  hesitation: 'Langkah dan petunjuk disederhanakan karena ada jeda saat mengisi.',
  backtrack: 'Langkah dan petunjuk disederhanakan karena langkah sebelumnya dibuka kembali.',
};

export function createPresetPlan(
  preset: SinglePreset,
  profile: Profile,
  confidence: number,
  policy: AllyPolicy,
  reasonCodes: string[] = [],
): GuardResult {
  const explanation = reasonCodes.map((code) => explanations[code]).find(Boolean)
    ?? templates[preset].explanation;
  const candidate: AdaptationPlan = {
    profile,
    ...templates[preset],
    explanation,
    confidence,
    ttlSeconds: 120,
  };
  return guardPlan(candidate, policy);
}
