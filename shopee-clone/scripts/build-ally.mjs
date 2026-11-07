// Build a host runtime snapshot without writing to the sibling SDK.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { patchTransport,patchSensor,patchPresets,patchRules } from './ally-patches.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sdk=resolve(root,'../sdk');
const output=resolve(root,'.cache/ally-sdk');
const require=createRequire(import.meta.url);
const esbuild=createRequire(require.resolve('vite/package.json'))('esbuild');
const manifest=JSON.parse(await readFile(resolve(sdk,'package.json'),'utf8'));
await mkdir(resolve(output,'dist'),{recursive:true});
await mkdir(resolve(root,'vendor'),{recursive:true});
await esbuild.build({entryPoints:{index:resolve(sdk,'src/index.ts'),core:resolve(sdk,'src/core.ts')},outdir:resolve(output,'dist'),bundle:true,format:'esm',platform:'neutral',target:'es2022',jsx:'automatic',external:['react','react/jsx-runtime','zod'],plugins:[{name:'shopee-runtime-patches',setup(builder){
  for(const [file,patch] of [['engine-client',patchTransport],['sensor',patchSensor],['presets',patchPresets],['rules',patchRules]]) {
    builder.onLoad({filter:new RegExp(`${file}\\.ts$`)},async args=>({contents:patch((await readFile(args.path,'utf8')).replace(/\r\n/g,'\n')),loader:'ts'}));
  }
}}]});
await copyFile(resolve(sdk,'src/styles.css'),resolve(output,'dist/styles.css'));
await copyFile(resolve(sdk,'README.md'),resolve(output,'README.md'));
const version=`${manifest.version}-shopee.3`;
await writeFile(resolve(output,'package.json'),JSON.stringify({name:manifest.name,version,private:true,type:'module',files:['dist','README.md'],sideEffects:['./dist/styles.css'],exports:{'.':'./dist/index.js','./core':'./dist/core.js','./styles.css':'./dist/styles.css'},dependencies:manifest.dependencies,peerDependencies:manifest.peerDependencies},null,2)+'\n');
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['pack','--pack-destination',resolve(root,'vendor')],{cwd:output,stdio:'inherit',shell:process.platform==='win32',windowsHide:true});
if(result.error||result.status!==0)throw new Error('SDK packaging failed');
console.log(`Built ${manifest.name}@${version} with fast, guarded local assistance and optional AI refinement; sibling SDK unchanged.`);
