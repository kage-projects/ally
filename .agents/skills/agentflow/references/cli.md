# CLI Coding Agent Execution

Use when running inside a local CLI or IDE coding agent with authorized shell and git access. Optimize **time-to-verified-outcome** with correctness as the guardrail; specialist skills still own domain decisions, and this router preserves their chain.

## Proof

Follow `test-engineering`: run its 3-question triage, set the risk tier (RK), and give every proof (PF) a boundary and a stage. `iter` stays cheap — typecheck, lint, and unit for the changed behavior. Integration and contract proof belong to `pr`; `release`, `post`, and `nightly` proof never run per change.

| Change | Starting point |
| --- | --- |
| Mechanical: rename, formatting, generated metadata | inspect `git diff`, run the affected static check |
| Local rule, calculation, bug | unit or regression PF at `iter`, then whatever the repo requires at `pr` |
| Public API, persistence, integration, shared state | integration or contract PF at `pr` |
| High risk: auth, payments, destructive migration, concurrency | explicit invariant plus failure/recovery PF at `pr`; release-stage proof only where a guarantee demands it |

Escalate to `test-engineering` when the boundary, stage, or E2E admission for a proof is unclear. Default to zero new browser/Playwright E2E tests for ordinary CRUD, form, UI-state, or API features; never install a browser test runner unasked, and reserve E2E for critical multi-page auth/checkout journeys that lower boundaries cannot prove.

## Loop

```text
inspect → first missing contract → slice → reproduce/implement
        → stage-aware proof → code-review (gates, verdict) → integrate
```

1. **Inspect first.** Check `git status`, active branch, existing dirty work, and only the relevant `.agents/` file(s) (`product.md`, `engineering.md`, or `DESIGN.md`). Never clobber uncommitted user changes.
2. **Enter at the first missing contract.** Load the specialist that owns it and carry its IDs forward (`J/B/X/P` → `R/S/K` → `U/M/ST` → `T/O/FL`). A failed ready gate returns upstream; it is never passed along.
3. **One vertical slice.** Ship a normal feature end-to-end in one coherent change rather than splitting it into `M1..M5` milestones or layer-only commits. Use one short-lived branch (`feat/...`, `fix/...`, `refactor/...`) when isolating nontrivial work, or commit directly when repository policy allows; never create branches per skill, agent, or retry.
4. **Fast feedback.** Reproduce a bug with a failing test first; TDD is optional. Proof depth follows the stage map above. Before declaring the slice ready, run the repository's required gate from `.agents/engineering.md` or `package.json` (`lint`/`typecheck`, `test`, `build`).
5. **Review with `code-review`.** Gates first, then the verdict. A `Block`, failed check, or failed conformance returns to implement; re-run only affected checks.
6. **Follow the budget.** Add tests to the existing suite rather than creating new CI workflows, manual QA checklists, or extra Markdown reports. A workflow is added only when the stage map needs `ci`, `release`, or `nightly`. Update `.agents/product.md`, `.agents/engineering.md`, or `.agents/DESIGN.md` in place in the same slice only when a durable decision changed.
7. **Report honestly.** Report commands that actually ran and their exit status; mark unrun checks explicitly rather than inferring success. Integrate only on an approving verdict. Merging is not releasing: `release-engineering` owns the release decision and the `PUBLISHED`/`DEPLOYED`/`RELEASED` evidence.
