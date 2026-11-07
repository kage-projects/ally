import { Button } from "@/components/arc/button/button";
import type { ConnectionStatus } from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type DashboardEmptyStateProps = {
  onRestore: () => void;
  connectionStatus: ConnectionStatus;
};

export function DashboardEmptyState({ onRestore, connectionStatus }: DashboardEmptyStateProps) {
  return (
    <section className={styles.emptyState} aria-labelledby="empty-dashboard-title">
      <div>
        <div className={styles.emptyIcon} aria-hidden="true">⌁</div>
        <h2 className={styles.emptyTitle} id="empty-dashboard-title">
          {connectionStatus === "unavailable" ? "Live updates are unavailable." : "Waiting for Ally events."}
        </h2>
        <p className={styles.emptyCopy}>
          {connectionStatus === "unavailable"
            ? "This browser could not open the event channel. You can still explore a demo session."
            : "Keep this dashboard open alongside checkout on the same browser and origin. Signals and decisions appear as events arrive."}
        </p>
        <Button className={styles.restoreButton} onClick={onRestore} type="button" variant="primary">
          Load demo session
        </Button>
        <p className={styles.emptyHint}>
          Demo data is replaced automatically when a live event arrives.
        </p>
      </div>
    </section>
  );
}
