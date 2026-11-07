import { test,expect } from '@playwright/test';
import { createPresetPlan,scoreProfile } from '@ally/react/core';
import { createHostPolicy } from '../shared/ally-policy.mjs';

async function localBackend(page) {
  await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:false,keyConfigured:false,model:'local-rules'}}));
}

async function applyPending(page,scope=page) {
  const root=page.locator('[data-ally-root]');
  await expect(root).toHaveAttribute('data-ally-status',/pending|applied/,{timeout:2000});
  if(await root.getAttribute('data-ally-status')==='pending') {
    await scope.getByRole('button',{name:'Selesai mengisi, terapkan',exact:true}).tap();
  }
  await expect(root).toHaveAttribute('data-ally-status','applied');
}

async function zoomTwice(page) {
  const client=await page.context().newCDPSession(page);
  for(let i=0;i<2;i++) {
    await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.3});
    await page.waitForTimeout(100);
    await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
    await page.waitForTimeout(100);
  }
  await client.detach();
}

const screens=[
  ['browse','/','.search input','fontSize'],
  ['profile','/profile','.profile-actions span','fontSize'],
  ['cart','/cart','.quantity button','height'],
  ['checkout','/checkout','.checkout-message input','fontSize'],
  ['voucher','/vouchers','.voucher-code input','fontSize'],
  ['shipping','/shipping','.shipping-option p','fontSize'],
  ['payment','/payment','.bank-transfer','fontSize'],
  ['addresses','/addresses','.address-entry p','fontSize'],
  ['address-form','/address/edit','#address-phone','fontSize'],
  ['orders','/purchases','.purchase-tabs button','fontSize'],
  ['order-details','/orders/1','.order-product .truncate','fontSize'],
  ['tracking','/delivery','.tracking-step p','fontSize'],
];

for(const [name,path,selector,property] of screens) {
  test(`two real zoom episodes improve ${name} and Undo restores its baseline`,async({page})=>{
    await localBackend(page);
    let calls=0;page.on('request',request=>{if(request.url().endsWith('/api/ally/plan'))calls++});
    await page.goto(`${path}?ally=1`);
    await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','observing');
    const target=page.locator(selector).first();
    const before=await target.evaluate((element,property)=>getComputedStyle(element)[property],property);
    const locked=await page.locator('[data-ally-slot]').allTextContents();
    await zoomTwice(page);
    await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','applied',{timeout:2000});
    await expect.poll(async()=>parseFloat(await target.evaluate((element,property)=>getComputedStyle(element)[property],property))).toBeGreaterThan(parseFloat(before));
    await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-contrast','high');
    expect(await page.locator('[data-ally-slot]').allTextContents()).toEqual(locked);
    expect(calls).toBe(0);
    const toast=await page.locator('.ally-toast').boundingBox(),field=await target.boundingBox();
    if(['browse','voucher','address-form'].includes(name)&&toast&&field) {
      expect(toast.y+toast.height<=field.y||toast.y>=field.y+field.height).toBe(true);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:`screenshots/actual/ally-cases/${name}-${page.viewportSize().width}.png`});
    await page.getByRole('button',{name:'Undo',exact:true}).tap();
    await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','observing');
    await expect.poll(()=>target.evaluate((element,property)=>getComputedStyle(element)[property],property)).toBe(before);
  });
}

test('the demo catalog opens all 14 scenarios with explicit opt-in navigation',async({page})=>{
  await localBackend(page);await page.goto('/?ally=1');
  await page.locator('.ally-demo-trigger').tap();
  await page.getByText('14 skenario untuk dicoba',{exact:true}).click();
  await expect(page.locator('.ally-scenarios a')).toHaveCount(14);
  await expect(page.locator('.ally-scenarios a').filter({hasText:'Memilih pengiriman'})).toHaveAttribute('href',/ally=1/);
  await page.getByRole('link',{name:'Memilih pengiriman',exact:true}).tap();
  await expect(page).toHaveURL(/\/shipping\?ally=1$/);
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','observing');
});

