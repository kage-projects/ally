import { createApplier, captureScope } from './applier.js';
import type { ApplyResult, ScopeSnapshot } from './applier.js';
import { guardPlan } from './guard.js';
import { createHighlighter } from './highlight.js';
import { PlannerClient } from './engine-client.js';
import { buildDecisionInput } from './planner-contract.js';
import { createPreferenceStorage } from './preference-storage.js';
import {
  PreferenceContextSchema, PreferenceStore, compareOutcomeWindows,
  planFromPreference, policyFingerprint,
} from './preferences.js';
import type { OutcomeObservation, PreferenceContext } from './preferences.js';
import { decideRule } from './rules.js';
import { AllyPolicySchema } from './schema.js';
import type { AdaptationPlan, AllyPolicy, FrictionSummary, Preset, Profile } from './schema.js';
import { createSensor, systemClock } from './sensor.js';
import type { Sensor, SensorSnapshot } from './sensor.js';
import { transitionStatus } from './state.js';
import type { AllyConfig, AllyDecisionEvent, AllyStatus, DecisionSource, PlannerStatus } from './types.js';

export interface RuntimeView {
  plan: AdaptationPlan | null;
  profile: Profile | null;
  summary: FrictionSummary | null;
  explanation: string | null;
  status: AllyStatus;
  plannerStatus: PlannerStatus;
  toastVisible: boolean;
  helpVisible: boolean;
  outcome: OutcomeObservation | null;
}

export interface CandidateRequest {
  plan: unknown;
  source: DecisionSource;
  preset: Preset;
  reasonCodes: string[];
  contextEpoch?: number;
  modality?: FrictionSummary['inputModality'];
  beforeWindow?: SensorSnapshot | null;
}

interface PendingCandidate {
  request: CandidateRequest;
  plan: AdaptationPlan;
  epoch: number;
  expiresAt: number;
  signature: string;
  deferred: boolean;
}

interface ActiveDecision {
  decisionId: number;
  context: PreferenceContext | null;
  beforeWindow: SensorSnapshot | null;
  requested: AdaptationPlan;
  result: ApplyResult;
  source: DecisionSource;
  preset: Preset;
  reasonCodes: string[];
  signature: string;
  kept: boolean;
}

export function initialRuntimeView(policy: unknown, enabled = true): RuntimeView {
  return { plan: null, profile: null, summary: null, explanation: null,
    status: enabled && AllyPolicySchema.safeParse(policy).success ? 'observing' : 'disabled',
    plannerStatus: 'idle', toastVisible: false, helpVisible: false, outcome: null };
}

export class AllyRuntime {
  private readonly scope: HTMLElement;
  private readonly config: AllyConfig;
  private onUpdate: (view: RuntimeView) => void;
  private onDecision?: (event: AllyDecisionEvent) => void;
  private readonly applier: ReturnType<typeof createApplier>;
  private readonly highlighter: ReturnType<typeof createHighlighter>;
  private readonly planner = new PlannerClient();
  private preferences: PreferenceStore | null = null;
  private decisionCounter = 0;
  private plannerBusy = false;
  private plannerSerial = 0;
  private sensor: Sensor | null = null;
  private policy: AllyPolicy | null;
  private enabled: boolean;
  private alive = false;
  private view: RuntimeView;
  private active: ActiveDecision | null = null;
  private baseline: ScopeSnapshot | null = null;
  private pending: PendingCandidate | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private ttlTimer: ReturnType<typeof setTimeout> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private blurTimer: ReturnType<typeof setTimeout> | null = null;
  private restoreOnBlur = false;
  private composing = false;
  private epoch = 0;
  private step: string;
  private lastAppliedAt = Number.NEGATIVE_INFINITY;
  private undoBoost = 0;
  private undoCount = 0;
  private rejected = new Map<string, number>();
  private latestWindowId = -1;
  private keptWindowId = -1;

