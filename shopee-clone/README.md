# Shopee mobile + Ally

React 19 / Vite replica of the supplied Shopee mobile references, with an opt-in
Ally adaptive UI demo and a same-origin Node planner backend. Requires Node 22+.

## Run

```powershell
npm.cmd install
# First setup only: copy .env.example to .env.local if .env.local does not exist.
# Set OPENAI_API_KEY in .env.local; never put the key in a VITE_ variable.
npm.cmd run dev -- --host 127.0.0.1
```

- Reference: http://127.0.0.1:5173/
- Adaptive demo: http://127.0.0.1:5173/cart?ally=1
- Observe only: http://127.0.0.1:5173/cart?ally=0
- Address demo: http://127.0.0.1:5173/address/edit?ally=1
- Live analytics: http://127.0.0.1:5173/dashboard (start the sibling dashboard first)

See [dashboard setup and demo steps](docs/ALLY_DASHBOARD.md). Open the dashboard
before interacting with Shopee, in the same browser and on the same port 5173.

`npm run dev` serves both the frontend and `/api/ally/*` through Vite middleware.
The key and `OPENAI_MODEL` are read only by the backend from `.env.local` or the
process environment. Process environment takes precedence. The dev backend reads
the file again for each request. `ALLY_AI_ENABLED=0` disables external AI calls.
Without a key, deterministic SDK rules remain available. Model IDs are case-sensitive.
The provided default is `gpt-5.4-mini`; use a model available to your API project.

## Demo

Open the Ally pill to see connection status, current phase, aggregate signals and
decisions. Normal Shopee routes remain in reference mode unless opened
with `?ally=1` or `VITE_ALLY_ENABLED=1`. Internal links preserve the explicit
`ally` parameter, so the mode also survives reloads and opening a link in a new
tab. `?ally=0` keeps the reference appearance while reporting anonymous SDK
signals/profile to the dashboard. It applies no adaptation, displays no Ally
controls/highlights and makes no planner requests. Plain URLs with the default
`VITE_ALLY_ENABLED=0` keep observation and reporting off.

Open the pill and expand **14 skenario untuk dicoba** for links, genuine
interaction triggers and expected adaptations. All twelve supplied screens now
support opt-in observation, including browsing, account navigation and orders.

For a repeatable demonstration without an API key, open the address demo, clear
Full Name and Phone Number, then press Submit four times. Enough repeated
validation evidence immediately produces guarded local assistance. Optional AI
refinement runs asynchronously; the local plan remains useful when AI fails.
When the pill says "Menunggu input selesai",
tap "Selesai mengisi, terapkan" in the prompt below it to leave the input field.
Ally deliberately defers layout changes while an input is focused.
Try Why and Undo while help is open. Keep closes help and the highlight while
retaining the appearance, then starts a fresh observation window. Enough new
friction can reopen help immediately. To undo a kept plan, open the Ally pill
and choose **Batalkan penyesuaian**. The pill's Reset clears session preferences.

For reading assistance, pinch to enlarge the page, return to normal scale, and
repeat. The two separate zoom episodes trigger a visual preset immediately.
Keep/Undo/Why also work inside native review, return and search dialogs.

The planner is not called for every click or every form error. The evidence
gate still rejects weak signals. Combined evidence can produce a modest local
plan and optionally request AI refinement. Keep cancels pending refinement;
Undo restores the previous presentation without changing input or commerce
choices. Preferences are in memory for the current page session.

| Scenario | Demo route | Assistance |
| --- | --- | --- |
| Product search | `/?ally=1` | Search hints, more readable input |
| Account navigation | `/profile?ally=1` | Larger navigation labels |
| Cart and quantities | `/cart?ally=1` | Larger targets, missing-selection hints |
| Checkout | `/checkout?ally=1` | Guidance for missing payment/address |
| Voucher validation | `/vouchers?ally=1` | Larger controls and eligibility guidance after seven invalid Apply attempts |
| Shipping selection | `/shipping?ally=1` | Clearer dates and service choices |
| Payment selection | `/payment?ally=1` | Clearer bank selection and unavailable-activation guidance |
| Address selection | `/addresses?ally=1` | More readable addresses and larger Edit targets |
| Address validation | `/address/edit?ally=1` | Larger fields and inline guidance |
| Purchase history | `/purchases?ally=1` | Larger tabs and unsuccessful-search guidance |
| Order details | `/orders/1?ally=1` | Readable product/status details, protected totals |
| Delivery tracking | `/delivery?ally=1` | Larger timeline text and stronger contrast |
| Reviews | `/purchases?tab=4&ally=1` → Rate | Star-selection guidance after repeated invalid saves |
| Return/refund | `/purchases?tab=4&ally=1` → Return/Refund | Reason/explanation guidance after repeated invalid saves |

