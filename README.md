# Ally

Adaptive checkout UI with a React SDK and a judge dashboard.

## Repository layout

| Path | Purpose |
| --- | --- |
| `dashboard/` | Next.js dashboard, simulator, and dashboard tests |
| `dashboard/mocks/` | Sample events and evaluation data for demos and tests |
| `sdk/` | React SDK with its own package setup and checks |
| `shopee-clone/` | Checkout app with its own package setup |
| `contracts/dashboard.ts` | Shared v1 dashboard event and evaluation wire types |
| `eval/` | Measured evaluation output shared with the dashboard |

The original plans mention `apps/demo/` and `packages/ally-react/`. Current code
lives in `dashboard/` and `sdk/`, respectively.

## Dashboard

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000/dashboard`. The simulator is at
`http://localhost:3000/dashboard/simulator`.

```bash
pnpm typecheck
pnpm lint
pnpm test:dashboard
pnpm build
pnpm start
```

Root commands target the `@ally/dashboard` workspace. See
[dashboard/README.md](dashboard/README.md) for integration and evaluation setup.

SDK and checkout retain their independent package manifests and lockfiles. Their
commands are documented in [sdk/README.md](sdk/README.md) and
[shopee-clone/package.json](shopee-clone/package.json).

Checkout producers and the dashboard must agree on `contracts/dashboard.ts`.
The local event channel requires the same origin and browser profile. Actual
evaluation output belongs in `eval/`; sample fixtures remain in
`dashboard/mocks/`.
