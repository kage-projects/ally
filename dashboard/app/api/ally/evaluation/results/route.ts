import { loadEvaluationReport } from "@/lib/dashboard/evaluation-loader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await loadEvaluationReport();
  if (report === null) {
    return new Response("No validated evaluation report is available.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store" },
    });
  }
  return new Response(report, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline; filename=results.md",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
