import { AdaptationPlanSchema, FrictionSummarySchema, decideRule } from '@ally/react/core';
import { ALLY_STEPS } from './ally-policy.mjs';

const policyCorrections = new Set(['targetMinSize', 'spacingScale', 'fontScale',
  'hideNonEssential', 'confirmDestructive', 'voiceOffer']);

function producerId() {
  const crypto = globalThis.crypto;
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// Pure producer, injectable for contract tests. No DOM/form contents or storage.
export function createDashboardProducer({ send, policy, now = Date.now, id = producerId() }) {
  let serial = 0, previous = null, current = null, step = 'browse', modality = 'mouse';
  const decisions = new Map();
  const emit = (type, payload, at = now()) => send({ version: 1, eventId: `${id}:${++serial}`, type, at, payload });
  const heartbeat = () => emit('heartbeat', { step, inputModality: modality });
  function reset() {
    // An expiry does not restart the SDK sensor. Keep its checkpoint so the
    // next cumulative snapshot cannot resend counts from before the reset.
    current = null; decisions.clear(); emit('reset', {});
  }
  return {
    setStep(value) { if (ALLY_STEPS.includes(value)) { step = value; heartbeat(); } },
    heartbeat,
    reset,
    observe(snapshot) {
      if (snapshot.source !== 'live' || !Number.isSafeInteger(snapshot.sequence) ||
          !Number.isSafeInteger(snapshot.windowId) || !Number.isSafeInteger(snapshot.at) ||
          (previous && snapshot.sequence <= previous.sequence)) return;
      const parsed = FrictionSummarySchema.safeParse(snapshot.summary);
      if (!parsed.success || !ALLY_STEPS.includes(parsed.data.context.step)) return;
      const summary = parsed.data;
      if (summary.windowMs < 1 || Object.values(summary.viewport).some(value => value <= 0) ||
          !Number.isSafeInteger(snapshot.samples?.targetSizes)) return;
      const rule = decideRule(summary, policy());
      const full = structuredClone(summary);
      // Fast snapshots are cumulative within one sensor window. Send only their
      // increments, so a later full window never double-counts the same taps.
      if (previous?.windowId === snapshot.windowId) {
        summary.windowMs -= previous.summary.windowMs;
        for (const name of Object.keys(summary.counts)) summary.counts[name] -= previous.summary.counts[name];
        const samples = snapshot.samples.targetSizes - previous.samples;
        summary.timings.avgTargetSize = samples > 0 ? Math.max(0,
          (full.timings.avgTargetSize * snapshot.samples.targetSizes -
           previous.summary.timings.avgTargetSize * previous.samples) / samples) : 0;
        summary.timings.stepDurations = summary.timings.stepDurations.slice(previous.summary.timings.stepDurations.length);
      }
      if (summary.windowMs < 1 || Object.values(summary.counts).some(value => value < 0)) return;
      previous = { sequence: snapshot.sequence, windowId: snapshot.windowId, summary: full, samples: snapshot.samples.targetSizes };
      step = summary.context.step; modality = summary.inputModality;
      emit('summary', { summary, profile: rule.profile, preset: rule.preset, confidence: rule.confidence }, snapshot.at);
    },
    decision(event, lockedComponentsPreserved) {
      if (!Number.isSafeInteger(event.decisionId) || !Number.isSafeInteger(event.transactionId) || !Number.isSafeInteger(event.at)) return;
      if (event.action === 'expired') { reset(); return; }
      if (event.action === 'undone') {
        // A new transaction after Keep/step captures the retained appearance.
        // Undo only rolls back revisions sharing that actual SDK baseline.
        for (const record of [...decisions.values()].reverse()) {
          if (!record.undone && record.transactionId === event.transactionId) {
            emit('undo', { decisionId: record.id }, event.at); record.undone = true;
          }
        }
        current = [...decisions.values()].reverse().find(record => !record.undone) || null; return;
      }
      if (event.action === 'kept') {
        if (current?.sdkId === event.decisionId && !current.kept) {
          current.kept = true; emit('keep', { decisionId: current.id }, event.at);
        }
        return;
      }
      if (!['applied', 'corrected'].includes(event.action)) return;
      const parsed = AdaptationPlanSchema.safeParse(event.plan);
      if (!parsed.success || !['rule', 'llm', 'cache'].includes(event.source) ||
          !Number.isFinite(event.latencyMs) || event.latencyMs < 0) return;
      if (event.action === 'applied' && current?.sdkId === event.decisionId) return;
      const plan = parsed.data, kept = event.action === 'corrected' && current?.kept;
      const record = { id: `${id}:decision:${++serial}`, sdkId: event.decisionId,
        transactionId: event.transactionId, plan, kept: !!kept, undone: false };
      emit('decision', { id: record.id, source: event.source === 'cache' ? 'llm' : event.source,
        preset: event.preset, latencyMs: event.latencyMs, confidence: plan.confidence,
        previousPlan: current?.plan || null, plan, explanation: plan.explanation,
        guardrails: { schemaValid: true,
          policyClamped: event.corrections.some(code => policyCorrections.has(code)),
          lockedComponentsPreserved: lockedComponentsPreserved === true } }, event.at);
      decisions.set(record.id, record); current = record;
      // Bound memory to the same 100-decision history as dashboard v1.
      if (decisions.size > 100) decisions.delete(decisions.keys().next().value);
      emit('applied', { decisionId: record.id }, event.at);
      if (kept) emit('keep', { decisionId: record.id }, event.at);
    },
  };
}

export function lockedSlotsPreserved(scope, plan) {
  if (!scope) return false;
  const locked = '[data-ally-slot="price"], [data-ally-slot="legalText"], [data-ally-slot="totalAmount"], [data-ally-slot="payButton"]';
  for (const name of plan.layout.hideNonEssential) {
    for (const element of scope.querySelectorAll(`[data-ally-optional="${name}"]`)) {
      if (element.matches(locked) || element.querySelector(locked)) return false;
    }
  }
  if (plan.layout.primaryActionSticky) {
    for (const action of scope.querySelectorAll('[data-ally-slot="primaryAction"]')) {
      for (const pay of scope.querySelectorAll('[data-ally-slot="payButton"]')) {
        if (action.contains(pay) || pay.contains(action)) return false;
      }
    }
  }
  return true;
}
