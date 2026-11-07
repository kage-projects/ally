import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFrictionTrend } from "../lib/dashboard/friction-trend";
import { createDashboardState, dashboardReducer } from "../lib/dashboard/reducer";
import { parseAllyBusEvent } from "../lib/dashboard/event-parser";
import fixtures from "../mocks/ally-events.v1.json";
import type { FrictionTrendWindow } from "../lib/dashboard/types";

const window = (at: number, taps = 10, missTap = 2): FrictionTrendWindow => ({ at, taps, missTap, windowMs: 10_000 });

test("empty and zero-tap windows do not invent a friction rate", () => {
  assert.equal(buildFrictionTrend([], []), null);
  const trend = buildFrictionTrend([window(10_000, 0, 0)], [])!;
  assert.equal(trend.points[0].rate, null);
  assert.equal(trend.segments.length, 0);
});

test("ratios and x positions use actual counts and timestamps, without mutating inputs", () => {
  const windows = [window(30_000, 20, 1), window(10_000)];
  const trend = buildFrictionTrend(windows, [])!;
  assert.equal(trend.points[0].rate, .2);
  assert.equal(trend.points[1].rate, .05);
  assert.equal(trend.points[0].x, 1 / 3);
  assert.equal(trend.points[1].x, 1);
  assert.equal(windows[0].at, 30_000);
  assert.equal(trend.segments.length, 2, "Missing window must break the line");
});

test("zero-tap windows break lines while a measured zero rate remains visible", () => {
  const trend = buildFrictionTrend([window(10_000), window(20_000, 0, 0), window(30_000, 10, 0)], [])!;
  assert.equal(trend.segments.length, 2);
  assert.equal(trend.segments[1][0].rate, 0);
  assert.ok(trend.ceiling > 0);
});

test("lifecycle markers retain event times and the chart excludes markers before retained history", () => {
  const markers = [
    { at: 1, type: "applied" as const, decisionId: "old", preset: "motor" as const },
    { at: 15_000, type: "applied" as const, decisionId: "new", preset: "motor" as const },
    { at: 25_000, type: "undo" as const, decisionId: "new", preset: "motor" as const },
  ];
  const trend = buildFrictionTrend([window(20_000)], markers)!;
  assert.equal(trend.markers.length, 2);
  assert.equal(trend.markers[0].x, 1 / 3);
  assert.equal(trend.markers[1].x, 1);
});

test("reducer records timestamped summaries and accepted apply/undo events; reset clears the trend", () => {
  let state = createDashboardState();
  for (const fixture of fixtures) {
    const event = parseAllyBusEvent(fixture)!;
    state = dashboardReducer(state, { type: "bus/event", event, receivedAt: event.at });
  }
  assert.equal(state.trendWindows.length, fixtures.filter((event) => event.type === "summary").length);
  assert.deepEqual(state.adaptationMarkers.map((marker) => marker.type), ["applied", "applied", "undo"]);
  assert.deepEqual(state.adaptationMarkers.map((marker) => marker.at), fixtures.filter((event) => event.type === "applied" || event.type === "undo").map((event) => event.at));
  const summary = fixtures.find((event) => event.type === "summary")!;
  for (let i = 0; i < 40; i++) {
    const event = parseAllyBusEvent({ ...summary, at: summary.at + i * 10_000, eventId: `new-${i}` })!;
    state = dashboardReducer(state, { type: "bus/event", event, receivedAt: event.at });
  }
  assert.equal(state.trendWindows.length, 30);
  state = dashboardReducer(state, { type: "view/reset" });
  assert.deepEqual(state.trendWindows, []);
  assert.deepEqual(state.adaptationMarkers, []);
});
