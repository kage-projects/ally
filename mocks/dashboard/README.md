# Ally Dashboard Mocks

This directory unblocks dashboard development while `apps/demo` and the SDK bus
are being built on other branches.

## Files

- `contracts.ts` — provisional TypeScript contract v1.
- `ally-events.v1.json` — ordered fixture events for dashboard state/reducer work.
- `eval-results.mock.json` — clearly labelled evaluation fixture for presentation work.

## Event scenario

The event fixture covers:

1. Checkout heartbeat on the address step.
2. Baseline summary before adaptation.
3. Tremor summary with three miss-taps.
4. Deterministic motor rule decision.
5. Applied event.
6. Post-adaptation summary.
7. Keep event.
8. Combined motor + visual summary.
9. LLM decision with guardrail status.
10. Applied event followed by Undo.

## Decisions locked for mock v1

- Channel name: `ally`.
- Event contract version: `1`.
- Event timestamps: epoch milliseconds.
- `keep` is an explicit event.
- `heartbeat` is optional; the dashboard must also work from `lastEventAt`.
- Decision guardrail claims are explicit fields, never inferred by the UI.
- Evaluation data must expose `isMock`.
- Final Playwright results should replace the fixture via `eval/results.json`.

## Integration rule

When the SDK bus is ready:

1. Move/adapt the shared types into `packages/ally-react/src/bus.ts`.
2. Import the SDK-owned types from the dashboard.
3. Keep backward compatibility with `version: 1`, or increment the version and
   add a small adapter.
4. Never copy form values, screen content, PII, absolute pointer coordinates, or
   unique device identifiers into events.

## Mock-data safety

The evaluation fixture contains planning numbers only. Any UI rendering this file
must visibly show the `label` while `isMock === true`. Before submission, replace
it with real evaluation output and verify `isMock === false`.