  private preferenceContext(preset: Preset, modality: FrictionSummary['inputModality']): PreferenceContext | null {
    if (!this.policy || preset === null) return null;
    const parsed = PreferenceContextSchema.safeParse({ step: this.step,
      modality, preset, policyFingerprint: policyFingerprint(this.policy) });
    return parsed.success ? parsed.data : null;
  }

  constructor(
    scope: HTMLElement,
    policy: unknown,
    config: AllyConfig,
    onUpdate: (view: RuntimeView) => void,
    onDecision?: (event: AllyDecisionEvent) => void,
  ) {
    this.scope = scope;
    this.config = config;
    this.onUpdate = onUpdate;
    this.onDecision = onDecision;
    this.enabled = config.enabled !== false;
    const parsed = AllyPolicySchema.safeParse(policy);
    this.policy = parsed.success ? parsed.data : null;
    this.view = initialRuntimeView(policy, this.enabled);
    this.step = config.steps[0] ?? 'unknown';
    this.applier = createApplier(scope, (result) => this.correctActive(result));
    this.highlighter = createHighlighter(scope);
    if (!parsed.success) console.error('Ally integration: invalid policy');
  }

  private publish() { if (this.alive) this.onUpdate({ ...this.view }); }

  private log(action: AllyDecisionEvent['action'], active: ActiveDecision) {
    try {
      this.onDecision?.({ action, source: active.source, plan: active.result.plan,
        corrections: active.result.corrections, reasonCodes: active.reasonCodes,
        preset: active.preset });
    } catch {
      console.error('Ally integration: onDecision callback failed');
    }
  }

  private clearPending() {
    this.pending = null;
    if (this.pendingTimer !== null) clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
    if (this.view.status === 'pending') {
      this.view.status = this.active ? (this.active.kept ? 'kept' : 'applied') : 'observing';
    }
  }

  private clearTtl() {
    if (this.ttlTimer !== null) clearTimeout(this.ttlTimer);
    this.ttlTimer = null;
    this.restoreOnBlur = false;
  }

  private clearToast() {
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toastTimer = null;
    this.view.toastVisible = false;
  }

  private cancelPlanner(clearCache = false) {
    this.plannerSerial++;
    this.plannerBusy = false;
    this.planner.abort();
    if (clearCache) this.planner.clearCache();
    this.view.plannerStatus = 'idle';
  }

  private startPlanner(
    snapshot: SensorSnapshot,
    profile: Profile,
    policy: AllyPolicy,
    preset: Preset,
    reasonCodes: string[],
  ) {
    if (this.plannerBusy || !this.alive || !this.enabled || !this.policy) return;
    let input;
    try {
      const context = this.preferenceContext(preset, snapshot.summary.inputModality);
      const preferences = context ? this.preferences?.summaries(context, 3) ?? [] : [];
      input = buildDecisionInput(snapshot.summary, profile, policy, preferences, this.config.steps);
    } catch {
      this.view.plannerStatus = 'fallback';
      this.publish();
      return;
    }
    const epoch = this.epoch;
    const serial = ++this.plannerSerial;
    const previousStatus = this.view.plannerStatus;
    this.plannerBusy = true;
    this.view.plannerStatus = 'loading';
    this.publish();
    void this.planner.plan(this.config.endpoint ?? '/api/ally/plan', input, snapshot.windowId)
      .then((outcome) => {
        if (serial !== this.plannerSerial || epoch !== this.epoch ||
            !this.alive || !this.enabled || !this.policy) return;
        this.plannerBusy = false;
        if (outcome.kind === 'skipped') {
          this.view.plannerStatus = previousStatus;
        } else if (outcome.kind === 'error') {
          this.view.plannerStatus = outcome.reason === 'aborted' ? 'idle' : 'fallback';
        } else {
          this.view.plannerStatus = 'idle';
          if (outcome.kind === 'plan') {
            this.acceptCandidate({ plan: outcome.plan, source: outcome.source,
              preset, reasonCodes, contextEpoch: epoch,
              modality: snapshot.summary.inputModality, beforeWindow: snapshot });
          }
        }
        this.publish();
      }).catch(() => {
        if (serial !== this.plannerSerial || epoch !== this.epoch || !this.alive) return;
        this.plannerBusy = false;
        this.view.plannerStatus = 'fallback';
        this.publish();
      });
  }

