import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  DEFAULT_POLICY, PlannerResponseSchema, buildDecisionInput,
  decideRule, guardPlan, scoreProfile, serializeDecisionInput,
} from '@ally/react/core';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(await readFile(join(here, 'ai-golden.json'), 'utf8'));
const mock = process.argv.includes('--mock');
const endpoint = process.env.ALLY_AI_ENDPOINT;
if (!mock && !endpoint) {
  console.log('AI endpoint not configured; live model quality is unverified. Set ALLY_AI_ENDPOINT to run.');
  process.exit(0);
}
if (!mock && !/^https?:\/\//.test(endpoint)) {
  throw new Error('ALLY_AI_ENDPOINT must be an absolute HTTP(S) URL for this script');
}

const policy = { ...DEFAULT_POLICY, llm: { ...DEFAULT_POLICY.llm, enabled: true } };
const base = {
  windowMs: 10000,
  viewport: { w: 390, h: 844, dpr: 2 },
  inputModality: 'touch',
  counts: { taps: 0, missTap: 0, rageClick: 0, hesitation: 0, backtrack: 0,
    errorLoop: 0, zoomEvent: 0, scrollThrash: 0, slowTargeting: 0 },
  timings: { avgTargetSize: 0, avgTimeToTarget: 0, stepDurations: [] },
  context: { step: 'cart', priorPreset: null, undoCount: 0 },
};

function mockReply(input) {
  const { motor, visual, cognitive } = input.profile;
  const ranked = [motor, visual, cognitive].sort((a, b) => b - a);
  return new Response(JSON.stringify({ schemaVersion: 1, source: 'llm', latencyMs: 1,
    plan: {
      profile: input.profile,
      tokens: { targetMinSize: motor >= 0.5 ? 56 : 48,
        spacingScale: motor >= 0.5 ? 1.5 : 1.25,
        fontScale: visual >= 0.3 ? 1.35 : 1.1,
        contrast: visual >= 0.3 ? 'high' : 'normal', density: 'spacious' },
      layout: { stepMode: cognitive >= 0.5 ? 'one-per-screen' : 'default',
        hideNonEssential: ['promoBanner', 'recommendations'],
        primaryActionSticky: false, confirmDestructive: true },
      assist: { inlineHints: cognitive >= 0.5, voiceOffer: false },
      confidence: ranked[0] - ranked[1],
      explanation: 'Tampilan disesuaikan dengan sinyal interaksi.', ttlSeconds: 120,
    },
  }), { status: 200 });
}

function semanticPass(plan, dimensions) {
  return dimensions.every((dimension) => {
    if (dimension === 'motor') return plan.tokens.targetMinSize >= 56;
    if (dimension === 'visual') return plan.tokens.fontScale >= 1.25 &&
      plan.tokens.contrast === 'high';
    return plan.layout.stepMode === 'one-per-screen' || plan.assist.inlineHints;
  });
}

const rows = [];
let routingPassed = 0;
let semanticPassed = 0;
let violations = 0;
for (const fixture of fixtures) {
  for (let run = 1; run <= 3; run++) {
    const summary = { ...base, counts: { ...base.counts, ...fixture.signals } };
    const decision = decideRule(summary, policy);
    const route = decision.requestPlanner ? 'llm' : decision.candidate ? 'rule' : 'none';
    const routingOk = route === fixture.route;
    if (routingOk) routingPassed++;
    const row = { fixture: fixture.id, run, route, routingOk,
      semanticOk: null, schemaPolicyOk: null, latencyMs: null };
    if (route !== 'llm') {
      row.schemaPolicyOk = route === 'none' ||
        JSON.stringify(guardPlan(decision.candidate.plan, policy).plan) ===
          JSON.stringify(decision.candidate.plan);
      if (!row.schemaPolicyOk) violations++;
    } else {
      const input = buildDecisionInput(summary, scoreProfile(summary), policy, [], ['cart']);
      const started = Date.now();
      let response;
      try {
        response = mock ? mockReply(input) : await fetch(endpoint, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: serializeDecisionInput(input), signal: AbortSignal.timeout(3000),
        });
        row.latencyMs = Date.now() - started;
        if (response.status === 200) {
          const parsed = PlannerResponseSchema.safeParse(await response.json());
          if (!parsed.success) throw new Error('invalid response schema');
          const guarded = guardPlan(parsed.data.plan, policy);
          const valid = JSON.stringify(guarded.plan) === JSON.stringify(parsed.data.plan) &&
            JSON.stringify(parsed.data.plan.profile) === JSON.stringify(input.profile);
          row.schemaPolicyOk = valid;
          if (!valid) violations++;
          row.semanticOk = semanticPass(guarded.plan, fixture.dimensions);
          if (row.semanticOk) semanticPassed++;
        } else {
          row.schemaPolicyOk = response.status === 204;
          if (!row.schemaPolicyOk) violations++;
          row.semanticOk = false;
        }
      } catch (error) {
        row.schemaPolicyOk = false;
        row.semanticOk = false;
        row.error = error instanceof Error ? error.message : 'unknown error';
        violations++;
      }
    }
    rows.push(row);
  }
}
assert.equal(rows.length, 21);
const report = { mode: mock ? 'synthetic-mock' : 'host-endpoint',
  routingPassed, routingTotal: 21, semanticPassed, semanticTotal: 15,
  violations, runs: rows };
await mkdir(join(here, '..', 'test-results'), { recursive: true });
const output = join(here, '..', 'test-results', mock ? 'ai-mock.json' : 'ai-live.json');
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`${report.mode}: routing ${routingPassed}/21; semantic ${semanticPassed}/15; schema/policy violations ${violations}; ${output}`);
if (routingPassed !== 21 || semanticPassed < 12 || violations !== 0) process.exitCode = 1;
