# @ally/react — React web SDK

Ally observes interaction friction inside a React subtree and applies reversible UI tokens. It runs local rules first and can ask a host-owned planner endpoint for ambiguous cases. This package contains the SDK and script fixtures only; the host app and server route are separate.

For a complete React integration walkthrough, see the [usage guide](docs/USAGE.md). The [planner handoff](docs/HOST_PLANNER_HANDOFF.md) defines the host server contract. Both documents are included in the package tarball.

## Install and mount

The package targets React 19 and ESM. Install the generated tarball with React as a peer, then import its stylesheet once in the host entry. The package is currently private, so registry publishing is a separate release decision.

```sh
pnpm add ./ally-react-0.1.0.tgz react@^19
```

Mount the provider around the adaptive subtree:

```tsx
import '@ally/react/styles.css';
import { AllyProvider, useAlly } from '@ally/react';
import { DEFAULT_POLICY } from '@ally/react/core';
import { useState } from 'react';

function Checkout() {
  const ally = useAlly();
  const [email, setEmail] = useState('');
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (!email.trim()) {
      ally.reportError({ field: 'email', category: 'required' });
      return;
    }
    ally.reportStep('shipping');
  }}>
    <input name="email" value={email} onChange={(event) => setEmail(event.target.value)} />
    <button type="submit">Shipping</button>
    <button type="button" onClick={() => ally.resetPreferences()}>Reset Ally preferences</button>
  </form>;
}

export function AllyCheckout() {
  return <AllyProvider policy={DEFAULT_POLICY} config={{
    steps: ['cart', 'shipping', 'payment'],
    allowedFields: ['email'], errorCategories: ['required'],
    persistence: 'local', storageKey: 'ally:checkout:v1',
  }}><Checkout /></AllyProvider>;
}
```

Use one provider per subtree; nested providers are unsupported. `steps` must list every value passed to `reportStep`. Report error **categories**, never input values or error messages. The default persistence is memory. `local` stores at most 20 validated preference records in browser localStorage for seven days; unavailable or denied storage falls back to memory. `resetPreferences()` clears the SDK's preference records. Keep and Undo controls are rendered by the provider; `useAlly()` also exposes `keep()`, `undo()`, `plan`, `status`, `plannerStatus`, `summary`, `explanation`, and `outcome`. The outcome is `unknown` unless comparable complete windows have enough taps; it is not a measure of user impact.

## Host UI contract

Interactive controls should consume `--ally-target`, `--ally-space`, and `--ally-font`; for example, `min-height: var(--ally-target)` and `font-size: calc(1rem * var(--ally-font))`. Mark protected elements with `data-ally-slot="price"`, `"legalText"`, `"totalAmount"`, or `"payButton"`. Use `data-ally-slot="primaryAction"` for a sticky CTA, separate from the pay button. Mark optional sections with `data-ally-optional="promoBanner"`, `"recommendations"`, `"voucherCarousel"`, or `"socialProof"`. Ally applies only schema-defined tokens and flags, clamps them to merchant policy, and keeps protected slots visible. See [`test/fixtures/consumer.tsx`](test/fixtures/consumer.tsx) for a three-step script fixture.

## Planner endpoint

To enable AI planning, set `policy.llm.enabled: true` and `config.endpoint: '/api/ally/plan'`. The route must be same-origin. The SDK posts a strict `DecisionInput` containing `schemaVersion`, anonymous `summary` counters/timings/sizes, computed `profile`, `policy`, and at most three preference summaries. It never sends field values, visible text, identifiers, screenshots, or absolute coordinates. The host owns its OpenAI key, model, server-side policy, and route.

The server validates input with `DecisionInputSchema` from `@ally/react/core`, recomputes the profile, applies its authoritative policy, and returns either HTTP `204` or a guarded HTTP `200` response:

```ts
// Shape of a request produced by the SDK; summary contains counters and timings only.
import { buildDecisionInput, scoreProfile, serializeDecisionInput } from '@ally/react/core';
const request = buildDecisionInput(summary, scoreProfile(summary), policy,
  preferences, ['cart', 'shipping', 'payment']);
const body = serializeDecisionInput(request); // POST /api/ally/plan
```

```json
{ "schemaVersion": 1, "plan": { "profile": { "motor": 0.8, "visual": 0, "cognitive": 0 }, "tokens": { "targetMinSize": 56, "spacingScale": 1.25, "fontScale": 1, "contrast": "normal", "density": "comfortable" }, "layout": { "stepMode": "default", "hideNonEssential": [], "primaryActionSticky": false, "confirmDestructive": true }, "assist": { "inlineHints": false, "voiceOffer": false }, "confidence": 0.8, "explanation": "Larger targets may help after repeated missed taps.", "ttlSeconds": 120 }, "source": "llm", "latencyMs": 100 }
```

This is a response-shape example; the server must compute or validate every field. Invalid, late, timed-out, or unavailable planner responses fall back to the local decision. See [`docs/HOST_PLANNER_HANDOFF.md`](docs/HOST_PLANNER_HANDOFF.md) and [`docs/CONTRACTS.md`](docs/CONTRACTS.md) for the complete contract.

## Build and verification

From the repository root:

- `pnpm -C sdk build` — emit ESM, declarations, and CSS.
- `pnpm -C sdk typecheck` — check SDK TypeScript.
- `pnpm -C sdk test` — run Vitest unit and jsdom scripts, including the host fixture.
- `pnpm -C sdk test:contract` — run SSR contract and fresh tarball consumer checks.
- `pnpm -C sdk test:package` — pack and check only the tarball consumer.
- `pnpm -C sdk test:ai:mock` — run seven synthetic planner fixtures.
- `pnpm -C sdk test:ai` — evaluate a real host endpoint when `ALLY_AI_ENDPOINT` is set.

Generated reports and the tarball are written to `sdk/test-results/`. The package test installs the tarball and its dependencies into a fresh consumer with `pnpm install --offline --ignore-workspace`; it does not link dependencies from the SDK workspace. It uses package output, not SDK source. The required packages must already be in pnpm's active store (run `pnpm fetch` with network access first). Registry publication and installation, visual browser compatibility, real model quality, and user impact remain untested.
