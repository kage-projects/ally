import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createServer, request as httpRequest } from 'node:http';
import { once } from 'node:events';
import { createDashboardProducer } from '../../shared/ally-dashboard.mjs';
import { createHostPolicy } from '../../shared/ally-policy.mjs';
import { createPresetPlan, scoreProfile } from '@ally/react/core';
import { createDashboardProxy, createDashboardUpgradeProxy, isDashboardPath } from '../../server/dashboard-proxy.mjs';

// Exercise the dashboard's actual boundary/reducer, not a second test schema.
const require=createRequire(import.meta.url);
const esbuild=createRequire(require.resolve('vite/package.json'))('esbuild');
const moduleUrl=async source=>'data:text/javascript;base64,'+Buffer.from((await esbuild.transform(source,{loader:'ts',format:'esm'})).code).toString('base64');
const contractUrl=await moduleUrl(await readFile('../contracts/dashboard.ts','utf8'));
const parserSource=(await readFile('../dashboard/lib/dashboard/event-parser.ts','utf8')).replace('"../../../contracts/dashboard"',JSON.stringify(contractUrl));
const {parseAllyBusEvent}=await import(await moduleUrl(parserSource));
const {createDashboardState,dashboardReducer}=await import(await moduleUrl(await readFile('../dashboard/lib/dashboard/reducer.ts','utf8')));

function summary(counts={}) {
  return {windowMs:1000,viewport:{w:360,h:800,dpr:2},inputModality:'touch',
    counts:{taps:3,missTap:3,rageClick:0,hesitation:0,backtrack:0,errorLoop:0,zoomEvent:0,scrollThrash:0,slowTargeting:0,...counts},
    timings:{avgTargetSize:20,avgTimeToTarget:0,stepDurations:[]},
    context:{step:'cart',priorPreset:null,undoCount:0}};
}
function fixture() {
  const events=[],policy=createHostPolicy(),at=1700000001000;
  const producer=createDashboardProducer({send:event=>{assert(parseAllyBusEvent(event),JSON.stringify(event));events.push(event)},policy:()=>policy,now:()=>at,id:'ephemeral-test'});
  const snapshot={at,sequence:1,windowId:0,source:'live',summary:summary(),samples:{targetSizes:2}};
  const plan=createPresetPlan('motor',scoreProfile(snapshot.summary),.75,policy).plan;
  const decision={action:'applied',decisionId:1,transactionId:1,at,source:'rule',preset:'motor',plan,latencyMs:2,corrections:[]};
  const state=()=>events.reduce((state,event)=>dashboardReducer(state,{type:'bus/event',event,receivedAt:event.at}),createDashboardState());
  return {events,producer,snapshot,decision,state};
}

test('real observations and Apply/Keep/Undo pass dashboard v1 and update its reducer',()=>{
  const {events,producer,snapshot,decision,state}=fixture();
  producer.setStep('cart');producer.observe(snapshot);producer.decision(decision,true);
  assert.deepEqual(events.map(e=>e.type),['heartbeat','summary','decision','applied']);
  assert.equal(state().comparison.beforeWindowCount,1);assert.equal(state().activeDecision.status,'applied');
  producer.decision({...decision,action:'kept'},true);assert.equal(state().activeDecision.status,'kept');
  producer.decision({...decision,action:'undone'},true);assert.equal(state().activeDecision,null);
  assert.equal(state().decisions[0].status,'undone');
  assert.equal(events[2].payload.guardrails.lockedComponentsPreserved,true);
  assert.equal(events[2].payload.latencyMs,2);
});

test('fast and full observations send disjoint count/time/target-size increments',()=>{
  const {events,producer,snapshot}=fixture();producer.observe(snapshot);producer.observe(snapshot);
  const next=structuredClone(snapshot);next.at+=1000;next.sequence++;next.summary.windowMs=2000;
  next.summary.counts.taps=5;next.summary.timings.avgTargetSize=30;next.samples.targetSizes=4;
  producer.observe(next);
  const windows=events.filter(e=>e.type==='summary').map(e=>e.payload.summary);
  assert.equal(windows.length,2);assert.equal(windows[1].counts.taps,2);assert.equal(windows[1].counts.missTap,0);
  assert.equal(windows[1].windowMs,1000);assert.equal(windows[1].timings.avgTargetSize,40);
  assert.equal(windows.reduce((n,w)=>n+w.counts.taps,0),5);
  const newWindow=structuredClone(next);newWindow.sequence++;newWindow.windowId++;newWindow.summary.windowMs=10000;
  producer.observe(newWindow);assert.equal(events.at(-1).payload.summary.counts.taps,5);
});

test('invalid/private/simulated observations are rejected; only coarse steps enter the bus',()=>{
  const {producer,snapshot,events}=fixture();
  producer.setStep('private-order-id');
  producer.observe({...snapshot,source:'simulation'});
  producer.observe({...snapshot,summary:{...snapshot.summary,formValue:'private'}});
  producer.observe({...snapshot,summary:{...snapshot.summary,context:{...snapshot.summary.context,step:'private-order-id'}}});
  assert.equal(events.length,0);producer.observe(snapshot);assert.equal(events.length,1);
  assert(!JSON.stringify(events).includes('private'));
});

