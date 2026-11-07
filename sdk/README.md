# @ally/react — React web SDK

This folder is the React web SDK package. It implements strict data contracts,
a pure policy guard, scoped interaction sensor, local rules and presets, and a
React provider that applies reversible UI tokens. The provider observes DOM
interactions and exposes Keep, Undo, and Why. Ambiguous evidence can request
a guarded plan from the host's same-origin endpoint. Preference persistence
is planned for Phase 4.

Run from the repository root:

- `pnpm -C sdk install` — install pinned dependencies.
- `pnpm -C sdk build` — build ESM, types, and CSS.
- `pnpm -C sdk typecheck` — check TypeScript.
- `pnpm -C sdk test` — run core, sensor, runtime, and React jsdom tests.
- `pnpm -C sdk test:contract` — import the built React and core entry points
  from a minimal server-rendered consumer fixture.
- `pnpm -C sdk test:ai:mock` — run the synthetic seven-fixture planner harness.
- `pnpm -C sdk test:ai` — evaluate the host endpoint when `ALLY_AI_ENDPOINT`
  is set; otherwise report that live quality is unverified.

The host wraps its React subtree in `AllyProvider`, gives it a merchant policy
and step names, and imports `@ally/react/styles.css`. Interactive components
read `--ally-target`, `--ally-space`, and `--ally-font`. Mark protected
content with `data-ally-slot="totalAmount"` or another supported slot, and
optional content with `data-ally-optional="promoBanner"` or another allowed
name. Mark a sticky CTA with `data-ally-slot="primaryAction"` and keep it
separate from `data-ally-slot="payButton"`. Host styles should use
`min-height: var(--ally-target)` and `min-width: var(--ally-target)` for
interactive targets, and `font-size: calc(1rem * var(--ally-font))` for scalable
text. The SDK owns `--ally-*` and `data-ally-*` on its wrapper while mounted.
See `test/provider.test.tsx` for a script-based integration fixture.

The separate `@ally/react/core` export contains `AllyPolicySchema`,
`AdaptationPlanSchema`, `DecisionInputSchema`, `AdaptationPlanJsonSchema`,
`DEFAULT_POLICY`, `guardPlan`, `scoreProfile`, `decideRule`, and
`createPresetPlan`, plus `PlannerResponseSchema` and `buildDecisionInput`.
It imports no browser APIs and can be
used by the host server. The host owns the OpenAI endpoint and API key.

To enable AI planning, set `policy.llm.enabled` and mount the host route at
`config.endpoint` (default `/api/ally/plan`). See
[`docs/HOST_PLANNER_HANDOFF.md`](docs/HOST_PLANNER_HANDOFF.md) for the exact
request, response, and server-side trust rules.

The current entry points target React 19 and ESM. Plan fields follow
[`docs/CONTRACTS.md`](docs/CONTRACTS.md); implementation progress is in
[`docs/IMPLEMENTATION_PHASES.md`](docs/IMPLEMENTATION_PHASES.md).
