"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseEvaluationEvidence, type EvaluationEvidence } from "./evaluation";

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
      const response = await fetch("/api/ally/evaluation", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Evaluation request failed");
      const nextEvidence = parseEvaluationEvidence(await response.json());
      if (!nextEvidence) throw new Error("Invalid evaluation response");
      if (!controller.signal.aborted) {
        setEvidence(nextEvidence);
        setRefreshError(null);
      }
    } catch {
      if (!controller.signal.aborted) {
        setRefreshError("Could not refresh evaluation. Showing the last loaded state.");
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
