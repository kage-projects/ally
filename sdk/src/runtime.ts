import { createApplier, captureScope } from './applier.js';
import type { ApplyResult, ScopeSnapshot } from './applier.js';
import { guardPlan } from './guard.js';
import { PlannerClient } from './engine-client.js';
import { buildDecisionInput } from './planner-contract.js';
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
}

export interface CandidateRequest {
  plan: unknown;
  source: DecisionSource;
  preset: Preset;
  reasonCodes: string[];
  contextEpoch?: number;
}

interface PendingCandidate {
  request: CandidateRequest;
  plan: AdaptationPlan;
  epoch: number;
  expiresAt: number;
  signature: string;
}

interface ActiveDecision {
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
    plannerStatus: 'idle', toastVisible: false };
}

export class AllyRuntime {
  private readonly scope: HTMLElement;
  private readonly config: AllyConfig;
  private onUpdate: (view: RuntimeView) => void;
  private onDecision?: (event: AllyDecisionEvent) => void;
  private readonly applier: ReturnType<typeof createApplier>;
  private readonly planner = new PlannerClient();
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
    if (this.plannerBusy || !this.alive || !this.enabled || !this.policy || this.active?.kept) return;
    let input;
    try {
      input = buildDecisionInput(snapshot.summary, profile, policy, [], this.config.steps);
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
            !this.alive || !this.enabled || !this.policy || this.active?.kept) return;
        this.plannerBusy = false;
        if (outcome.kind === 'skipped') {
          this.view.plannerStatus = previousStatus;
        } else if (outcome.kind === 'error') {
          this.view.plannerStatus = outcome.reason === 'aborted' ? 'idle' : 'fallback';
        } else {
          this.view.plannerStatus = 'idle';
          if (outcome.kind === 'plan') {
            this.acceptCandidate({ plan: outcome.plan, source: outcome.source,
              preset, reasonCodes, contextEpoch: epoch });
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
  }

  setDecisionCallback(callback?: (event: AllyDecisionEvent) => void) {
    this.onDecision = callback;
  }

  getView(): RuntimeView { return { ...this.view }; }
  getEpoch(): number { return this.epoch; }

  ingest(snapshot: SensorSnapshot) {
    if (!this.alive || !this.enabled || !this.policy || snapshot.source !== 'live') return;
    if (snapshot.summary.context.step !== this.step) return;
    const effectivePolicy: AllyPolicy = {
      ...this.policy,
      thresholds: { ...this.policy.thresholds,
        apply: Math.min(1, this.policy.thresholds.apply + this.undoBoost) },
    };
    const decision = decideRule(snapshot.summary, effectivePolicy);
    this.view.summary = snapshot.summary;
    this.view.profile = decision.profile;
    this.publish();
    if (this.active?.kept) return;
    if (decision.candidate) {
      this.acceptCandidate({ plan: decision.candidate.plan, source: 'rule',
        preset: decision.preset, reasonCodes: decision.reasonCodes });
    } else if (decision.requestPlanner) {
      this.startPlanner(snapshot, decision.profile, effectivePolicy,
        decision.preset, decision.reasonCodes);
    }
  }

  acceptCandidate(request: CandidateRequest): boolean {
    if (!this.alive || !this.enabled || !this.policy ||
        (request.contextEpoch !== undefined && request.contextEpoch !== this.epoch)) return false;
    if (this.active?.kept) return false;
    let plan: AdaptationPlan;
    try { plan = guardPlan(request.plan, this.policy).plan; }
    catch { return false; }
    const signature = this.signature(plan);
    if (this.active?.signature === signature || (this.rejected.get(signature) ?? 0) > Date.now()) return false;
    if (Date.now() - this.lastAppliedAt < 10000 && request.source !== 'llm') return false;
    const expiresAt = Date.now() + plan.ttlSeconds * 1000;
    const pending: PendingCandidate = { request, plan, epoch: this.epoch, expiresAt, signature };
    if (this.unsafeFocus(plan)) {
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
    const result = this.applier.apply(pending.plan, this.policy);
    this.active = {
      requested: pending.plan, result, source: pending.request.source,
      preset: pending.request.preset, reasonCodes: pending.request.reasonCodes,
      signature: pending.signature, kept: false,
    };
    this.sensor?.updateContext({ priorPreset: pending.request.preset, undoCount: this.undoCount });
    this.lastAppliedAt = Date.now();
    this.view.plan = result.plan;
    this.view.explanation = result.plan.explanation;
    this.view.status = transitionStatus(this.view.status, 'apply');
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
    this.active.kept = true;
    this.view.status = transitionStatus('applied', 'keep');
    this.publish();
    this.log('kept', this.active);
  }

  undo() {
    if (!this.alive || (!this.active && !this.pending && !this.plannerBusy)) return;
    this.epoch++;
    this.cancelPlanner(true);
    if (this.active) {
      this.rejected.set(this.active.signature, Date.now() + 60000);
      this.undoBoost = Math.min(1, this.undoBoost + 0.15);
      this.undoCount++;
      this.sensor?.updateContext({ priorPreset: this.active.preset, undoCount: this.undoCount });
    }
    this.restoreTransaction('undone');
  }

  reportStep(step: string) {
    if (!this.alive || !this.config.steps.includes(step) || step === this.step) return;
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
    this.publish();
  }

  setPolicy(value: unknown) {
    if (!this.alive) return;
    const parsed = AllyPolicySchema.safeParse(value);
    this.epoch++;
    this.cancelPlanner(true);
    this.clearPending();
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
        } catch {
          this.applier.restore(this.applier.initial);
          this.active = null;
          this.baseline = null;
          this.view.plan = null;
          this.view.explanation = null;
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
      this.view.status = transitionStatus(this.view.status, 'disable');
    } else if (this.policy) {
      this.view.status = transitionStatus(this.view.status, 'enable');
      this.makeSensor();
    }
    this.publish();
  }
}
