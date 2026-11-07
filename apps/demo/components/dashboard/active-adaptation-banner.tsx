import { formatPercent, formatPreset } from "@/lib/dashboard/formatters";
import type { DashboardDecision } from "@/lib/dashboard/types";

import styles from "./dashboard.module.css";

type ActiveAdaptationBannerProps = {
  decision: DashboardDecision | null;
};

export function ActiveAdaptationBanner({
  decision,
}: ActiveAdaptationBannerProps) {
  if (!decision) {
    return (
      <section className={styles.adaptationBanner} aria-label="Active adaptation">
        <div>
          <div className={styles.eyebrow}>Active adaptation</div>
          <h2 className={styles.adaptationTitle}>No adaptation applied</h2>
          <p className={styles.adaptationCopy}>
            Load a sample session to explore adaptation decisions.
          </p>
        </div>
      </section>
    );
  }

  const { plan } = decision;

  return (
    <section className={styles.adaptationBanner} aria-label="Active adaptation">
      <div>
        <div className={styles.eyebrow}>Active adaptation</div>
        <h2 className={styles.adaptationTitle}>
          {formatPreset(decision.preset)}
        </h2>
        <p className={styles.adaptationCopy}>
          {formatPercent(decision.confidence)} confidence · {decision.latencyMs}ms ·{" "}
          {decision.status === "kept" ? "Kept by user" : decision.status}
        </p>
      </div>

      <div className={styles.chipRow} aria-label="Active token changes">
        <TokenValue label="Target size" value={`${plan.tokens.targetMinSize}px`} />
        <TokenValue label="Spacing" value={`${plan.tokens.spacingScale.toFixed(1)}×`} />
        <TokenValue label="Font scale" value={`${plan.tokens.fontScale.toFixed(2)}×`} />
        <TokenValue label="Contrast" value={plan.tokens.contrast} />
        <TokenValue label="Sticky CTA" value={plan.layout.primaryActionSticky ? "On" : "Off"} />
      </div>
    </section>
  );
}

function TokenValue({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.tokenValue}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
