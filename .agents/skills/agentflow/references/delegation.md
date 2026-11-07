# Delegation Policy

Apply only when the router considers delegating real work to another worker/agent. Delegation is an orchestration decision, not a default for large or multi-agent tasks.

## Gate: delegate only when it pays

Ask before spawning anyone:

```text
specialized expertise?
independent parallel work?
large context that can be isolated?
separate verification useful?
```

```text
no → solve directly
yes → delegate with a bounded contract
```

Do not delegate work whose coordination cost exceeds doing it directly. Do not create one worker per skill, file, or workflow stage.

## A node is a contracted outcome

A node is not a file or a step. It is an outcome with:

```text
objective
required inputs
upstream contracts (carry their IDs: J/B/X/P, R/S/K, U/M/ST, T/O/FL, RK/PF)
own governing skill and its ready gate
constraints
allowed scope
expected output
proof: PF at its stage
verdict or acceptance
```

One node has one accountable owner. Files and modules are implementation details discovered while executing.

A node is done only when the owning skill's ready gate passes and its proof is faithful; otherwise the gap returns to the node, not forward to integration.

## Type the edges

Use the smallest edge vocabulary that explains scheduling:

```text
data     → B consumes A's output
order    → A must happen before B
decision → B waits for A's consequential choice
write-conflict → overlapping mutable scope; serialize or assign one owner
```

Readiness: `ready(node)` = all required predecessors done + required decisions available + no conflicting writer active.

## Worker output is untrusted until verified

Do not accept `Done.` / `Implemented.` as proof.

```text
coordinator → contract → worker → evidence → coordinator verifies
```

Verify the actual artifact: diff, test result, build result, reproduction, or query — not the worker's summary. A claim of completion without a PF at the right stage is unverified.

## Contract equivalence ≠ structural equality

A worker may find a better mechanism or path. Compare the contract, not the structure:

```text
required outcome preserved?
constraints preserved?
scope materially exceeded?
verification passes?
```

## Replan on discovery

A discovery that invalidates the contract or downstream assumptions stops the affected work; the coordinator replans the affected subgraph. Do not force a worker to finish an obsolete plan, and do not rebuild the whole graph for a local discovery.

## Integration is first-class

Parallel local success does not prove global success. The coordinator owns cross-node contract consistency, merge order, conflict resolution, integration, and final verification.
