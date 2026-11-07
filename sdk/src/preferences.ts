import { z } from 'zod';
import { guardPlan } from './guard.js';
import { createPreferenceStorage } from './preference-storage.js';
import type { PreferenceStorageAdapter } from './preference-storage.js';
import {
  AdaptationPlanSchema, AllyPolicySchema, AssistSchema, LayoutSchema,
  ModalitySchema, ProfileSchema, TokensSchema,
} from './schema.js';
import type {
  AdaptationPlan, AllyPolicy, FrictionSummary, PreferenceSummary, Preset, Profile,
} from './schema.js';
import type { SensorSnapshot } from './sensor.js';

const preset = z.enum(['motor', 'visual', 'cognitive', 'combined']);
const shortName = z.string().min(1).max(32).regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
const count = z.number().int().nonnegative();
const timestamp = z.number().int().nonnegative().finite();
const DAY_MS = 24 * 60 * 60 * 1000;
export const PREFERENCE_EXPIRY_MS = 7 * DAY_MS;
export const MAX_PREFERENCE_RECORDS = 20;

export const PreferenceContextSchema = z.strictObject({
  step: shortName,
  modality: ModalitySchema,
  preset,
  policyFingerprint: z.string().regex(/^[0-9a-f]{8}$/),
});

export const PreferenceChoiceSchema = z.strictObject({
  tokens: TokensSchema,
  layout: LayoutSchema,
  assist: AssistSchema,
});

export const PreferenceRecordSchema = z.strictObject({
  schemaVersion: z.literal(1),
  context: PreferenceContextSchema,
  choice: PreferenceChoiceSchema,
  keptCount: count,
  undoneCount: count,
  updatedAt: timestamp,
  expiresAt: timestamp,
}).refine((record) => record.expiresAt > record.updatedAt, 'Preference expiry must follow update');

const PreferenceEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  records: z.array(PreferenceRecordSchema).max(MAX_PREFERENCE_RECORDS),
});

export type PreferenceContext = z.infer<typeof PreferenceContextSchema>;
export type PreferenceChoice = z.infer<typeof PreferenceChoiceSchema>;
export type PreferenceRecord = z.infer<typeof PreferenceRecordSchema>;
export type Feedback = 'kept' | 'undone';

function choiceFromPlan(plan: AdaptationPlan): PreferenceChoice {
  return { tokens: plan.tokens, layout: plan.layout, assist: plan.assist };
}

function recordKey(context: PreferenceContext, choice: PreferenceChoice): string {
  return JSON.stringify([context, choice]);
}

