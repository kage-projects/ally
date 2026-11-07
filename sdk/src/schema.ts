import { z } from 'zod';

const boundedScore = z.number().finite().min(0).max(1);
const nonnegative = z.number().finite().nonnegative();
const count = z.number().int().nonnegative();
const shortName = z.string().min(1).max(32).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/);

export const PresetSchema = z.enum(['motor', 'visual', 'cognitive', 'combined']).nullable();
export const ModalitySchema = z.enum(['touch', 'mouse', 'keyboard', 'mixed']);
export const HideableSchema = z.enum([
  'promoBanner',
  'recommendations',
  'voucherCarousel',
  'socialProof',
]);
export const LockedComponentSchema = z.enum([
  'price',
  'legalText',
  'totalAmount',
  'payButton',
]);

export const FrictionSummarySchema = z.strictObject({
  windowMs: nonnegative,
  viewport: z.strictObject({
    w: nonnegative,
    h: nonnegative,
    dpr: nonnegative,
  }),
  inputModality: ModalitySchema,
  counts: z.strictObject({
    taps: count,
    missTap: count,
    rageClick: count,
    hesitation: count,
    backtrack: count,
    errorLoop: count,
    zoomEvent: count,
    scrollThrash: count,
    slowTargeting: count,
  }),
  timings: z.strictObject({
    avgTargetSize: nonnegative,
    avgTimeToTarget: nonnegative,
    stepDurations: z.array(nonnegative),
  }),
  context: z.strictObject({
    step: shortName,
    priorPreset: PresetSchema,
    undoCount: count,
  }),
});

export const ProfileSchema = z.strictObject({
  motor: boundedScore,
  visual: boundedScore,
  cognitive: boundedScore,
});

export const TokensSchema = z.strictObject({
  targetMinSize: z.number().int().finite(),
  spacingScale: z.number().finite(),
  fontScale: z.number().finite(),
  contrast: z.enum(['normal', 'high']),
  density: z.enum(['compact', 'comfortable', 'spacious']),
});

export const LayoutSchema = z.strictObject({
  stepMode: z.enum(['default', 'one-per-screen']),
  hideNonEssential: z.array(HideableSchema),
  primaryActionSticky: z.boolean(),
  confirmDestructive: z.boolean(),
});

export const AssistSchema = z.strictObject({
  inlineHints: z.boolean(),
  voiceOffer: z.boolean(),
});

export const AdaptationPlanSchema = z.strictObject({
  profile: ProfileSchema,
  tokens: TokensSchema,
  layout: LayoutSchema,
  assist: AssistSchema,
  confidence: boundedScore,
  explanation: z.string().min(1).max(240),
  ttlSeconds: z.number().int().min(60).max(300),
});

const range = z.tuple([z.number().finite(), z.number().finite()])
  .refine(([min, max]) => min <= max, 'Range minimum exceeds maximum');

export const AllyPolicySchema = z.strictObject({
  limits: z.strictObject({
    targetMinSize: range.refine(
      ([min, max]) => Math.ceil(min) <= Math.floor(max),
      'Target size range contains no integer',
    ),
    spacingScale: range,
    fontScale: range,
  }),
  lockedComponents: z.array(LockedComponentSchema),
  allowHide: z.array(HideableSchema),
  llm: z.strictObject({
    enabled: z.boolean(),
    model: z.string().min(1).max(80),
    timeoutMs: z.number().int().positive().max(30000),
  }),
  thresholds: z.strictObject({
    apply: boundedScore,
    llm: boundedScore,
  }),
});

export const PreferenceSummarySchema = z.strictObject({
  step: shortName,
  modality: ModalitySchema,
  preset: PresetSchema,
  choice: z.strictObject({
    tokens: TokensSchema,
    layout: LayoutSchema,
    assist: AssistSchema,
  }),
  keptCount: count,
  undoneCount: count,
  ageBucket: z.enum(['recent', 'older']),
});

export const DecisionInputSchema = z.strictObject({
  schemaVersion: z.literal(1),
  summary: FrictionSummarySchema,
  profile: ProfileSchema,
  policy: AllyPolicySchema,
  preferences: z.array(PreferenceSummarySchema).max(3),
});

export type FrictionSummary = z.infer<typeof FrictionSummarySchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Preset = z.infer<typeof PresetSchema>;
export type AdaptationPlan = z.infer<typeof AdaptationPlanSchema>;
export type AllyPolicy = z.infer<typeof AllyPolicySchema>;
export type DecisionInput = z.infer<typeof DecisionInputSchema>;
export type PreferenceSummary = z.infer<typeof PreferenceSummarySchema>;

export const DEFAULT_POLICY: AllyPolicy = {
  limits: {
    targetMinSize: [44, 72],
    spacingScale: [1, 2],
    fontScale: [1, 1.6],
  },
  lockedComponents: ['price', 'legalText', 'totalAmount', 'payButton'],
  allowHide: ['promoBanner', 'recommendations', 'voucherCarousel', 'socialProof'],
  llm: { enabled: false, model: 'configured-on-host', timeoutMs: 1500 },
  thresholds: { apply: 0.6, llm: 0.2 },
};

// OpenAI Structured Outputs expects the root schema object, not the draft URI.
const { $schema: _draft, ...plannerSchema } = z.toJSONSchema(AdaptationPlanSchema);
export const AdaptationPlanJsonSchema = plannerSchema;
