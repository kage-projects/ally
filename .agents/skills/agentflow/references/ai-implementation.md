# AI Implementation Policy

Apply when a slice implements, integrates, or changes an AI/ML capability: a model call, retrieval/RAG, embedding, prompt/harness, evaluation, or a data path that feeds a model. AI work follows the same chain, ready gates, and budget as ordinary software, plus the AI-specific invariants below. This policy does not grant model credentials, compute, or network access.

## Treat the model as a nondeterministic, untrusted dependency

```text
model output
  ↓ decode / validate against a schema and business invariants
  ↓ domain representation
```

- A model response is external ingress. Decode and validate it before it reaches sensitive effects (write, delete, payment, external call).
- Do not trust the model to enforce authorization, ownership, or tenant isolation. Those checks run in ordinary code at the effect boundary.
- Model latency/failure is expected. Define a timeout, a fallback or error surface, and (for write paths) idempotency or no-automatic-retry.

## Gate on observable behavior, not vibes

```text
job / acceptance (J1, P# from product-design)
   ↓
evaluation set (golden / regression examples)
   ↓
metric tied to the job (not a proxy score alone)
   ↓
threshold that means "good enough to ship"
```

- Build a small offline eval before claiming quality. A single demo answer is not proof; state explicitly when an eval has not run.
- Prefer a regression set over a single-shot prompt impression. Add failing examples for actual failure modes.
- Metrics must trace to the user's job. Do not maximize an unrelated benchmark score.

## Retrieval / RAG only when it pays

```text
does the job need external knowledge?
  ├─ no  → plain model call (do not add retrieval by fashion)
  └─ yes → retrieval with a measured quality bar
```

- Choose retrieval when a concrete question depends on non-parametric knowledge.
- Evaluate retrieval on its own axis (recall of the right context) before evaluating the final answer.
- Keep retrieved context observable: log which chunks/IDs fed the answer so failures are diagnosable.

## Model readiness (G and release scope)

- **Cost/latency budget** — an unbounded or slow model call on a hot path is a defect. Record the target as a `G` (with its SLI and measurement point) or an `A#`; do not invent numbers.
- **Guardrails** — a required property (format, policy, safety, schema) needs a code check, not a prompt wish. It is a `G` and a `PF`, not a prompt instruction.
- **Observability** — emit the signals engineering.md names for its measurement points, plus model, prompt/harness version, and key inputs/outputs at the boundary so regressions are attributable. Alerts and burn-rate belong to `release-engineering`.
- **Version pinning** — a changed model or harness version changes behavior; treat it like a dependency upgrade and re-run the eval gate.

## Verification

```text
deterministic parsing/validation → unit PF, stage iter/pr
retrieval quality                → eval PF on a golden set, stage release or nightly
model-dependent behavior         → eval gate PF, stage release
critical user journey E2E        → only with test-engineering admission
```

A model-dependent proof is an `eval` PF with a stage, not a per-iteration unit test. Do not claim a model behaves correctly from one sampled answer, and do not mock the model when the behavior under proof is the model-dependent outcome.
