import type { Metadata } from "next";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { EvaluationResults } from "@/lib/dashboard/types";
import { parseAllyBusEvent } from "@/lib/dashboard/event-parser";
import eventFixtures from "../../../../mocks/dashboard/ally-events.v1.json";
import evaluationFixture from "../../../../mocks/dashboard/eval-results.mock.json";

export const metadata: Metadata = {
  title: "Judge Dashboard | Ally",
  description:
    "Observe Ally friction signals, adaptive decisions, and measurable outcomes.",
};

export default function DashboardPage() {
  const demoEvents = eventFixtures.map((fixture) => {
    const event = parseAllyBusEvent(fixture);
    if (!event) throw new Error("Invalid dashboard demo fixture");
    return event;
  });
  return (
    <DashboardClient
      demoEvents={demoEvents}
      evaluation={evaluationFixture as unknown as EvaluationResults}
    />
  );
}
