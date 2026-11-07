import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import path from "node:path";

export default function nextConfig(phase: string): NextConfig {
  return {
    // A production build must not overwrite the running dev server's manifests.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    outputFileTracingRoot: path.resolve(__dirname, ".."),
    outputFileTracingIncludes: {
      "/dashboard": ["../eval/results.json", "../eval/results.md"],
      "/api/ally/evaluation": ["../eval/results.json", "../eval/results.md"],
      "/api/ally/evaluation/results": ["../eval/results.json", "../eval/results.md"],
    },
  };
}
