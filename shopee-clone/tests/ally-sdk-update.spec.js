import { test, expect } from '@playwright/test';

async function zoomTwice(page) {
  const client=await page.context().newCDPSession(page);
  for(let i=0;i<2;i++){
    await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.3});
    await page.waitForTimeout(100);
    await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
    await page.waitForTimeout(100);
  }
  await client.detach();
}

test('SDK highlights real changes, closes help on Keep and reobserves without losing the kept baseline',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:false,keyConfigured:false,model:'local-rules'}}));
  await page.goto('/cart?ally=1');
  const root=page.locator('[data-ally-root]'),target=page.getByRole('button',{name:'Tambah kiip',exact:true});
  const before=await target.boundingBox();
  const quantity=await page.getByLabel('Jumlah kiip',{exact:true}).textContent();
  const protectedText=await page.locator('[data-ally-slot]').allTextContents();
  for(let i=0;i<3;i++)await page.mouse.click(before.x+before.width+3,before.y+before.height/2);
  await expect(root).toHaveAttribute('data-ally-status','applied');
  await expect(target).toHaveAttribute('data-ally-highlighted','');
  await expect(page.locator('[data-ally-ui] [data-ally-highlighted]')).toHaveCount(0);
  const keptHeight=(await target.boundingBox()).height;
  expect(keptHeight).toBe(56);
  await page.screenshot({path:`screenshots/actual/ally-sdk-update/motor-highlight-${page.viewportSize().width}.png`});
  await expect(page.locator('[data-ally-highlighted]')).toHaveCount(0,{timeout:5500});
  await page.getByRole('button',{name:'Keep',exact:true}).tap();
  await expect(root).toHaveAttribute('data-ally-status','kept');
  await expect(page.locator('.ally-controls')).toHaveCount(0);
  await expect(page.locator('.ally-toast')).toBeEmpty();
  await page.waitForTimeout(300);
  await expect(root).toHaveAttribute('data-ally-status','kept');
  const restart=Date.now();
  await zoomTwice(page);
  await expect(root).toHaveAttribute('data-ally-status','applied',{timeout:2000});
  expect(Date.now()-restart).toBeLessThan(3000);
  await expect(root).toHaveAttribute('data-ally-contrast','high');
  await expect(target).toHaveAttribute('data-ally-highlighted','');
  await page.screenshot({path:`screenshots/actual/ally-sdk-update/fresh-visual-${page.viewportSize().width}.png`});
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  await expect(root).toHaveAttribute('data-ally-status','observing');
  await expect(page.locator('[data-ally-highlighted]')).toHaveCount(0);
  expect((await target.boundingBox()).height).toBe(keptHeight);
  expect(await page.getByLabel('Jumlah kiip',{exact:true}).textContent()).toBe(quantity);
  expect(await page.locator('[data-ally-slot]').allTextContents()).toEqual(protectedText);
  await page.locator('.ally-demo-trigger').tap();
  await page.getByRole('checkbox',{name:'Aktifkan tampilan adaptif',exact:true}).uncheck();
  await expect(root).toHaveAttribute('data-ally-status','disabled');
  expect((await target.boundingBox()).height).toBe(before.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
