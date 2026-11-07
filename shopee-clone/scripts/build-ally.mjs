// Build a host runtime snapshot without writing to the sibling SDK.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sdk=resolve(root,'../sdk');
const output=resolve(root,'.cache/ally-sdk');
const require=createRequire(import.meta.url);
const esbuild=createRequire(require.resolve('vite/package.json'))('esbuild');
const manifest=JSON.parse(await readFile(resolve(sdk,'package.json'),'utf8'));
await mkdir(resolve(output,'dist'),{recursive:true});
await mkdir(resolve(root,'vendor'),{recursive:true});
await esbuild.build({entryPoints:{index:resolve(sdk,'src/index.ts'),core:resolve(sdk,'src/core.ts')},outdir:resolve(output,'dist'),bundle:true,format:'esm',platform:'neutral',target:'es2022',jsx:'automatic',external:['react','react/jsx-runtime','zod'],plugins:[{name:'host-planner-deadline',setup(builder){
  builder.onLoad({filter:/engine-client\.ts$/},async args=>{
    const original=await readFile(args.path,'utf8'),anchor='}, 2000);';
    if(!original.includes(anchor))throw new Error('SDK timeout patch requires review: source changed');
    // Retain the original 2s default; respect an explicitly longer bounded policy.
    return {contents:original.replace(anchor,'}, Math.min(30000, Math.max(2000, input.policy.llm.timeoutMs)));'),loader:'ts'};
  });
}}]});
await copyFile(resolve(sdk,'src/styles.css'),resolve(output,'dist/styles.css'));
await copyFile(resolve(sdk,'README.md'),resolve(output,'README.md'));
const version=`${manifest.version}-shopee.1`;
await writeFile(resolve(output,'package.json'),JSON.stringify({name:manifest.name,version,private:true,type:'module',files:['dist','README.md'],sideEffects:['./dist/styles.css'],exports:{'.':'./dist/index.js','./core':'./dist/core.js','./styles.css':'./dist/styles.css'},dependencies:manifest.dependencies,peerDependencies:manifest.peerDependencies},null,2)+'\n');
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['pack','--pack-destination',resolve(root,'vendor')],{cwd:output,stdio:'inherit',shell:process.platform==='win32',windowsHide:true});
if(result.error||result.status!==0)throw new Error('SDK packaging failed');
console.log(`Built ${manifest.name}@${version} with a policy-aware deadline; sibling SDK unchanged.`);
