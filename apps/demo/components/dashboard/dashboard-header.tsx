import { Button } from "@/components/arc/button/button";
import type { ConnectionStatus, DashboardState } from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type DashboardHeaderProps = {
  context: DashboardState["currentContext"];
  mode: DashboardState["mode"];
  connectionStatus: ConnectionStatus;
  secondsSinceEvent: number | null;
  hasData: boolean;
  onReset: () => void;
  onRestore: () => void;
};

export function DashboardHeader({
  context,
  mode,
  connectionStatus,
  secondsSinceEvent,
  hasData,
  onReset,
  onRestore,
}: DashboardHeaderProps) {
  const statusLabel = connectionStatus === "waiting" ? "Listening"
    : connectionStatus === "live" ? "Live"
    : connectionStatus === "idle" ? "Idle · Waiting for checkout"
    : "Live updates unavailable";

  return (
    <header className={styles.topbar}>
      <div className={styles.brandRow}>
        <a className={styles.brand} href="/dashboard" aria-label="Ally dashboard">
          <svg className={styles.mark} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M5 26 15 6h3l9 20h-6l-5-12-5 12H5Z" fill="currentColor" />
            <path d="m12 22 9-4" stroke="currentColor" strokeWidth="3" />
          </svg>
          <span>ally<span className={styles.brandDot}>.</span></span>
        </a>
        <span className={styles.brandDivider} aria-hidden="true" />
        <div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>Every signal. Every decision.</p>
        </div>
      </div>

      <div className={styles.headerMeta}>
        <div className={styles.statusRow} aria-label="Current dashboard context">
          {mode === "live" ? (
            <span className={styles.statusPill} data-status={connectionStatus}>
              <span className={styles.statusDot} aria-hidden="true" />
              <span role="status">{statusLabel}</span>
            </span>
          ) : null}
          {mode === "live" && secondsSinceEvent !== null ? (
            <span className={styles.lastEvent} title="Time since the last valid event was received">
              {secondsSinceEvent}s ago
            </span>
          ) : null}
          <span className={styles.contextPill}>
            {context?.inputModality ?? "—"}
          </span>
          <span className={styles.contextPill}>
            {context?.step ?? "—"}
          </span>
        </div>

        <div className={styles.headerActions}>
          <a className={styles.button} href="/dashboard/simulator" target="_blank" rel="noreferrer">
            Event simulator <span aria-hidden="true">↗</span>
          </a>
          <a className={styles.button} href="#evaluation-evidence">
            Evaluation <span aria-hidden="true">↗</span>
          </a>
          <Button
            className={styles.arcButton}
            onClick={hasData ? onReset : onRestore}
            size="sm"
            type="button"
            variant="ghost"
          >
            {hasData ? "Reset view" : "Load demo"}
          </Button>
        </div>
      </div>
    </header>
  );
}
