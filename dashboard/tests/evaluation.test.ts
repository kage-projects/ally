import assert from "node:assert/strict";
import fs, { mkdtemp, mkdir, rm, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { mock, test } from "node:test";
import fixture from "../mocks/eval-results.mock.json";
import {
  formatEvaluationSample,
  parseEvaluationEvidence,
  parseEvaluationResults,
} from "../lib/dashboard/evaluation";
import {
  getEvaluationDirectory,
  loadEvaluationEvidence,
  loadEvaluationReport,
} from "../lib/dashboard/evaluation-loader";

function measuredResults() {
  return { ...structuredClone(fixture), isMock: false, generatedAt: "2026-11-07T05:00:00.000Z", label: "Measured evaluation run" };
}

async function withDirectory(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), "ally-evaluation-"));
  try {
    await run(directory);
  } finally {
    // Only remove this test's freshly created, verified directory under the temp root.
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith("ally-evaluation-"));
    await rm(directory, { recursive: true, force: true });
  }
}

test("accepts measured results and requires explicit opt-in for the sample fixture", () => {
  assert.deepEqual(parseEvaluationResults(measuredResults()), measuredResults());
  assert.equal(parseEvaluationResults(fixture), null);
  assert.deepEqual(parseEvaluationResults(fixture, { allowMock: true }), fixture);
});

test("rejects unsupported versions, wrong units, invalid sample sizes, timestamps and extra fields", () => {
  const examples: unknown[] = [null, [], {}, { ...measuredResults(), schemaVersion: 2 },
    { ...measuredResults(), generatedAt: null }, { ...measuredResults(), generatedAt: "not a date" },
    { ...measuredResults(), sessionsPerVariant: 0 }, { ...measuredResults(), sessionsPerVariant: 1.5 },
    { ...measuredResults(), sessionsPerVariant: Infinity }, { ...measuredResults(), scenario: " " },
    { ...measuredResults(), address: "not part of this contract" }];
  const wrongUnits = measuredResults();
  wrongUnits.metrics.misTapRate.unit = "seconds";
  examples.push(wrongUnits);
  for (const example of examples) assert.equal(parseEvaluationResults(example), null);
});

test("rejects ratios outside percentage-point range and non-finite or negative metric values", () => {
  for (const invalid of [-1, 101, Infinity, NaN]) {
    const results = measuredResults();
    results.metrics.completionRate.allyOn.mean = invalid;
    assert.equal(parseEvaluationResults(results), null);
  }
  const invalidDeviation = measuredResults();
  invalidDeviation.metrics.timeToComplete.allyOn.standardDeviation = -1;
  assert.equal(parseEvaluationResults(invalidDeviation), null);
  const invalidImprovement = measuredResults();
  invalidImprovement.metrics.errorLoops.improvementPercent = NaN;
  assert.equal(parseEvaluationResults(invalidImprovement), null);
});

test("accepts worsening metrics without clamping their negative improvement", () => {
  const results = measuredResults();
  results.metrics.errorLoops.improvementPercent = -100;
  assert.equal(parseEvaluationResults(results)?.metrics.errorLoops.improvementPercent, -100);
});

test("formats mean and standard deviation without rounding counts to whole numbers", () => {
  assert.equal(formatEvaluationSample(23, 4.2, "percent"), "23 ± 4.2%");
  assert.equal(formatEvaluationSample(84, 9.5, "seconds"), "84 ± 9.5s");
  assert.equal(formatEvaluationSample(0.06, 0.02, "count"), "0.06 ± 0.02");
});

test("validates API evidence and never accepts a mocked file as measured evidence", () => {
  const ready = { status: "ready", results: measuredResults(), source: "eval/results.json", reportAvailable: false };
  assert.deepEqual(parseEvaluationEvidence(ready), ready);
  assert.equal(parseEvaluationEvidence({ ...ready, results: fixture }), null);
  assert.equal(parseEvaluationEvidence({ ...ready, source: "other.json" }), null);
  const missing = { status: "unavailable", reason: "missing", message: "Awaiting evaluation" };
  assert.deepEqual(parseEvaluationEvidence(missing), missing);
  assert.equal(parseEvaluationEvidence({ ...missing, reason: "surprise" }), null);
});

