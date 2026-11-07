import { ALLY_CHANNEL_NAME } from "../../../contracts/dashboard";
import { parseAllyBusEvent } from "./event-parser";
import type { AllyBusEvent, ConnectionStatus } from "./types";

export const BUS_IDLE_AFTER_MS = 15_000;

export function getConnectionStatus(lastReceivedAt: number | null, now: number, unavailable: boolean): ConnectionStatus {
  if (unavailable) return "unavailable";
  if (lastReceivedAt === null) return "waiting";
  return now - lastReceivedAt >= BUS_IDLE_AFTER_MS ? "idle" : "live";
}

/** A separate channel instance is required for senders, even within one tab. */
export function subscribeAllyBus(onEvent: (event: AllyBusEvent, receivedAt: number) => void): {
  available: boolean;
  close: () => void;
} {
  let channel: BroadcastChannel;
  try {
    if (typeof globalThis.BroadcastChannel !== "function") throw new Error("BroadcastChannel unavailable");
    channel = new BroadcastChannel(ALLY_CHANNEL_NAME);
  } catch {
    return { available: false, close: () => {} };
  }
  let closed = false;
  channel.onmessage = (message: MessageEvent<unknown>) => {
    if (closed) return;
    const event = parseAllyBusEvent(message.data);
    if (event) onEvent(event, Date.now());
    else if (process.env.NODE_ENV === "development") console.warn("Ally ignored an invalid or unsupported bus event.");
  };
  channel.onmessageerror = () => {
    if (process.env.NODE_ENV === "development") console.warn("Ally could not deserialize a bus event.");
  };
  return {
    available: true,
    close: () => {
      if (closed) return;
      closed = true;
      channel.onmessage = null;
      channel.onmessageerror = null;
      channel.close();
    },
  };
}
