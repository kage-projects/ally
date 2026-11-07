import { test,expect } from '@playwright/test';
import { createPresetPlan,scoreProfile } from '@ally/react/core';
import { createHostPolicy } from '../shared/ally-policy.mjs';

test('Ally opt-in survives navigation and reload while reference mode remains the default',async({page})=>{
  await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:false,keyConfigured:false,model:'local-rules'}}));
  await page.goto('/address/edit?ally=1');
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','observing');
  await page.getByRole('link',{name:'Kembali',exact:true}).tap();
  await expect(page).toHaveURL(/\/addresses\?ally=1$/);
  await expect(page.getByRole('link',{name:'Edit',exact:true}).first()).toHaveAttribute('href',/ally=1/);
  await page.reload();
  await expect(page.locator('.ally-demo-trigger')).toBeVisible();
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','observing');
  await page.getByRole('link',{name:'Kembali',exact:true}).tap();
  await expect(page).toHaveURL(/\/checkout\?ally=1$/);
  await page.goBack();
  await expect(page.locator('.ally-demo-trigger')).toBeVisible();
  await page.goto('/cart');
  await expect(page.locator('.ally-demo-trigger')).toHaveCount(0);
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','disabled');
});

test('Ally observes real form errors, applies a guarded planner result, and supports Keep/Undo',async({page})=>{
  await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:true,keyConfigured:true,model:'test-planner'}}));
  let request;
  const planned=page.waitForResponse(response=>response.url().endsWith('/api/ally/plan'));
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
  await page.getByRole('button',{name:'Submit',exact:true}).tap();
  await page.waitForTimeout(300);
  expect(request).toBeUndefined();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Submit',exact:true}).tap();
  await expect.poll(()=>request?.summary.context.step,{timeout:2000}).toBe('checkout');
  expect(request.summary.counts.errorLoop).toBeGreaterThanOrEqual(5);
  expect(request.summary.windowMs).toBeLessThan(5000);
  await expect(page.locator('.ally-demo-trigger')).toHaveText('Ally · Menunggu input selesai');
  expect(JSON.stringify(request)).not.toContain('naufal');
  expect(request.policy.llm.timeoutMs).toBe(15000);
  await planned;
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','pending');
  await expect(page.locator('.ally-demo-waiting')).toContainText('Penyesuaian siap');
  await page.getByRole('button',{name:'Selesai mengisi, terapkan',exact:true}).tap();
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','applied');
  await expect.poll(async()=>parseFloat(await page.locator('#address-phone').evaluate(element=>getComputedStyle(element).fontSize))).toBeGreaterThan(parseFloat(before));
  await expect(page.locator('.ally-controls')).toBeInViewport();
  await page.getByRole('button',{name:'Why',exact:true}).click();
  await expect(page.locator('.ally-why')).toBeVisible();
  await page.getByRole('button',{name:'Keep',exact:true}).click();
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','kept');
  await expect(page.locator('.ally-controls')).toHaveCount(0);
  await page.locator('.ally-demo-trigger').click();
  await page.getByRole('button',{name:'Batalkan penyesuaian',exact:true}).click();
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','observing');
  await expect(page.locator('#address-phone')).toHaveCSS('font-size',before);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('region',{name:'Panel Ally'})).toContainText('undone · llm');
});