// FNV-1a is a compact deterministic configuration fingerprint, not a user ID.
export function policyFingerprint(policy: AllyPolicy): string {
  const json = JSON.stringify(AllyPolicySchema.parse(policy));
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function localExplanation(reasonCodes: readonly string[]): string {
  if (reasonCodes.includes('miss_tap')) {
    return 'Pilihan tampilan sebelumnya digunakan karena beberapa ketukan meleset.';
  }
  if (reasonCodes.includes('zoom_event')) {
    return 'Pilihan tampilan sebelumnya digunakan karena tampilan diperbesar.';
  }
  if (reasonCodes.includes('backtrack')) {
    return 'Pilihan tampilan sebelumnya digunakan karena langkah dibuka kembali.';
  }
  return 'Pilihan tampilan sebelumnya digunakan karena sinyal friksi saat ini.';
}

export function planFromPreference(
  record: PreferenceRecord,
  profile: Profile,
  confidence: number,
  reasonCodes: readonly string[],
  policy: AllyPolicy,
): AdaptationPlan {
  const candidate = AdaptationPlanSchema.parse({
    profile: ProfileSchema.parse(profile), ...record.choice, confidence,
    explanation: localExplanation(reasonCodes), ttlSeconds: 120,
  });
  return guardPlan(candidate, policy).plan;
}

export class PreferenceStore {
  private records: PreferenceRecord[] = [];
  private readonly feedbackByDecision = new Map<number, { key: string; action: Feedback }>();
  private readonly adapter: PreferenceStorageAdapter;
  private readonly now: () => number;

  constructor(
    adapter: PreferenceStorageAdapter = createPreferenceStorage(),
    now: () => number = () => Date.now(),
  ) {
    this.adapter = adapter;
    this.now = now;
  }

  load(): void {
    const raw = this.adapter.load();
    if (raw === null) { this.records = []; return; }
    try {
      const parsed = PreferenceEnvelopeSchema.parse(JSON.parse(raw));
      this.records = parsed.records.filter((record) => record.expiresAt > this.now())
        .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_PREFERENCE_RECORDS);
      if (this.records.length !== parsed.records.length) this.persist();
    } catch {
      this.records = [];
      this.adapter.clear();
    }
  }

  private persist() {
    this.records = this.records.filter((record) => record.expiresAt > this.now())
      .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_PREFERENCE_RECORDS);
    this.adapter.save(JSON.stringify({ schemaVersion: 1, records: this.records }));
  }

  recordFeedback(
    decisionId: number,
    context: PreferenceContext,
    effectivePlan: AdaptationPlan,
    action: Feedback,
  ): boolean {
    const parsedContext = PreferenceContextSchema.parse(context);
    const choice = PreferenceChoiceSchema.parse(choiceFromPlan(AdaptationPlanSchema.parse(effectivePlan)));
    const previous = this.feedbackByDecision.get(decisionId);
    if (previous?.action === action) return false;
    const key = previous?.key ?? recordKey(parsedContext, choice);
    let record = this.records.find((item) => recordKey(item.context, item.choice) === key);
    if (!record) {
      record = PreferenceRecordSchema.parse({ schemaVersion: 1, context: parsedContext,
        choice, keptCount: 0, undoneCount: 0, updatedAt: this.now(),
        expiresAt: this.now() + PREFERENCE_EXPIRY_MS });
      this.records.push(record);
    }
    if (previous?.action === 'kept') record.keptCount = Math.max(0, record.keptCount - 1);
    if (previous?.action === 'undone') record.undoneCount = Math.max(0, record.undoneCount - 1);
    if (action === 'kept') record.keptCount++;
    else record.undoneCount++;
    record.updatedAt = this.now();
    record.expiresAt = this.now() + PREFERENCE_EXPIRY_MS;
    this.feedbackByDecision.set(decisionId, { key, action });
    this.persist();
    return true;
  }

  recordsFor(context: PreferenceContext): PreferenceRecord[] {
    const parsed = PreferenceContextSchema.parse(context);
    return this.records.filter((record) => record.expiresAt > this.now() &&
      record.context.step === parsed.step &&
      record.context.modality === parsed.modality &&
      record.context.preset === parsed.preset &&
      record.context.policyFingerprint === parsed.policyFingerprint)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  preferred(context: PreferenceContext): PreferenceRecord | null {
    return this.recordsFor(context).find((record) => record.keptCount > record.undoneCount) ?? null;
  }

  summaries(context: PreferenceContext, max = 3): PreferenceSummary[] {
    return this.recordsFor(context).slice(0, Math.min(max, 3)).map((record) => ({
      step: record.context.step,
      modality: record.context.modality,
      preset: record.context.preset,
      choice: record.choice,
      keptCount: record.keptCount,
      undoneCount: record.undoneCount,
      ageBucket: this.now() - record.updatedAt <= DAY_MS ? 'recent' : 'older',
    }));
  }

  reset(): void {
    this.records = [];
    this.feedbackByDecision.clear();
    this.adapter.clear();
  }

  count(): number { return this.recordsForAll().length; }
  recordsForAll(): PreferenceRecord[] {
    return this.records.filter((record) => record.expiresAt > this.now());
  }
}

export type OutcomeObservation =
  | { status: 'unknown'; reason: 'missing-window' | 'overlap' | 'context' |
      'duration' | 'samples' }
  | { status: 'measured'; beforeRate: number; afterRate: number;
      beforeTaps: number; afterTaps: number; delta: number };

export function compareOutcomeWindows(
  before: Pick<SensorSnapshot, 'windowId' | 'reason' | 'summary'> | null,
  after: Pick<SensorSnapshot, 'windowId' | 'reason' | 'summary'> | null,
): OutcomeObservation {
  if (!before || !after) return { status: 'unknown', reason: 'missing-window' };
  if (before.reason !== 'window' || after.reason !== 'window' ||
      before.windowId + 1 !== after.windowId) return { status: 'unknown', reason: 'overlap' };
  const a: FrictionSummary = before.summary;
  const b: FrictionSummary = after.summary;
  if (a.context.step !== b.context.step || a.inputModality !== b.inputModality) {
    return { status: 'unknown', reason: 'context' };
  }
  if (a.windowMs <= 0 || b.windowMs <= 0 || Math.abs(a.windowMs - b.windowMs) > 100) {
    return { status: 'unknown', reason: 'duration' };
  }
  if (a.counts.taps < 5 || b.counts.taps < 5) {
    return { status: 'unknown', reason: 'samples' };
  }
  const beforeRate = a.counts.missTap / a.counts.taps;
  const afterRate = b.counts.missTap / b.counts.taps;
  return { status: 'measured', beforeRate, afterRate,
    beforeTaps: a.counts.taps, afterTaps: b.counts.taps,
    delta: afterRate - beforeRate };
}
