import Link from "next/link";

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
        <div className={styles.mark} aria-hidden="true">
          A
        </div>
        <div>
          <div className={styles.eyebrow}>Ally · Judge Dashboard</div>
          <h1 className={styles.title}>Live Control Center</h1>
          <p className={styles.subtitle}>Observe → Decide → Adapt → Prove</p>
        </div>
      </div>

      <div className={styles.headerMeta}>
        <div className={styles.statusRow} aria-label="Current dashboard context">
          <span className={styles.statusPill}>
            <span className={styles.statusDot} aria-hidden="true" />
            {hasData ? "Live mock session" : "Listening"}
          </span>
          <span className={styles.contextPill}>
            {summary?.inputModality ?? "No modality"}
          </span>
          <span className={styles.contextPill}>
            {summary?.context.step ?? "Waiting for checkout"}
          </span>
        </div>

        <div className={styles.headerActions}>
          <Link className={styles.button} href="/checkout" target="_blank">
            Open checkout
          </Link>
          <a className={styles.buttonPrimary} href="#evaluation-evidence">
            View evaluation
          </a>
          <Button
            className={styles.arcButton}
            onClick={hasData ? onReset : onRestore}
            size="sm"
            type="button"
            variant="secondary"
          >
            {hasData ? "Reset view" : "Restore mock"}
          </Button>
        </div>
      </div>
    </header>
  );
}