// Explicit opt-in smoke test. Uses a synthetic, anonymous summary, never form data.
import { scoreProfile,PlannerResponseSchema } from '@ally/react/core';
import { createHostPolicy } from '../shared/ally-policy.mjs';
import { readSettings } from '../server/app.mjs';
import { planAdaptation } from '../server/planner.mjs';

const summary={windowMs:10000,viewport:{w:360,h:800,dpr:2},inputModality:'touch',counts:{taps:12,missTap:0,rageClick:0,hesitation:0,backtrack:0,errorLoop:6,zoomEvent:0,scrollThrash:0,slowTargeting:0},timings:{avgTargetSize:30,avgTimeToTarget:0,stepDurations:[]},context:{step:'checkout',priorPreset:null,undoCount:0}};
const input={schemaVersion:1,summary,profile:scoreProfile(summary),policy:createHostPolicy({ai:true}),preferences:[]};
if(process.argv.includes('--models')) {
  const settings=readSettings();
  if(!settings.apiKey){console.log('OPENAI_API_KEY is not configured.');process.exit(1)}
  const response=await fetch('https://api.openai.com/v1/models',{headers:{authorization:`Bearer ${settings.apiKey}`},signal:AbortSignal.timeout(10000)});
  const body=await response.json();
  console.log(JSON.stringify({status:response.status,code:body.error?.code,models:body.data?.map(item=>item.id).filter(id=>/^gpt-(4\.1|4o-mini|5\.4|5-mini|5\.6)/.test(id)).sort()}));
  process.exit(response.ok?0:1);
}
if(!process.argv.includes('--live')){console.log('Use --live to explicitly make one paid planner request.');process.exit(0)}
if(process.argv.includes('--browser')) {
  const {chromium}=await import('playwright');
  const {existsSync}=await import('node:fs');
  const {mkdir}=await import('node:fs/promises');
  const browser=await chromium.launch({channel:existsSync(chromium.executablePath())?undefined:'chrome'});
  try {
    const page=await browser.newPage({viewport:{width:360,height:800},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    let pageErrors=0;page.on('pageerror',()=>pageErrors++);
    await page.goto(`${process.env.ALLY_BASE_URL||'http://127.0.0.1:5173'}/address/edit?ally=1`);
    await page.locator('[data-ally-status="observing"]').waitFor();
    await page.getByLabel('Full Name',{exact:true}).fill('');
    await page.locator('#address-phone').fill('');
    const before=await page.locator('#address-phone').evaluate(element=>getComputedStyle(element).fontSize);
    await mkdir('screenshots/actual',{recursive:true});
    await page.screenshot({path:'screenshots/actual/ally-live-before-360.png'});
    const planned=page.waitForResponse(response=>response.url().endsWith('/api/ally/plan'),{timeout:30000});
    for(let i=0;i<5;i++)await page.getByRole('button',{name:'Submit',exact:true}).click();
    const response=await planned;
    if(response.status()!==200)throw new Error(`Planner returned HTTP ${response.status()}`);
    const reply=await response.json();
    if(!PlannerResponseSchema.safeParse(reply).success||reply.source!=='llm')throw new Error('Invalid planner reply');
    await page.getByRole('heading',{name:'Edit Address',exact:true}).click();
    await page.locator('[data-ally-status="applied"]').waitFor();
    const after=await page.locator('#address-phone').evaluate(element=>getComputedStyle(element).fontSize);
    await page.screenshot({path:'screenshots/actual/ally-live-applied-360.png'});
    await page.getByRole('button',{name:'Keep',exact:true}).click();
    await page.locator('[data-ally-status="kept"]').waitFor();
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    await page.locator('[data-ally-status="observing"]').waitFor();
    const restored=await page.locator('#address-phone').evaluate(element=>getComputedStyle(element).fontSize);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    if(pageErrors||overflow||before!==restored)throw new Error('Mobile integrity or Undo failed');
    console.log(JSON.stringify({valid:true,source:reply.source,latencyMs:reply.latencyMs,fontBefore:before,fontApplied:after,fontRestored:restored,pageErrors,overflow}));
  }finally{await browser.close()}
  process.exit(0);
}
const started=Date.now();let result,upstreamStatus=null,upstreamCode=null,networkError=null;
if(process.argv.includes('--direct')) {
  const settings=readSettings();
  if(!settings.apiKey){console.log('OPENAI_API_KEY is not configured.');process.exit(1)}
  result=await planAdaptation(input,{...settings,fetchImpl:async(...args)=>{
    try{const response=await fetch(...args);upstreamStatus=response.status;if(!response.ok){try{upstreamCode=(await response.clone().json()).error?.code}catch{}}return response}
    catch(error){networkError=error.cause?.code||error.name;throw error}
  }});
}else{
  const response=await fetch(`${process.env.ALLY_BASE_URL||'http://127.0.0.1:5173'}/api/ally/plan`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(16000)});
  result={status:response.status,body:response.status===204?undefined:await response.json()};
}
const valid=result.status===200&&PlannerResponseSchema.safeParse(result.body).success;
console.log(JSON.stringify({status:result.status,upstreamStatus,upstreamCode,networkError,elapsedMs:Date.now()-started,valid,source:result.body?.source,error:result.body?.error,tokens:result.body?.plan?.tokens}));
if(!valid)process.exitCode=1;
