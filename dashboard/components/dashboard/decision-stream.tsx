"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { getPlanDiff } from "@/lib/dashboard/decision-diff";
import { formatClock, formatPercent, formatPreset } from "@/lib/dashboard/formatters";
import type { DashboardDecision, DecisionSource, DecisionStatus } from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type DecisionFilter = "all" | DecisionSource;

export function DecisionStream({ decisions }: { decisions: DashboardDecision[] }) {
  const [filter, setFilter] = useState<DecisionFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const stream = useRef<HTMLElement>(null);
  const dialogTitleId = useId();
  const selectedDecision = decisions.find((decision) => decision.id === selectedId) ?? null;
  const isDialogOpen = selectedDecision !== null || historyOpen;
  const filteredDecisions = useMemo(
    () => filter === "all" ? decisions : decisions.filter((decision) => decision.source === filter),
    [decisions, filter],
  );

  useEffect(() => {
    const element = dialog.current;
    const openingTrigger = trigger.current;
    const section = stream.current;
    if (!isDialogOpen || !element) return;
    if (!element.open) element.showModal();
    return () => {
      if (element.open) element.close();
      if (!openingTrigger?.isConnected) {
        const fallback = section?.isConnected ? section : document.getElementById("dashboard-content");
        fallback?.focus({ preventScroll: true });
      }
    };
  }, [isDialogOpen]);

  function closeDetails() {
    dialog.current?.close();
  }

  function restoreFocus() {
    setSelectedId(null);
    setHistoryOpen(false);
    if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
    else (stream.current ?? document.getElementById("dashboard-content"))?.focus({ preventScroll: true });
  }

  return (
    <section
      className={`${styles.panel} ${styles.streamPanel}`}
      id="decision-stream"
      aria-labelledby="decision-stream-title"
      ref={stream}
      tabIndex={-1}
    >
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.sectionHeading} id="decision-stream-title">Decision stream</h2>
          <p className={styles.panelHint}>How Ally responds, and why.</p>
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
          { value: "fallback", label: "Fallback" },
        ]}
        value={filter}
      />

      {filteredDecisions.length ? (
        <div className={styles.decisionList}>
          {filteredDecisions.slice(0, 2).map((decision) => (
            <article className={styles.decisionEntry} key={decision.id}>
              <div className={styles.decisionAvatar} aria-hidden="true">
                {decision.source === "llm" ? "AI" : decision.source === "fallback" ? "F" : "A"}
              </div>
              <div className={styles.decisionContent}>
                <div className={styles.decisionTopline}>
                  <div>
                    <h3 className={styles.decisionTitle}>{formatPreset(decision.preset)}</h3>
                    <div className={styles.sourceMeta}>
                      <SourceBadge source={decision.source} />
                      <span aria-hidden="true">·</span>
                      <time dateTime={new Date(decision.at).toISOString()} title="UTC">
                        {formatClock(decision.at)} UTC
                      </time>
                      <span>{decision.latencyMs}ms</span>
                      <span>{formatPercent(decision.confidence)} confidence</span>
                    </div>
                  </div>
                  <StatusBadge status={decision.status} />
                </div>
                <p className={`${styles.decisionExplanation} ${styles.decisionPreview}`}>{decision.explanation}</p>
                <button
                  aria-haspopup="dialog"
                  aria-label={`View details for ${formatPreset(decision.preset)}`}
                  className={styles.detailToggle}
                  onClick={(event) => {
                    trigger.current = event.currentTarget;
                    setSelectedId(decision.id);
                  }}
                  type="button"
                >
                  View details <span aria-hidden="true">↗</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.panelBody}>
          <p className={styles.panelHint}>
            {decisions.length ? "No decisions match this filter." : "Waiting for the first adaptation decision."}
          </p>
        </div>
      )}

      {filteredDecisions.length ? (
        <div className={styles.streamEnd}>
          <button className={styles.detailToggle} type="button" aria-haspopup="dialog" onClick={(event) => {
            trigger.current = event.currentTarget;
            setHistoryOpen(true);
          }}>View all decisions <span aria-hidden="true">↗</span></button>
        </div>
      ) : null}

      <dialog
        ref={dialog}
        className={styles.decisionDialog}
        aria-labelledby={dialogTitleId}
        onClose={restoreFocus}
      >
        {selectedDecision ? (
          <>
            <div className={styles.dialogHeading}>
              <div>
                <p className={styles.eyebrow}>Decision details</p>
                <h2 className={styles.adaptationTitle} id={dialogTitleId}>
                  {formatPreset(selectedDecision.preset)}
                </h2>
              </div>
              <button className={styles.dialogClose} onClick={closeDetails} type="button">
                Close <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className={styles.dialogBody}>
              <div className={styles.sourceMeta}>
                <SourceBadge source={selectedDecision.source} />
                <StatusBadge status={selectedDecision.status} />
                <span>{selectedDecision.latencyMs}ms</span>
                <span>{formatPercent(selectedDecision.confidence)} confidence</span>
              </div>
              <p className={styles.decisionExplanation}>{selectedDecision.explanation}</p>
              {historyOpen ? <button className={styles.detailToggle} type="button" onClick={() => setSelectedId(null)}>← Back to history</button> : null}
              <DecisionChanges decision={selectedDecision} />
              <div className={styles.guardrailList} aria-label="Guardrail results">
                <GuardrailItem label="Schema valid" valid={selectedDecision.guardrails.schemaValid} />
                <GuardrailItem
                  label="Policy clamp"
                  valid={selectedDecision.guardrails.policyClamped}
                  validCopy="Applied"
                  invalidCopy="Not needed"
                />
                <GuardrailItem
                  label="Locked content"
                  valid={selectedDecision.guardrails.lockedComponentsPreserved}
                  validCopy="Preserved"
                />
              </div>
              <dl className={styles.dialogMeta}>
                <div><dt>Decision ID</dt><dd>{selectedDecision.id}</dd></div>
                <div><dt>Recorded at</dt><dd>{new Date(selectedDecision.at).toISOString()}</dd></div>
                <div><dt>Plan lifetime</dt><dd>{selectedDecision.plan.ttlSeconds}s</dd></div>
                <div>
                  <dt>Friction profile</dt>
                  <dd>
                    Motor {formatPercent(selectedDecision.plan.profile.motor)} · Visual {formatPercent(selectedDecision.plan.profile.visual)} · Cognitive {formatPercent(selectedDecision.plan.profile.cognitive)}
                  </dd>
                </div>
              </dl>
            </div>
          </>
        ) : historyOpen ? (
          <>
            <div className={styles.dialogHeading}>
              <div><p className={styles.eyebrow}>Decision history</p><h2 className={styles.adaptationTitle} id={dialogTitleId}>All decisions · {decisions.length}</h2></div>
              <button className={styles.dialogClose} onClick={closeDetails} type="button">Close ×</button>
            </div>
            <div className={styles.dialogBody}>
              <p className={styles.panelHint}>Latest first · All sources · Up to 100 recorded decisions</p>
              {decisions.map((decision) => <article className={styles.historyEntry} key={decision.id}>
                <div className={styles.decisionTopline}><h3 className={styles.decisionTitle}>{formatPreset(decision.preset)}</h3><StatusBadge status={decision.status} /></div>
                <div className={styles.sourceMeta}><SourceBadge source={decision.source} /><span>{formatClock(decision.at)} UTC</span><span>{decision.latencyMs}ms</span></div>
                <p className={styles.decisionExplanation}>{decision.explanation}</p>
                <button className={styles.detailToggle} type="button" onClick={() => setSelectedId(decision.id)}>View details for {formatPreset(decision.preset)} ↗</button>
              </article>)}
              {!decisions.length ? <p>No decisions in the current session.</p> : null}
            </div>
          </>
        ) : null}
      </dialog>
    </section>
  );
}

