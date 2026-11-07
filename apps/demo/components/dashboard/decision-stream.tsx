"use client";

import { useMemo, useState } from "react";

import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import {
  formatClock,
  formatPercent,
  formatPreset,
} from "@/lib/dashboard/formatters";
import type {
  AdaptationPlan,
  DashboardDecision,
  DecisionSource,
  DecisionStatus,
} from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type DecisionFilter = "all" | DecisionSource;

type DecisionStreamProps = {
  decisions: DashboardDecision[];
};

export function DecisionStream({ decisions }: DecisionStreamProps) {
  const [filter, setFilter] = useState<DecisionFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(
    decisions[0]?.id ?? null,
  );

  const filteredDecisions = useMemo(
    () =>
      filter === "all"
        ? decisions
        : decisions.filter((decision) => decision.source === filter),
    [decisions, filter],
  );

  return (
    <section className={`${styles.panel} ${styles.streamPanel}`} id="decision-stream" aria-labelledby="decision-stream-title">
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.sectionHeading} id="decision-stream-title">
            Decision stream
          </h2>
          <p className={styles.panelHint}>
            How Ally responds, and why.
          </p>
        </div>

        <span className={styles.entryCount}>{decisions.length} decisions</span>
      </div>

      <SegmentedControl
          className={styles.streamTabs}
          label="Filter decisions by source"
          onValueChange={(value) => setFilter(value as DecisionFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "rule", label: "Rule" },
            { value: "llm", label: "LLM" },
          ]}
          value={filter}
        />

      {filteredDecisions.length ? (
        <div className={styles.decisionList}>
          {filteredDecisions.map((decision) => {
            const expanded = expandedId === decision.id;
            const changes = getPlanDiff(decision.previousPlan, decision.plan);

            return (
              <article className={styles.decisionEntry} key={decision.id}>
                <div className={styles.decisionAvatar} aria-hidden="true">
                  {decision.source === "llm" ? "AI" : "A"}
                </div>
                <div className={styles.decisionContent}>
                <div className={styles.decisionTopline}>
                  <div>
                    <h3 className={styles.decisionTitle}>
                      {formatPreset(decision.preset)}
                    </h3>
                    <div className={styles.sourceMeta}>
                      <SourceBadge source={decision.source} />
                      <span aria-hidden="true">·</span>
                      <span>{formatClock(decision.at)}</span>
                      <span>{decision.latencyMs}ms</span>
                      <span>{formatPercent(decision.confidence)} confidence</span>
                    </div>
                  </div>

                  <StatusBadge status={decision.status} />
                </div>

                <p className={styles.decisionExplanation}>
                  {decision.explanation}
                </p>

                {expanded ? (
                  <div className={styles.decisionDetails} id={`details-${decision.id}`}>
                    <div className={styles.detailLabel}>What changed</div>
                    <dl className={styles.diffList}>
                      {changes.map((change) => (
                        <div className={styles.diffItem} key={change.label}>
                          <dt>{change.label}</dt>
                          <dd>{change.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className={styles.guardrailList}>
                      <GuardrailItem
                        label="Schema valid"
                        valid={decision.guardrails.schemaValid}
                      />
                      <GuardrailItem
                        label="Policy clamp"
                        valid={decision.guardrails.policyClamped}
                        validCopy="Applied"
                        invalidCopy="Not needed"
                      />
                      <GuardrailItem
                        label="Locked content"
                        valid={decision.guardrails.lockedComponentsPreserved}
                        validCopy="Preserved"
                      />
                    </div>
                  </div>
                ) : null}

                <button
                  aria-expanded={expanded}
                  aria-controls={expanded ? `details-${decision.id}` : undefined}
                  aria-label={`${expanded ? "Hide" : "View"} details for ${formatPreset(decision.preset)}`}
                  className={styles.detailToggle}
                  onClick={() => setExpandedId(expanded ? null : decision.id)}
                  type="button"
                >
                  {expanded ? "Hide details" : "View details"}
                  <span aria-hidden="true">{expanded ? "↑" : "↓"}</span>
                </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.panelBody}>
          <p className={styles.panelHint}>No decisions match this filter.</p>
        </div>
      )}

      <div className={styles.streamEnd}>
        <span className={styles.streamEndMark} aria-hidden="true">✳</span>
        <span>You’re all caught up.</span>
        <p>Every adaptation leaves a clear trail.</p>
      </div>
    </section>
  );
}

function SourceBadge({ source }: { source: DecisionSource }) {
  return (
    <span className={source === "llm" ? styles.sourceLlm : styles.sourceTag}>
      {source.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: DecisionStatus }) {
  const statusClass =
    status === "kept" ? styles.statusKept : status === "undone" ? styles.statusUndone : styles.statusNeutral;

  return (
    <span className={`${styles.decisionStatus} ${statusClass}`}>
      <span aria-hidden="true">{status === "kept" ? "✓" : status === "undone" ? "↶" : "·"}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function GuardrailItem({
  label,
  valid,
  validCopy = "Passed",
  invalidCopy = "Failed",
}: {
  label: string;
  valid: boolean;
  validCopy?: string;
  invalidCopy?: string;
}) {
  return (
    <span className={styles.guardrailItem}>
      <strong>{valid ? "✓" : "○"} {label}</strong> ·{" "}
      {valid ? validCopy : invalidCopy}
    </span>
  );
}

function getPlanDiff(
  previous: AdaptationPlan | null,
  plan: AdaptationPlan,
): Array<{ label: string; value: string }> {
  const previousTokens = previous?.tokens;

  return [
    {
      label: "Target",
      value: `${previousTokens?.targetMinSize ?? 44}px → ${plan.tokens.targetMinSize}px`,
    },
    {
      label: "Spacing",
      value: `${previousTokens?.spacingScale ?? 1}× → ${plan.tokens.spacingScale}×`,
    },
    {
      label: "Font",
      value: `${previousTokens?.fontScale ?? 1}× → ${plan.tokens.fontScale}×`,
    },
    {
      label: "Contrast",
      value: `${previousTokens?.contrast ?? "normal"} → ${plan.tokens.contrast}`,
    },
    {
      label: "Density",
      value: `${previousTokens?.density ?? "compact"} → ${plan.tokens.density}`,
    },
    {
      label: "Non-essential",
      value: plan.layout.hideNonEssential.length
        ? `hide ${plan.layout.hideNonEssential.join(", ")}`
        : "keep visible",
    },
  ];
}
