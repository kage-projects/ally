import { readFileSync, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { resolve, sep, extname } from 'node:path';
import { planAdaptation } from './planner.mjs';
import { createDashboardProxy } from './dashboard-proxy.mjs';

export function readSettings() {
  let file={};try{file=parseEnv(readFileSync(resolve('.env.local'),'utf8'))}catch{}
  const env={...file,...process.env};
  return {apiKey:env.OPENAI_API_KEY?.trim()||'',model:env.OPENAI_MODEL?.trim()||'gpt-5.4-mini',aiEnabled:env.ALLY_AI_ENABLED!=='0',dashboardOrigin:env.ALLY_DASHBOARD_ORIGIN?.trim()||'http://127.0.0.1:3000'};
}

function reply(res,status,body) {
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(body===undefined?undefined:JSON.stringify(body));
}

export function createApiHandler({settings=readSettings,fetchImpl,now=Date.now}={}) {
  const requests=new Map();let inFlight=0;
  return async function handle(req,res) {
    const path=req.url?.split('?')[0];
    if(!path?.startsWith('/api/'))return false;
    const config=settings();
    if(path==='/api/ally/status'&&req.method==='GET') {
      reply(res,200,{aiEnabled:config.aiEnabled,keyConfigured:!!config.apiKey,model:config.model});return true;
    }
    if(path!=='/api/ally/plan'){reply(res,404,{error:'not_found'});return true}
    if(req.method!=='POST'){reply(res,405,{error:'method_not_allowed'});return true}
    let sameOrigin=true;
    try{if(req.headers.origin)sameOrigin=new URL(req.headers.origin).host===req.headers.host}catch{sameOrigin=false}
    if(!sameOrigin||req.headers['sec-fetch-site']==='cross-site'){reply(res,403,{error:'origin_rejected'});return true}
    if(req.headers['content-type']?.split(';')[0]!=='application/json'){reply(res,415,{error:'json_required'});return true}
    const time=now(),address=req.socket.remoteAddress||'local';
    for(const [key,entry] of requests)if(time-entry.start>=60000)requests.delete(key);
    const limit=requests.get(address)||{start:time,count:0};limit.count++;requests.set(address,limit);
    if(limit.count>20||inFlight>=2){reply(res,429,{error:'rate_limited'});return true}
    const abort=new AbortController();
    const onClose=()=>{if(!res.writableEnded)abort.abort()};res.once('close',onClose);
    inFlight++;
    try {
      const chunks=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>16384){reply(res,413,{error:'request_too_large'});return true}chunks.push(chunk)}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{reply(res,400,{error:'invalid_json'});return true}
      const result=await planAdaptation(body,{...config,fetchImpl,signal:abort.signal});
      if(!res.destroyed)reply(res,result.status,result.body);
    } catch {if(!res.destroyed)reply(res,400,{error:'invalid_request'})}
    finally{inFlight--;res.off('close',onClose)}
    return true;
  };
}

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.ico':'image/x-icon'};
export function createAppHandler(options={}) {
  const api=createApiHandler(options),root=resolve(options.dist||'dist');
  const dashboard=createDashboardProxy({origin:()=> (options.settings||readSettings)().dashboardOrigin||'http://127.0.0.1:3000'});
  return async(req,res)=>{
    if(dashboard(req,res))return;
    if(await api(req,res))return;
    if(!['GET','HEAD'].includes(req.method)){reply(res,405,{error:'method_not_allowed'});return}
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname.includes('\0')||pathname.includes('\\')||pathname.split('/').some(part=>part.startsWith('.'))){reply(res,404,{error:'not_found'});return}
      let file=resolve(root,`.${pathname}`);
      if(file!==root&&!file.startsWith(root+sep)){reply(res,404,{error:'not_found'});return}
      let info;try{info=await stat(file)}catch{}
      if(!info?.isFile()) {
        if(extname(pathname)){reply(res,404,{error:'not_found'});return}
        file=resolve(root,'index.html');info=await stat(file);
      }
      res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','x-content-type-options':'nosniff','cache-control':extname(file)==='.html'?'no-cache':'public, max-age=3600'});
      if(req.method==='HEAD')res.end();else createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    }catch{reply(res,404,{error:'not_found'})}
  };
}
