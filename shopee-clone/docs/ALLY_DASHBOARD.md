# Live Shopee → Ally dashboard

The host publishes real SDK observations and decisions using the existing
`../contracts/dashboard.ts` v1 protocol. The original `../dashboard` source and
its synthetic demo/evaluation fixtures are unchanged.

## Run

In the repository root (the parent of `shopee-clone`), install the dashboard's
workspace dependencies and start Next:

```powershell
pnpm install
pnpm --filter @ally/dashboard dev --hostname 127.0.0.1 --port 3000
```

In a separate terminal inside `shopee-clone`:

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

For the production Shopee server, build then run `npm.cmd start`; its default
port is now 5173. If `.env.local` already sets `PORT=3000`, change it to 5173 or
set `PORT=5173` in the process environment. `ALLY_DASHBOARD_ORIGIN` defaults to
`http://127.0.0.1:3000` and can point to a different fixed dashboard server.

1. Open **http://127.0.0.1:5173/dashboard** first.
2. In another tab of the same browser/profile, open
   **http://127.0.0.1:5173/address/edit?ally=1**.
3. Clear Full Name and Phone Number, then press Submit four times. If asked,
   press “Selesai mengisi, terapkan”.
4. The dashboard shows Live, actual Signals, friction profile, Combined Support,
   RULE source, measured latency, applied tokens and guardrail results.
5. Keep and Undo in Shopee update that decision's status in the dashboard.
   Keep now closes help; use **Batalkan penyesuaian** in the Ally panel to undo
   it later. New friction after Keep can open a new decision immediately.
   Other scenarios, including the cart's motor assistance, use the same bridge.

The Ally demo panel includes a dashboard link. Open it before triggering help.
For baseline observation, open `/cart?ally=0` or `/address/edit?ally=0` instead.
The same real friction signals and profile reach the dashboard, with **No
adaptation applied** and no decision events. There is no Ally pill, highlight,
layout adaptation or AI request. The explicit mode survives frontend navigation.
Do not open the dashboard directly on port 3000 for a live Shopee session:
BroadcastChannel cannot cross origins/ports. Keep `localhost` and `127.0.0.1`
consistent. No historical replay, persistence or cross-device transport is added.

## Data and lifecycle

- Adaptive `?ally=1` and observe-only `?ally=0` sessions open
  `BroadcastChannel("ally")` on supported shopping routes. Plain URLs with the
  default configuration have no observation/reporting or dashboard link.
- In snapshot `.6`, observe-only mode uses the same SDK listeners, allowlisted
  validation counters, coarse phases, fast observations and ten-second windows.
  It publishes the observations and returns before preferences/candidates/AI.
  Mode changes rebuild the runtime and reset the dashboard session, restoring
  reference styling and cancelling pending adaptive work when entering `ally=0`.
- A fresh heartbeat every five seconds keeps the existing dashboard Live.
  Browsers may throttle background timers; Idle retains the dashboard's data.
- SDK observations publish immediately at the existing fast evidence thresholds
  and at regular ten-second windows. They precede applied decisions so baseline
  metrics freeze at the right boundary. Fast/full cumulative snapshots are split
  into disjoint increments, including sample-weighted target sizes.
- Profile/confidence reflect SDK rule scoring of the current cumulative evidence;
  displayed signal counts represent each new, nonoverlapping interval.
- Summaries contain counters, timings, viewport sizes and five coarse phases.
  They contain no form values, DOM text, route/order IDs, screenshots or absolute
  coordinates. Bus IDs are random, memory-only event/decision correlation IDs.
- Decision payloads contain only schema-defined plans, SDK explanations, measured
  computation/request latency and actual SDK correction codes. A cached AI plan
  maps to `llm` because v1 has no cache source; latency is this resolution's time.
  Guardrail badges use schema validation, actual policy corrections, and structural
  checks preventing protected slots from being hidden/stickied; protected text is
  neither inspected nor transmitted.
- SDK snapshot `.5` supplies a local transaction counter each time it captures
  a baseline, including after Keep or step changes. Undo marks only revisions
  sharing that baseline undone. This preserves an earlier kept appearance in
  the dashboard when the SDK restores it. Counters stay local to the adapter;
  the shared v1 wire schema is unchanged. History is bounded to 100 decisions.
- v1 has no expiry/disable event. Expiry and stopping observation send `reset`,
  clearing the session instead of representing expiry as a user's Undo. Reload
  starts a new ephemeral producer. Use one active Shopee demo tab per dashboard;
  v1 has no session selector and merges producers on the same origin.
- Slow targeting, scroll thrash and time-to-target are not measured by this SDK
  snapshot; its schema reports zero. Do not present those zeroes or resulting
  time-to-target comparisons as measured improvement. A future shared contract
  needs explicit unavailable capabilities to distinguish them.
- Evaluation remains separate: the dashboard loads only validated non-mock
  `eval/results.json`. Live UI integration does not fabricate evaluation scores.

## Verification

```powershell
npm.cmd run test:unit
# With both servers running:
$env:ALLY_DASHBOARD_TEST='1'
npx playwright test tests/ally-dashboard.spec.js --workers=1 --reporter=line
```

Unit checks import the actual sibling dashboard validator/reducer, covering v1
compatibility, baseline ordering, snapshot deduplication/increments, privacy,
replacement/correction, full Undo and expiry. Proxy checks cover Next assets,
RSC/evaluation routing, credential stripping and unavailable/self upstreams.
Browser checks exercise actual SDK events in two tabs at 360×800 @2 and
390×844 @1 and capture `screenshots/actual/dashboard/`.

Validated for this change: host build, 25 host unit checks, 50 existing dashboard
unit checks, all 66 existing Shopee browser checks, six new integration checks,
and 27 reference captures with no page errors, broken images or horizontal
overflow. A separate unmocked browser smoke delivered actual cart miss taps,
RULE/Motor Support, Apply, Keep and Undo with no page errors.

After upstream SDK synchronization to snapshot `.5`, 26 host unit checks and
all 76 mobile browser checks pass, including fresh post-Keep decisions and
transaction-aware Undo in the dashboard. The 27 reference captures remain
unchanged in their diagnostic comparison scores.

Snapshot `.6` additionally passes all 82 mobile checks and 26 host unit checks.
Observe-only checks verify real SDK miss/error reports in the dashboard, zero
adaptation/planner calls, private-value exclusion, safe mode changes and
byte-identical cart screenshots compared with plain reference mode at both
mobile sizes.

Environment limitation: the sibling dashboard had no installed dependencies and
network access was unavailable. Browser QA used its source in the ignored
`.cache/dashboard-host` mirror with cached Next 15.5.29, React 19.2.8, Motion
12.43.0 and Tailwind 4.3.3. The mirror explicitly limits Tailwind scanning to
app/components to avoid watching generated output. The original dashboard files
and dependency declarations are untouched. Its exact locked dependency install
and production build have not been verified here; use the normal workspace
commands above for that environment. No synthetic event replay was used for
the live integration checks.