test('three actual missed pointer clicks enlarge cart quantity controls without changing quantity or prices',async({page})=>{
  await localBackend(page);await page.goto('/cart?ally=1');
  const target=page.getByRole('button',{name:'Tambah kiip',exact:true});
  const before=await target.boundingBox(),quantity=await page.getByLabel('Jumlah kiip',{exact:true}).textContent();
  const locked=await page.locator('[data-ally-slot]').allTextContents();
  // Chromium adjusts near-miss touch coordinates onto small buttons. Mouse
  // input preserves real misses while the viewport remains mobile-sized.
  for(let i=0;i<3;i++)await page.mouse.click(before.x+before.width+3,before.y+before.height/2);
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','applied',{timeout:2000});
  await expect.poll(async()=>(await target.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect(await page.getByLabel('Jumlah kiip',{exact:true}).textContent()).toBe(quantity);
  expect(await page.locator('[data-ally-slot]').allTextContents()).toEqual(locked);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  await expect.poll(async()=>(await target.boundingBox()).height).toBeCloseTo(before.height,0);
});

test('invalid voucher attempts show local guidance even when AI fails, without exposing the code or selecting a voucher',async({page})=>{
  await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:true,keyConfigured:true,model:'test-ai'}}));
  let request;
  await page.route('**/api/ally/plan',route=>{request=route.request().postDataJSON();return route.fulfill({status:502,json:{error:'planner_unavailable'}})});
  await page.goto('/vouchers?ally=1');
  const chosen=await page.locator('.voucher-select[aria-pressed="true"]').count();
  await page.getByRole('textbox',{name:'Voucher code',exact:true}).fill('PRIVATE-NOT-A-VOUCHER');
  for(let i=0;i<7;i++)await page.getByRole('button',{name:'Apply',exact:true}).tap();
  await applyPending(page);
  await expect(page.getByRole('complementary',{name:'Petunjuk Ally'})).toContainText('minimal belanja');
  expect(await page.locator('.voucher-select[aria-pressed="true"]').count()).toBe(chosen);
  await expect.poll(()=>request?.summary.context.step).toBe('checkout');
  expect(JSON.stringify(request)).not.toContain('PRIVATE-NOT-A-VOUCHER');
  await page.getByRole('button',{name:'Keep',exact:true}).tap();
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','kept');
  await expect(page.locator('.ally-controls')).toHaveCount(0);
  await page.locator('.ally-demo-trigger').tap();
  await page.getByRole('button',{name:'Batalkan penyesuaian',exact:true}).tap();
  await expect(page.getByRole('complementary',{name:'Petunjuk Ally'})).toHaveCount(0);
  await expect(page.getByRole('textbox',{name:'Voucher code',exact:true})).toHaveValue('PRIVATE-NOT-A-VOUCHER');
});

for(const type of ['review','refund']) {
  test(`${type} validation exposes usable Ally controls inside the native dialog`,async({page})=>{
    await localBackend(page);await page.goto('/purchases?tab=4&ally=1');
    await page.getByRole('button',{name:type==='review'?'Rate':'Return/Refund',exact:true}).first().tap();
    const dialog=page.getByRole('dialog');
    const save=dialog.getByRole('button',{name:type==='review'?'Simpan penilaian':'Simpan pengajuan simulasi',exact:true});
    for(let i=0;i<7;i++)await save.tap();
    await applyPending(page,dialog);
    await expect(dialog.getByRole('complementary',{name:'Petunjuk Ally'})).toContainText(type==='review'?'bintang':'lima karakter');
    const controls=dialog.getByLabel('Kontrol Ally dalam formulir');
    await expect(controls).toBeVisible();
    await page.screenshot({path:`screenshots/actual/ally-cases/${type}-dialog-${page.viewportSize().width}.png`});
    await controls.getByRole('button',{name:'Why',exact:true}).tap();
    await expect(controls).toContainText('Teks, jarak, dan petunjuk');
    await controls.getByRole('button',{name:'Keep',exact:true}).tap();
    await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','kept');
    await expect(controls).toHaveCount(0);
    await expect(dialog).toBeVisible();
    if(type==='review')await expect(dialog.getByRole('radio',{checked:true})).toHaveCount(0);
    else await expect(dialog.getByRole('combobox')).toHaveValue('');
    await dialog.getByRole('button',{name:'Tutup',exact:true}).tap();
    await page.locator('.ally-demo-trigger').tap();
    await page.getByRole('button',{name:'Batalkan penyesuaian',exact:true}).tap();
    await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','observing');
    await expect(page.getByRole('complementary',{name:'Petunjuk Ally'})).toHaveCount(0);
  });
}

test('local assistance kept before a slow AI reply cannot be overwritten by that reply',async({page})=>{
  await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:true,keyConfigured:true,model:'slow-ai'}}));
  let request;
  await page.route('**/api/ally/plan',async route=>{
    request=route.request().postDataJSON();
    await new Promise(resolve=>setTimeout(resolve,2500));
    const plan=createPresetPlan('visual',scoreProfile(request.summary),.8,createHostPolicy({ai:true}),['error_loop']).plan;
    await route.fulfill({json:{schemaVersion:1,source:'llm',latencyMs:2500,plan}}).catch(()=>{});
  });
  await page.goto('/address/edit?ally=1');
  await page.getByLabel('Full Name',{exact:true}).fill('');await page.locator('#address-phone').fill('');
  for(let i=0;i<4;i++)await page.getByRole('button',{name:'Submit',exact:true}).tap();
  await applyPending(page);
  await page.getByRole('button',{name:'Keep',exact:true}).tap();
  const before=await page.locator('#address-phone').evaluate(element=>getComputedStyle(element).fontSize);
  await page.waitForTimeout(2800);
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','kept');
  expect(await page.locator('#address-phone').evaluate(element=>getComputedStyle(element).fontSize)).toBe(before);
  await page.locator('.ally-demo-trigger').tap();
  await expect(page.getByRole('region',{name:'Panel Ally'})).toContainText('kept · rule · combined');
  expect(request?.summary.context.step).toBe('checkout');
});
