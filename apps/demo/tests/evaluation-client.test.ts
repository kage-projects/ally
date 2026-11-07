import assert from "node:assert/strict";
import { test } from "node:test";
import { EvaluationRequestError, requestEvaluationEvidence } from "../lib/dashboard/evaluation-client";

const missing = { status: "unavailable", reason: "missing", message: "Awaiting measured results" };

function hangingFetch(): typeof fetch {
  return async (_input, init) => new Promise<Response>((_resolve, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    if (init?.signal?.aborted) abort();
    else init?.signal?.addEventListener("abort", abort, { once: true });
  });
}

test("evaluation refresh uses the fixed no-store endpoint and validates evidence", async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "/api/ally/evaluation");
    assert.equal(init?.cache, "no-store");
    assert.ok(init?.signal);
    return Response.json(missing);
  };
  const controller = new AbortController();
  assert.deepEqual(await requestEvaluationEvidence(controller.signal, { fetcher }), missing);
  assert.equal(controller.signal.aborted, false);
});

test("HTTP failures are rejected instead of becoming evidence", async () => {
  await assert.rejects(requestEvaluationEvidence(new AbortController().signal, {
    fetcher: async () => new Response("Internal Server Error", { status: 500 }),
  }), (error) => error instanceof EvaluationRequestError && error.kind === "http");
});

test("invalid JSON and invalid evidence are rejected without rendering their contents", async () => {
  for (const response of [new Response("{incomplete"), Response.json({ status: "ready", results: {} })]) {
    await assert.rejects(requestEvaluationEvidence(new AbortController().signal, {
      fetcher: async () => response,
    }), (error) => error instanceof EvaluationRequestError && error.kind === "invalid");
  }
});

test("network failures preserve their failure outcome for the hook to display", async () => {
  const failure = new TypeError("Network unavailable");
  await assert.rejects(requestEvaluationEvidence(new AbortController().signal, {
    fetcher: async () => { throw failure; },
  }), (error) => error === failure);
});

test("a stalled refresh times out without aborting the caller signal", async () => {
  const controller = new AbortController();
  await assert.rejects(requestEvaluationEvidence(controller.signal, {
    fetcher: hangingFetch(), timeoutMs: 10,
  }), (error) => error instanceof EvaluationRequestError && error.kind === "timeout");
  assert.equal(controller.signal.aborted, false);
});

test("the timeout also covers a stalled JSON body after headers arrive", { timeout: 1000 }, async () => {
  await assert.rejects(requestEvaluationEvidence(new AbortController().signal, {
    timeoutMs: 10,
    fetcher: async (_input, init) => new Response(new ReadableStream({
      start(body) {
        init?.signal?.addEventListener("abort", () => {
          body.error(new DOMException("Body aborted", "AbortError"));
        }, { once: true });
      },
    })),
  }), (error) => error instanceof EvaluationRequestError && error.kind === "timeout");
});

test("an already-cancelled refresh performs no request", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(requestEvaluationEvidence(controller.signal, {
    fetcher: async () => { calls++; return Response.json(missing); },
  }), { name: "AbortError" });
  assert.equal(calls, 0);
});

test("lifecycle cancellation aborts the pending request without reporting a timeout", async () => {
  const controller = new AbortController();
  const result = requestEvaluationEvidence(controller.signal, { fetcher: hangingFetch() });
  controller.abort();
  await assert.rejects(result, { name: "AbortError" });
});
