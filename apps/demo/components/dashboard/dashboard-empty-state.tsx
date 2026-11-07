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
          Waiting for Ally events
        </h2>
        <p className={styles.emptyCopy}>
          Open the checkout on the same origin or restore the mock session to preview
          the complete judge-dashboard story.
        </p>
        <Button onClick={onRestore} type="button" variant="primary">
          Restore mock session
        </Button>
      </div>
    </section>
  );
}