import assert from "node:assert/strict";
import { test } from "node:test";
import fixtures from "../../../mocks/dashboard/ally-events.v1.json";
import { getPlanDiff } from "../lib/dashboard/decision-diff";
import { describeMetricChange, formatImprovement } from "../lib/dashboard/formatters";
import { parseAllyBusEvent } from "../lib/dashboard/event-parser";
import { createDashboardState, dashboardReducer } from "../lib/dashboard/reducer";
import type { AdaptationPlan, AllyBusEvent, DashboardState } from "../lib/dashboard/types";

const events = fixtures.map((fixture) => {
  const event = parseAllyBusEvent(fixture);
  assert.ok(event);
  return event;
});
const summaryFixture = events.find((event) => event.type === "summary")!;
const decisionFixture = events.find((event) => event.type === "decision")!;

function receive(state: DashboardState, event: AllyBusEvent) {
  return dashboardReducer(state, { type: "bus/event", event, receivedAt: 1_000_000 });
}

function summary(at: number, counts = { taps: 10, missTap: 2, errorLoop: 1 }, windowMs = 10_000, time = 3) {
  const event = structuredClone(summaryFixture);
  event.eventId = `summary-${at}`;
  event.at = at;
  Object.assign(event.payload.summary.counts, counts);
  event.payload.summary.windowMs = windowMs;
  event.payload.summary.timings.avgTimeToTarget = time;
  return event;
}

function decision(id: string, at: number) {
  const event = structuredClone(decisionFixture);
  event.eventId = `decision-${id}`;
  event.payload.id = id;
  event.at = at;
  return event;
}

function status(type: "applied" | "keep" | "undo", id: string, at: number): AllyBusEvent {
  return { version: 1, eventId: `${type}-${id}-${at}`, type, at, payload: { decisionId: id } };
}

test("a null prior plan reports requested settings without inventing default values", () => {
  const changes = getPlanDiff(null, decisionFixture.payload.plan);
  assert.equal(changes.length, 11);
  assert.ok(changes.every((change) => change.value.includes("previous not recorded")));
  assert.ok(changes.every((change) => !change.value.includes("→")));
});

test("identical token/layout/assist settings and reordered hidden content produce no changes", () => {
  const plan = structuredClone(decisionFixture.payload.plan);
  plan.layout.hideNonEssential = ["promoBanner", "recommendations"];
  const after = structuredClone(plan);
  after.layout.hideNonEssential.reverse();
  after.explanation = "A different explanation is metadata, not a settings change.";
  after.confidence = 0.5;
  assert.deepEqual(getPlanDiff(plan, after), []);
});

test("diffs include all token, layout, and assistance properties when they change", () => {
  const before: AdaptationPlan = {
    ...structuredClone(decisionFixture.payload.plan),
    tokens: { targetMinSize: 44, spacingScale: 1, fontScale: 1, contrast: "normal", density: "compact" },
    layout: { stepMode: "default", hideNonEssential: [], primaryActionSticky: false, confirmDestructive: false },
    assist: { inlineHints: false, voiceOffer: false },
  };
  const after: AdaptationPlan = {
    ...structuredClone(before),
    tokens: { targetMinSize: 56, spacingScale: 1.2, fontScale: 1.1, contrast: "high", density: "comfortable" },
    layout: { stepMode: "one-per-screen", hideNonEssential: ["promoBanner"], primaryActionSticky: true, confirmDestructive: true },
    assist: { inlineHints: true, voiceOffer: true },
  };
  const changes = getPlanDiff(before, after);
  assert.equal(changes.length, 11);
  assert.equal(changes.find((item) => item.label === "Target size")?.value, "44px → 56px");
  assert.equal(changes.find((item) => item.label === "Hidden content")?.value, "None → Promo banner");
  assert.equal(changes.find((item) => item.label === "Step mode")?.value, "Default → One per screen");
  assert.equal(changes.find((item) => item.label === "Voice assistance offer")?.value, "Off → On");
});

test("a single changed setting does not include unchanged properties", () => {
  const before = structuredClone(decisionFixture.payload.plan);
  const after = structuredClone(before);
  after.assist.inlineHints = !before.assist.inlineHints;
  const changes = getPlanDiff(before, after);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].label, "Inline hints");
});