  private showToast() {
    this.clearToast();
    this.view.toastVisible = true;
    this.toastTimer = setTimeout(() => {
      this.toastTimer = null;
      this.view.toastVisible = false;
      this.publish();
    }, 8000);
  }

  private signature(plan: AdaptationPlan): string {
    return JSON.stringify([this.step, plan.tokens, plan.layout, plan.assist]);
  }

  private unsafeFocus(plan?: AdaptationPlan): boolean {
    if (this.composing) return true;
    const focused = this.scope.ownerDocument.activeElement;
    if (!focused || !this.scope.contains(focused)) return false;
    if (focused.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ||
        focused.closest('[contenteditable]:not([contenteditable="false"])')) return true;
    if (!plan) return false;
    return plan.layout.hideNonEssential.some((name) => [...this.scope.querySelectorAll(
      `[data-ally-optional="${name}"]`,
    )].some((target) => target === focused || target.contains(focused)));
  }

  private scheduleAfterBlur() {
    if (this.blurTimer !== null) clearTimeout(this.blurTimer);
    this.blurTimer = setTimeout(() => {
      this.blurTimer = null;
      if (!this.alive || !this.enabled) return;
      if (this.restoreOnBlur && !this.unsafeFocus()) {
        this.restoreTransaction('expired');
      } else {
        this.tryPending();
        if (this.active && !this.pending) {
          const before = JSON.stringify(this.active.result);
          const next = this.applier.reconcile();
          if (next && JSON.stringify(next) !== before) this.correctActive(next);
        }
      }
    }, 0);
  }

  private onBlur = () => this.scheduleAfterBlur();
  private onCompositionStart = () => { this.composing = true; };
  private onCompositionEnd = () => { this.composing = false; this.scheduleAfterBlur(); };

  private makeSensor() {
    if (this.sensor || !this.policy || !this.enabled) return;
    try {
      this.sensor = createSensor(this.scope, systemClock,
        (snapshot) => this.ingest(snapshot), {
          steps: this.config.steps,
          allowedFields: this.config.allowedFields,
          errorCategories: this.config.errorCategories,
          undoCount: this.undoCount,
          priorPreset: this.active?.preset ?? null,
        });
      this.sensor.start();
    } catch {
      this.policy = null;
      this.view.status = 'disabled';
      console.error('Ally integration: invalid sensor configuration');
    }
  }

  start() {
    if (this.alive) return;
    this.alive = true;
    this.preferences = new PreferenceStore(createPreferenceStorage(
      this.config.persistence ?? 'memory', this.config.storageKey ?? 'ally:pref:v1',
      () => {
        try { return this.scope.ownerDocument.defaultView?.localStorage ?? null; }
        catch { return null; }
      },
    ));
    this.preferences.load();
    this.scope.addEventListener('focusout', this.onBlur);
    this.scope.addEventListener('compositionstart', this.onCompositionStart);
    this.scope.addEventListener('compositionend', this.onCompositionEnd);
    this.makeSensor();
    this.publish();
  }

  stop() {
    if (!this.alive) return;
    this.epoch++;
    this.alive = false;
    this.sensor?.stop();
    this.sensor = null;
    this.cancelPlanner(true);
    this.clearPending();
    this.clearTtl();
    this.clearToast();
    if (this.blurTimer !== null) clearTimeout(this.blurTimer);
    this.blurTimer = null;
    this.scope.removeEventListener('focusout', this.onBlur);
    this.scope.removeEventListener('compositionstart', this.onCompositionStart);
    this.scope.removeEventListener('compositionend', this.onCompositionEnd);
    this.applier.destroy();
    this.highlighter.clear();
  }

  setDecisionCallback(callback?: (event: AllyDecisionEvent) => void) {
    this.onDecision = callback;
  }

