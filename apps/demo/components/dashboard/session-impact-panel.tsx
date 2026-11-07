import {
  formatDuration,
  formatImprovement,
  formatPercent,
} from "@/lib/dashboard/formatters";
import type { SessionComparison } from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type SessionImpactPanelProps = {
  comparison: SessionComparison;
};

export function SessionImpactPanel({ comparison }: SessionImpactPanelProps) {
  const { before, after } = comparison;

  return (
    <section className={styles.panel} aria-labelledby="session-impact-title">
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.sectionHeading} id="session-impact-title">
            Session impact
          </h2>
          <p className={styles.panelHint}>
            {comparison.beforeWindowCount} before · {comparison.afterWindowCount} after
          </p>
        </div>
      </div>

      <div className={styles.panelBody}>
        {before && after ? (
          <div className={styles.metricList}>
            <MetricRow
              after={after.misTapRate}
              before={before.misTapRate}
              format={(value) => (value === null ? "—" : formatPercent(value))}
              label="Mis-tap rate"
            />
            <MetricRow
              after={after.avgTimeToTarget}
              before={before.avgTimeToTarget}
              format={(value) => (value === null ? "—" : formatDuration(value))}
              label="Time to target"
            />
            <MetricRow
              after={after.errorLoops}
              before={before.errorLoops}
              format={(value) => (value === null ? "—" : value.toFixed(0))}
              label="Error loops"
            />
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div>
              <div className={styles.emptyIcon} aria-hidden="true">↗</div>
              <h3 className={styles.emptyTitle}>Collecting outcome data</h3>
              <p className={styles.emptyCopy}>
                Metrics appear after Ally receives at least one summary before and
                after an applied adaptation.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MetricRow({
  label,
  before,
  after,
  format,
}: {
  label: string;
  before: number | null;
  after: number | null;
  format: (value: number | null) => string;
}) {
  const improvement = formatImprovement(before, after);
  const improvementLabel =
    before !== null && after !== null && before === after
      ? "No change"
      : improvement === null
        ? "No baseline"
        : `↓ ${Math.max(0, improvement).toFixed(0)}%`;

  return (
    <div className={styles.metricRow}>
      <div className={styles.metricHeader}>
        <span className={styles.metricName}>{label}</span>
        <span className={styles.metricImprovement}>{improvementLabel}</span>
      </div>
      <div className={styles.metricValues}>
        <span className={styles.metricValue}>
          <small>Before</small>
          <strong>{format(before)}</strong>
        </span>
        <span className={styles.metricArrow} aria-hidden="true">→</span>
        <span className={styles.metricValue}>
          <small>After</small>
          <strong>{format(after)}</strong>
        </span>
      </div>
    </div>
  );
}
