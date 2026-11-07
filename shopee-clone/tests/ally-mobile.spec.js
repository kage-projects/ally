import { test,expect } from '@playwright/test';
import { createPresetPlan,scoreProfile } from '@ally/react/core';
import { createHostPolicy } from '../shared/ally-policy.mjs';

test('Ally observes real form errors, applies a guarded planner result, and supports Keep/Undo',async({page})=>{
  await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:true,keyConfigured:true,model:'test-planner'}}));
  let request;
  await page.route('**/api/ally/plan',async route=>{
    request=route.request().postDataJSON();
    // Longer than the original SDK's fixed 2s deadline: regression for live AI.
    await new Promise(resolve=>setTimeout(resolve,2500));
    const plan=createPresetPlan('visual',scoreProfile(request.summary),.8,createHostPolicy({ai:true}),['error_loop']).plan;
    await route.fulfill({json:{schemaVersion:1,source:'llm',latencyMs:1,plan}});
  });
  await page.goto('/address/edit?ally=1');
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','observing');
  await page.getByLabel('Full Name',{exact:true}).fill('');
  await page.locator('#address-phone').fill('');
  const before=await page.locator('#address-phone').evaluate(element=>getComputedStyle(element).fontSize);
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'Submit',exact:true}).click();
  await expect.poll(()=>request?.summary.context.step,{timeout:15000}).toBe('checkout');
  expect(request.summary.counts.errorLoop).toBeGreaterThanOrEqual(6);
  expect(JSON.stringify(request)).not.toContain('naufal');
  expect(request.policy.llm.timeoutMs).toBe(15000);
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','pending');
  await page.getByRole('heading',{name:'Edit Address',exact:true}).click();
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','applied');
  const after=await page.locator('#address-phone').evaluate(element=>getComputedStyle(element).fontSize);
  expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));
  await expect(page.locator('.ally-controls')).toBeInViewport();
  await page.getByRole('button',{name:'Keep',exact:true}).click();
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','kept');
  await page.getByRole('button',{name:'Why',exact:true}).click();
  await expect(page.locator('.ally-why')).toBeVisible();
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','observing');
  expect(await page.locator('#address-phone').evaluate(element=>getComputedStyle(element).fontSize)).toBe(before);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:/Ally ·/}).click();
  await expect(page.getByRole('region',{name:'Panel Ally'})).toContainText('undone · llm');
});