  getView(): RuntimeView { return { ...this.view }; }
  getEpoch(): number { return this.epoch; }

  ingest(snapshot: SensorSnapshot) {
    if (!this.alive || !this.enabled || !this.policy || snapshot.source !== 'live') return;
    if (snapshot.summary.context.step !== this.step) return;
    this.latestWindowId = snapshot.windowId;
    if (this.active?.beforeWindow && snapshot.reason === 'window' &&
        snapshot.windowId > this.active.beforeWindow.windowId) {
      this.view.outcome = compareOutcomeWindows(this.active.beforeWindow, snapshot);
      this.active.beforeWindow = null;
    }
    const effectivePolicy: AllyPolicy = {
      ...this.policy,
      thresholds: { ...this.policy.thresholds,
        apply: Math.min(1, this.policy.thresholds.apply + this.undoBoost) },
    };
    const decision = decideRule(snapshot.summary, effectivePolicy);
    this.view.summary = snapshot.summary;
    this.view.profile = decision.profile;
    this.publish();
    if (this.active?.kept && snapshot.windowId <= this.keptWindowId) return;
    const context = this.preferenceContext(decision.preset, snapshot.summary.inputModality);
    const preferred = decision.kind === 'none' || !context
      ? null : this.preferences?.preferred(context) ?? null;
    let reused = false;
    if (preferred) {
      try {
        const plan = planFromPreference(preferred, decision.profile, decision.confidence,
          decision.reasonCodes, this.policy);
        reused = this.acceptCandidate({ plan, source: 'rule', preset: decision.preset,
          reasonCodes: [...decision.reasonCodes, 'preference_reuse'],
          modality: snapshot.summary.inputModality,
          beforeWindow: snapshot });
      } catch { /* The current policy and rule remain authoritative. */ }
    }
    if (!reused && decision.candidate) {
      this.acceptCandidate({ plan: decision.candidate.plan, source: 'rule',
        preset: decision.preset, reasonCodes: decision.reasonCodes,
        modality: snapshot.summary.inputModality,
        beforeWindow: snapshot });
    }
    if (!reused && decision.requestPlanner) {
      this.startPlanner(snapshot, decision.profile, effectivePolicy,
        decision.preset, decision.reasonCodes);
    }
  }

  acceptCandidate(request: CandidateRequest): boolean {
    if (!this.alive || !this.enabled || !this.policy ||
        (request.contextEpoch !== undefined && request.contextEpoch !== this.epoch)) return false;
    const afterKeep = this.active?.kept === true;
    // A kept appearance stays active, but only new observations may reopen help.
    if (afterKeep && (!request.beforeWindow || request.beforeWindow.windowId <= this.keptWindowId)) return false;
    let plan: AdaptationPlan;
    try { plan = guardPlan(request.plan, this.policy).plan; }
    catch { return false; }
    const signature = this.signature(plan);
    if ((!afterKeep && this.active?.signature === signature) || (this.rejected.get(signature) ?? 0) > Date.now()) return false;
    if (!afterKeep && Date.now() - this.lastAppliedAt < 10000 && request.source !== 'llm') return false;
    const expiresAt = Date.now() + plan.ttlSeconds * 1000;
    const pending: PendingCandidate = { request, plan, epoch: this.epoch,
      expiresAt, signature, deferred: false };
    if (this.unsafeFocus(plan)) {
      pending.deferred = true;
      this.clearPending();
      this.pending = pending;
      this.view.status = transitionStatus(this.view.status, 'defer');
      this.pendingTimer = setTimeout(() => {
        if (this.pending !== pending) return;
        this.clearPending();
        this.publish();
      }, plan.ttlSeconds * 1000);
      this.publish();
      return true;
    }
    return this.applyCandidate(pending);
  }

  private tryPending() {
    const pending = this.pending;
    if (!pending || !this.policy) return;
    if (pending.epoch !== this.epoch || Date.now() >= pending.expiresAt) {
      this.clearPending();
      this.publish();
      return;
    }
    if (this.unsafeFocus(pending.plan)) return;
    this.applyCandidate(pending);
  }

