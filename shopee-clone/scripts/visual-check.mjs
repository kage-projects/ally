import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { screens } from './mobile-screens.mjs';
import { compareImages } from './compare-images.mjs';

const base=process.env.VISUAL_BASE_URL||'http://127.0.0.1:5173';
const output=resolve('screenshots/actual');
const requested=process.argv.slice(2);
const targets=requested.length?screens.filter(screen=>requested.includes(screen.name)):screens;
if(!targets.length) throw new Error('No matching mobile screens requested');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.VISUAL_BROWSER_CHANNEL||(existsSync(chromium.executablePath())?undefined:'chrome')});
const report=[];
try {
  for(const screen of targets) {
    const sizes=[{name:'mobile-reference',width:360,height:800,scale:2},{name:'mobile',width:390,height:844,scale:1}];
    if(screen.width!==720||screen.height!==1600) sizes.push({name:'reference-native',width:360,height:Math.round(screen.height/(screen.width/360)),scale:screen.width/360});
    for(const size of sizes){
      const page=await browser.newPage({viewport:{width:size.width,height:size.height},deviceScaleFactor:size.scale,isMobile:true,hasTouch:true});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      try {
        await page.goto(`${base}${screen.path}`,{waitUntil:'networkidle',timeout:30000});
        await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})))});
        const filename=screen.name==='home'?`${size.name}.png`:`${screen.name}-${size.name}.png`;
        const path=resolve(output,filename);
        await page.screenshot({path,fullPage:false,animations:'disabled'});
        const health=await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(image=>!image.complete||!image.naturalWidth).map(image=>image.src)}));
        const result={screen:screen.name,viewport:[size.width,size.height],scale:size.scale,screenshot:filename,...health,errors};
        if(health.horizontalOverflow||health.brokenImages.length||errors.length) process.exitCode=1;
        const matches=size.name==='reference-native'||(size.name==='mobile-reference'&&screen.width===720&&screen.height===1600);
        if(matches){
          const sections=screen.name==='home'?[['header',0,178],['wallet',178,298],['categories',298,508],['banner',508,731],['media',731,1053],['products',1053,1475],['navigation',1475,1600]]:screen.name==='profile'?[['header',0,245],['verify',245,466],['purchases',466,927],['wallet',927,1302],['finance',1302,1475],['navigation',1475,1600]]:undefined;
          result.comparison=await compareImages(page,resolve('screenshots/reference',screen.reference),path,resolve(output,screen.name==='home'?'mobile-diff.png':`${screen.name}-diff.png`),sections);
          if(!result.comparison.dimensionsMatch) process.exitCode=1;
          const comparisonFile=screen.name==='home'?'comparison.json':`${screen.name}-comparison.json`;
          await writeFile(resolve(output,comparisonFile),JSON.stringify({reference:screen.reference,note:'Mean RGB error is diagnostic, not a fidelity pass threshold. Source JPEG compression affects the score.',...result.comparison},null,2));
        }
        report.push(result);
        console.log(`${screen.name} ${size.width}x${size.height} @${size.scale.toFixed(2)}: overflow=${health.horizontalOverflow}, broken=${health.brokenImages.length}, errors=${errors.length}${result.comparison?' '+JSON.stringify(result.comparison.sections||result.comparison):''}`);
      }catch(error){process.exitCode=1;console.error(`${screen.name}/${size.name}: ${error.message}`);report.push({screen:screen.name,error:error.message})}
      finally{await page.close()}
    }
  }
}finally{await browser.close()}
await writeFile(resolve(output,'validation.json'),JSON.stringify(report,null,2));
const cards=targets.map(screen=>{
  const native=screen.width!==720||screen.height!==1600;
  const capture=screen.name==='home'?'mobile-reference.png':`${screen.name}-${native?'reference-native':'mobile-reference'}.png`;
  return `<section><h2>${screen.name}</h2><div><figure><figcaption>Reference</figcaption><img src="../reference/${encodeURIComponent(screen.reference)}" alt="${screen.name} reference"></figure><figure><figcaption>Actual</figcaption><img src="${capture}" alt="${screen.name} actual"></figure></div></section>`;
}).join('\n');
await writeFile(resolve(output,'review.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>Mobile visual review</title><style>body{font:16px system-ui;background:#eee;margin:24px}section{max-width:1000px;margin:0 auto 40px}section>div{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0;background:white}figcaption{padding:8px}img{display:block;width:100%;height:auto}</style><h1>Mobile reference comparison</h1><p>Local QA gallery. Differences and runtime checks are recorded in validation.json.</p>${cards}</html>`);
