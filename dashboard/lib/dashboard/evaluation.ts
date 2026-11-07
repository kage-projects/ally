import type { EvaluationResults } from "./types";

export const EVALUATION_SOURCE = "eval/results.json" as const;
export const EVALUATION_REPORT_URL = "/api/ally/evaluation/results";

export type EvaluationEvidence =
  | {
      status: "ready";
      results: EvaluationResults;
      source: typeof EVALUATION_SOURCE;
      reportAvailable: boolean;
    }
  | {
      status: "unavailable";
      reason: "missing" | "invalid" | "unreadable";
      message: string;
    };

type RecordValue = Record<string, unknown>;

function shape(value: unknown, keys: readonly string[]): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function finite(value: unknown, minimum = 0): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum;
}

function text(value: unknown, limit: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}

function sample(value: unknown, percent: boolean): boolean {
  return shape(value, ["mean", "standardDeviation"]) && finite(value.mean) &&
    finite(value.standardDeviation) && (!percent || (value.mean <= 100 && value.standardDeviation <= 100));
}

function metric(value: unknown, unit: "percent" | "seconds" | "count"): boolean {
  return shape(value, ["unit", "allyOff", "allyOn", "improvementPercent"]) &&
    value.unit === unit && sample(value.allyOff, unit === "percent") &&
    sample(value.allyOn, unit === "percent") &&
    typeof value.improvementPercent === "number" && Number.isFinite(value.improvementPercent);
}

/** Percent means and standard deviations use percentage points (0–100), not ratios. */
export function parseEvaluationResults(
  value: unknown,
  { allowMock = false }: { allowMock?: boolean } = {},
): EvaluationResults | null {
  if (!shape(value, ["schemaVersion", "isMock", "label", "scenario", "generatedAt", "sessionsPerVariant", "metrics"]) ||
    value.schemaVersion !== 1 || typeof value.isMock !== "boolean" ||
    (value.isMock && !allowMock) || !text(value.label, 256) || !text(value.scenario, 512) ||
    !finite(value.sessionsPerVariant, 1) || !Number.isSafeInteger(value.sessionsPerVariant)) return null;

  const timestampValid = text(value.generatedAt, 64) &&
    /^\d{4}-\d{2}-\d{2}T/.test(value.generatedAt) && Number.isFinite(Date.parse(value.generatedAt));
  if (!timestampValid && !(value.isMock && value.generatedAt === null)) return null;

  const { metrics } = value;
  if (!shape(metrics, ["misTapRate", "timeToComplete", "errorLoops", "completionRate"]) ||
    !metric(metrics.misTapRate, "percent") || !metric(metrics.timeToComplete, "seconds") ||
    !metric(metrics.errorLoops, "count") || !metric(metrics.completionRate, "percent")) return null;

  return value as EvaluationResults;
}

/** Revalidate responses at the browser boundary before rendering file-derived data. */
export function parseEvaluationEvidence(value: unknown): EvaluationEvidence | null {
  if (shape(value, ["status", "results", "source", "reportAvailable"]) &&
    value.status === "ready" && value.source === EVALUATION_SOURCE &&
    typeof value.reportAvailable === "boolean") {
    const results = parseEvaluationResults(value.results);
    return results ? { status: "ready", results, source: EVALUATION_SOURCE, reportAvailable: value.reportAvailable } : null;
  }
  if (shape(value, ["status", "reason", "message"]) && value.status === "unavailable" &&
    (value.reason === "missing" || value.reason === "invalid" || value.reason === "unreadable") &&
    text(value.message, 512)) {
    return { status: "unavailable", reason: value.reason, message: value.message };
  }
  return null;
}

export function formatEvaluationSample(mean: number, standardDeviation: number, unit: "percent" | "seconds" | "count"): string {
  const precision = unit === "count" ? 2 : 1;
  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: precision });
  const suffix = unit === "percent" ? "%" : unit === "seconds" ? "s" : "";
  return `${formatter.format(mean)} ± ${formatter.format(standardDeviation)}${suffix}`;
}
