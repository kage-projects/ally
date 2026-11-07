"use client";

import { useId, useRef } from "react";
import {
  EVALUATION_REPORT_URL,
  EVALUATION_SOURCE,
  formatEvaluationSample,
  type EvaluationEvidence,
} from "@/lib/dashboard/evaluation";
import type { EvaluationResults } from "@/lib/dashboard/types";
import styles from "./dashboard.module.css";

type EvaluationPanelProps = {
  evidence: EvaluationEvidence;
  demoResults?: EvaluationResults;
  onRefresh?: () => void;
  refreshing?: boolean;
  refreshError?: string | null;
  compact?: boolean;
};

const ROWS = [
  { key: "misTapRate", label: "Mis-tap rate" },
  { key: "timeToComplete", label: "Completion time" },
  { key: "errorLoops", label: "Error loops" },
  { key: "completionRate", label: "Completion rate" },
] as const;

export function EvaluationPanel(props: EvaluationPanelProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  if (!props.compact) return <EvaluationContent {...props} />;
  const demo = props.demoResults?.isMock === true ? props.demoResults : null;
  const results = demo ?? (props.evidence.status === "ready" ? props.evidence.results : null);
  return (
    <section className={styles.panel} id="evaluation-evidence" aria-labelledby={titleId} data-evaluation-state={demo ? "sample" : results ? "ready" : "unavailable"}>
      <div className={styles.panelHeader}>
        <div><h2 className={styles.sectionHeading} id={titleId}>Evaluation</h2><p className={styles.panelHint}>{results ? `${results.sessionsPerVariant} sessions per variant · Mean ± SD` : "Measured results pending"}</p></div>
        {demo ? <span className={styles.mockBadge}>SAMPLE</span> : null}
      </div>
      <div className={styles.panelBody}>
        {results ? <>
          <p className={styles.panelHint}>{demo ? "Illustrative data · Not measured" : "Measured evaluation · Separate from live session"}</p>
          <div className={styles.evaluationGrid} role="table" aria-label="Evaluation summary: mean and standard deviation">
            <div className={styles.evaluationColumnLabels} role="row"><span role="columnheader">Metric</span><span className={styles.evaluationNumbers} role="presentation"><span role="columnheader">Ally off</span><span role="columnheader">Ally on</span></span></div>
            {ROWS.slice(0, 2).map(({ key, label }) => <div className={styles.evaluationRow} role="row" key={key}>
              <span className={styles.evaluationName} role="rowheader">{label}</span>
              <span className={styles.evaluationNumbers} role="presentation"><span role="cell">{formatEvaluationSample(results.metrics[key].allyOff.mean, results.metrics[key].allyOff.standardDeviation, results.metrics[key].unit)}</span><strong role="cell">{formatEvaluationSample(results.metrics[key].allyOn.mean, results.metrics[key].allyOn.standardDeviation, results.metrics[key].unit)}</strong></span>
            </div>)}
          </div>
        </> : <p className={styles.panelHint}>Awaiting validated results from {EVALUATION_SOURCE}.</p>}
        <button className={styles.detailToggle} type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>View all evaluation results ↗</button>
        {props.refreshError ? <p className={styles.panelHint} role="status">{props.refreshError}</p> : null}
      </div>
      <dialog ref={dialog} className={styles.decisionDialog} aria-label="Full evaluation results">
        <div className={styles.dialogHeading}><h2 className={styles.adaptationTitle}>Evaluation evidence</h2><button className={styles.dialogClose} type="button" onClick={() => dialog.current?.close()}>Close ×</button></div>
        <EvaluationContent {...props} />
      </dialog>
    </section>
  );
}

function EvaluationContent({
  evidence,
  demoResults,
  onRefresh,
  refreshing = false,
  refreshError = null,
  compact = false,
}: EvaluationPanelProps) {
  const headingId = useId();
  const demo = demoResults?.isMock === true ? demoResults : null;
  const results = demo ?? (evidence.status === "ready" ? evidence.results : null);
  const state = demo ? "sample" : results ? "ready" : "unavailable";

  return (
    <section
      className={styles.panel}
      id={compact ? undefined : "evaluation-evidence"}
      aria-labelledby={headingId}
      data-evaluation-state={state}
    >
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.sectionHeading} id={headingId}>Evaluation</h2>
          <p className={styles.panelHint}>
            {results ? `${results.sessionsPerVariant} sessions per variant · Mean ± SD` : "Measured results pending"}
          </p>
        </div>
        {onRefresh ? (
          <button
            className={styles.detailToggle}
            onClick={onRefresh}
            type="button"
            disabled={refreshing}
            aria-busy={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh results"}
          </button>
        ) : null}
      </div>

      <div className={styles.panelBody}>
        {refreshError ? <p className={styles.panelHint} role="status">{refreshError}</p> : null}
        {results ? (
          <>
            {demo ? (
              <div className={styles.mockNotice} role="note">
                <span className={styles.mockBadge}>SAMPLE · NOT MEASURED</span>
                <span>{demo.label}</span>
              </div>
            ) : (
              <div className={styles.evaluationMeta}>
                <span>Measured evaluation</span>
                <span>{results.label}</span>
              </div>
            )}

            <p className={styles.panelHint}>{results.scenario}</p>
            <div
              className={styles.evaluationGrid}
              role="table"
              aria-label="Ally off and Ally on: mean and standard deviation"
            >
              <div className={styles.evaluationColumnLabels} role="row">
                <span role="columnheader">Metric</span>
                <span className={styles.evaluationNumbers} role="presentation">
                  <span role="columnheader">Ally off</span>
                  <span role="columnheader">Ally on</span>
                </span>
              </div>
              {ROWS.map(({ key, label }) => {
                const metric = results.metrics[key];
                return (
                  <div className={styles.evaluationRow} role="row" key={key}>
                    <span className={styles.evaluationName} role="rowheader">{label}</span>
                    <span className={styles.evaluationNumbers} role="presentation">
                      <span role="cell">{formatEvaluationSample(metric.allyOff.mean, metric.allyOff.standardDeviation, metric.unit)}</span>
                      <strong role="cell">{formatEvaluationSample(metric.allyOn.mean, metric.allyOn.standardDeviation, metric.unit)}</strong>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={styles.evaluationMeta}>
              <span>{demo ? "Illustrative data for demo mode only." : `Source: ${EVALUATION_SOURCE}`}</span>
              {!demo && results.generatedAt ? (
                <time dateTime={results.generatedAt}>{formatGeneratedAt(results.generatedAt)} UTC</time>
              ) : null}
              <span>Evaluation runs are separate from this live session.</span>
            </div>
            {!demo && evidence.status === "ready" && evidence.reportAvailable ? (
              <div className={styles.evaluationActions}>
                <a className={styles.detailToggle} href={EVALUATION_REPORT_URL} target="_blank" rel="noreferrer">
                  View full results <span aria-hidden="true">↗</span>
                </a>
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.evaluationUnavailable}>
            <h3 className={styles.sectionHeading}>Awaiting measured results</h3>
            <p className={styles.panelHint}>{evidence.status === "unavailable" ? evidence.message : "No validated results are available."}</p>
            <p className={styles.panelHint}>Expected source: {EVALUATION_SOURCE}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function formatGeneratedAt(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}
