import assert from "node:assert/strict";
import { test } from "node:test";
import fixtures from "../../../mocks/dashboard/ally-events.v1.json";
import { ALLY_CHANNEL_NAME } from "../../../mocks/dashboard/contracts";
import { BUS_IDLE_AFTER_MS, getConnectionStatus, subscribeAllyBus } from "../lib/dashboard/bus";
import { parseAllyBusEvent } from "../lib/dashboard/event-parser";
import { createDashboardState, dashboardReducer } from "../lib/dashboard/reducer";
import type { AllyBusEvent, DashboardState } from "../lib/dashboard/types";

const events = fixtures.map((fixture) => {
  const event = parseAllyBusEvent(fixture);
  assert.ok(event, `Fixture ${fixture.eventId} must be valid`);
  return event;
});
const heartbeat = events.find((event) => event.type === "heartbeat")!;
const summary = events.find((event) => event.type === "summary")!;
const decision = events.find((event) => event.type === "decision")!;

function receive(state: DashboardState, event: AllyBusEvent, receivedAt = 100_000) {
  return dashboardReducer(state, { type: "bus/event", event, receivedAt });
}

function summaryEvent(index: number): Extract<AllyBusEvent, { type: "summary" }> {
  return { ...summary, eventId: `summary-${index}`, at: 1000 + index };
}

test("accepts every v1 fixture, including optional heartbeat", () => {
  assert.equal(events.length, fixtures.length);
  for (const event of events) assert.deepEqual(parseAllyBusEvent(event), event);
});

test("rejects malformed, unsupported, non-finite, oversized and extra-field payloads", () => {
  const badSummary = structuredClone(summary);
  badSummary.payload.summary.counts.missTap = Number.NaN;
  const badProfile = structuredClone(summary);
  badProfile.payload.profile.motor = 1.1;
  const badPlan = structuredClone(decision);
  badPlan.payload.plan.tokens.fontScale = 0;
  const badGuardrails = structuredClone(decision);
  Object.assign(badGuardrails.payload.guardrails, { schemaValid: "true" });
  const malformed = [
    null, undefined, [], "summary", {},
    { ...heartbeat, version: 2 },
    { ...heartbeat, type: "unknown" },
    { ...heartbeat, eventId: "" },
    { ...heartbeat, at: Number.POSITIVE_INFINITY },
    { ...heartbeat, at: 9_000_000_000_000_000 },
    { ...heartbeat, payload: null },
    { ...heartbeat, payload: { ...heartbeat.payload, formValues: { email: "excluded" } } },
    { ...heartbeat, rawText: "excluded" },
    { ...summary, payload: { ...summary.payload, summary: {} } },
    badSummary, badProfile, badPlan, badGuardrails,
    { version: 1, type: "reset", at: 1, eventId: "reset", payload: { unexpected: true } },
  ];
  for (const value of malformed) assert.equal(parseAllyBusEvent(value), null);
});

test("starts empty and uses received time for waiting/live/idle, without assuming peers", () => {
  const initial = createDashboardState();
  assert.equal(initial.currentSummary, null);
  assert.equal(getConnectionStatus(null, 100_000, false), "waiting");
  const state = receive(initial, { ...heartbeat, at: 1 }, 100_000);
  assert.equal(state.lastEventAt, 1);
  assert.equal(state.lastReceivedAt, 100_000);
  assert.equal(state.currentSummary, null);
  assert.deepEqual(state.currentContext, heartbeat.payload);
  assert.equal(getConnectionStatus(state.lastReceivedAt, 100_001, false), "live");
  assert.equal(getConnectionStatus(state.lastReceivedAt, 100_000 + BUS_IDLE_AFTER_MS - 1, false), "live");
  assert.equal(getConnectionStatus(state.lastReceivedAt, 100_000 + BUS_IDLE_AFTER_MS, false), "idle");
  assert.equal(getConnectionStatus(null, 0, true), "unavailable");
  assert.equal(getConnectionStatus(100_000, 100_001, true), "unavailable");
});

