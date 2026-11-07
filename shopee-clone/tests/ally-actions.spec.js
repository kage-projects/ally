import { test,expect } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:false,keyConfigured:false,model:'local-rules'}}));
  await page.route('**/api/ally/plan',()=>{throw new Error('Local assistance must not call the planner')});
});

async function finishPending(page,scope=page) {
  const root=page.locator('[data-ally-root]');
  await expect(root).toHaveAttribute('data-ally-status',/pending|applied/,{timeout:2000});
  if(await root.getAttribute('data-ally-status')==='pending')await scope.getByRole('button',{name:'Selesai mengisi, terapkan',exact:true}).tap();
  await expect(root).toHaveAttribute('data-ally-status','applied');
}

test('empty-cart checkout errors offer guidance without selecting or buying items',async({page})=>{
  await page.goto('/cart?ally=1');
  const values=await page.locator('[data-ally-slot]').allTextContents();
  // The empty-cart CTA announces aria-disabled but handles physical taps to
  // explain the missing selection; it is not a natively disabled button.
  for(let i=0;i<7;i++) {
    const box=await page.getByRole('button',{name:'Check Out (0)',exact:true}).boundingBox();
    await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  }
  await finishPending(page);
  await expect(page.getByRole('complementary',{name:'Petunjuk Ally'})).toContainText('Pilih barang terlebih dahulu');
  expect(await page.locator('[data-ally-slot]').allTextContents()).toEqual(values);
  await expect(page.getByRole('checkbox',{checked:true})).toHaveCount(0);
  await expect(page).toHaveURL(/\/cart\?ally=1$/);
});

test('missing payment at checkout offers help while protected totals and terms stay intact',async({page})=>{
  await page.goto('/checkout?ally=1');
  const values=await page.locator('[data-ally-slot]').allTextContents();
  for(let i=0;i<7;i++)await page.getByRole('button',{name:'Place Order',exact:true}).tap();
  await finishPending(page);
  await expect(page.getByRole('complementary',{name:'Petunjuk Ally'})).toContainText('metode pembayaran');
  expect(await page.locator('[data-ally-slot]').allTextContents()).toEqual(values);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page).toHaveURL(/\/checkout\?ally=1$/);
});

test('unavailable payment attempts offer help without activating credit or choosing a bank',async({page})=>{
  await page.goto('/payment?ally=1');
  for(let i=0;i<7;i++) {
    await page.getByRole('button',{name:'Activate',exact:true}).tap();
    await page.getByRole('dialog').getByRole('button',{name:'Tutup',exact:true}).tap();
  }
  await finishPending(page);
  await expect(page.getByRole('complementary',{name:'Petunjuk Ally'})).toContainText('tidak memilih atau membayar otomatis');
  await expect(page.getByRole('button',{name:'Confirm',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:/Bank Transfer/}).tap();
  await expect(page.getByRole('radio',{name:'SeaBank',exact:true})).not.toBeChecked();
});

test('unsuccessful product searches receive local hints without losing the query',async({page})=>{
  await page.goto('/?ally=1');
  await page.getByRole('textbox',{name:'Cari di Shopee',exact:true}).fill('NO-MATCH-PRIVATE-SEARCH');
  await page.getByRole('button',{name:'Cari',exact:true}).tap();
  const dialog=page.getByRole('dialog');
  for(let i=0;i<7;i++)await dialog.getByRole('button',{name:'Cari',exact:true}).tap();
  await finishPending(page,dialog);
  await expect(dialog.getByRole('complementary',{name:'Petunjuk Ally'})).toContainText('kata yang lebih singkat');
  await expect(dialog.getByRole('textbox',{name:'Cari produk tersedia',exact:true})).toHaveValue('NO-MATCH-PRIVATE-SEARCH');
  await expect(dialog.getByLabel('Kontrol Ally dalam formulir')).toBeVisible();
  await page.screenshot({path:`screenshots/actual/ally-cases/search-dialog-${page.viewportSize().width}.png`});
});

test('repeated order searches are aggregated in the orders phase',async({page})=>{
  await page.goto('/purchases?ally=1');
  for(let i=0;i<7;i++) {
    const dialog=page.getByRole('dialog');
    if(!await dialog.isVisible())await page.getByRole('button',{name:'Cari pesanan',exact:true}).tap();
    await dialog.getByRole('textbox',{name:'Cari pesanan',exact:true}).fill('NO-MATCH-ORDER');
    await dialog.getByRole('button',{name:'Cari',exact:true}).tap();
  }
  const dialog=page.getByRole('dialog');
  await finishPending(page,await dialog.isVisible()?dialog:page);
  if(await dialog.isVisible())await dialog.getByRole('button',{name:'Tutup',exact:true}).tap();
  await expect(page.getByRole('complementary',{name:'Petunjuk Ally'})).toContainText('tab status');
  await expect(page.getByRole('heading',{name:'Tidak ada pesanan',exact:true})).toBeVisible();
  await page.locator('.ally-demo-trigger').tap();
  await expect(page.getByRole('region',{name:'Panel Ally'})).toContainText('Fase: orders');
});
