import type { FrictionSummary } from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type LiveSignalsPanelProps = {
  summary: FrictionSummary | null;
};

const SIGNALS: Array<{
  key: keyof FrictionSummary["counts"];
  label: string;
  scale: number;
}> = [
  { key: "taps", label: "Taps", scale: 24 },
  { key: "missTap", label: "Miss taps", scale: 5 },
  { key: "rageClick", label: "Rage clicks", scale: 3 },
  { key: "hesitation", label: "Hesitation", scale: 3 },
  { key: "backtrack", label: "Backtracks", scale: 3 },
  { key: "errorLoop", label: "Error loops", scale: 3 },
  { key: "zoomEvent", label: "Zoom events", scale: 3 },
  { key: "scrollThrash", label: "Scroll thrash", scale: 3 },
  { key: "slowTargeting", label: "Slow targeting", scale: 3 },
];

export function LiveSignalsPanel({ summary }: LiveSignalsPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="live-signals-title">
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.sectionHeading} id="live-signals-title">
            <span className={styles.sectionIcon} aria-hidden="true" />
            Live signals
          </h2>
          <p className={styles.panelHint}>Aggregated 10-second window</p>
        </div>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.signalList}>
          {SIGNALS.map(({ key, label, scale }) => {
            const value = summary?.counts[key] ?? 0;
            const width = Math.min(100, (value / scale) * 100);

            return (
              <div className={styles.signalRow} key={key}>
                <div className={styles.signalMeta}>
                  <span className={styles.signalLabel}>{label}</span>
                  <span className={styles.signalValue}>{value}</span>
                </div>
                <div className={styles.track} aria-hidden="true">
                  <div className={styles.bar} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.contextGrid}>
          <ContextItem label="Window" value={`${summary?.windowMs ?? 0}ms`} />
          <ContextItem
            label="Viewport"
            value={
              summary
                ? `${summary.viewport.w}×${summary.viewport.h}`
                : "Waiting"
            }
          />
          <ContextItem label="DPR" value={summary?.viewport.dpr.toFixed(1) ?? "—"} />
          <ContextItem label="Step" value={summary?.context.step ?? "—"} />
        </div>
      </div>
    </section>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.contextItem}>
      <div className={styles.contextLabel}>{label}</div>
      <div className={styles.contextValue}>{value}</div>
    </div>
  );
}