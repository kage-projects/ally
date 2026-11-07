import type { AdaptationPlan } from "./types";

export type PlanChange = { label: string; value: string };

const COMPONENT_LABELS: Record<AdaptationPlan["layout"]["hideNonEssential"][number], string> = {
  promoBanner: "Promo banner",
  recommendations: "Recommendations",
  voucherCarousel: "Voucher carousel",
  socialProof: "Social proof",
};

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("-", " ");
}

/** Only report observed differences. An absent prior plan never implies defaults. */
export function getPlanDiff(previous: AdaptationPlan | null, plan: AdaptationPlan): PlanChange[] {
  const changes: PlanChange[] = [];
  function add<T>(label: string, before: T | undefined, after: T, render: (value: T) => string) {
    if (previous && JSON.stringify(before) === JSON.stringify(after)) return;
    changes.push({
      label,
      value: previous && before !== undefined
        ? `${render(before)} → ${render(after)}`
        : `${render(after)} (previous not recorded)`,
    });
  }
  const onOff = (value: boolean) => value ? "On" : "Off";
  add("Target size", previous?.tokens.targetMinSize, plan.tokens.targetMinSize, (value) => `${value}px`);
  add("Spacing", previous?.tokens.spacingScale, plan.tokens.spacingScale, (value) => `${value}×`);
  add("Font scale", previous?.tokens.fontScale, plan.tokens.fontScale, (value) => `${value}×`);
  add("Contrast", previous?.tokens.contrast, plan.tokens.contrast, humanize);
  add("Density", previous?.tokens.density, plan.tokens.density, humanize);
  add("Step mode", previous?.layout.stepMode, plan.layout.stepMode, humanize);
  add("Hidden content", previous ? [...previous.layout.hideNonEssential].sort() : undefined,
    [...plan.layout.hideNonEssential].sort(), (values) => values.length
      ? values.map((value) => COMPONENT_LABELS[value]).join(", ") : "None");
  add("Sticky action", previous?.layout.primaryActionSticky, plan.layout.primaryActionSticky, onOff);
  add("Confirm destructive actions", previous?.layout.confirmDestructive, plan.layout.confirmDestructive, onOff);
  add("Inline hints", previous?.assist.inlineHints, plan.assist.inlineHints, onOff);
  add("Voice assistance offer", previous?.assist.voiceOffer, plan.assist.voiceOffer, onOff);
  return changes;
}
