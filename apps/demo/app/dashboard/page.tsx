import type { Metadata } from "next";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type {
  AllyBusEvent,
  EvaluationResults,
} from "@/lib/dashboard/types";
import eventFixtures from "../../../../mocks/dashboard/ally-events.v1.json";
import evaluationFixture from "../../../../mocks/dashboard/eval-results.mock.json";

export const metadata: Metadata = {
  title: "Judge Dashboard | Ally",
  description:
    "Observe Ally friction signals, adaptive decisions, and measurable outcomes.",
};

export default function DashboardPage() {
  return (
    <DashboardClient
      initialEvents={eventFixtures as unknown as AllyBusEvent[]}
      evaluation={evaluationFixture as unknown as EvaluationResults}
    />
  );
}