"use client";

import type { AllyBusEvent, EvaluationResults } from "@/lib/dashboard/types";
import { useAllyBus } from "@/lib/dashboard/use-ally-bus";

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
  demoEvents: AllyBusEvent[];
  evaluation: EvaluationResults;
};

export function DashboardClient({
  demoEvents,
  evaluation,
}: DashboardClientProps) {
  const { dashboard, connectionStatus, secondsSinceEvent, reset, loadDemo } = useAllyBus();
  const hasData = dashboard.currentSummary !== null || dashboard.decisions.length > 0;
  const streamLabel = dashboard.mode === "demo" ? "Demo · Sample session"
    : connectionStatus === "waiting" ? "Listening · Same-origin events"
    : connectionStatus === "unavailable" ? "Event channel unavailable"
    : connectionStatus === "idle" ? "Idle · Session retained"
    : "Live event stream";

  return (
    <div className={styles.page}>
      <main className={styles.shell}>
        <a className={styles.skipLink} href="#decision-stream">Skip to decisions</a>
        <DashboardHeader
          hasData={hasData}
          onReset={reset}
          onRestore={() => loadDemo(demoEvents)}
          context={dashboard.currentContext}
          mode={dashboard.mode}
          connectionStatus={connectionStatus}
          secondsSinceEvent={secondsSinceEvent}
        />

        <div className={styles.workspaceBar}>
          <span className={styles.workspaceLabel}>
            <span className={styles.workspaceDot} aria-hidden="true" />
            Adaptation workspace
          </span>
          <span className={styles.demoLabel}>
            {streamLabel}
          </span>
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
          <DashboardEmptyState
            connectionStatus={connectionStatus}
            onRestore={() => loadDemo(demoEvents)}
          />
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
