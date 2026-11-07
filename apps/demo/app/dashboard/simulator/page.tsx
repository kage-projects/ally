import type { Metadata } from "next";
import { BusSimulator } from "@/components/dashboard/bus-simulator";
import { parseAllyBusEvent } from "@/lib/dashboard/event-parser";
import fixtures from "../../../../../mocks/dashboard/ally-events.v1.json";

export const metadata: Metadata = {
  title: "Event Simulator | Ally",
  description: "Send synthetic Ally v1 events to a dashboard in another tab.",
};

export default function SimulatorPage() {
  const events = fixtures.map((fixture) => {
    const event = parseAllyBusEvent(fixture);
    if (!event) throw new Error("Invalid dashboard simulator fixture");
    return event;
  });
  return <BusSimulator events={events} />;
}
