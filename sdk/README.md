# @ally/react — React web SDK

This folder is the React web SDK package. It implements strict data contracts,
a pure policy guard, scoped interaction sensor, and local rules and presets.
The sensor is internal until the provider integration in Phase 2. The package
exports core rules and a typed provider/hook scaffold. The provider does not yet wire
the sensor to UI adaptation, call a planner, or persist preferences; those
behaviors belong to Phases 2–4.

Run from the repository root:

- `pnpm -C sdk install` — install pinned dependencies.
- `pnpm -C sdk build` — build ESM, types, and CSS.
- `pnpm -C sdk typecheck` — check TypeScript.
- `pnpm -C sdk test` — run schema, guard, sensor, and rule tests.
- `pnpm -C sdk test:contract` — import the built React and core entry points
  from a minimal server-rendered consumer fixture.

The host wraps its React subtree in `AllyProvider`, gives it a merchant policy
and step names, and imports `@ally/react/styles.css`. Interactive components
read `--ally-target`, `--ally-space`, and `--ally-font`. Mark protected
content with `data-ally-slot="totalAmount"` or another supported slot, and
optional content with `data-ally-optional="promoBanner"` or another allowed
name. See `test/contract.mjs` for a minimal fixture.

The separate `@ally/react/core` export contains `AllyPolicySchema`,
`AdaptationPlanSchema`, `DecisionInputSchema`, `AdaptationPlanJsonSchema`,
`DEFAULT_POLICY`, `guardPlan`, `scoreProfile`, `decideRule`, and
`createPresetPlan`. It imports no browser APIs and can be
used by the host server. The host owns the OpenAI endpoint and API key.

The current entry points target React 19 and ESM. Plan fields follow
[`docs/CONTRACTS.md`](docs/CONTRACTS.md); implementation progress is in
[`docs/IMPLEMENTATION_PHASES.md`](docs/IMPLEMENTATION_PHASES.md).