function DecisionChanges({ decision }: { decision: DashboardDecision }) {
  const changes = getPlanDiff(decision.previousPlan, decision.plan);
  return (
    <div className={styles.decisionDetails}>
      <h3 className={styles.detailLabel}>
        {decision.previousPlan ? "What changed" : "Requested settings"}
      </h3>
      {!decision.previousPlan ? (
        <p className={styles.panelHint}>The previous plan was not recorded; no default values are assumed.</p>
      ) : null}
      {changes.length ? (
        <dl className={styles.diffList}>
          {changes.map((change) => (
            <div className={styles.diffItem} key={change.label}>
              <dt>{change.label}</dt><dd>{change.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={styles.panelHint}>No token, layout, or assistance settings changed.</p>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: DecisionSource }) {
  return (
    <span className={source === "llm" ? styles.sourceLlm : styles.sourceTag} data-source={source}>
      {source.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: DecisionStatus }) {
  const statusClass = status === "kept" ? styles.statusKept
    : status === "undone" ? styles.statusUndone : styles.statusNeutral;
  return (
    <span className={`${styles.decisionStatus} ${statusClass}`}>
      <span aria-hidden="true">{status === "kept" ? "✓" : status === "undone" ? "↶" : "·"}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function GuardrailItem({
  label, valid, validCopy = "Passed", invalidCopy = "Failed",
}: { label: string; valid: boolean; validCopy?: string; invalidCopy?: string }) {
  return (
    <span className={styles.guardrailItem}>
      <strong>{valid ? "✓" : "○"} {label}</strong> · {valid ? validCopy : invalidCopy}
    </span>
  );
}
