import { AdaptationPlanSchema, AllyPolicySchema } from './schema.js';
import type { AdaptationPlan, AllyPolicy } from './schema.js';

export type GuardCorrection =
  | 'targetMinSize'
  | 'spacingScale'
  | 'fontScale'
  | 'hideNonEssential'
  | 'primaryActionSticky'
  | 'confirmDestructive'
  | 'voiceOffer';

export interface GuardResult {
  plan: AdaptationPlan;
  corrections: GuardCorrection[];
}

function clamp(value: number, [min, max]: [number, number]): number {
  return Math.max(min, Math.min(max, value));
}

export function guardPlan(
  candidate: unknown,
  merchantPolicy: unknown,
): GuardResult {
  const policy: AllyPolicy = AllyPolicySchema.parse(merchantPolicy);
  const plan: AdaptationPlan = AdaptationPlanSchema.parse(candidate);
  const corrections: GuardCorrection[] = [];
  const allowed = new Set(policy.allowHide);
  const hidden = [...new Set(plan.layout.hideNonEssential)].filter((name) => allowed.has(name));
  if (hidden.length !== plan.layout.hideNonEssential.length) corrections.push('hideNonEssential');

  const targetBounds: [number, number] = [
    Math.ceil(policy.limits.targetMinSize[0]),
    Math.floor(policy.limits.targetMinSize[1]),
  ];
  if (targetBounds[0] > targetBounds[1]) {
    throw new Error('Policy has no valid integer target size');
  }
  const targetMinSize = clamp(plan.tokens.targetMinSize, targetBounds);
  const spacingScale = clamp(plan.tokens.spacingScale, policy.limits.spacingScale);
  const fontScale = clamp(plan.tokens.fontScale, policy.limits.fontScale);
  if (targetMinSize !== plan.tokens.targetMinSize) corrections.push('targetMinSize');
  if (spacingScale !== plan.tokens.spacingScale) corrections.push('spacingScale');
  if (fontScale !== plan.tokens.fontScale) corrections.push('fontScale');

  const paymentLocked = policy.lockedComponents.includes('payButton');
  // DOM safety for a sticky primaryAction is checked by the browser applier.
  const primaryActionSticky = plan.layout.primaryActionSticky;
  const confirmDestructive = paymentLocked ? true : plan.layout.confirmDestructive;
  if (primaryActionSticky !== plan.layout.primaryActionSticky) corrections.push('primaryActionSticky');
  if (confirmDestructive !== plan.layout.confirmDestructive) corrections.push('confirmDestructive');
  if (plan.assist.voiceOffer) corrections.push('voiceOffer');

  return {
    plan: {
      ...plan,
      tokens: { ...plan.tokens, targetMinSize, spacingScale, fontScale },
      layout: { ...plan.layout, hideNonEssential: hidden, primaryActionSticky, confirmDestructive },
      assist: { ...plan.assist, voiceOffer: false },
    },
    corrections,
  };
}
