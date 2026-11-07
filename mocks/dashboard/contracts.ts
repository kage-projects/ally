/**
 * Provisional dashboard contract v1.
 *
 * This file intentionally lives outside apps/demo and packages/ally-react while
 * the app scaffold and SDK bus are being built in parallel. The SDK should own
 * the final runtime contract in packages/ally-react/src/bus.ts.
 */

export const ALLY_BUS_VERSION = 1 as const;
export const ALLY_CHANNEL_NAME = "ally" as const;

export type InputModality = "touch" | "mouse" | "keyboard" | "mixed";
export type Preset = "motor" | "visual" | "cognitive" | "combined" | null;
export type DecisionSource = "rule" | "llm" | "fallback";
export type DecisionStatus =
  | "pending"
  | "applied"
  | "kept"
  | "undone"
  | "expired"
  | "fallback";

export type Profile = {
  motor: number;
  visual: number;
  cognitive: number;
};

export type FrictionSummary = {
  windowMs: number;
  viewport: { w: number; h: number; dpr: number };
  inputModality: InputModality;
  counts: {
    taps: number;
    missTap: number;
    rageClick: number;
    hesitation: number;
    backtrack: number;
    errorLoop: number;
    zoomEvent: number;
    scrollThrash: number;
    slowTargeting: number;
  };
  timings: {
    avgTargetSize: number;
    avgTimeToTarget: number;
    stepDurations: number[];
  };
  context: {
    step: string;
    priorPreset: Preset;
    undoCount: number;
  };
};

export type AdaptationPlan = {
  profile: Profile;
  tokens: {
    targetMinSize: number;
    spacingScale: number;
    fontScale: number;
    contrast: "normal" | "high";
    density: "compact" | "comfortable" | "spacious";
  };
  layout: {
    stepMode: "default" | "one-per-screen";
    hideNonEssential: Array<
      "promoBanner" | "recommendations" | "voucherCarousel" | "socialProof"
    >;
    primaryActionSticky: boolean;
    confirmDestructive: boolean;
  };
  assist: {
    inlineHints: boolean;
    voiceOffer: boolean;
  };
  confidence: number;
  explanation: string;
  ttlSeconds: number;
};

export type DecisionGuardrails = {
  schemaValid: boolean;
  policyClamped: boolean;
  lockedComponentsPreserved: boolean;
};

type EventBase<TType extends string, TPayload> = {
  version: typeof ALLY_BUS_VERSION;
  eventId: string;
  type: TType;
  at: number;
  payload: TPayload;
};

export type HeartbeatEvent = EventBase<
  "heartbeat",
  {
    step: string;
    inputModality: InputModality;
  }
>;

export type SummaryEvent = EventBase<
  "summary",
  {
    summary: FrictionSummary;
    profile: Profile;
    preset: Preset;
    confidence: number;
  }
>;

export type DecisionEvent = EventBase<
  "decision",
  {
    id: string;
    source: DecisionSource;
    preset: Preset;
    latencyMs: number;
    confidence: number;
    previousPlan: AdaptationPlan | null;
    plan: AdaptationPlan;
    explanation: string;
    guardrails: DecisionGuardrails;
  }
>;

export type AppliedEvent = EventBase<
  "applied",
  {
    decisionId: string;
  }
>;

export type KeepEvent = EventBase<
  "keep",
  {
    decisionId: string;
  }
>;

export type UndoEvent = EventBase<
  "undo",
  {
    decisionId: string;
  }
>;

export type ResetEvent = EventBase<"reset", Record<string, never>>;

export type AllyBusEvent =
  | HeartbeatEvent
  | SummaryEvent
  | DecisionEvent
  | AppliedEvent
  | KeepEvent
  | UndoEvent
  | ResetEvent;

export type EvaluationMetric = {
  unit: "percent" | "seconds" | "count";
  allyOff: { mean: number; standardDeviation: number };
  allyOn: { mean: number; standardDeviation: number };
  improvementPercent: number;
};

export type EvaluationResults = {
  schemaVersion: 1;
  isMock: boolean;
  label: string;
  scenario: string;
  generatedAt: string | null;
  sessionsPerVariant: number;
  metrics: {
    misTapRate: EvaluationMetric;
    timeToComplete: EvaluationMetric;
    errorLoops: EvaluationMetric;
    completionRate: EvaluationMetric;
  };
};