  private applyCandidate(pending: PendingCandidate): boolean {
    if (!this.policy || pending.epoch !== this.epoch || Date.now() >= pending.expiresAt) return false;
    this.clearPending();
    this.clearTtl();
    if (!this.active || this.active.kept) this.baseline = captureScope(this.scope);
    const beforeStyles = this.highlighter.capture();
    const result = this.applier.apply(pending.plan, this.policy);
    this.active = {
      decisionId: ++this.decisionCounter,
      context: this.preferenceContext(pending.request.preset,
        pending.request.modality ?? this.view.summary?.inputModality ?? 'mouse'),
      beforeWindow: pending.deferred ? null : pending.request.beforeWindow ?? null,
      requested: pending.plan, result, source: pending.request.source,
      preset: pending.request.preset, reasonCodes: pending.request.reasonCodes,
      signature: pending.signature, kept: false,
    };
    this.sensor?.updateContext({ priorPreset: pending.request.preset, undoCount: this.undoCount });
    this.lastAppliedAt = Date.now();
    this.view.plan = result.plan;
    this.view.explanation = result.plan.explanation;
    this.view.outcome = { status: 'unknown', reason: 'missing-window' };
    this.view.status = transitionStatus(this.view.status, 'apply');
    this.view.helpVisible = true;
    this.showToast();
    this.ttlTimer = setTimeout(() => {
      this.ttlTimer = null;
      if (!this.active || this.active.kept) return;
      if (this.unsafeFocus()) {
        this.restoreOnBlur = true;
        this.view.status = transitionStatus(this.view.status, 'defer');
        this.publish();
      } else this.restoreTransaction('expired');
    }, Math.max(0, pending.expiresAt - Date.now()));
    this.publish();
    this.highlighter.show(beforeStyles);
    this.log('applied', this.active);
    return true;
  }

  private correctActive(result: ApplyResult) {
    if (!this.active || !this.alive) return;
    this.active.result = result;
    this.view.plan = result.plan;
    this.view.explanation = result.plan.explanation;
    this.publish();
    this.log('corrected', this.active);
  }

  private restoreTransaction(action: 'undone' | 'expired') {
    this.clearPending();
    this.clearTtl();
    this.clearToast();
    this.highlighter.clear();
    this.view.helpVisible = false;
    const previous = this.active;
    if (previous) {
      this.applier.restore(this.baseline ?? this.applier.initial);
      this.active = null;
      this.baseline = null;
      this.view.plan = null;
      this.view.explanation = null;
      this.log(action, previous);
    }
    this.view.status = transitionStatus(this.view.status, 'restore');
    this.publish();
  }

  keep() {
    if (!this.alive || !this.active || this.active.kept) return;
    this.epoch++;
    this.cancelPlanner(true);
    this.clearPending();
    this.clearTtl();
    this.clearToast();
    this.highlighter.clear();
    this.view.helpVisible = false;
    this.active.kept = true;
    this.keptWindowId = this.latestWindowId;
    this.sensor?.beginObservation();
    this.planner.reset();
    this.lastAppliedAt = Number.NEGATIVE_INFINITY;
    if (this.active.context) this.preferences?.recordFeedback(this.active.decisionId,
      this.active.context, this.active.result.plan, 'kept');
    this.view.status = transitionStatus('applied', 'keep');
    this.publish();
    this.log('kept', this.active);
  }

  undo() {
    if (!this.alive || (!this.active && !this.pending && !this.plannerBusy)) return;
    this.epoch++;
    this.cancelPlanner(true);
    if (this.active) {
      if (this.active.context) this.preferences?.recordFeedback(this.active.decisionId,
        this.active.context, this.active.result.plan, 'undone');
      this.rejected.set(this.active.signature, Date.now() + 60000);
      this.undoBoost = Math.min(1, this.undoBoost + 0.15);
      this.undoCount++;
      this.sensor?.updateContext({ priorPreset: this.active.preset, undoCount: this.undoCount });
    }
    this.restoreTransaction('undone');
  }

