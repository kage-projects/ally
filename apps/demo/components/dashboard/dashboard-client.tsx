"use client";

import { useMemo, useState } from "react";

import { buildMockDashboardState } from "@/lib/dashboard/mock-state";
import type { AllyBusEvent, EvaluationResults } from "@/lib/dashboard/types";

import { ActiveAdaptationBanner } from "./active-adaptation-banner";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { DashboardHeader } from "./dashboard-header";
import { DecisionStream } from "./decision-stream";
import { EvaluationPanel } from "./evaluation-panel";
import { LiveSignalsPanel } from "./live-signals-panel";
import { ProfileGauge } from "./profile-gauge";
import { SessionImpactPanel } from "./session-impact-panel";
import styles from "./dashboard.module.css";

type DashboardClientProps = {
  initialEvents: AllyBusEvent[];
  evaluation: EvaluationResults;
};

export function DashboardClient({
  initialEvents,
  evaluation,
}: DashboardClientProps) {
  const [events, setEvents] = useState<AllyBusEvent[]>(initialEvents);
  const dashboard = useMemo(() => buildMockDashboardState(events), [events]);
  const hasData = events.length > 0;

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <a className={styles.skipLink} href="#decision-stream">Skip to decisions</a>
        <DashboardHeader
          hasData={hasData}
          onReset={() => setEvents([])}
          onRestore={() => setEvents(initialEvents)}
          summary={dashboard.currentSummary}
        />

        <div className={styles.workspaceBar}>
          <span className={styles.workspaceLabel}>
            <span className={styles.workspaceDot} aria-hidden="true" />
            Adaptation workspace
          </span>
          <span className={styles.demoLabel}>Preview · Sample data</span>
        </div>

        {hasData ? (
          <>
            <ActiveAdaptationBanner decision={dashboard.activeDecision} />

            <div className={styles.grid}>
              <div className={`${styles.column} ${styles.columnLeft}`}>
                <LiveSignalsPanel summary={dashboard.currentSummary} />
                <ProfileGauge profile={dashboard.profile} />
              </div>

              <div className={`${styles.column} ${styles.columnCenter}`}>
                <DecisionStream decisions={dashboard.decisions} />
              </div>

              <div className={`${styles.column} ${styles.columnRight}`}>
                <SessionImpactPanel comparison={dashboard.comparison} />
                <EvaluationPanel evaluation={evaluation} />
              </div>
            </div>
          </>
        ) : (
          <DashboardEmptyState onRestore={() => setEvents(initialEvents)} />
        )}

        <footer className={styles.footer}>
          <span className={styles.footerBrand}>ally.</span>
          <span>Counters and timings only. No form values, screen content, or PII.</span>
          <span className={styles.footerNote}>Built around people.</span>
        </footer>
      </main>
    </div>
  );
}
