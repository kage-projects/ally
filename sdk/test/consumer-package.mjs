import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sdkDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resultsDir = resolve(sdkDir, 'test-results');
const manifest = JSON.parse(await readFile(join(sdkDir, 'package.json'), 'utf8'));
const tarball = join(resultsDir, `ally-react-${manifest.version}.tgz`);
await mkdir(resultsDir, { recursive: true });

function runPnpm(args, cwd) {
  const scriptPath = process.env.npm_execpath;
  const nodeScript = Boolean(scriptPath && /\.[cm]?js$/i.test(scriptPath));
  const command = nodeScript ? process.execPath
    : scriptPath && !/\.cmd$/i.test(scriptPath) ? scriptPath
      : process.platform === 'win32' ? 'pnpm.CMD' : 'pnpm';
  const commandArgs = command === process.execPath ? [scriptPath, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    cwd, encoding: 'utf8', windowsHide: true,
    shell: process.platform === 'win32' && /\.cmd$/i.test(command),
  });
  if (result.error || result.status !== 0) {
    throw new Error(`pnpm ${args[0]} failed (${result.status ?? 'unknown'}):\n${result.stderr || result.stdout || result.error}`);
  }
  return result.stdout;
}

const packOutput = runPnpm(['pack', '--out', tarball, '--json'], sdkDir);
const packed = JSON.parse(packOutput);
const paths = new Set(packed.files.map((file) => file.path));
for (const required of ['dist/index.js', 'dist/index.d.ts', 'dist/core.js',
  'dist/core.d.ts', 'dist/styles.css', 'README.md', 'docs/USAGE.md',
  'docs/HOST_PLANNER_HANDOFF.md', 'package.json']) {
  assert(paths.has(required), `tarball missing ${required}`);
}
assert([...paths].every((path) => ['dist/', 'README.md', 'docs/USAGE.md',
  'docs/HOST_PLANNER_HANDOFF.md', 'package.json']
  .some((allowed) => path === allowed || path.startsWith(allowed))),
  'tarball contains source, tests, or unrelated files');
assert.equal(manifest.peerDependencies.react, '^19.0.0');

for (const path of paths) {
  if (!path.startsWith('dist/')) continue;
  const content = await readFile(join(sdkDir, path), 'utf8');
  assert(!content.includes('OPENAI_API_KEY'), `bundle contains key name: ${path}`);
}

const consumerDir = await mkdtemp(join(resultsDir, 'consumer-'));
const insideResults = relative(resultsDir, resolve(consumerDir));
assert(insideResults && !insideResults.startsWith('..') &&
  !isAbsolute(insideResults) && !insideResults.includes(`${sep}..${sep}`),
  'consumer cleanup target escaped test-results');

