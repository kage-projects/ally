import { ALLY_BUS_VERSION } from "../../../contracts/dashboard";
import type { AllyBusEvent } from "./types";

type RecordValue = Record<string, unknown>;

function shape(value: unknown, keys: string[]): value is RecordValue {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function text(value: unknown, maxLength = 128): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function number(value: unknown, min = 0): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min;
}

function count(value: unknown): value is number {
  return number(value) && Number.isSafeInteger(value);
}

function score(value: unknown): value is number {
  return number(value) && value <= 1;
}

function oneOf(value: unknown, values: readonly unknown[]): boolean {
  return values.includes(value);
}

function profile(value: unknown): boolean {
  return shape(value, ["motor", "visual", "cognitive"]) &&
    Object.values(value).every(score);
}

function modality(value: unknown): boolean {
  return oneOf(value, ["touch", "mouse", "keyboard", "mixed"]);
}

function preset(value: unknown): boolean {
  return oneOf(value, [null, "motor", "visual", "cognitive", "combined"]);
}

function summary(value: unknown): boolean {
  if (!shape(value, ["windowMs", "viewport", "inputModality", "counts", "timings", "context"])) return false;
  const { viewport, counts, timings, context } = value;
  return number(value.windowMs, 1) && modality(value.inputModality) &&
    shape(viewport, ["w", "h", "dpr"]) && Object.values(viewport).every((v) => number(v, Number.MIN_VALUE)) &&
    shape(counts, ["taps", "missTap", "rageClick", "hesitation", "backtrack", "errorLoop", "zoomEvent", "scrollThrash", "slowTargeting"]) &&
    Object.values(counts).every(count) &&
    shape(timings, ["avgTargetSize", "avgTimeToTarget", "stepDurations"]) &&
    number(timings.avgTargetSize) && number(timings.avgTimeToTarget) &&
    Array.isArray(timings.stepDurations) && timings.stepDurations.length <= 100 &&
    timings.stepDurations.every((v) => number(v)) &&
    shape(context, ["step", "priorPreset", "undoCount"]) &&
    text(context.step, 80) && preset(context.priorPreset) && count(context.undoCount);
}

function plan(value: unknown): boolean {
  if (!shape(value, ["profile", "tokens", "layout", "assist", "confidence", "explanation", "ttlSeconds"])) return false;
  const { tokens, layout, assist } = value;
  return profile(value.profile) && score(value.confidence) &&
    text(value.explanation, 2000) && count(value.ttlSeconds) && value.ttlSeconds > 0 &&
    shape(tokens, ["targetMinSize", "spacingScale", "fontScale", "contrast", "density"]) &&
    number(tokens.targetMinSize, Number.MIN_VALUE) && number(tokens.spacingScale, Number.MIN_VALUE) &&
    number(tokens.fontScale, Number.MIN_VALUE) && oneOf(tokens.contrast, ["normal", "high"]) &&
    oneOf(tokens.density, ["compact", "comfortable", "spacious"]) &&
    shape(layout, ["stepMode", "hideNonEssential", "primaryActionSticky", "confirmDestructive"]) &&
    oneOf(layout.stepMode, ["default", "one-per-screen"]) &&
    Array.isArray(layout.hideNonEssential) && layout.hideNonEssential.length <= 4 &&
    layout.hideNonEssential.every((v) => oneOf(v, ["promoBanner", "recommendations", "voucherCarousel", "socialProof"])) &&
    typeof layout.primaryActionSticky === "boolean" && typeof layout.confirmDestructive === "boolean" &&
    shape(assist, ["inlineHints", "voiceOffer"]) && Object.values(assist).every((v) => typeof v === "boolean");
}

/** Validate v1 at the transport boundary. Extra fields are rejected, never stored. */
export function parseAllyBusEvent(value: unknown): AllyBusEvent | null {
  if (!shape(value, ["version", "eventId", "type", "at", "payload"]) ||
    value.version !== ALLY_BUS_VERSION || !text(value.eventId) ||
    !count(value.at) || value.at > 8_640_000_000_000_000) return null;

  const { payload } = value;
  let valid = false;
  switch (value.type) {
    case "heartbeat":
      valid = shape(payload, ["step", "inputModality"]) && text(payload.step, 80) && modality(payload.inputModality);
      break;
    case "summary":
      valid = shape(payload, ["summary", "profile", "preset", "confidence"]) &&
        summary(payload.summary) && profile(payload.profile) && preset(payload.preset) && score(payload.confidence);
      break;
    case "decision":
      valid = shape(payload, ["id", "source", "preset", "latencyMs", "confidence", "previousPlan", "plan", "explanation", "guardrails"]) &&
        text(payload.id) && oneOf(payload.source, ["rule", "llm", "fallback"]) && preset(payload.preset) &&
        number(payload.latencyMs) && score(payload.confidence) &&
        (payload.previousPlan === null || plan(payload.previousPlan)) && plan(payload.plan) &&
        text(payload.explanation, 2000) &&
        shape(payload.guardrails, ["schemaValid", "policyClamped", "lockedComponentsPreserved"]) &&
        Object.values(payload.guardrails).every((v) => typeof v === "boolean");
      break;
    case "applied":
    case "keep":
    case "undo":
      valid = shape(payload, ["decisionId"]) && text(payload.decisionId);
      break;
    case "reset":
      valid = shape(payload, []);
      break;
  }
  return valid ? value as AllyBusEvent : null;
}
