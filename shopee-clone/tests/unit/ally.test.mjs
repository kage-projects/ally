import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_POLICY,scoreProfile,createPresetPlan,PlannerResponseSchema,decideRule } from '@ally/react/core';
import { createHostPolicy,allyPhase } from '../../shared/ally-policy.mjs';
import { planAdaptation,intersectPolicy } from '../../server/planner.mjs';
import { createApiHandler,createAppHandler } from '../../server/app.mjs';

function input(counts={}) {
  const summary={windowMs:10000,viewport:{w:360,h:800,dpr:2},inputModality:'touch',
    counts:{taps:12,missTap:0,rageClick:0,hesitation:0,backtrack:0,errorLoop:0,zoomEvent:0,scrollThrash:0,slowTargeting:0,...counts},
    timings:{avgTargetSize:30,avgTimeToTarget:0,stepDurations:[]},
    context:{step:'checkout',priorPreset:null,undoCount:0}};
  return {schemaVersion:1,summary,profile:scoreProfile(summary),policy:createHostPolicy({ai:true}),preferences:[]};
}
const combined=()=>input({errorLoop:6});
function planFor(body) {
  const profile=scoreProfile(body.summary);
  return createPresetPlan('visual',profile,.8,createHostPolicy({ai:true}),['error_loop']).plan;
}
const responseFor=plan=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({plan})}]}]}),{status:200});

test('checkout options share one phase; only a new local order is confirmation',()=>{
  for(const route of ['/checkout','/vouchers','/payment','/shipping','/addresses','/address/edit?index=0'])assert.equal(allyPhase(route),'checkout');
  assert.equal(allyPhase('/cart?ally=1'),'cart');
  assert.equal(allyPhase('/orders/demo-123'),'confirmation');
  assert.equal(allyPhase('/orders/1'),'orders');
  assert.equal(allyPhase('/purchases?tab=4'),'orders');
  assert.equal(allyPhase('/delivery'),'orders');
  assert.equal(allyPhase('/profile'),'browse');
  assert.equal(allyPhase('/?ally=1'),'browse');
  assert.equal(allyPhase('/unknown'),null);
});

test('combined evidence produces guarded local help while AI refinement remains optional',()=>{
  const summary=combined().summary;
  for(const ai of [false,true]) {
    const policy=createHostPolicy({ai});
    policy.limits={targetMinSize:[44,44],spacingScale:[1,1.05],fontScale:[1,1.05]};
    const decision=decideRule(summary,policy),plan=decision.candidate?.plan;
    assert.equal(decision.kind,'combined');assert.equal(decision.requestPlanner,ai);
    assert(plan);assert.equal(plan.tokens.targetMinSize,44);
    assert.equal(plan.tokens.fontScale,1.05);assert.equal(plan.tokens.spacingScale,1.05);
    assert.deepEqual(plan.profile,scoreProfile(summary));assert.equal(plan.assist.inlineHints,true);
    assert(plan.confidence>=policy.thresholds.apply);
    assert.equal(plan.assist.voiceOffer,false);assert.equal(plan.layout.confirmDestructive,true);
    assert.equal(plan.layout.primaryActionSticky,false);assert.equal(plan.layout.stepMode,'default');
    assert.deepEqual(plan.layout.hideNonEssential,[]);
    policy.thresholds.apply=.95;
    assert.equal(decideRule(summary,policy).candidate,null);
    assert.equal(decideRule(summary,policy).requestPlanner,ai);
  }
  assert.equal(decideRule(input({errorLoop:5}).summary,createHostPolicy()).candidate,null);
  assert.equal(DEFAULT_POLICY.thresholds.apply,.6);
  for(const counts of [{},{errorLoop:1},{zoomEvent:1},{missTap:1}]) {
    const decision=decideRule(input(counts).summary,createHostPolicy({ai:true}));
    assert.equal(decision.candidate,null);assert.equal(decision.requestPlanner,false);
  }
});

test('server intersects permissions without trusting browser model, hide list or locks',()=>{
  const server=createHostPolicy({ai:true,model:'server-model'}),browser=structuredClone(DEFAULT_POLICY);
  browser.llm.enabled=true;browser.llm.model='untrusted';browser.lockedComponents=[];
  const effective=intersectPolicy(browser,server);
  assert.equal(effective.llm.model,'server-model');assert.deepEqual(effective.allowHide,[]);
  assert.deepEqual(effective.lockedComponents,server.lockedComponents);
  assert.deepEqual(effective.limits.fontScale,[1,1.2]);
  browser.limits.fontScale=[2,3];assert.equal(intersectPolicy(browser,server),null);
});