test("summary alone updates signals, profile, context and connection without heartbeat", () => {
  const state = receive(createDashboardState(), summary);
  assert.deepEqual(state.currentSummary, summary.payload.summary);
  assert.deepEqual(state.profile, summary.payload.profile);
  assert.equal(state.summaryHistory.length, 1);
  assert.equal(state.currentContext?.step, summary.payload.summary.context.step);
  assert.equal(getConnectionStatus(state.lastReceivedAt, 100_001, false), "live");
});

test("deduplicates event IDs and does not mutate earlier reducer state", () => {
  const initial = createDashboardState();
  const snapshot = structuredClone(initial);
  const state = receive(initial, summary);
  assert.deepEqual(initial, snapshot);
  assert.equal(receive(state, summary, 200_000), state);
  assert.equal(state.lastReceivedAt, 100_000);
});

test("isolates demo mode and replaces sample data on the first live event", () => {
  const demo = dashboardReducer(createDashboardState(), { type: "demo/load", events });
  assert.equal(demo.mode, "demo");
  assert.equal(demo.lastReceivedAt, null);
  assert.equal(demo.decisions.length, 2);
  const live = receive(demo, heartbeat);
  assert.equal(live.mode, "live");
  assert.equal(live.decisions.length, 0);
  assert.equal(live.summaryHistory.length, 0);
  assert.equal(live.lastReceivedAt, 100_000);
});

test("applies, keeps and undoes decisions and restores the prior active adaptation", () => {
  let state = createDashboardState();
  for (const event of events) state = receive(state, event);
  const motor = state.decisions.find((item) => item.preset === "motor")!;
  const combined = state.decisions.find((item) => item.preset === "combined")!;
  assert.equal(motor.status, "kept");
  assert.equal(combined.status, "undone");
  assert.equal(state.activeDecision?.id, motor.id);
  assert.ok(state.comparison.before);
  assert.ok(state.comparison.after);
  const extra = { ...decision, eventId: "duplicate-decision" };
  assert.equal(receive(state, extra).decisions.length, 2);
});

test("ignores unknown decisions and invalid status transitions", () => {
  const pending = receive(createDashboardState(), decision);
  const invalidKeep: AllyBusEvent = { version: 1, eventId: "early-keep", type: "keep", at: 1, payload: { decisionId: decision.payload.id } };
  const state = receive(pending, invalidKeep);
  assert.equal(state.decisions[0].status, "pending");
  const unknown: AllyBusEvent = { ...invalidKeep, eventId: "unknown", type: "applied", payload: { decisionId: "missing" } };
  const next = receive(state, unknown);
  assert.equal(next.activeDecision, null);
  assert.equal(next.firstAppliedAt, null);
});

test("bounds signal history, decisions, comparison windows and deduplication memory", () => {
  let state = createDashboardState();
  for (let index = 0; index < 600; index++) state = receive(state, summaryEvent(index));
  assert.equal(state.summaryHistory.length, 30);
  assert.equal(state.beforeWindows.length, 6);
  assert.equal(state.recentEventIds.length, 500);
  for (let index = 0; index < 105; index++) {
    state = receive(state, { ...decision, eventId: `decision-${index}`, payload: { ...decision.payload, id: `decision-${index}` } });
  }
  assert.equal(state.decisions.length, 100);
  assert.equal(state.decisions[0].id, "decision-104");
  assert.equal(state.decisions.at(-1)?.id, "decision-5");
});

test("freezes baseline windows, bounds after windows and handles zero-tap metrics", () => {
  let state = receive(createDashboardState(), summaryEvent(0));
  state = receive(state, decision);
  state = receive(state, { version: 1, eventId: "apply", type: "applied", at: 1001, payload: { decisionId: decision.payload.id } });
  const baseline = structuredClone(state.beforeWindows);
  for (let index = 2; index < 40; index++) state = receive(state, summaryEvent(index));
  assert.deepEqual(state.beforeWindows, baseline);
  assert.equal(state.afterWindows.length, 6);
  assert.equal(state.comparison.afterWindowCount, 6);
  assert.ok(Number.isFinite(state.comparison.after?.misTapRate));
  const zero = structuredClone(summaryEvent(41));
  zero.payload.summary.counts.taps = 0;
  zero.payload.summary.counts.missTap = 0;
  let zeroState = receive(createDashboardState(), zero);
  zeroState = receive(zeroState, decision);
  zeroState = receive(zeroState, { version: 1, eventId: "apply-zero", type: "applied", at: zero.at + 1, payload: { decisionId: decision.payload.id } });
  assert.equal(zeroState.comparison.before?.misTapRate, null);
  assert.equal(zeroState.comparison.before?.avgTimeToTarget, 0);
});

