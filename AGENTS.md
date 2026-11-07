# Repository Guidelines

## Project Structure & Module Organization

Ally is an adaptive UI engine in development. This repository contains planning documents, `Poster.pdf`, the dashboard, checkout app, and SDK package.

- `dashboard/`: Next.js judge dashboard, with its own tests and sample fixtures in `dashboard/mocks/`.
- `sdk/`: React SDK and its independent package setup.
- `shopee-clone/`: teammate-owned checkout app and its independent package setup.
- `contracts/dashboard.ts`: shared dashboard event and evaluation wire types.
- `eval/`: measured evaluation output consumed by the dashboard.

- `ALLY_PRD.md`: product requirements, data contracts, privacy rules, and evaluation targets.
- `ALLY_BUILD_PLAN.md`: implementation milestones, target architecture, and acceptance criteria.
- `ALLY_PLAYBOOK.md`: strategy and pitch guidance.

Use `sdk/` for the React SDK, its script-based tests, and documentation. The older `packages/ally-react/` and `apps/demo/` paths in the original plans have been superseded by `sdk/` and `dashboard/`. A teammate owns the checkout app and its server endpoint. SDK work starts with `sdk/docs/ARCHITECTURE.md`, `CONTRACTS.md`, and `IMPLEMENTATION_PHASES.md`; dashboard setup is in `dashboard/README.md`.

## Build, Test, and Development Commands

Root scripts target `@ally/dashboard`: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm typecheck`, `pnpm lint`, and `pnpm test:dashboard`. The root workspace includes `dashboard/`; SDK and checkout keep their existing independent package setup.

The SDK package in `sdk/` exposes:

- `pnpm -C sdk build`: build the SDK package.
- `pnpm -C sdk typecheck`: check SDK types.
- `pnpm -C sdk test`: run SDK unit and DOM simulation scripts.
- `pnpm -C sdk test:contract`: verify SSR and a fresh tarball consumer.
- `pnpm -C sdk test:package`: verify the tarball consumer separately.
- `pnpm -C sdk test:ai:mock`: run the synthetic planner harness.
- `pnpm -C sdk test:ai`: evaluate the host endpoint when configured.

These scripts are available. Live model quality remains unverified until the host endpoint is supplied.

## Coding Style & Naming Conventions

Use strict TypeScript, React functional components, and two-space indentation. Follow the planned naming: lowercase module files such as `sensor.ts` and `engine-client.ts`; PascalCase component files such as `Toast.tsx`.

Keep SDK `FrictionSummary`, `AdaptationPlan`, and `AllyPolicy` centralized in `sdk/src/schema.ts`. Coordinate changes to the dashboard wire format in `contracts/dashboard.ts` with its producers and consumers. Prefer CSS variables (`--ally-*`) and data attributes for adaptations. The dashboard uses ESLint; the SDK has no configured formatter or linter.

## Testing Guidelines

Use Vitest with jsdom and scripted endpoint fixtures. Name unit tests `*.test.ts` or `*.test.tsx`. Add or adjust tests for every rule-layer or guard change, covering policy clamping, locked components, invalid plans, fallback behavior, and undo. No coverage threshold is currently configured. Check the phase gates in `sdk/docs/`; browser and host-app tests belong to the teammate.

## Commit & Pull Request Guidelines

The single existing commit, `Add Ally PRD for hackathon`, uses a concise imperative subject. Follow that style and keep changes focused. PRs should describe the behavior changed, reference relevant requirements or milestones, report validation, and include screenshots for visible UI changes.

## Security & Adaptation Constraints

Keep API keys server-side. Send only anonymous counters, timings, and sizes; exclude form values, text, identifiers, screenshots, and absolute coordinates. Apply only schema-defined tokens and flags, respect merchant policy, and preserve undo and explanations. Never inject model-generated HTML or use `dangerouslySetInnerHTML`.
