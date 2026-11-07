// Build a host runtime snapshot without writing to the sibling SDK.
import { createRequire } from 'node:module';
import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { patchTransport,patchSensor,patchPresets,patchRules,patchTelemetryRuntime,patchTelemetryTypes,patchTelemetryProvider } from './ally-patches.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sdk=resolve(root,'../sdk');
const output=resolve(root,'.cache/ally-sdk');
const require=createRequire(import.meta.url);
const esbuild=createRequire(require.resolve('vite/package.json'))('esbuild');
const manifest=JSON.parse(await readFile(resolve(sdk,'package.json'),'utf8'));
await mkdir(resolve(output,'dist'),{recursive:true});
await mkdir(resolve(root,'vendor'),{recursive:true});
// Read a source snapshot through Node. A virtual namespace also keeps the native
// bundler from scanning directories outside this workspace in restricted runs.
const modules=new Map(),hash=createHash('sha256');
for(const file of (await readdir(resolve(sdk,'src'),{recursive:true})).sort()) {
  if(!/\.(ts|tsx|css)$/.test(file))continue;
  const name=file.replaceAll('\\','/'),content=await readFile(resolve(sdk,'src',file),'utf8');
  modules.set(name,content);hash.update(name);hash.update(content);
}
const sourceHash=hash.digest('hex');
const patches=new Map([['engine-client',patchTransport],['sensor',patchSensor],['presets',patchPresets],['rules',patchRules],['runtime',patchTelemetryRuntime],['types',patchTelemetryTypes],['provider',patchTelemetryProvider]]);
await esbuild.build({entryPoints:{index:'ally:index.ts',core:'ally:core.ts'},outdir:resolve(output,'dist'),bundle:true,format:'esm',platform:'neutral',target:'es2022',jsx:'automatic',external:['react','react/jsx-runtime','zod'],plugins:[{name:'shopee-runtime-patches',setup(builder){
  builder.onResolve({filter:/^ally:/},args=>({path:args.path.slice(5),namespace:'ally-source'}));
  builder.onResolve({filter:/^\./,namespace:'ally-source'},args=>{
    const stem=posix.normalize(posix.join(posix.dirname(args.importer),args.path)).replace(/\.js$/,'');
    const path=[stem+'.ts',stem+'.tsx'].find(file=>modules.has(file));
    if(!path)throw Error(`Unknown SDK module: ${args.path}`);
    return {path,namespace:'ally-source'};
  });
  builder.onLoad({filter:/\.(ts|tsx)$/,namespace:'ally-source'},args=>{
    let contents=modules.get(args.path).replace(/\r\n/g,'\n');
    const patch=patches.get(posix.basename(args.path).replace(/\.tsx?$/,''));
    if(patch)contents=patch(contents);
    return {contents,loader:args.path.endsWith('.tsx')?'tsx':'ts'};
  });
}}]});
await copyFile(resolve(sdk,'src/styles.css'),resolve(output,'dist/styles.css'));
await copyFile(resolve(sdk,'README.md'),resolve(output,'README.md'));
const version=`${manifest.version}-shopee.6`;
await writeFile(resolve(output,'package.json'),JSON.stringify({name:manifest.name,version,private:true,type:'module',allySource:{version:manifest.version,sha256:sourceHash},files:['dist','README.md'],sideEffects:['./dist/styles.css'],exports:{'.':'./dist/index.js','./core':'./dist/core.js','./styles.css':'./dist/styles.css'},dependencies:manifest.dependencies,peerDependencies:manifest.peerDependencies},null,2)+'\n');
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['pack','--ignore-scripts','--cache',resolve(root,'.cache/npm'),'--pack-destination',resolve(root,'vendor')],{cwd:output,stdio:'inherit',shell:process.platform==='win32',windowsHide:true});
if(result.error||result.status!==0)throw new Error('SDK packaging failed');
console.log(`Built ${manifest.name}@${version} with fast, guarded local assistance and optional AI refinement; sibling SDK unchanged.`);
