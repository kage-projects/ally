import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { EVALUATION_SOURCE, parseEvaluationResults, type EvaluationEvidence } from "./evaluation";

const MAX_RESULTS_BYTES = 1_048_576;
const MAX_REPORT_BYTES = 2_097_152;

/** Handles pnpm --filter (apps/demo cwd), root invocations, and traced standalone layouts. */
export function getEvaluationDirectory(cwd = process.cwd()): string {
  const appDirectory = path.basename(cwd) === "demo" && path.basename(path.dirname(cwd)) === "apps";
  return path.resolve(cwd, appDirectory ? "../../eval" : "eval");
}

function missing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

async function regularFile(filePath: string, maximumBytes: number): Promise<boolean> {
  try {
    const stats = await lstat(filePath);
    return stats.isFile() && stats.size > 0 && stats.size <= maximumBytes;
  } catch {
    return false;
  }
}

/** Directory overrides are for trusted server/test callers; HTTP requests never select paths. */
export async function loadEvaluationEvidence(directory = getEvaluationDirectory()): Promise<EvaluationEvidence> {
  const resultPath = path.join(directory, "results.json");
  let json: string;
  try {
    const stats = await lstat(resultPath);
    if (!stats.isFile() || stats.size === 0 || stats.size > MAX_RESULTS_BYTES) {
      return { status: "unavailable", reason: "invalid", message: "The evaluation results file is not a supported JSON report." };
    }
    json = await readFile(resultPath, "utf8");
    if (Buffer.byteLength(json, "utf8") > MAX_RESULTS_BYTES) {
      return { status: "unavailable", reason: "invalid", message: "The evaluation results file is too large." };
    }
  } catch (error) {
    return missing(error)
      ? { status: "unavailable", reason: "missing", message: "No measured evaluation results yet. Results will appear after the evaluation run is saved." }
      : { status: "unavailable", reason: "unreadable", message: "The evaluation results could not be read. Try refreshing after the evaluation run finishes." };
  }

  let results;
  try {
    results = parseEvaluationResults(JSON.parse(json));
  } catch {
    results = null;
  }
  if (!results) {
    return { status: "unavailable", reason: "invalid", message: "The evaluation results did not pass validation. No measured values are shown." };
  }

  return {
    status: "ready",
    results,
    source: EVALUATION_SOURCE,
    reportAvailable: await regularFile(path.join(directory, "results.md"), MAX_REPORT_BYTES),
  };
}

export async function loadEvaluationReport(directory = getEvaluationDirectory()): Promise<string | null> {
  const evidence = await loadEvaluationEvidence(directory);
  if (evidence.status !== "ready" || !evidence.reportAvailable) return null;
  try {
    const report = await readFile(path.join(directory, "results.md"), "utf8");
    return Buffer.byteLength(report, "utf8") <= MAX_REPORT_BYTES ? report : null;
  } catch {
    return null;
  }
}