test('replaced/corrected decisions, cached AI, clamp results and complete Undo stay consistent',()=>{
  const {producer,decision,state,events}=fixture();producer.decision(decision,true);
  producer.decision({...decision,decisionId:2,source:'cache',corrections:['targetMinSize']},true);
  assert.equal(state().decisions[0].source,'llm');
  assert.equal(state().decisions[0].guardrails.policyClamped,true);
  assert.deepEqual(state().decisions[0].previousPlan,decision.plan);
  producer.decision({...decision,decisionId:2,action:'kept'},true);
  producer.decision({...decision,decisionId:2,action:'corrected'},false);
  assert.equal(state().activeDecision.status,'kept');
  assert.equal(state().activeDecision.guardrails.lockedComponentsPreserved,false);
  producer.decision({...decision,decisionId:2,action:'undone'},true);
  assert.equal(state().activeDecision,null);assert(state().decisions.every(item=>item.status==='undone'));
  assert.equal(new Set(events.map(e=>e.eventId)).size,events.length);
});

test('expiry resets v1 without inventing Undo/replaying old counts; heartbeat is fresh',()=>{
  const {producer,decision,snapshot,state,events}=fixture();producer.observe(snapshot);producer.decision(decision,true);
  producer.decision({...decision,action:'expired'},true);
  assert.equal(events.at(-1).type,'reset');assert.equal(state().decisions.length,0);
  producer.heartbeat();producer.heartbeat();assert.notEqual(events.at(-1).eventId,events.at(-2).eventId);
  const next=structuredClone(snapshot);next.sequence++;next.at+=1000;next.summary.windowMs+=1000;next.summary.counts.taps++;
  producer.observe(next);assert.equal(events.at(-1).payload.summary.counts.taps,1);
});

test('Undo after fresh post-Keep decisions preserves the actual prior transaction',()=>{
  const {producer,decision,state}=fixture();producer.decision(decision,true);
  producer.decision({...decision,action:'kept'},true);
  producer.decision({...decision,decisionId:2,transactionId:2},true);
  producer.decision({...decision,decisionId:3,transactionId:2,source:'llm'},true);
  producer.decision({...decision,decisionId:3,transactionId:2,action:'undone'},true);
  assert.equal(state().decisions.filter(d=>d.status==='undone').length,2);
  assert.equal(state().activeDecision.status,'kept');
  assert.equal(state().activeDecision.id,state().decisions[2].id);
  producer.decision({...decision,decisionId:4,transactionId:3},true);
  assert.deepEqual(state().activeDecision.previousPlan,decision.plan);
});

async function serve(t,handler) {
  const server=createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>{server.closeAllConnections();server.close()});
  return `http://127.0.0.1:${server.address().port}`;
}
test('dashboard proxy forwards Next assets/RSC/evaluation on same origin, strips credentials',async t=>{
  const seen=[];
  const upstream=await serve(t,(req,res)=>{seen.push({url:req.url,headers:req.headers});res.setHeader('set-cookie','secret=1');res.end('dashboard')});
  const proxy=createDashboardProxy({origin:upstream});
  const host=await serve(t,(req,res)=>{if(!proxy(req,res)){res.statusCode=404;res.end()}});
  for(const path of ['/dashboard','/dashboard/simulator?_rsc=abc','/_next/static/chunk.js','/api/ally/evaluation/results']) {
    const response=await fetch(host+path,{headers:{cookie:'user=private',authorization:'Bearer private',rsc:'1'}});
    assert.equal(await response.text(),'dashboard');assert.equal(response.headers.get('set-cookie'),null);
  }
  assert(seen.every(req=>!req.headers.cookie&&!req.headers.authorization&&req.headers.rsc==='1'));
  assert.equal((await fetch(host+'/dashboard',{method:'POST'})).status,405);
  for(const path of ['/api/ally/plan','/cart','/dashboard-other','/api/ally/evaluation/private'])assert.equal(isDashboardPath(path),false);
});

test('dashboard proxy returns actionable 503 for unavailable/invalid/self upstream',async t=>{
  for(const origin of ['file:///etc/passwd','http://user:secret@localhost:3000','http://127.0.0.1:1']) {
    const proxy=createDashboardProxy({origin});const host=await serve(t,(req,res)=>proxy(req,res));
    const response=await fetch(host+'/dashboard');assert.equal(response.status,503);assert.match(await response.text(),/ALLY_DASHBOARD_ORIGIN/);
  }
  let host;const proxy=createDashboardProxy({origin:()=>host});host=await serve(t,(req,res)=>proxy(req,res));
  assert.equal((await fetch(host+'/dashboard')).status,503);
});

test('Next HMR upgrades through the host and preserves bidirectional socket bytes',async t=>{
  const upstream=createServer();upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  upstream.on('upgrade',(req,socket)=>{
    assert.equal(req.headers.cookie,undefined);
    socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
    socket.on('data',chunk=>socket.write(chunk));
    t.after(()=>socket.destroy());
  });
  const proxy=createDashboardUpgradeProxy({origin:`http://127.0.0.1:${upstream.address().port}`});
  const host=createServer();host.on('upgrade',(req,socket,head)=>{if(!proxy(req,socket,head))socket.destroy()});
  host.listen(0,'127.0.0.1');await once(host,'listening');
  t.after(()=>{host.close();upstream.close()});
  const request=httpRequest(`http://127.0.0.1:${host.address().port}/_next/webpack-hmr`,{
    headers:{connection:'Upgrade',upgrade:'websocket',cookie:'private=1'}});
  request.end();const [response,socket]=await once(request,'upgrade');t.after(()=>socket.destroy());
  assert.equal(response.statusCode,101);
  const reply=once(socket,'data');socket.write('ping');assert.equal((await reply)[0].toString(),'ping');
});
