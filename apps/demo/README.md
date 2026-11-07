# Ally Demo

Next.js application for the Ally checkout demo and judge dashboard.

## Run locally

From the repository root:

```bash
pnpm dev
```

Open `http://localhost:3000/dashboard`.

The dashboard starts empty and listens on `BroadcastChannel("ally")`. A valid v1
event changes the status to **Live**; 15 seconds without a valid event changes it
to **Idle** while retaining session data. Heartbeats are optional. Status uses the
local receive time, so old producer timestamps do not make a fresh event look idle.

## Try the event stream

1. Open `/dashboard` in one tab.
2. Open `/dashboard/simulator` in another tab on the **same origin and browser profile**.
3. Click **Replay sample session**, or send each event individually.
4. Watch signals, profile, decisions, Keep/Undo, and the active adaptation update.
5. Wait 15 seconds to see Idle, then send another event to return to Live.
6. Use **Reset session** in the simulator to clear the receiving dashboard.

The simulator sends synthetic fixture events with fresh timestamps and unique IDs.
It is a development tool, not the checkout SDK or evaluation harness. Events are
ephemeral: open the dashboard before sending them. Cross-device/tab-profile sync
is outside this local channel's scope.

**Load demo** displays a local sample session without claiming a live connection.
The first live event clears that sample session before applying received data.
Evaluation remains visibly labelled sample data until real results are integrated.

## Integration contract

The provisional v1 contract is in `mocks/dashboard/contracts.ts`. Incoming events
are validated before reaching the reducer; unknown versions, invalid nested
fields, extra fields, and non-finite numeric values are ignored. Development
warnings omit the rejected payload. Event IDs are deduplicated within a bounded
500-event window. The dashboard retains at most 30 summaries, 100 decisions, and
six windows per comparison group. Local **Reset view** clears only this view and
keeps its listener open; a bus `reset` clears every listening dashboard.

The final SDK should own these types under `packages/ally-react/src/bus.ts` once
available. No form values, screen content, or device identifiers belong in events.

## Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm test:dashboard
pnpm build
```

`test:dashboard` uses the existing TypeScript compiler and Node's built-in test
runner (Node 20+). It covers validation, reducer lifecycle, memory bounds,
connection timing, cleanup, unsupported browsers, and real channel delivery using
two Node channel instances. Browser-tab verification is a separate manual check.
