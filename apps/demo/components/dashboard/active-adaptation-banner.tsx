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
            Ally is listening for aggregated friction signals from the checkout.
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
          {decision.source.toUpperCase()} · {decision.latencyMs}ms · Confidence{" "}
          {formatPercent(decision.confidence)} · {decision.status.toUpperCase()}
        </p>
      </div>

      <div className={styles.chipRow} aria-label="Active token changes">
        <span className={styles.chip}>
          Target <strong>{plan.tokens.targetMinSize}px</strong>
        </span>
        <span className={styles.chip}>
          Spacing <strong>{plan.tokens.spacingScale.toFixed(1)}×</strong>
        </span>
        <span className={styles.chip}>
          Font <strong>{plan.tokens.fontScale.toFixed(2)}×</strong>
        </span>
        <span className={styles.chip}>
          Contrast <strong>{plan.tokens.contrast.toUpperCase()}</strong>
        </span>
        <span className={styles.chip}>
          Sticky CTA <strong>{plan.layout.primaryActionSticky ? "ON" : "OFF"}</strong>
        </span>
      </div>
    </section>
  );
}