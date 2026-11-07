import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AllyProvider, useAlly } from '@ally/react';
import {
  AdaptationPlanJsonSchema,
  AllyPolicySchema,
  DEFAULT_POLICY,
  PlannerResponseSchema,
  buildDecisionInput,
  decideRule,
  guardPlan,
  scoreProfile,
} from '@ally/react/core';

assert.equal(typeof guardPlan, 'function');
assert.equal(typeof decideRule, 'function');
assert.equal(typeof scoreProfile, 'function');
assert.equal(typeof buildDecisionInput, 'function');
assert.equal(typeof PlannerResponseSchema.safeParse, 'function');
assert.equal(AllyPolicySchema.safeParse(DEFAULT_POLICY).success, true);
assert.equal(AdaptationPlanJsonSchema.type, 'object');
assert.equal(existsSync(new URL('../dist/styles.css', import.meta.url)), true);
assert.match(readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8'), /^"use client";/);
assert.doesNotMatch(readFileSync(new URL('../dist/core.js', import.meta.url), 'utf8'), /^"use client";/);

function Fixture() {
  const ally = useAlly();
  return createElement('section', null,
    createElement('button', { style: { minHeight: 'var(--ally-target)' } }, ally.status),
    createElement('strong', { 'data-ally-slot': 'totalAmount' }, 'Rp 100.000'),
    createElement('aside', { 'data-ally-optional': 'promoBanner' }, 'Promo'),
    createElement('aside', { 'data-ally-optional': 'recommendations' },
      createElement('strong', { 'data-ally-slot': 'totalAmount' }, 'Invalid nesting fixture')));
}

const output = renderToStaticMarkup(createElement(
  AllyProvider,
  { policy: DEFAULT_POLICY, config: { steps: ['cart', 'address', 'payment'] } },
  createElement(Fixture),
));
assert.match(output, /data-ally-root/);
assert.match(output, /data-ally-slot="totalAmount"/);
assert.match(output, /data-ally-optional="promoBanner"/);
assert.match(output, /data-ally-optional="recommendations"/);
assert.match(output, /observing/);
console.log('contract consumer: passed');
