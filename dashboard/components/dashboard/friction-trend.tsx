import { useId } from "react";
import { buildFrictionTrend } from "@/lib/dashboard/friction-trend";
import { formatClock, formatPercent, formatPreset } from "@/lib/dashboard/formatters";
import type { AdaptationMarker, FrictionTrendWindow } from "@/lib/dashboard/types";
import styles from "./dashboard.module.css";

export function FrictionTrend({ windows, markers, isDemo }: {
  windows: FrictionTrendWindow[]; markers: AdaptationMarker[]; isDemo: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const trend = buildFrictionTrend(windows, markers);
  const validPoints = trend?.points.filter((point) => point.rate !== null) ?? [];
  const latest = trend?.points.at(-1);
  const x = (value: number) => 8 + value * 984;
  const y = (rate: number) => 104 - rate / (trend?.ceiling ?? 0.1) * 92;

  return (
    <section className={styles.trendPanel} aria-labelledby={titleId}>
      <div className={styles.trendHeading}>
        <div>
          <h2 className={styles.sectionHeading} id={titleId}>Friction over time</h2>
          <p className={styles.panelHint}>Miss-tap rate per recorded window · {isDemo ? "Sample session" : "Session observations"}</p>
        </div>
        <div className={styles.trendLegend}>
          <span><i className={styles.trendLineKey} /> Miss-tap rate</span>
          <span><i className={styles.trendApplyKey} /> Applied</span>
          <span><i className={styles.trendUndoKey} /> Undo</span>
          <strong>{latest?.rate != null ? formatPercent(latest.rate) : "—"}<small> latest</small></strong>
        </div>
      </div>
      {trend ? (
        <div className={styles.trendPlot}>
          <div className={styles.trendYAxis} aria-hidden="true"><span>{formatPercent(trend.ceiling)}</span><span>0%</span></div>
          <svg className={styles.trendSvg} viewBox="0 0 1000 112" preserveAspectRatio="none" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
            <desc id={descriptionId}>
              {trend.points.map((point) => `${formatClock(point.at)} UTC: ${point.rate === null ? "no taps, no rate" : `${formatPercent(point.rate)}, ${point.missTap} misses in ${point.taps} taps`}`).join(". ")}
              {trend.markers.map((marker) => `. ${formatClock(marker.at)} UTC: ${formatPreset(marker.preset)} ${marker.type}`).join("")}
            </desc>
            {[12, 58, 104].map((height) => <line key={height} x1="8" x2="992" y1={height} y2={height} className={styles.trendGridline} vectorEffect="non-scaling-stroke" />)}
            {trend.markers.map((marker) => (
              <line key={`${marker.decisionId}-${marker.type}-${marker.at}`} x1={x(marker.x)} x2={x(marker.x)} y1="4" y2="108" className={marker.type === "undo" ? styles.trendUndoMarker : styles.trendApplyMarker} vectorEffect="non-scaling-stroke">
                <title>{formatClock(marker.at)} UTC · {formatPreset(marker.preset)} · {marker.type === "undo" ? "Undo" : "Applied"}</title>
              </line>
            ))}
            {trend.segments.map((segment, index) => (
              <polyline key={index} points={segment.map((point) => `${x(point.x)},${y(point.rate!)}`).join(" ")} className={styles.trendLine} vectorEffect="non-scaling-stroke" />
            ))}
            {validPoints.map((point, index) => (
              <svg key={index} x={x(point.x) - 4} y={y(point.rate!) - 4} width="8" height="8" viewBox="0 0 8 8" className={styles.trendPoint}>
                <title>{formatClock(point.at)} UTC · {formatPercent(point.rate!)} · {point.missTap}/{point.taps} taps</title>
                <circle cx="4" cy="4" r="3" />
              </svg>
            ))}
          </svg>
          <div className={styles.trendXAxis}><span>{formatClock(trend.start)} UTC</span><span>{validPoints.length < 2 ? "Collecting data · Need two windows with taps" : `${trend.points.length} recorded windows · Gaps mean no rate or missing windows`}</span><span>{formatClock(trend.end)} UTC</span></div>
        </div>
      ) : (
        <div className={styles.trendCollecting}>Collecting data · The trend appears when an interaction window arrives.</div>
      )}
    </section>
  );
}
