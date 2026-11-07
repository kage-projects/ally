import type { Preset } from "./types";

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(11, 19);
}

export function formatPercent(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits,
  }).format(value);
}

export function formatPreset(preset: Preset): string {
  if (!preset) return "Default";

  return `${preset.charAt(0).toUpperCase()}${preset.slice(1)} Support`;
}

export function formatDuration(seconds: number): string {
  return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
}

export function formatImprovement(
  before: number | null,
  after: number | null,
  higherIsBetter = false,
): number | null {
  if (before === null || after === null || before === 0) return null;

  const delta = higherIsBetter ? after - before : before - after;
  return (delta / before) * 100;
}