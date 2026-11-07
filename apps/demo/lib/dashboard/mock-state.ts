import type {
  AllyBusEvent,
  DashboardDecision,
  DashboardViewModel,
  FrictionSummary,
  MetricSnapshot,
  Profile,
  SessionComparison,
} from "./types";

const EMPTY_PROFILE: Profile = {
  motor: 0,
  visual: 0,
  cognitive: 0,
};

function toMetricSnapshot(summary: FrictionSummary): MetricSnapshot {
  return {
    misTapRate:
      summary.counts.taps > 0
        ? summary.counts.missTap / summary.counts.taps
        : null,
    avgTimeToTarget: summary.timings.avgTimeToTarget,
    errorLoops: summary.counts.errorLoop,
  };
}

function getSessionComparison(events: AllyBusEvent[]): SessionComparison {
  const firstApplied = events.find((event) => event.type === "applied");

  if (!firstApplied) {
    return {
      before: null,
      after: null,
      beforeWindowCount: 0,
      afterWindowCount: 0,
    };
  }

  const summaries = events.filter(
    (event): event is Extract<AllyBusEvent, { type: "summary" }> =>
      event.type === "summary",
  );

  const beforeWindows = summaries.filter((event) => event.at <= firstApplied.at);
  const afterWindows = summaries.filter((event) => event.at > firstApplied.at);
  const before = beforeWindows.at(-1)?.payload.summary ?? null;
  const after = afterWindows.at(0)?.payload.summary ?? null;

  return {
    before: before ? toMetricSnapshot(before) : null,
    after: after ? toMetricSnapshot(after) : null,
    beforeWindowCount: beforeWindows.length,
    afterWindowCount: after ? 1 : 0,
  };
}

export function buildMockDashboardState(
  events: AllyBusEvent[],
): DashboardViewModel {
  const summaries: FrictionSummary[] = [];
  const decisions: DashboardDecision[] = [];
  const decisionById = new Map<string, DashboardDecision>();
  let profile = EMPTY_PROFILE;
  let preset: DashboardViewModel["preset"] = null;
  let confidence = 0;

  for (const event of events) {
    if (event.type === "summary") {
      summaries.push(event.payload.summary);
      profile = event.payload.profile;
      preset = event.payload.preset;
      confidence = event.payload.confidence;
    }

    if (event.type === "decision") {
      const decision: DashboardDecision = {
        ...event.payload,
        at: event.at,
        status: "pending",
      };

      decisions.push(decision);
      decisionById.set(decision.id, decision);
    }

    if (
      event.type === "applied" ||
      event.type === "keep" ||
      event.type === "undo"
    ) {
      const decision = decisionById.get(event.payload.decisionId);

      if (decision) {
        decision.status =
          event.type === "applied"
            ? "applied"
            : event.type === "keep"
              ? "kept"
              : "undone";
      }
    }
  }

  const activeDecision =
    [...decisions]
      .reverse()
      .find(
        (decision) =>
          decision.status === "applied" || decision.status === "kept",
      ) ?? null;

  return {
    currentSummary: summaries.at(-1) ?? null,
    summaryHistory: summaries.slice(-30),
    profile,
    preset,
    confidence,
    decisions: [...decisions].reverse(),
    activeDecision,
    comparison: getSessionComparison(events),
    lastEventAt: events.at(-1)?.at ?? null,
  };
}