import type { AllyBusEvent, DashboardState, FrictionSummary, MetricSnapshot } from "./types";

export const SUMMARY_HISTORY_LIMIT = 30;
export const DECISION_HISTORY_LIMIT = 100;
export const COMPARISON_WINDOW_LIMIT = 6;
const SEEN_EVENT_LIMIT = 500;

export type DashboardAction =
  | { type: "bus/event"; event: AllyBusEvent; receivedAt: number }
  | { type: "view/reset" }
  | { type: "demo/load"; events: AllyBusEvent[] };

export function createDashboardState(): DashboardState {
  return {
    mode: "live",
    currentSummary: null,
    summaryHistory: [],
    profile: { motor: 0, visual: 0, cognitive: 0 },
    preset: null,
    confidence: 0,
    decisions: [],
    activeDecision: null,
    comparison: { before: null, after: null, beforeWindowCount: 0, afterWindowCount: 0 },
    lastEventAt: null,
    lastReceivedAt: null,
    currentContext: null,
    recentEventIds: [],
    beforeWindows: [],
    afterWindows: [],
    firstAppliedAt: null,
    adaptationChangedAt: null,
  };
}

function metrics(windows: FrictionSummary[]): MetricSnapshot | null {
  if (windows.length === 0) return null;
  const taps = windows.reduce((total, window) => total + window.counts.taps, 0);
  return {
    misTapRate: taps > 0 ? windows.reduce((total, window) => total + window.counts.missTap, 0) / taps : null,
    avgTimeToTarget: taps > 0
      ? windows.reduce((total, window) => total + window.timings.avgTimeToTarget * window.counts.taps, 0) / taps
      : null,
    errorLoops: windows.reduce((total, window) => total + window.counts.errorLoop, 0)
      / windows.reduce((total, window) => total + window.windowMs, 0) * 10_000,
  };
}

function applyEvent(state: DashboardState, event: AllyBusEvent): DashboardState {
  const next = event.type === "reset" ? createDashboardState() : { ...state };
  next.lastEventAt = event.at;
  next.recentEventIds = [...next.recentEventIds, event.eventId].slice(-SEEN_EVENT_LIMIT);

  switch (event.type) {
    case "heartbeat":
      next.currentContext = event.payload;
      break;
    case "summary": {
      const { summary, profile, preset, confidence } = event.payload;
      next.currentSummary = summary;
      next.summaryHistory = [...state.summaryHistory, summary].slice(-SUMMARY_HISTORY_LIMIT);
      next.profile = profile;
      next.preset = preset;
      next.confidence = confidence;
      next.currentContext = { step: summary.context.step, inputModality: summary.inputModality };
      if (state.firstAppliedAt === null) {
        next.beforeWindows = [...state.beforeWindows, summary].slice(-COMPARISON_WINDOW_LIMIT);
      } else if (state.activeDecision !== null && state.adaptationChangedAt !== null &&
        event.at - summary.windowMs >= state.adaptationChangedAt) {
        next.afterWindows = [...state.afterWindows, summary].slice(-COMPARISON_WINDOW_LIMIT);
      }
      next.comparison = {
        before: state.firstAppliedAt === null ? null : metrics(next.beforeWindows),
        after: metrics(next.afterWindows),
        beforeWindowCount: next.beforeWindows.length,
        afterWindowCount: next.afterWindows.length,
      };
      break;
    }
    case "decision":
      if (!state.decisions.some((decision) => decision.id === event.payload.id)) {
        next.decisions = [
          { ...event.payload, at: event.at, status: "pending" as const },
          ...state.decisions,
        ].slice(0, DECISION_HISTORY_LIMIT);
      }
      break;
    case "applied":
    case "keep":
    case "undo": {
      const decision = state.decisions.find((item) => item.id === event.payload.decisionId)
        ?? (state.activeDecision?.id === event.payload.decisionId ? state.activeDecision : null);
      if (!decision) break;
      const allowed = event.type === "applied" ? decision.status === "pending"
        : event.type === "keep" ? decision.status === "applied"
        : decision.status === "applied" || decision.status === "kept";
      if (!allowed) break;
      const updated = { ...decision, status: event.type === "applied" ? "applied" as const
        : event.type === "keep" ? "kept" as const : "undone" as const };
      next.decisions = state.decisions.map((item) => item.id === decision.id ? updated : item);
      if (event.type === "applied") {
        next.activeDecision = updated;
        next.adaptationChangedAt = event.at;
        if (state.firstAppliedAt === null) {
          next.firstAppliedAt = event.at;
          next.comparison = { ...state.comparison, before: metrics(state.beforeWindows) };
        }
      } else if (state.activeDecision?.id === decision.id) {
        next.activeDecision = event.type === "keep" ? updated
          : next.decisions.find((item) => item.status === "applied" || item.status === "kept") ?? null;
        if (event.type === "undo") next.adaptationChangedAt = event.at;
      }
      break;
    }
  }
  return next;
}

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  if (action.type === "view/reset") return createDashboardState();
  if (action.type === "demo/load") {
    const demo = action.events.reduce((current, event) =>
      current.recentEventIds.includes(event.eventId) ? current : applyEvent(current, event), createDashboardState());
    return { ...demo, mode: "demo" };
  }
  const current = state.mode === "demo" ? createDashboardState() : state;
  if (current.recentEventIds.includes(action.event.eventId)) return state;
  return { ...applyEvent(current, action.event), mode: "live", lastReceivedAt: action.receivedAt };
}