test("resolves fixed repo eval paths from root and dashboard, including standalone layout", () => {
  const repo = path.join(tmpdir(), "ally-test-repository");
  assert.equal(getEvaluationDirectory(repo), path.join(repo, "eval"));
  assert.equal(getEvaluationDirectory(path.join(repo, "dashboard")), path.join(repo, "eval"));
  const standalone = path.join(repo, "dashboard", ".next", "standalone");
  assert.equal(getEvaluationDirectory(path.join(standalone, "dashboard")), path.join(standalone, "eval"));
});

test("missing files produce unavailable evidence and no report", async () => withDirectory(async (directory) => {
  const evidence = await loadEvaluationEvidence(directory);
  assert.equal(evidence.status, "unavailable");
  if (evidence.status === "unavailable") assert.equal(evidence.reason, "missing");
  assert.equal(await loadEvaluationReport(directory), null);
}));

test("loads measured results from disk without fabricating a missing report link", async () => withDirectory(async (directory) => {
  await writeFile(path.join(directory, "results.json"), JSON.stringify(measuredResults()));
  const evidence = await loadEvaluationEvidence(directory);
  assert.equal(evidence.status, "ready");
  if (evidence.status === "ready") {
    assert.deepEqual(evidence.results, measuredResults());
    assert.equal(evidence.reportAvailable, false);
    assert.equal(evidence.source, "eval/results.json");
  }
}));

test("exposes an actual Markdown report only alongside validated measured results", async () => withDirectory(async (directory) => {
  const report = "# Measured evaluation\n\nTwenty sessions per variant.\n";
  await writeFile(path.join(directory, "results.md"), report);
  assert.equal(await loadEvaluationReport(directory), null);
  await writeFile(path.join(directory, "results.json"), JSON.stringify(measuredResults()));
  const evidence = await loadEvaluationEvidence(directory);
  assert.equal(evidence.status, "ready");
  if (evidence.status === "ready") assert.equal(evidence.reportAvailable, true);
  assert.equal(await loadEvaluationReport(directory), report);
}));

test("malformed JSON and fixture-only files hide all measured results", async () => withDirectory(async (directory) => {
  for (const content of ["{incomplete", JSON.stringify(fixture), JSON.stringify({})]) {
    await writeFile(path.join(directory, "results.json"), content);
    const evidence = await loadEvaluationEvidence(directory);
    assert.equal(evidence.status, "unavailable");
    if (evidence.status === "unavailable") assert.equal(evidence.reason, "invalid");
    assert.equal(await loadEvaluationReport(directory), null);
  }
}));

test("rejects non-file and oversized inputs without reading them as results", async () => withDirectory(async (directory) => {
  await mkdir(path.join(directory, "results.json"));
  const directoryEvidence = await loadEvaluationEvidence(directory);
  assert.equal(directoryEvidence.status, "unavailable");
  if (directoryEvidence.status === "unavailable") assert.equal(directoryEvidence.reason, "invalid");
  await rmdir(path.join(directory, "results.json"));
  await writeFile(path.join(directory, "results.json"), " ".repeat(1_048_577));
  const oversizedEvidence = await loadEvaluationEvidence(directory);
  assert.equal(oversizedEvidence.status, "unavailable");
  if (oversizedEvidence.status === "unavailable") assert.equal(oversizedEvidence.reason, "invalid");
}));

test("read failures produce a safe unavailable message without exposing the OS error", async () => withDirectory(async (directory) => {
  await writeFile(path.join(directory, "results.json"), JSON.stringify(measuredResults()));
  const read = mock.method(fs, "readFile", async () => { throw Object.assign(new Error("private OS details"), { code: "EACCES" }); });
  try {
    const evidence = await loadEvaluationEvidence(directory);
    assert.equal(evidence.status, "unavailable");
    if (evidence.status === "unavailable") {
      assert.equal(evidence.reason, "unreadable");
      assert.equal(evidence.message.includes("private OS details"), false);
    }
  } finally {
    read.mock.restore();
  }
}));
