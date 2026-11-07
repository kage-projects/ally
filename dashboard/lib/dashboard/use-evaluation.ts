"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EvaluationEvidence } from "./evaluation";
import { EvaluationRequestError, requestEvaluationEvidence } from "./evaluation-client";

export function useEvaluation(initialEvidence: EvaluationEvidence) {
  const [evidence, setEvidence] = useState(initialEvidence);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setRefreshing(true);
    try {
      const nextEvidence = await requestEvaluationEvidence(controller.signal);
      if (!controller.signal.aborted) {
        setEvidence(nextEvidence);
        setRefreshError(null);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setRefreshError(error instanceof EvaluationRequestError && error.kind === "timeout"
          ? "Evaluation refresh timed out. Showing the last loaded state."
          : "Could not refresh evaluation. Showing the last loaded state.");
      }
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        if (!controller.signal.aborted) setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => { void refresh(); }, 15_000);
    return () => {
      window.clearInterval(timer);
      pending.current?.abort();
    };
  }, [refresh]);

  return { evidence, refreshing, refreshError, refresh };
}