try {
  await writeFile(join(consumerDir, 'package.json'), JSON.stringify({
    name: 'ally-tarball-consumer', private: true, type: 'module',
    dependencies: { '@ally/react': `file:../ally-react-${manifest.version}.tgz`,
      react: '19.3.1', 'react-dom': '19.3.1' },
    devDependencies: { typescript: '5.9.3', '@types/react': '19.3.0',
      '@types/react-dom': '19.3.0' },
  }, null, 2));
  const nodeModules = join(consumerDir, 'node_modules');
  runPnpm(['install', '--offline', '--ignore-scripts', '--ignore-workspace'], consumerDir);
  const fixtureSource = await readFile(join(sdkDir, 'test', 'fixtures', 'consumer.tsx'), 'utf8');
  await writeFile(join(consumerDir, 'fixture.tsx'), fixtureSource);
  await writeFile(join(consumerDir, 'fixture.mjs'), ts.transpileModule(fixtureSource, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022 },
  }).outputText);
  await writeFile(join(consumerDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext',
      jsx: 'react-jsx', strict: true, skipLibCheck: true, noEmit: true,
      types: ['react', 'react-dom'] },
    include: ['fixture.tsx'],
  }, null, 2));
  await writeFile(join(consumerDir, 'check.mjs'), `
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
assert.equal(globalThis.window, undefined);
assert.equal(globalThis.document, undefined);
const core = await import('@ally/react/core');
assert.equal(typeof core.decideRule, 'function');
assert.equal(typeof core.buildDecisionInput, 'function');
const reactEntry = await import('@ally/react');
assert.equal(typeof reactEntry.AllyProvider, 'function');
assert.equal(typeof reactEntry.useAlly, 'function');
const { ConsumerFixture } = await import('./fixture.mjs');
const markup = renderToStaticMarkup(createElement(ConsumerFixture));
for (const marker of ['data-ally-root', 'data-ally-step="cart"',
  'data-ally-step="shipping"', 'data-ally-step="payment"',
  'data-ally-slot="totalAmount"', 'data-ally-slot="payButton"',
  'data-ally-slot="primaryAction"', 'data-ally-optional="promoBanner"']) {
  assert(markup.includes(marker), 'consumer fixture missing ' + marker);
}
assert(markup.includes('var(--ally-target)'));
assert(markup.includes('observing'));
const summary = { windowMs: 10000, viewport: { w: 390, h: 844, dpr: 2 },
  inputModality: 'touch', counts: { taps: 3, missTap: 3, rageClick: 0,
    hesitation: 0, backtrack: 0, errorLoop: 0, zoomEvent: 0,
    scrollThrash: 0, slowTargeting: 0 }, timings: {
    avgTargetSize: 40, avgTimeToTarget: 0, stepDurations: [] },
  context: { step: 'cart', priorPreset: null, undoCount: 0 } };
const profile = core.scoreProfile(summary);
const payload = core.serializeDecisionInput(core.buildDecisionInput(summary, profile,
  core.DEFAULT_POLICY, [], ['cart', 'shipping', 'payment']));
assert(!payload.includes('SENTINEL_VALUE_DO_NOT_SEND'));
assert(!payload.includes('SENTINEL_TEXT_DO_NOT_SEND'));
console.log('fresh tarball consumer: SSR, React peer, core, payload passed');
`);

  const typecheck = spawnSync(process.execPath,
    [join(nodeModules, 'typescript', 'bin', 'tsc'), '--noEmit'],
    { cwd: consumerDir, encoding: 'utf8', windowsHide: true });
  if (typecheck.error || typecheck.status !== 0) {
    throw new Error(`consumer typecheck failed: ${typecheck.stderr || typecheck.stdout || typecheck.error}`);
  }
  const consumerCheck = spawnSync(process.execPath, ['check.mjs'], {
    cwd: consumerDir, encoding: 'utf8', windowsHide: true,
  });
  if (consumerCheck.error || consumerCheck.status !== 0) {
    throw new Error(`consumer check failed (${consumerCheck.status ?? 'unknown'}):\n${consumerCheck.stderr || consumerCheck.stdout || consumerCheck.error}`);
  }
  assert(consumerCheck.stdout.includes('fresh tarball consumer:'));
  const report = {
    package: `${manifest.name}@${manifest.version}`,
    mode: 'offline-pnpm-install-consumer',
    commands: { pack: 0, offlineInstall: 0, typecheck: 0, consumer: 0 },
    checks: ['dist exports', 'React peer', 'core import without DOM', 'SSR fixture',
      'CSS export', 'TypeScript declarations', 'anonymous payload', 'bundle key scan'],
    tarball,
    limitations: ['The fresh consumer installed from a local tarball and the pnpm store; publishing to and installing from a registry was not tested',
      'jsdom and SSR scripts do not prove visual browser compatibility',
      'mock requests do not prove model quality or user impact'],
  };
  await writeFile(join(resultsDir, 'package-contract.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`tarball consumer: passed (${manifest.name}@${manifest.version}); ${tarball}`);
} finally {
  // This path was created by mkdtemp and verified inside sdk/test-results above.
  await rm(consumerDir, { recursive: true, force: true });
}
