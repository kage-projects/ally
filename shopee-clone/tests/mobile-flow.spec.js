import { test, expect } from '@playwright/test';

test('selected cart products and checkout drafts survive option navigation', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('checkbox', { name: 'Pilih toko UGREEN Official Store', exact: true }).check();
  await page.getByRole('button', { name: 'Check Out (1)', exact: true }).click();
  await expect(page.locator('.checkout-total .row-right')).toHaveText('Rp275.000');
  await page.getByRole('textbox', { name: 'Pesan untuk penjual' }).fill('Tolong kemas dengan aman');
  await page.getByRole('checkbox', { name: /Damage Recovery Protection/ }).check();
  await page.locator('.shipping-heading').click();
  await page.getByRole('button', { name: 'CONFIRM', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Pesan untuk penjual' })).toHaveValue('Tolong kemas dengan aman');
  await expect(page.getByRole('checkbox', { name: /Damage Recovery Protection/ })).toBeChecked();
  await page.getByRole('link', { name: 'Payment Methods View All', exact: true }).click();
  await page.getByRole('button', { name: /Bank Transfer/ }).click();
  await page.getByRole('radio', { name: 'SeaBank', exact: true }).check();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.getByRole('button', { name: 'Place Order', exact: true }).click();
  await page.getByRole('button', { name: 'Buat simulasi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order Details', exact: true })).toBeVisible();
  await expect(page.locator('.order-complete')).toHaveText('Simulasi · Awaiting Payment');
  await expect(page.locator('.order-total-row')).toContainText('Rp267.700');
  await page.getByRole('link', { name: 'Kembali', exact: true }).click();
  await page.getByRole('tab', { name: 'To Pay', exact: true }).click();
  await expect(page.locator('.purchase-card')).toHaveCount(1);
});

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
  await page.locator('.cart-edit').click();
  await page.getByRole('button',{name:'Hapus (3)',exact:true}).click();
  await page.getByRole('button',{name:'Batal',exact:true}).click();
  await expect(page.locator('.cart-shop')).toHaveCount(3);
  await page.getByRole('button',{name:'Hapus (3)',exact:true}).click();
  await page.getByRole('button',{name:'Hapus',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Keranjang kosong',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Kembali berbelanja',exact:true}).click();
  await page.getByRole('textbox',{name:'Cari di Shopee',exact:true}).fill('UGREEN');
  await page.getByRole('textbox',{name:'Cari di Shopee',exact:true}).press('Enter');
  await page.getByRole('button',{name:'Tambah ke keranjang',exact:true}).click();
  await expect(page.getByRole('button',{name:'Check Out (1)',exact:true})).toBeVisible();
  await page.locator('.cart-footer-voucher').click();
  await page.getByRole('link',{name:'Kembali',exact:true}).click();
  await expect(page).toHaveURL(/\/cart$/);
});

test('checkout keeps confirmed shipping, vouchers and payment choices',async({page})=>{
  await page.goto('/checkout');
  await page.locator('.shipping-heading').click();
  await page.getByRole('button',{name:/8 - 9 Nov.*3.500/}).click();
  await page.getByRole('button',{name:'CONFIRM',exact:true}).click();
  await expect(page.locator('.selected-shipping p')).toHaveText('Hemat Kargo');
  await page.locator('.checkout-vouchers a').click();
  await page.getByRole('textbox',{name:'Voucher code',exact:true}).fill('INVALID');
  await page.getByRole('button',{name:'Apply',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Kode voucher tidak ditemukan');
  await expect(page.getByRole('textbox',{name:'Voucher code',exact:true})).toHaveValue('INVALID');
  await page.getByRole('textbox',{name:'Voucher code',exact:true}).fill('VIP10K');
  await page.getByRole('button',{name:'Apply',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pilih 20% off Capped at Rp10k',exact:true})).toHaveAttribute('aria-pressed','true');
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
  await page.locator('#address-phone').fill('abc');
  await page.getByRole('button',{name:'Submit',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('nomor telepon');
  await page.locator('#address-phone').fill('+628123456789');
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
  await page.getByRole('tab',{name:'All',exact:true}).click();
  await page.getByRole('button',{name:'Rate',exact:true}).click();
  await page.getByRole('radio',{name:'5 bintang',exact:true}).click();
  await page.getByRole('textbox',{name:'Ulasan',exact:true}).fill('Barang sesuai pesanan');
  await page.getByRole('button',{name:'Simpan penilaian',exact:true}).click();
  await expect(page.getByRole('button',{name:'Lihat penilaian',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Detail pesanan fahrigunawan84',exact:true}).click();
  await expect(page.locator('.order-product')).toContainText('Entrasol gold');
});
