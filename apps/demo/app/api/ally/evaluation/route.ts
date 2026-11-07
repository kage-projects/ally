import { loadEvaluationEvidence } from "@/lib/dashboard/evaluation-loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await loadEvaluationEvidence(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
