import type { Metadata } from "next";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { parseAllyBusEvent } from "@/lib/dashboard/event-parser";
import { parseEvaluationResults } from "@/lib/dashboard/evaluation";
import { loadEvaluationEvidence } from "@/lib/dashboard/evaluation-loader";
import eventFixtures from "../../../../mocks/dashboard/ally-events.v1.json";
import evaluationFixture from "../../../../mocks/dashboard/eval-results.mock.json";

export const metadata: Metadata = {
  title: "Judge Dashboard | Ally",
  description:
    "Observe Ally friction signals, adaptive decisions, and measurable outcomes.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const demoEvents = eventFixtures.map((fixture) => {
    const event = parseAllyBusEvent(fixture);
    if (!event) throw new Error("Invalid dashboard demo fixture");
    return event;
  });
  const demoEvaluation = parseEvaluationResults(evaluationFixture, { allowMock: true });
  if (!demoEvaluation) throw new Error("Invalid dashboard evaluation fixture");
  const initialEvaluation = await loadEvaluationEvidence();
  return (
    <DashboardClient
      demoEvents={demoEvents}
      initialEvaluation={initialEvaluation}
      demoEvaluation={demoEvaluation}
    />
  );
}