test("can undo the active adaptation even after its log entry is pruned", () => {
  let state = receive(createDashboardState(), decision);
  state = receive(state, { version: 1, eventId: "apply-active", type: "applied", at: 2, payload: { decisionId: decision.payload.id } });
  for (let index = 0; index < 100; index++) {
    state = receive(state, { ...decision, eventId: `pending-${index}`, payload: { ...decision.payload, id: `pending-${index}` } });
  }
  assert.equal(state.decisions.some((item) => item.id === decision.payload.id), false);
  assert.equal(state.activeDecision?.id, decision.payload.id);
  state = receive(state, { version: 1, eventId: "undo-active", type: "undo", at: 3, payload: { decisionId: decision.payload.id } });
  assert.equal(state.activeDecision, null);
});

test("remote reset clears session data while remaining live; local reset waits for fresh events", () => {
  let state = events.reduce((current, event) => receive(current, event), createDashboardState());
  const reset: AllyBusEvent = { version: 1, eventId: "remote-reset", type: "reset", at: 10, payload: {} };
  state = receive(state, reset, 200_000);
  assert.equal(state.decisions.length, 0);
  assert.equal(state.currentSummary, null);
  assert.equal(state.lastReceivedAt, 200_000);
  assert.equal(state.firstAppliedAt, null);
  assert.equal(receive(state, reset), state);
  assert.equal(receive(state, summary, 200_001).summaryHistory.length, 1);
  assert.deepEqual(dashboardReducer(state, { type: "view/reset" }), createDashboardState());
});

test("real BroadcastChannel transports v1 events, ignores bad data and feeds the reducer", async (context) => {
  let state = createDashboardState();
  let received = 0;
  const startedAt = performance.now();
  const sender = new BroadcastChannel(ALLY_CHANNEL_NAME);
  let subscription: ReturnType<typeof subscribeAllyBus> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error("BroadcastChannel receive timeout")), 3000);
      subscription = subscribeAllyBus((event, receivedAt) => {
        state = receive(state, event, receivedAt);
        received += 1;
        if (received === events.length) resolve();
      });
      assert.equal(subscription.available, true);
      sender.postMessage(null);
      sender.postMessage({ ...heartbeat, version: 2 });
      for (const event of events) sender.postMessage(event);
    });
    assert.equal(received, events.length);
    assert.equal(state.decisions.length, 2);
    assert.equal(state.activeDecision?.preset, "motor");
    assert.equal(state.mode, "live");
    context.diagnostic(`${events.length} events received in ${(performance.now() - startedAt).toFixed(1)}ms using two channel instances.`);
  } finally {
    clearTimeout(timeout);
    subscription?.close();
    sender.close();
  }
});

test("subscription cleanup is idempotent and prevents subsequent delivery", async () => {
  let received = 0;
  const subscription = subscribeAllyBus(() => received++);
  const sender = new BroadcastChannel(ALLY_CHANNEL_NAME);
  subscription.close();
  subscription.close();
  sender.postMessage(heartbeat);
  await new Promise((resolve) => setTimeout(resolve, 30));
  sender.close();
  assert.equal(received, 0);
});

test("unsupported or blocked BroadcastChannel degrades without throwing", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "BroadcastChannel")!;
  try {
    Object.defineProperty(globalThis, "BroadcastChannel", { ...original, value: undefined });
    assert.equal(subscribeAllyBus(() => {}).available, false);
    Object.defineProperty(globalThis, "BroadcastChannel", {
      ...original,
      value: class { constructor() { throw new Error("Blocked"); } },
    });
    const subscription = subscribeAllyBus(() => {});
    assert.equal(subscription.available, false);
    subscription.close();
  } finally {
    Object.defineProperty(globalThis, "BroadcastChannel", original);
  }
});
