import { test, expect } from '@playwright/test';

test('profile and home navigation preserve the selected tab',async({page})=>{
  await page.goto('/');await page.getByRole('link',{name:'Me',exact:true}).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading',{name:'My Purchases',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'My Wallet',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Home',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Cari di Shopee'})).toBeVisible();
});

test('cart selection and quantities recalculate the checkout total',async({page})=>{
  await page.goto('/cart');
  const checkout=page.getByRole('button',{name:'Check Out (0)',exact:true});await expect(checkout).toBeVisible();
  await page.getByRole('checkbox',{name:'Pilih toko KiiP Official Shop',exact:true}).check();
  await expect(page.locator('.cart-checkout strong')).toHaveText('Rp165.000');
  await page.getByRole('button',{name:'Tambah kiip',exact:true}).click();
  await expect(page.locator('.cart-checkout strong')).toHaveText('Rp330.000');
  await page.getByRole('switch',{name:'Gunakan koin',exact:true}).click();
  await expect(page.locator('.cart-checkout strong')).toHaveText('Rp329.900');
  await page.getByRole('checkbox',{name:'All',exact:true}).check();
  await expect(page.getByRole('button',{name:'Check Out (3)',exact:true})).toBeVisible();
});

test('checkout keeps confirmed shipping, vouchers and payment choices',async({page})=>{
  await page.goto('/checkout');
  await page.locator('.shipping-heading').click();
  await page.getByRole('button',{name:/8 - 9 Nov.*3.500/}).click();
  await page.getByRole('button',{name:'CONFIRM',exact:true}).click();
  await expect(page.locator('.selected-shipping p')).toHaveText('Hemat Kargo');
  await page.locator('.checkout-vouchers a').click();
  await page.getByRole('button',{name:'Pilih 20% off Capped at Rp10k',exact:true}).click();
  await page.getByRole('button',{name:'OK',exact:true}).click();
  await expect(page.locator('.total-payment .row-right')).toHaveText('Rp166.200');
  await page.getByRole('link',{name:'Payment Methods View All',exact:true}).click();
  await page.getByRole('button',{name:/Bank Transfer/}).click();
  await page.getByRole('radio',{name:'SeaBank',exact:true}).check();
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.locator('.checkout-bank small')).toHaveText('SeaBank');
});

test('address selection and form edits carry back into checkout',async({page})=>{
  await page.goto('/addresses');
  await page.getByRole('radio',{name:'Pilih alamat Indra 2',exact:true}).click();
  await expect(page.locator('.checkout-address')).toContainText('Indra');
  await page.locator('.checkout-address').click();
  await page.locator('.address-entry').first().getByRole('link',{name:'Edit',exact:true}).click();
  await page.getByLabel('Full Name',{exact:true}).fill('naufal test');
  await page.getByRole('button',{name:'Submit',exact:true}).click();
  await expect(page).toHaveURL(/\/addresses$/);
  await expect(page.locator('.address-entry').first()).toContainText('naufal test');
});

test('purchase history connects order details and delivery tracking',async({page})=>{
  await page.goto('/profile');
  await page.getByRole('link',{name:/View Purchase History/}).click();
  await page.getByRole('link',{name:'Detail pesanan Garnier Indonesia Official Shop',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Order Details',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Shipping Information',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Delivered on 4 Nov',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Order Details',exact:true}).click();
  await page.getByRole('link',{name:'Kembali',exact:true}).click();
  await page.getByRole('tab',{name:'Completed',exact:true}).click();
  await expect(page.locator('.purchase-card')).toHaveCount(3);
  await page.getByRole('tab',{name:'To Pay',exact:true}).click();
  await expect(page.locator('.purchase-card')).toHaveCount(0);
});