The SDK never chooses a voucher, shipping method, bank, review score or refund
reason for the user. It does not submit orders, reviews or returns automatically.

## Backend and limits

`POST /api/ally/plan` validates the SDK schema, recomputes scores, enforces the
evidence gate, intersects client policy with server limits, calls the OpenAI
Responses API with strict structured output and `store:false`, and validates and
guards the result. Prices, totals, terms and payment controls are protected; no
sections may be hidden. Only aggregate counters/timings/sizes are submitted.
Raw upstream errors, API keys and form values are never returned or logged.

Requests are capped at 16 KiB, 20/minute/IP and two concurrent planner calls.
Cross-origin browser calls are rejected. The server binds to loopback by default.
`GET /api/ally/status` exposes readiness and model name, never the key.

For a production build running locally:

```powershell
npm.cmd run build
npm.cmd start
```

The Node server serves `dist` and the same API on http://127.0.0.1:5173.
`PORT` and `HOST` can configure its listener. Commerce orders, ratings and returns
remain local simulations. This integration does not add Shopee payment services,
Firebase accounts/history, or public deployment.

## SDK artifact

`vendor/ally-react-0.1.0-shopee.6.tgz` is a runtime JavaScript snapshot built from
the supplied sibling `../sdk`. Host patches in `scripts/ally-patches.mjs`:
instead of always
aborting at 2 seconds, it respects `policy.llm.timeoutMs`, with a 2-second minimum
and 30-second maximum. This host uses 15 seconds; the backend stops one second
earlier. Six repeated validation errors or two separate zoom episodes emit
early evidence snapshots independently of the motor fast-event latch. A modest
combined preset supplies immediate guarded local help while optional AI refines
it. Regular 10-second outcome windows and score/evidence thresholds remain
unchanged. Local combined confidence is bounded by the weaker supported
dimension and must meet the merchant apply threshold. SDK schema validation,
stale-response cancellation and Undo remain.
The snapshot also exposes live observation callbacks, epoch timestamps, ephemeral
decision/transaction correlation and measured rule/planner latency for the
dashboard bridge. It includes the upstream four-second change highlight and
post-Keep observation lifecycle. Modal controls follow the SDK's help visibility;
retained appearance follows the effective root attributes even after Undo.
An `observationOnly` host option forwards actual sensor windows and rule scores
before returning without applying a candidate or starting AI. Switching modes
rebuilds the runtime so stale adaptive state cannot affect observe-only mode.
The sibling SDK source is unchanged. Declarations are not generated by this host
snapshot; the full SDK's own type/package test suite is separate.

To rebuild after an SDK change:

```powershell
npm.cmd run sdk:build
npm.cmd install ./vendor/ally-react-0.1.0-shopee.6.tgz
```

Restart Vite after replacing the SDK artifact so dependency optimization uses
the new runtime snapshot.

## Validate

```powershell
npm.cmd test
npm.cmd run visual:check
```

Tests use mocked OpenAI responses, including a response slower than the original
2-second deadline. They also exercise genuine zoom, pointer and form events,
local assistance with AI disabled/failing, modal controls, protected commerce
values and cancelling late refinement after Keep. Visual validation checks all
12 reference screens at 360×800
@2 and 390×844 @1, plus matching-aspect captures for three tall references.

With the dev server running, explicitly opt into one small paid live smoke test:

```powershell
node scripts/check-ally.mjs --live
# Full real browser → SDK → backend → OpenAI → Keep/Undo smoke test:
node scripts/check-ally.mjs --live --browser
```

The browser smoke test saves local before/pending/applied screenshots under
`screenshots/actual/ally-live-*-360.png`. Do not call it in routine CI.

API request format: [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
SDK integration contract: [host planner handoff](../sdk/docs/HOST_PLANNER_HANDOFF.md).
