import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

async function listener(context) {
  const page=await context.newPage();await page.goto('/');
  await page.evaluate(()=>{
    window.received=[];window.channel=new BroadcastChannel('ally');
    window.channel.onmessage=event=>window.received.push(event.data);
  });
  return page;
}

async function missThree(page,target) {
  const box=await target.boundingBox();
  for(let i=0;i<3;i++)await page.mouse.click(box.x+box.width+3,box.y+box.height/2);
}

test('ally=0 reports real friction with identical reference pixels and no adaptation or AI',async({page,context})=>{
  const monitor=await listener(context),errors=[],api=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().includes('/api/ally/'))api.push(request.url())});
  await page.goto('/cart');await page.evaluate(()=>document.fonts.ready);
  const reference=await page.screenshot({animations:'disabled'});
  await page.clock.install();
  await page.goto('/cart?ally=0');await page.bringToFront();await page.evaluate(()=>document.fonts.ready);
  const passive=await page.screenshot({animations:'disabled',path:`screenshots/actual/ally-observation/cart-${page.viewportSize().width}.png`});
  expect(createHash('sha256').update(passive).digest('hex')).toBe(createHash('sha256').update(reference).digest('hex'));
  const target=page.getByRole('button',{name:'Tambah kiip',exact:true}),before=await target.boundingBox();
  await missThree(page,target);
  await expect.poll(()=>monitor.evaluate(()=>window.received.some(e=>e.type==='summary'&&e.payload.summary.counts.missTap===3))).toBe(true);
  await page.clock.fastForward(10050);
  await expect.poll(()=>monitor.evaluate(()=>window.received.filter(e=>e.type==='summary').length)).toBeGreaterThan(1);
  expect((await target.boundingBox()).height).toBe(before.height);
  await expect(page.locator('.ally-demo-tools,.ally-controls,[data-ally-highlighted],[data-ally-contrast]')).toHaveCount(0);
  expect(await monitor.evaluate(()=>window.received.filter(e=>['decision','applied','keep','undo'].includes(e.type)))).toEqual([]);
  expect(api).toEqual([]);expect(errors).toEqual([]);
  await page.getByRole('link',{name:'Kembali',exact:true}).tap();
  await expect(page).toHaveURL(/\/\?ally=0$/);
  await expect.poll(()=>monitor.evaluate(()=>window.received.filter(e=>e.type==='heartbeat').at(-1)?.payload.step)).toBe('browse');
  await monitor.close();
});

test('switching ally modes in one page restores the reference and keeps the correct reporting behavior',async({page,context})=>{
  const monitor=await listener(context);
  await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:false,keyConfigured:false,model:'local-rules'}}));
  await page.goto('/cart?ally=1');await page.bringToFront();
  const target=page.getByRole('button',{name:'Tambah kiip',exact:true}),before=await target.boundingBox();
  await missThree(page,target);
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','applied');
  await page.evaluate(()=>{history.pushState({},'','/cart?ally=0');dispatchEvent(new PopStateEvent('popstate'))});
  await expect(page.locator('.ally-demo-tools,[data-ally-contrast]')).toHaveCount(0);
  expect((await target.boundingBox()).height).toBe(before.height);
  await monitor.evaluate(()=>{window.received=[]});
  await missThree(page,target);
  await expect.poll(()=>monitor.evaluate(()=>window.received.some(e=>e.type==='summary'&&e.payload.summary.counts.missTap===3))).toBe(true);
  expect(await monitor.evaluate(()=>window.received.some(e=>e.type==='applied'))).toBe(false);
  await page.evaluate(()=>{history.pushState({},'','/cart?ally=1');dispatchEvent(new PopStateEvent('popstate'))});
  await expect(page.locator('.ally-demo-tools')).toHaveCount(1);
  await missThree(page,target);
  await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','applied');
  await monitor.close();
});
