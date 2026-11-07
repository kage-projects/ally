import { Button } from "@/components/arc/button/button";

import styles from "./dashboard.module.css";

type DashboardEmptyStateProps = {
  onRestore: () => void;
};

export function DashboardEmptyState({ onRestore }: DashboardEmptyStateProps) {
  return (
    <section className={styles.emptyState} aria-labelledby="empty-dashboard-title">
      <div>
        <div className={styles.emptyIcon} aria-hidden="true">⌁</div>
        <h2 className={styles.emptyTitle} id="empty-dashboard-title">
          A fresh perspective.
        </h2>
        <p className={styles.emptyCopy}>
          Your view is clear. Load a demo session to explore interaction signals,
          adaptation decisions, and their impact.
        </p>
        <Button className={styles.restoreButton} onClick={onRestore} type="button" variant="primary">
          Load demo session
        </Button>
      </div>
    </section>
  );
}