test('schema, step and evidence gates block invalid data before calling OpenAI',async()=>{
  let calls=0;const options={apiKey:'test-key',fetchImpl:async()=>{calls++;throw Error()}};
  assert.equal((await planAdaptation({...combined(),email:'private@example.com'},options)).status,400);
  const badStep=combined();badStep.summary.context.step='user123';assert.equal((await planAdaptation(badStep,options)).status,400);
  assert.equal((await planAdaptation(input(),options)).status,204);
  assert.equal((await planAdaptation(input({missTap:4}),options)).status,204);
  assert.equal((await planAdaptation(combined(),{...options,aiEnabled:false})).status,204);
  assert.equal(calls,0);
});

test('real Responses request uses server credentials and validates/clamps structured plan',async()=>{
  const body=combined();body.profile={motor:0,visual:0,cognitive:0};
  body.policy.llm.model='browser-model';
  let request;
  const plan=planFor(body);plan.tokens.targetMinSize=200;plan.tokens.fontScale=3;
  plan.layout.hideNonEssential=['recommendations'];plan.layout.confirmDestructive=false;
  const result=await planAdaptation(body,{apiKey:'server-only-test-key',model:'server-model',fetchImpl:async(url,options)=>{request={url,...options};return responseFor(plan)}});
  assert.equal(result.status,200);assert(PlannerResponseSchema.safeParse(result.body).success);
  assert.equal(result.body.plan.tokens.targetMinSize,56);assert.equal(result.body.plan.tokens.fontScale,1.2);
  assert.deepEqual(result.body.plan.layout.hideNonEssential,[]);assert.equal(result.body.plan.layout.confirmDestructive,true);
  assert.deepEqual(result.body.plan.profile,scoreProfile(body.summary));
  assert.equal(request.url,'https://api.openai.com/v1/responses');
  assert.equal(request.headers.authorization,'Bearer server-only-test-key');
  const payload=JSON.parse(request.body);
  assert.equal(payload.model,'server-model');assert.equal(payload.store,false);
  assert.equal(payload.text.format.strict,true);assert.equal(payload.reasoning.effort,'none');
  assert(!request.body.includes('server-only-test-key'));assert(!JSON.stringify(result).includes('server-only-test-key'));
});

test('missing key, refusal, wrong profile, upstream error and no-op fail safely',async()=>{
  const body=combined();
  assert.equal((await planAdaptation(body)).status,503);
  assert.equal((await planAdaptation(body,{apiKey:'x',fetchImpl:async()=>responseFor(null)})).status,204);
  assert.equal((await planAdaptation(body,{apiKey:'x',fetchImpl:async()=>new Response('secret upstream details',{status:401})})).body.error,'planner_credentials_rejected');
  const bad=planFor(body);bad.profile={motor:1,visual:0,cognitive:0};
  for(const fetchImpl of [async()=>responseFor(bad),async()=>new Response('{}'),async()=>{throw Error('private details')}]) {
    const result=await planAdaptation(body,{apiKey:'x',fetchImpl});assert.equal(result.status,502);assert(!JSON.stringify(result).includes('private details'));
  }
});

async function withServer(t,handler) {
  const server=createServer(handler);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections()}));
  return `http://127.0.0.1:${server.address().port}`;
}
test('HTTP endpoint bounds payloads, rejects cross-origin requests and rate limits',async t=>{
  const handler=createApiHandler({settings:()=>({apiKey:'never-return-this',model:'test-model',aiEnabled:false})});
  const url=await withServer(t,(req,res)=>handler(req,res));
  const status=await (await fetch(`${url}/api/ally/status`)).json();
  assert.equal(status.keyConfigured,true);assert(!JSON.stringify(status).includes('never-return-this'));
  const post=(body,extra={})=>fetch(`${url}/api/ally/plan`,{method:'POST',headers:{'content-type':'application/json',...extra},body});
  assert.equal((await post('{}',{origin:'https://evil.example'})).status,403);
  assert.equal((await post('x'.repeat(17000))).status,413);
  assert.equal((await post('{')).status,400);
  assert.equal((await post(JSON.stringify({...combined(),phone:'private'}))).status,400);
  assert.equal((await post(JSON.stringify(input()))).status,204);
  for(let i=0;i<18;i++)await post(JSON.stringify(input()));
  assert.equal((await post(JSON.stringify(input()))).status,429);
});

test('production server serves app routes and never exposes dotfiles or arbitrary paths',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'shopee-ally-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  await writeFile(join(directory,'index.html'),'<h1>Mobile app</h1>');
  const url=await withServer(t,createAppHandler({dist:directory,settings:()=>({apiKey:'',aiEnabled:false,model:'test'})}));
  assert.match(await (await fetch(`${url}/checkout`)).text(),/Mobile app/);
  assert.equal((await fetch(`${url}/.env.local`)).status,404);
  assert.equal((await fetch(`${url}/assets/missing.js`)).status,404);
  assert.equal((await fetch(`${url}/api/unknown`)).status,404);
});
