"use client";

import { useEffect, useRef, useState } from "react";
import { ALLY_CHANNEL_NAME } from "../../../contracts/dashboard";
import type { AllyBusEvent } from "@/lib/dashboard/types";
import styles from "./dashboard.module.css";

export function BusSimulator({ events }: { events: AllyBusEvent[] }) {
  const channel = useRef<BroadcastChannel | null>(null);
  const timer = useRef<number | null>(null);
  const runId = useRef("");
  const cursor = useRef(0);
  const timelineStart = useRef(0);
  const fixtureStart = events[0]?.at ?? 0;
  const fixtureDuration = (events.at(-1)?.at ?? fixtureStart) - fixtureStart;
  const [available, setAvailable] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState("Opening event channel…");

  useEffect(() => {
    try {
      channel.current = new BroadcastChannel(ALLY_CHANNEL_NAME);
      runId.current = crypto.randomUUID();
      timelineStart.current = Date.now() - fixtureDuration;
      setAvailable(true);
      setStatus("Ready. Open the dashboard in another tab on this origin.");
    } catch {
      setStatus("This browser could not open the event channel.");
    }
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      channel.current?.close();
      channel.current = null;
    };
  }, [fixtureDuration]);

  function stop() {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  }

  function resetSession() {
    stop();
    runId.current = crypto.randomUUID();
    cursor.current = 0;
    setIndex(0);
    timelineStart.current = Date.now() - fixtureDuration;
    channel.current?.postMessage({
      version: 1,
      eventId: `${runId.current}:reset`,
      type: "reset",
      at: timelineStart.current,
      payload: {},
    } satisfies AllyBusEvent);
    setStatus("Reset sent. The dashboard remains subscribed.");
  }

  function sendNext() {
    const fixture = events[cursor.current];
    if (!fixture || !channel.current) return;
    const event = structuredClone(fixture);
    event.eventId = `${runId.current}:${fixture.eventId}`;
    // Preserve the summary windows while replaying faster than producer time.
    event.at = timelineStart.current + fixture.at - fixtureStart;
    if (event.type === "decision") event.payload.id = `${runId.current}:${event.payload.id}`;
    if (event.type === "applied" || event.type === "keep" || event.type === "undo") {
      event.payload.decisionId = `${runId.current}:${event.payload.decisionId}`;
    }
    channel.current.postMessage(event);
    cursor.current += 1;
    setIndex(cursor.current);
    setStatus(`Sent ${event.type} · ${cursor.current} of ${events.length} events.`);
    if (cursor.current === events.length) stop();
  }

  function replay() {
    resetSession();
    sendNext();
    setPlaying(true);
    timer.current = window.setInterval(sendNext, 600);
  }

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>Ally · Development tool</p>
            <h1 className={styles.title}>Event simulator</h1>
            <p className={styles.subtitle}>Synthetic events for checking the live dashboard.</p>
          </div>
          <a className={styles.button} href="/dashboard" target="_blank" rel="noreferrer">Open dashboard ↗</a>
        </header>
        <section className={styles.simulatorBody} aria-labelledby="simulator-title">
          <h2 className={styles.sectionHeading} id="simulator-title">Two tabs. One event stream.</h2>
          <p className={styles.emptyCopy}>
            Keep the dashboard open in another tab in this browser. Replay a motor
            adaptation, Keep, a combined adaptation, and Undo. These are sample
            events, not checkout telemetry or measured evaluation results.
          </p>
          <div className={styles.simulatorActions}>
            <button className={styles.button} disabled={!available || playing} onClick={replay} type="button">Replay sample session</button>
            <button className={styles.button} disabled={!available || playing || index >= events.length} onClick={sendNext} type="button">Send next event</button>
            <button className={styles.button} disabled={!playing} onClick={stop} type="button">Stop replay</button>
            <button className={styles.button} disabled={!available} onClick={resetSession} type="button">Reset session</button>
          </div>
          <p className={styles.simulatorStatus} role="status">{status}</p>
          <p className={styles.panelHint}>
            After the last event, the dashboard becomes Idle in 15 seconds.
            BroadcastChannel only reaches tabs on the same browser profile and origin.
          </p>
          <ol className={styles.simulatorEvents} aria-label="Sample event sequence">
            {events.map((event, eventIndex) => (
              <li className={styles.evaluationRow} key={event.eventId} data-sent={eventIndex < index}>
                <span>{String(eventIndex + 1).padStart(2, "0")} · {event.type}</span>
                <span>{eventIndex < index ? "Sent" : eventIndex === index ? "Next" : "Waiting"}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