test("metric descriptions distinguish worsening, improvement, no change, zero baseline and absent samples", () => {
  assert.deepEqual(describeMetricChange(1, 2), { label: "↑ 100%", trend: "worse" });
  assert.deepEqual(describeMetricChange(2, 1), { label: "↓ 50%", trend: "better" });
  assert.deepEqual(describeMetricChange(0, 0), { label: "No change", trend: "neutral" });
  assert.deepEqual(describeMetricChange(0, 1), { label: "↑ From zero", trend: "worse" });
  assert.deepEqual(describeMetricChange(0, 1, true), { label: "↑ From zero", trend: "better" });
  assert.equal(describeMetricChange(null, 0).trend, "unknown");
  assert.equal(describeMetricChange(0, null).trend, "unknown");
  assert.equal(describeMetricChange(1, Number.NaN).trend, "unknown");
  assert.equal(formatImprovement(0, 1), null);
  assert.equal(formatImprovement(1, Number.POSITIVE_INFINITY), null);
  assert.equal(describeMetricChange(1, 1.00001).label, "↑ <0.1%");
});

test("comparison uses weighted tap metrics and duration-normalized error loops for unequal windows", () => {
  let state = receive(createDashboardState(), summary(100_000));
  state = receive(state, decision("motor", 100_001));
  state = receive(state, status("applied", "motor", 100_002));
  const baseline = structuredClone(state.beforeWindows);
  state = receive(state, summary(110_001)); // Starts 1ms before adaptation: exclude.
  assert.equal(state.afterWindows.length, 0);
  state = receive(state, summary(110_002)); // Exact boundary: include.
  state = receive(state, summary(130_002, { taps: 20, missTap: 4, errorLoop: 4 }, 20_000, 1));
  assert.deepEqual(state.beforeWindows, baseline);
  assert.equal(state.comparison.afterWindowCount, 2);
  assert.equal(state.comparison.after?.misTapRate, 0.2);
  assert.ok(Math.abs(state.comparison.after!.avgTimeToTarget! - 5 / 3) < 1e-10);
  assert.ok(Math.abs(state.comparison.after!.errorLoops - 5 / 3) < 1e-10);
  assert.equal(state.comparison.before?.errorLoops, 1);
  assert.equal(describeMetricChange(state.comparison.before!.errorLoops, state.comparison.after!.errorLoops).trend, "worse");
});

test("zero-tap windows leave tap rate and targeting time unknown", () => {
  let state = receive(createDashboardState(), summary(100_000, { taps: 0, missTap: 0, errorLoop: 0 }));
  state = receive(state, decision("motor", 100_001));
  state = receive(state, status("applied", "motor", 100_002));
  state = receive(state, summary(110_002, { taps: 0, missTap: 0, errorLoop: 0 }));
  assert.equal(state.comparison.before?.misTapRate, null);
  assert.equal(state.comparison.after?.misTapRate, null);
  assert.equal(state.comparison.after?.avgTimeToTarget, null);
  assert.equal(state.comparison.after?.errorLoops, 0);
});

test("undo stops adapted sampling until a new adaptation has a full clean window", () => {
  let state = receive(createDashboardState(), summary(100_000));
  state = receive(state, decision("motor", 100_001));
  state = receive(state, status("applied", "motor", 100_002));
  state = receive(state, summary(110_002));
  const clean = structuredClone(state.afterWindows);
  state = receive(state, status("undo", "motor", 110_003));
  state = receive(state, summary(130_000));
  assert.equal(state.activeDecision, null);
  assert.deepEqual(state.afterWindows, clean);
  state = receive(state, decision("visual", 140_000));
  state = receive(state, status("applied", "visual", 140_001));
  state = receive(state, summary(150_000));
  assert.deepEqual(state.afterWindows, clean);
  state = receive(state, summary(150_001));
  assert.equal(state.afterWindows.length, 2);
});

test("undo to a prior active adaptation excludes windows spanning the restoration", () => {
  let state = receive(createDashboardState(), summary(100_000));
  state = receive(state, decision("motor", 100_001));
  state = receive(state, status("applied", "motor", 100_002));
  state = receive(state, status("keep", "motor", 100_003));
  state = receive(state, summary(110_002));
  state = receive(state, decision("combined", 120_000));
  state = receive(state, status("applied", "combined", 120_001));
  state = receive(state, status("undo", "combined", 125_000));
  assert.equal(state.activeDecision?.id, "motor");
  state = receive(state, summary(130_001));
  assert.equal(state.afterWindows.length, 1);
  state = receive(state, summary(135_000));
  assert.equal(state.afterWindows.length, 2);
  state = receive(state, { version: 1, type: "reset", eventId: "reset", at: 140_000, payload: {} });
  assert.equal(state.adaptationChangedAt, null);
  assert.deepEqual(state.beforeWindows, []);
  assert.deepEqual(state.afterWindows, []);
});
