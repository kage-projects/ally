import { parseEvaluationEvidence, type EvaluationEvidence } from "./evaluation";

export const EVALUATION_REQUEST_TIMEOUT_MS = 8_000;

export class EvaluationRequestError extends Error {
  constructor(readonly kind: "timeout" | "http" | "invalid") {
    super(`Evaluation request failed: ${kind}`);
    this.name = "EvaluationRequestError";
  }
}

/** Keep a stalled refresh bounded without cancelling the caller's lifecycle signal. */
export async function requestEvaluationEvidence(
  signal: AbortSignal,
  { fetcher = fetch, timeoutMs = EVALUATION_REQUEST_TIMEOUT_MS }: {
    fetcher?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<EvaluationEvidence> {
  if (signal.aborted) throw new DOMException("Evaluation refresh cancelled", "AbortError");
  const request = new AbortController();
  const cancel = () => request.abort();
  signal.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    request.abort();
  }, timeoutMs);

  try {
    const response = await fetcher("/api/ally/evaluation", {
      cache: "no-store",
      signal: request.signal,
    });
    if (!response.ok) throw new EvaluationRequestError("http");
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (request.signal.aborted) throw error;
      throw new EvaluationRequestError("invalid");
    }
    const evidence = parseEvaluationEvidence(payload);
    if (!evidence) throw new EvaluationRequestError("invalid");
    return evidence;
  } catch (error) {
    if (timedOut && !signal.aborted) throw new EvaluationRequestError("timeout");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
  }
}
