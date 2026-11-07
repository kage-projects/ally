"use client";

import { useEffect, useReducer, useState } from "react";
import { getConnectionStatus, subscribeAllyBus } from "./bus";
import { createDashboardState, dashboardReducer } from "./reducer";
import type { AllyBusEvent } from "./types";

export function useAllyBus() {
  const [dashboard, dispatch] = useReducer(dashboardReducer, undefined, createDashboardState);
  const [available, setAvailable] = useState(true);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const subscription = subscribeAllyBus((event, receivedAt) => {
      setNow(receivedAt);
      dispatch({ type: "bus/event", event, receivedAt });
    });
    setAvailable(subscription.available);
    return subscription.close;
  }, []);

  useEffect(() => {
    if (dashboard.lastReceivedAt === null || dashboard.mode === "demo") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [dashboard.lastReceivedAt, dashboard.mode]);

  return {
    dashboard,
    connectionStatus: getConnectionStatus(dashboard.lastReceivedAt, now, !available),
    secondsSinceEvent: dashboard.lastReceivedAt === null ? null : Math.max(0, Math.floor((now - dashboard.lastReceivedAt) / 1000)),
    reset: () => dispatch({ type: "view/reset" }),
    loadDemo: (events: AllyBusEvent[]) => dispatch({ type: "demo/load", events }),
  };
}
