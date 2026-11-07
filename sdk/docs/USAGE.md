# Panduan Pemakaian Ally React SDK

Ally mengamati friksi interaksi dalam subtree React, lalu menerapkan perubahan UI yang dibatasi policy dan dapat di-Undo. SDK ini untuk **React web 19** (ESM). Aplikasi host menyediakan markup, CSS, serta endpoint planner bila memakai AI.

## Instalasi

Saat ini paket tersedia sebagai tarball lokal. Dari repo Ally, jalankan `pnpm -C sdk build` dan `pnpm -C sdk test:package`; tarball berada di `sdk/test-results/ally-react-0.1.0.tgz`. Salin tarball ke root proyek host, lalu jalankan di sana:

```sh
pnpm add react@^19 ./ally-react-0.1.0.tgz
```

Setelah diterbitkan pada registry dengan nama yang sah, gunakan `pnpm add @SCOPE/NAMA_PAKET`. Impor stylesheet sekali di entry aplikasi: `import '@ally/react/styles.css';`. Jika nama paket berubah saat rilis, sesuaikan semua path impor.

## Pasang provider dan laporkan event host

Letakkan provider di luar elemen `form`, `table`, atau `select`. Satu subtree hanya boleh memiliki satu provider. Contoh berikut bisa menjadi komponen client Next.js atau komponen React biasa:

```tsx
'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { AllyProvider, useAlly } from '@ally/react';
import { DEFAULT_POLICY } from '@ally/react/core';

function Checkout() {
  const ally = useAlly();
  const [step, setStep] = useState<'cart' | 'payment'>('cart');
  const [email, setEmail] = useState('');

  function next(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      ally.reportError({ field: 'email', category: 'required' });
      return;
    }
    ally.reportStep('payment');
    setStep('payment');
  }

  return <>
    {step === 'cart' ? <form onSubmit={next}>
      <strong data-ally-slot="price">Rp 90.000</strong>
      <aside data-ally-optional="promoBanner">Promo</aside>
      <input aria-label="Email" value={email}
        onChange={(event) => setEmail(event.target.value)} />
      <button type="submit" className="ally-action" data-ally-slot="primaryAction">Lanjut</button>
    </form> : <section>
      <strong data-ally-slot="totalAmount">Rp 90.000</strong>
      <p data-ally-slot="legalText">Syarat pembayaran</p>
      <button type="button" className="ally-action" data-ally-slot="payButton">Bayar</button>
    </section>}
    <button type="button" onClick={() => ally.resetPreferences()}>
      Hapus preferensi Ally
    </button>
  </>;
}

export function AllyCheckout() {
  return <AllyProvider policy={DEFAULT_POLICY} config={{
    steps: ['cart', 'payment'],
    allowedFields: ['email'], errorCategories: ['required'],
    persistence: 'memory',
  }}><Checkout /></AllyProvider>;
}
```

`reportStep` dipanggil hanya ketika step benar-benar berubah. `reportError` dipanggil saat validasi gagal; field dan kategori harus ada di allowlist. Jangan kirim nilai input, pesan error, ID pengguna, atau teks bebas. Nama step harus unik, maksimal 32 karakter, diawali huruf A–Z, lalu hanya huruf, angka, `_`, atau `-`. Pakai label field/kategori pendek dan tetap, bukan teks dinamis.

`config.enabled` dapat mematikan adaptasi sementara (default `true`). `config.storageKey` menentukan key localStorage (default `ally:pref:v1`). `config.endpoint` default `/api/ally/plan`, tetapi hanya dipakai jika AI diaktifkan. Callback `onDecision` menerima `action`, `source`, plan efektif, preset, reason codes, dan koreksi guard; gunakan untuk diagnostik tanpa mencatat data formulir.

## Hubungkan gaya dan slot host

SDK menulis token pada wrapper `data-ally-root`. CSS host harus memakainya agar perubahan terlihat:

```css
.ally-action {
  min-height: var(--ally-target, 44px);
  min-width: var(--ally-target, 44px);
  padding: calc(8px * var(--ally-space, 1));
  font-size: calc(1rem * var(--ally-font, 1));
}
```

Tandai elemen terlindungi dengan `data-ally-slot="price"`, `"legalText"`, `"totalAmount"`, atau `"payButton"`. Gunakan `primaryAction` hanya untuk CTA terpisah dari `payButton`. Section yang boleh disembunyikan memakai `data-ally-optional="promoBanner"`, `"recommendations"`, `"voucherCarousel"`, atau `"socialProof"`. Jangan letakkan slot terlindungi di dalam section opsional.

## Feedback, preferensi, dan AI

Provider menampilkan Keep, Undo, dan Why setelah perubahan diterapkan. `useAlly()` juga menyediakan `plan`, `profile`, `summary`, `explanation`, `status`, `plannerStatus`, `outcome`, `keep()`, `undo()`, dan `resetPreferences()`. Diam atau hilangnya toast tidak dihitung sebagai Keep. `outcome` adalah perbandingan observasi, bukan bukti sebab-akibat.

Default `persistence: 'memory'` berlaku selama sesi. Untuk menyimpan preferensi pada browser yang sama, pilih `persistence: 'local'`, jelaskan penyimpanan ini kepada pengguna, dan tampilkan tombol reset. Record berlaku maksimal tujuh hari; pilihan lama tetap harus lolos policy dan evidence saat ini.

AI bersifat opsional; `DEFAULT_POLICY.llm.enabled` bernilai `false`. Untuk mengaktifkan planner, set `policy={{ ...DEFAULT_POLICY, llm: { ...DEFAULT_POLICY.llm, enabled: true } }}` dan `config.endpoint: '/api/ally/plan'`. Endpoint harus same-origin. API key OpenAI, model yang dipakai, dan policy otoritatif berada di **server host**. Ikuti [kontrak endpoint](HOST_PLANNER_HANDOFF.md). Jika endpoint gagal atau evidence kurang, SDK memakai rule lokal atau tidak mengubah UI.

Untuk memastikan paket yang dikirim ke host, jalankan `pnpm -C sdk build`, `pnpm -C sdk typecheck`, `pnpm -C sdk test`, dan `pnpm -C sdk test:contract`. Uji consumer memasang tarball secara offline dari store pnpm aktif; jalankan `pnpm fetch` saat online jika store belum lengkap. Pengujian aplikasi dan browser nyata tetap dilakukan di proyek host.

Jika UI tidak berubah, cek apakah ada cukup sinyal friksi, `enabled` masih `true`, tombol memakai CSS variables di atas, dan elemen tidak sedang fokus saat plan perlu diterapkan. Jika hanya planner yang gagal, periksa `plannerStatus` serta endpoint host; rule lokal tetap menjadi fallback.
