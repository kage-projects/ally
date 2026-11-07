# Evaluation producer handoff

The dashboard consumes measured output from this directory. This repository does
not yet include the checkout SDK or checkout evaluation harness. No measured
`results.json` or `results.md` has been generated here.

After running real Ally OFF/ON evaluation sessions, save:

- `results.json`: the `EvaluationResults` v1 object defined in
  `mocks/dashboard/contracts.ts`.
- `results.md`: an optional human-readable report for the same run.

The JSON must set `isMock` to `false`, include a valid ISO timestamp in
`generatedAt`, identify the scenario, and report the actual session count per
variant. Each of `misTapRate`, `timeToComplete`, `errorLoops`, and
`completionRate` needs Ally OFF/ON means and standard deviations, its prescribed
unit, and a finite `improvementPercent`. Percent means and standard deviations
use percentage points (0–100), not ratios. Do not relabel the mock fixture as a
measured run.

Write a complete report atomically after a run finishes. Live dashboard evidence
refreshes every 15 seconds, or on **Refresh results**. Invalid or incomplete JSON
hides measured values until validation succeeds. The optional Markdown report is
served as plain text only when the measured JSON is valid.

Local `pnpm dev` and `pnpm start` read the fixed files at runtime. Hosted read-only
deployments include files that exist at build time via Next.js output tracing;
redeploy after replacing the results. A future remote evaluation service can
replace the loader while preserving the same validated evidence contract.
