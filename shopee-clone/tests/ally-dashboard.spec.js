import { test, expect } from '@playwright/test';

// Requires the real sibling Next dashboard on ALLY_DASHBOARD_ORIGIN (port 3000).
test.describe('live dashboard integration',()=>{
  test.skip(process.env.ALLY_DASHBOARD_TEST!=='1','Start the dashboard and set ALLY_DASHBOARD_TEST=1');
  test('actual SDK signals, Apply, Keep and Undo reach the same-origin dashboard',async({page,context})=>{
    const errors=[];
    const dashboard=await context.newPage();
    dashboard.on('pageerror',error=>errors.push(error.message));
    page.on('pageerror',error=>errors.push(error.message));
    await dashboard.goto('/dashboard');
    await expect(dashboard.getByRole('heading',{name:'Waiting for Ally events.',exact:true})).toBeVisible();
    // Observe the actual bus to check privacy and correlation, without fixtures.
    await dashboard.evaluate(()=>{
      window.received=[];window.allyTestChannel=new BroadcastChannel('ally');
      window.allyTestChannel.onmessage=event=>window.received.push(event.data);
    });
    await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:false,keyConfigured:false,model:'local-rules'}}));
    await page.goto('/address/edit?ally=1');
    await page.getByRole('textbox',{name:'Full Name',exact:true}).fill('');
    await page.getByRole('textbox',{name:'Phone Number',exact:true}).fill('');
    await page.getByRole('textbox',{name:'Street Name, Building, House No.',exact:true}).fill('PRIVATE-ADDRESS-DO-NOT-SEND');
    for(let i=0;i<4;i++)await page.getByRole('button',{name:'Submit',exact:true}).tap();
    const root=page.locator('[data-ally-root]');
    if(await root.getAttribute('data-ally-status')==='pending')await page.getByRole('button',{name:'Selesai mengisi, terapkan',exact:true}).tap();
    await expect(root).toHaveAttribute('data-ally-status','applied');
    await dashboard.bringToFront();
    await expect(dashboard.getByRole('heading',{name:'Signals',exact:true})).toBeVisible();
    await expect(dashboard.getByRole('button',{name:'View details for Combined Support',exact:true})).toBeVisible();
    await expect(dashboard.locator('[data-source="rule"]').first()).toBeVisible();
    const messages=await dashboard.evaluate(()=>window.received);
    expect(messages.filter(event=>event.type==='summary').reduce((total,event)=>total+event.payload.summary.counts.errorLoop,0)).toBeGreaterThanOrEqual(6);
    expect(messages.filter(event=>event.type==='decision')).toHaveLength(1);
    expect(JSON.stringify(messages)).not.toContain('PRIVATE-ADDRESS-DO-NOT-SEND');
    await dashboard.screenshot({path:`screenshots/actual/dashboard/live-${page.viewportSize().width}.png`,fullPage:true});
    await page.bringToFront();await page.getByRole('button',{name:'Keep',exact:true}).tap();
    await expect.poll(()=>dashboard.evaluate(()=>window.received.some(event=>event.type==='keep'))).toBe(true);
    await expect(page.locator('.ally-controls')).toHaveCount(0);
    await page.locator('.ally-demo-trigger').tap();
    await page.getByRole('button',{name:'Batalkan penyesuaian',exact:true}).tap();
    await expect.poll(()=>dashboard.evaluate(()=>window.received.some(event=>event.type==='undo'))).toBe(true);
    await dashboard.bringToFront();
    await expect(dashboard.getByText('Undone',{exact:false}).first()).toBeVisible();
    expect(errors).toEqual([]);
    await page.bringToFront();
    await expect(page.getByRole('link',{name:/Buka dashboard analisis Ally/})).toHaveAttribute('href','/dashboard');
    await dashboard.close();
  });

  test('reference mode emits no Ally analytics and retains mobile layout',async({page,context})=>{
    const listener=await context.newPage();await listener.goto('/');
    await listener.evaluate(()=>{window.events=[];window.channel=new BroadcastChannel('ally');window.channel.onmessage=e=>window.events.push(e.data)});
    await page.goto('/cart');
    await expect(page.locator('.ally-demo-tools')).toHaveCount(0);
    await page.locator('.cart-page .quantity button').last().tap();
    await page.waitForTimeout(1100);
    expect(await listener.evaluate(()=>window.events)).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`screenshots/actual/dashboard/reference-cart-${page.viewportSize().width}.png`});
    await listener.close();
  });

  test('ally=0 sends private-safe validation signals to the dashboard without applying help',async({page,context})=>{
    const dashboard=await context.newPage();await dashboard.goto('/dashboard');
    await expect(dashboard.getByRole('heading',{name:'Waiting for Ally events.',exact:true})).toBeVisible();
    await dashboard.evaluate(()=>{
      window.received=[];window.channel=new BroadcastChannel('ally');window.channel.onmessage=e=>window.received.push(e.data);
    });
    const api=[];page.on('request',r=>{if(r.url().includes('/api/ally/'))api.push(r.url())});
    await page.goto('/address/edit?ally=0');await page.bringToFront();
    await page.getByLabel('Full Name',{exact:true}).fill('');
    await page.locator('#address-phone').fill('');
    await page.locator('#address-street').fill('PRIVATE-PASSIVE-ADDRESS');
    const size=await page.locator('#address-phone').evaluate(e=>getComputedStyle(e).fontSize);
    for(let i=0;i<4;i++)await page.getByRole('button',{name:'Submit',exact:true}).tap();
    await expect(dashboard.getByRole('heading',{name:'Signals',exact:true})).toBeVisible();
    await expect(dashboard.getByRole('region',{name:'Active adaptation',exact:true})).toContainText('No adaptation applied');
    const messages=await dashboard.evaluate(()=>window.received);
    expect(messages.filter(e=>e.type==='summary').reduce((n,e)=>n+e.payload.summary.counts.errorLoop,0)).toBeGreaterThanOrEqual(6);
    expect(messages.some(e=>e.type==='decision'||e.type==='applied')).toBe(false);
    expect(JSON.stringify(messages)).not.toContain('PRIVATE-PASSIVE-ADDRESS');
    expect(await page.locator('#address-phone').evaluate(e=>getComputedStyle(e).fontSize)).toBe(size);
    await expect(page.locator('.ally-demo-tools,.ally-controls,[data-ally-highlighted],[data-ally-contrast]')).toHaveCount(0);
    expect(api).toEqual([]);
    await dashboard.screenshot({path:`screenshots/actual/ally-observation/dashboard-${page.viewportSize().width}.png`,fullPage:true});
    await dashboard.close();
  });

  test('browser denying BroadcastChannel does not break Shopee or local assistance',async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{window.BroadcastChannel=class{constructor(){throw new DOMException('Blocked','SecurityError')}}});
    await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:false,keyConfigured:false,model:'local-rules'}}));
    await page.goto('/cart?ally=1');
    for(let i=0;i<7;i++){
      const box=await page.getByRole('button',{name:'Check Out (0)',exact:true}).boundingBox();
      await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
    }
    await expect(page.locator('[data-ally-root]')).toHaveAttribute('data-ally-status','applied');
    expect(errors).toEqual([]);
  });

  test('post-Keep help and Undo retain the matching kept adaptation in the dashboard',async({page,context})=>{
    const dashboard=await context.newPage();await dashboard.goto('/dashboard');
    await expect(dashboard.getByRole('heading',{name:'Waiting for Ally events.',exact:true})).toBeVisible();
    await page.route('**/api/ally/status',route=>route.fulfill({json:{aiEnabled:false,keyConfigured:false,model:'local-rules'}}));
    await page.goto('/cart?ally=1');await page.bringToFront();
    const target=page.getByRole('button',{name:'Tambah kiip',exact:true}),box=await target.boundingBox();
    for(let i=0;i<3;i++)await page.mouse.click(box.x+box.width+3,box.y+box.height/2);
    await page.getByRole('button',{name:'Keep',exact:true}).tap();
    const banner=dashboard.getByRole('region',{name:'Active adaptation',exact:true});
    await expect(banner).toContainText('Motor Support');await expect(banner).toContainText('Kept by user');
    const client=await page.context().newCDPSession(page);
    for(let i=0;i<2;i++){
      await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.3});await page.waitForTimeout(100);
      await client.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await page.waitForTimeout(100);
    }
    await client.detach();
    await expect(banner).toContainText('Visual Support');
    await page.getByRole('button',{name:'Undo',exact:true}).tap();
    await expect(banner).toContainText('Motor Support');await expect(banner).toContainText('Kept by user');
    await expect.poll(async()=>(await target.boundingBox()).height).toBe(56);
    await dashboard.close();
  });
});
