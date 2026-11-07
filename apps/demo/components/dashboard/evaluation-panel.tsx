import { Badge } from "@/components/arc/badge/badge";
import type { EvaluationResults } from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type EvaluationPanelProps = {
  evaluation: EvaluationResults;
};

export function EvaluationPanel({ evaluation }: EvaluationPanelProps) {
  return (
    <section
      className={styles.panel}
      id="evaluation-evidence"
      aria-labelledby="evaluation-title"
    >
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.sectionHeading} id="evaluation-title">
            <span className={styles.sectionIcon} aria-hidden="true" />
            Evaluation evidence
          </h2>
          <p className={styles.panelHint}>
            {evaluation.sessionsPerVariant} sessions per variant
          </p>
        </div>
      </div>

      <div className={styles.panelBody}>
        {evaluation.isMock ? (
          <div className={styles.mockNotice} role="note">
            <Badge outline pill size="sm" tone="warning">
              MOCK
            </Badge>
            <span>{evaluation.label}</span>
          </div>
        ) : null}

        <div className={styles.evaluationGrid}>
          <EvaluationRow
            allyOff={formatMetric(evaluation.metrics.misTapRate.allyOff.mean, "percent")}
            allyOn={formatMetric(evaluation.metrics.misTapRate.allyOn.mean, "percent")}
            label="Mis-tap rate"
          />
          <EvaluationRow
            allyOff={formatMetric(evaluation.metrics.timeToComplete.allyOff.mean, "seconds")}
            allyOn={formatMetric(evaluation.metrics.timeToComplete.allyOn.mean, "seconds")}
            label="Completion time"
          />
          <EvaluationRow
            allyOff={formatMetric(evaluation.metrics.errorLoops.allyOff.mean, "count")}
            allyOn={formatMetric(evaluation.metrics.errorLoops.allyOn.mean, "count")}
            label="Error loops"
          />
          <EvaluationRow
            allyOff={formatMetric(evaluation.metrics.completionRate.allyOff.mean, "percent")}
            allyOn={formatMetric(evaluation.metrics.completionRate.allyOn.mean, "percent")}
            label="Completion rate"
          />
        </div>
      </div>
    </section>
  );
}

function EvaluationRow({
  label,
  allyOff,
  allyOn,
}: {
  label: string;
  allyOff: string;
  allyOn: string;
}) {
  return (
    <div className={styles.evaluationRow}>
      <span className={styles.evaluationName}>{label}</span>
      <span className={styles.evaluationNumbers}>
        <span>{allyOff}</span>
        <strong>{allyOn}</strong>
      </span>
    </div>
  );
}

function formatMetric(
  value: number,
  unit: "percent" | "seconds" | "count",
): string {
  if (unit === "percent") return `${value.toFixed(0)}%`;
  if (unit === "seconds") return `${value.toFixed(0)}s`;
  return value.toFixed(1);
}