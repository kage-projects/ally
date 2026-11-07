"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/arc/badge/badge";
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
    <section className={styles.panel} aria-labelledby="decision-stream-title">
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.sectionHeading} id="decision-stream-title">
            <span className={styles.sectionIcon} aria-hidden="true" />
            Decision stream
          </h2>
          <p className={styles.panelHint}>
            White-box adaptations from rule and LLM paths
          </p>
        </div>

        <SegmentedControl
          label="Filter decisions by source"
          onValueChange={(value) => setFilter(value as DecisionFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "rule", label: "Rule" },
            { value: "llm", label: "LLM" },
          ]}
          value={filter}
        />
      </div>

      {filteredDecisions.length ? (
        <div className={styles.decisionList}>
          {filteredDecisions.map((decision) => {
            const expanded = expandedId === decision.id;
            const changes = getPlanDiff(decision.previousPlan, decision.plan);

            return (
              <button
                aria-expanded={expanded}
                className={`${styles.decisionButton} ${
                  expanded ? styles.decisionExpanded : ""
                }`}
                key={decision.id}
                onClick={() => setExpandedId(expanded ? null : decision.id)}
                type="button"
              >
                <div className={styles.decisionTopline}>
                  <div>
                    <div className={styles.decisionTitle}>
                      {formatPreset(decision.preset)}
                    </div>
                    <div className={styles.sourceMeta}>
                      <SourceBadge source={decision.source} />
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
                  <>
                    <div className={styles.diffList}>
                      {changes.map((change) => (
                        <span className={styles.diffItem} key={change.label}>
                          <strong>{change.label}</strong> · {change.value}
                        </span>
                      ))}
                    </div>

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
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.panelBody}>
          <p className={styles.panelHint}>No decisions match this filter.</p>
        </div>
      )}
    </section>
  );
}

function SourceBadge({ source }: { source: DecisionSource }) {
  const color =
    source === "llm" ? "violet" : source === "rule" ? "amber" : "sky";

  return (
    <Badge color={color} outline pill size="sm">
      {source.toUpperCase()}
    </Badge>
  );
}

function StatusBadge({ status }: { status: DecisionStatus }) {
  const tone =
    status === "kept" ? "success" : status === "undone" ? "danger" : "info";

  return (
    <Badge outline pill size="sm" tone={tone}>
      {status.toUpperCase()}
    </Badge>
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