  reportStep(step: string) {
    if (!this.alive || !this.config.steps.includes(step) || step === this.step) return;
    this.view.outcome = this.active ? { status: 'unknown', reason: 'context' } : null;
    this.sensor?.reportStep(step);
    this.step = step;
    this.epoch++;
    this.cancelPlanner();
    this.clearPending();
    this.clearTtl();
    if (this.active) {
      const result = this.applier.reconcile();
      if (result) {
        this.active.result = result;
        this.view.plan = result.plan;
        this.view.explanation = result.plan.explanation;
      }
      this.baseline = captureScope(this.scope);
      this.active.kept = false;
      this.active.decisionId = ++this.decisionCounter;
      // The visible plan predates this step; feedback on it must not teach the new step.
      this.active.context = null;
      this.active.beforeWindow = null;
      this.view.status = 'applied';
      this.ttlTimer = setTimeout(() => this.restoreTransaction('expired'),
        this.active.result.plan.ttlSeconds * 1000);
    }
    this.view.summary = null;
    this.view.profile = null;
    this.publish();
  }

  reportError(error: { field: string; category: string }) { this.sensor?.reportError(error); }

  resetPreferences() {
    if (!this.alive) return;
    this.epoch++;
    this.cancelPlanner(true);
    this.clearPending();
    this.undoBoost = 0;
    this.rejected.clear();
    this.preferences?.reset();
    this.view.outcome = null;
    this.publish();
  }

  setPolicy(value: unknown) {
    if (!this.alive) return;
    const parsed = AllyPolicySchema.safeParse(value);
    this.epoch++;
    this.cancelPlanner(true);
    this.clearPending();
    this.view.outcome = this.active ? { status: 'unknown', reason: 'context' } : null;
    if (this.active) this.active.beforeWindow = null;
    if (!parsed.success) {
      this.policy = null;
      this.sensor?.stop();
      this.sensor = null;
      this.clearTtl();
      this.clearToast();
      this.applier.restore(this.applier.initial);
      this.active = null;
      this.baseline = null;
      this.view.plan = null;
      this.view.explanation = null;
      this.view.helpVisible = false;
      this.highlighter.clear();
      this.view.status = 'disabled';
      console.error('Ally integration: invalid policy');
    } else {
      this.policy = parsed.data;
      if (this.enabled && !this.sensor) this.makeSensor();
      if (this.enabled && this.view.status === 'disabled') this.view.status = 'observing';
      if (this.active) {
        try {
          const result = this.applier.apply(this.active.requested, parsed.data);
          this.active.result = result;
          this.view.plan = result.plan;
          this.view.explanation = result.plan.explanation;
          // The active choice was made under the previous policy. A fresh
          // decision under this policy is needed before recording feedback.
          this.active.context = null;
        } catch {
          this.applier.restore(this.applier.initial);
          this.highlighter.clear();
          this.active = null;
          this.baseline = null;
          this.view.plan = null;
          this.view.explanation = null;
          this.view.helpVisible = false;
          this.view.status = 'observing';
        }
      }
    }
    this.publish();
  }

  setEnabled(enabled: boolean) {
    if (!this.alive || this.enabled === enabled) return;
    this.enabled = enabled;
    this.epoch++;
    this.cancelPlanner(!enabled);
    this.clearPending();
    if (!enabled) {
      this.sensor?.stop();
      this.sensor = null;
      this.clearTtl();
      this.clearToast();
      this.applier.restore(this.applier.initial);
      this.active = null;
      this.baseline = null;
      this.view.plan = null;
      this.view.explanation = null;
      this.view.helpVisible = false;
      this.highlighter.clear();
      this.view.status = transitionStatus(this.view.status, 'disable');
    } else if (this.policy) {
      this.view.status = transitionStatus(this.view.status, 'enable');
      this.makeSensor();
    }
    this.publish();
  }
}
