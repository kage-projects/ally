import { Button } from "@/components/arc/button/button";
import type { FrictionSummary } from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type DashboardHeaderProps = {
  summary: FrictionSummary | null;
  hasData: boolean;
  onReset: () => void;
  onRestore: () => void;
};

export function DashboardHeader({
  summary,
  hasData,
  onReset,
  onRestore,
}: DashboardHeaderProps) {
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
          <span className={styles.statusPill}>
            <span className={styles.statusDot} aria-hidden="true" />
            {hasData ? "Demo session" : "No session loaded"}
          </span>
          <span className={styles.contextPill}>
            {summary?.inputModality ?? "—"}
          </span>
          <span className={styles.contextPill}>
            {summary?.context.step ?? "—"}
          </span>
        </div>

        <div className={styles.headerActions}>
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
