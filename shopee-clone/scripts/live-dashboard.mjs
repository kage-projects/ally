// Materialize the existing dashboard inside this writable workspace, without
// changing the sibling app. Remove synthetic entry points from the live build.
import { cp, mkdir, readFile, writeFile, access, symlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const host=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(host,'../dashboard'),root=resolve(host,'.cache/dashboard-host'),app=resolve(root,'dashboard');
const exists=async path=>{try{await access(path);return true}catch{return false}};
function replace(text, before, after, count=1) {
  if(text.split(before).length-1!==count)throw Error(`Dashboard source changed; review live patch: ${before}`);
  return text.replaceAll(before,after);
}
await mkdir(app,{recursive:true});
for(const name of ['app','components','lib','next.config.ts','postcss.config.mjs','tsconfig.json','package.json','.gitignore']) {
  await cp(resolve(source,name),resolve(app,name),{recursive:true});
}
await mkdir(resolve(root,'contracts'),{recursive:true});
await cp(resolve(host,'../contracts/dashboard.ts'),resolve(root,'contracts/dashboard.ts'));
await cp(resolve(host,'../.gitignore'),resolve(root,'.gitignore'));
if(!await exists(resolve(root,'package.json')))await writeFile(resolve(root,'package.json'),JSON.stringify({name:'ally-live-dashboard',private:true}));
if(!await exists(resolve(app,'node_modules'))&&await exists(resolve(source,'node_modules'))) {
  await symlink(resolve(source,'node_modules'),resolve(app,'node_modules'),'junction');
}
async function patch(file, transform) {
  const target=resolve(app,file);
  await writeFile(target,transform((await readFile(target,'utf8')).replace(/\r\n/g,'\n')));
}
await writeFile(resolve(app,'app/dashboard/page.tsx'),`import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { loadEvaluationEvidence } from "@/lib/dashboard/evaluation-loader";
export const dynamic = "force-dynamic";
export const metadata = { title: "Live Shopee Dashboard | Ally" };
export default async function DashboardPage() {
  // Browser tabs must share Shopee's origin for BroadcastChannel delivery.
  if ((await headers()).get("x-ally-dashboard-proxy") !== "1") {
    const origin = process.env.ALLY_SHOPEE_ORIGIN || "http://127.0.0.1:5173";
    redirect(new URL("/dashboard", origin).href);
  }
  return <DashboardClient initialEvaluation={await loadEvaluationEvidence()} />;
}
`);
await patch('components/dashboard/dashboard-client.tsx',text=>{
  text=replace(text,'import type { AllyBusEvent, EvaluationResults } from "@/lib/dashboard/types";\n','');
  text=replace(text,'  demoEvents: AllyBusEvent[];\n','');
  text=replace(text,'  demoEvaluation: EvaluationResults;\n','');
  text=replace(text,'  demoEvents,\n','');text=replace(text,'  demoEvaluation,\n','');
  text=replace(text,'reset, loadDemo','reset');
  text=replace(text,'onRestore={() => loadDemo(demoEvents)}','',2);
  text=replace(text,'demoResults={dashboard.mode === "demo" ? demoEvaluation : undefined}','');
  return replace(text,'isDemo={dashboard.mode === "demo"}','isDemo={false}');
});
await patch('components/dashboard/dashboard-header.tsx',text=>{
  text=replace(text,'  onRestore: () => void;\n','');text=replace(text,'  onRestore,\n','');
  text=replace(text,'href="/dashboard/simulator"','href="/cart?ally=1"');
  text=replace(text,'Event simulator <span','Open Shopee <span');
  text=replace(text,'onClick={hasData ? onReset : onRestore}','onClick={onReset}\n            disabled={!hasData}');
  return replace(text,'{hasData ? "Reset view" : "Load demo"}','Reset view');
});
await writeFile(resolve(app,'components/dashboard/dashboard-empty-state.tsx'),`import type { ConnectionStatus } from "@/lib/dashboard/types";
import styles from "./dashboard.module.css";
export function DashboardEmptyState({ connectionStatus }: { connectionStatus: ConnectionStatus }) {
  return <section className={styles.emptyState} aria-labelledby="empty-dashboard-title"><div>
    <div className={styles.emptyIcon} aria-hidden="true">⌁</div>
    <h2 className={styles.emptyTitle} id="empty-dashboard-title">{connectionStatus === "unavailable" ? "Live updates are unavailable." : "Waiting for Ally events."}</h2>
    <p className={styles.emptyCopy}>Keep this dashboard open and interact with Shopee in another tab of the same browser. Only actual SDK signals and decisions appear here.</p>
    <a className={styles.button} href="/cart?ally=1" target="_blank" rel="noreferrer">Open Shopee with Ally ↗</a>
    <p className={styles.emptyHint}>Use ?ally=0 to observe the original interface, or ?ally=1 for adaptive assistance. No sample session is loaded.</p>
  </div></section>;
}
`);
await patch('lib/dashboard/use-ally-bus.ts',text=>{
  text=replace(text,'import type { AllyBusEvent } from "./types";\n','');
  return replace(text,'    loadDemo: (events: AllyBusEvent[]) => dispatch({ type: "demo/load", events }),\n','');
});
await writeFile(resolve(app,'app/dashboard/simulator/page.tsx'),'import { redirect } from "next/navigation";\nexport default function SimulatorDisabled() { redirect("/dashboard"); }\n');
await patch('app/globals.css',text=>replace(text,'@import "tailwindcss";','@import "tailwindcss" source(none);\n@source "./";\n@source "../components";'));
console.log('Prepared live dashboard: Shopee events only; demo loading and simulator disabled.');
if(!process.argv.includes('--prepare-only')) {
  const require=createRequire(resolve(app,'package.json'));
  let next;try{next=require.resolve('next/dist/bin/next')}catch{throw Error(`Install dashboard dependencies first: npm --prefix "${app}" install`)}
  const child=spawn(process.execPath,[next,'dev',app,'--hostname','127.0.0.1','--port',process.env.DASHBOARD_PORT||'3000'],{
    cwd:resolve(host,'..'),stdio:'inherit',windowsHide:true,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},
  });
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
  child.on('exit',code=>process.exit(code??1));
}
