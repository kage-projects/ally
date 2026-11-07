import type { AdaptationMarker, FrictionTrendWindow } from "./types";

/** Preserve producer timestamps; a zero-tap or missing window breaks the line. */
export function buildFrictionTrend(windows: FrictionTrendWindow[], markers: AdaptationMarker[]) {
  const ordered = [...windows].sort((a, b) => a.at - b.at);
  if (!ordered.length) return null;
  const start = ordered[0].at - ordered[0].windowMs;
  const visibleMarkers = markers.filter((marker) => marker.at >= start);
  const end = Math.max(ordered.at(-1)!.at, ...visibleMarkers.map((marker) => marker.at));
  const duration = Math.max(1, end - start);
  const points = ordered.map((window) => ({
    ...window,
    x: (window.at - start) / duration,
    rate: window.taps > 0 ? window.missTap / window.taps : null,
  }));
  const segments: typeof points[] = [];
  let segment: typeof points = [];
  for (const point of points) {
    const previous = segment.at(-1);
    if (point.rate === null || (previous && point.at - point.windowMs > previous.at)) {
      if (segment.length) segments.push(segment);
      segment = [];
    }
    if (point.rate !== null) segment.push(point);
  }
  if (segment.length) segments.push(segment);
  return {
    start, end, points, segments,
    ceiling: Math.max(0.1, Math.ceil(Math.max(0, ...points.map((point) => point.rate ?? 0)) * 10) / 10),
    markers: visibleMarkers.map((marker) => ({ ...marker, x: (marker.at - start) / duration })),
  };
}
