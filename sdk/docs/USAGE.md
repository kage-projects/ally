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

## Simpan riwayat per pengguna melalui backend Firebase

Firebase Auth, route backend, dan Firestore dikonfigurasi di **aplikasi host**, bukan di SDK. Aktifkan Authentication dan Cloud Firestore pada Firebase project host, lalu pasang `firebase`, `firebase-admin`, dan `zod` dengan `pnpm add firebase firebase-admin zod`. Untuk MVP, simpan satu dokumen per event `onDecision` (`applied`, `kept`, `undone`, `corrected`, atau `expired`) di `users/{uid}/allyEvents/{eventId}`. Event berisi kategori alasan (`reasonCodes`) dan pilihan solusi dari plan efektif; SDK tidak mengirim UID, nilai form, atau teks halaman.

Di komponen client yang sudah menginisialisasi Firebase Auth, teruskan callback provider ke route host. Jangan kirim UID dalam body; backend mengambilnya dari ID token yang diverifikasi.

```tsx
import { getAuth } from 'firebase/auth';
import type { AllyDecisionEvent } from '@ally/react';

async function saveAllyEvent(event: AllyDecisionEvent) {
  const user = getAuth().currentUser;
  if (!user) return; // Tentukan kebijakan host untuk pengguna yang belum login.
  const token = await user.getIdToken();
  const { profile, tokens, layout, assist, confidence, ttlSeconds } = event.plan;
  const response = await fetch('/api/ally/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      schemaVersion: 1,
      action: event.action,
      source: event.source,
      preset: event.preset,
      reasonCodes: event.reasonCodes,
      corrections: event.corrections,
      solution: { profile, tokens, layout, assist, confidence, ttlSeconds },
    }),
  });
  if (!response.ok) throw new Error('Gagal menyimpan event Ally');
}

// Tambahkan prop ini pada AllyProvider dalam contoh sebelumnya:
// onDecision={(event) => void saveAllyEvent(event).catch(() => {
//   console.error('Penyimpanan Ally gagal');
// })}
```

Contoh route Next.js App Router `app/api/ally/history/route.ts` berikut memakai Firebase Admin **hanya di server**. Inisialisasi Admin dengan kredensial server yang sesuai lingkungan host; jangan mengirim service account ke browser.

```ts
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { AdaptationPlanSchema, PresetSchema } from '@ally/react/core';
import { z } from 'zod';

if (!getApps().length) initializeApp({ credential: applicationDefault() });
export const runtime = 'nodejs';

const code = z.string().max(80).regex(/^[A-Za-z][A-Za-z0-9_-]*$/);
const SolutionSchema = AdaptationPlanSchema.pick({
  profile: true, tokens: true, layout: true, assist: true,
  confidence: true, ttlSeconds: true,
});
const EventSchema = z.strictObject({
  schemaVersion: z.literal(1),
  action: z.enum(['applied', 'kept', 'undone', 'corrected', 'expired']),
  source: z.enum(['rule', 'llm', 'cache']),
  preset: PresetSchema,
  reasonCodes: z.array(code).max(32),
  corrections: z.array(code).max(32),
  solution: SolutionSchema,
});

export async function POST(request: Request) {
  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 });
  let uid: string;
  try { uid = (await getAuth().verifyIdToken(token)).uid; }
  catch { return Response.json({ error: 'unauthorized' }, { status: 401 }); }

  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > 16_384) {
    return Response.json({ error: 'too-large' }, { status: 413 });
  }
  let input: unknown;
  try { input = JSON.parse(raw); }
  catch { return Response.json({ error: 'invalid-json' }, { status: 400 }); }
  const parsed = EventSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: 'invalid-event' }, { status: 400 });

  try {
    await getFirestore().collection('users').doc(uid).collection('allyEvents').add({
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    return Response.json({ error: 'storage-unavailable' }, { status: 503 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
```

Jika dashboard client membaca riwayat langsung dari Firestore, query subcollection `users/{uid}/allyEvents` milik pengguna yang login, urutkan `createdAt` menurun, dan batasi jumlah dokumen per halaman. Aturan di bawah membatasi baca ke pemilik akun dan menolak tulis langsung dari browser. Firebase Admin melewati Firestore Rules, sehingga verifikasi token dan validasi body pada route di atas wajib dijaga.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/allyEvents/{eventId} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

Ini adalah **log event append-only**, belum satu record terpadu per keputusan. `onDecision` saat ini tidak membawa snapshot `summary`, outcome, atau ID keputusan stabil, sehingga jangan menggabungkan Apply dan Keep/Undo berdasarkan waktu lalu mengklaimnya pasti satu keputusan. Jika dashboard memerlukan pasangan behavior numerik → solusi → outcome yang tepat, perluasan callback SDK untuk membawa snapshot dan ID keputusan adalah pekerjaan berikutnya. `resetPreferences()` hanya menghapus preferensi lokal; penghapusan riwayat Firestore memerlukan endpoint host tersendiri. Begitu disimpan di bawah UID, data ini adalah riwayat per pengguna, bukan lagi data anonim.

Rujukan Firebase: [verifikasi ID token di backend](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [aturan akses Firestore](https://firebase.google.com/docs/firestore/security/rules-conditions), dan [server timestamp](https://firebase.google.com/docs/firestore/manage-data/add-data#server_timestamp).

Untuk memastikan paket yang dikirim ke host, jalankan `pnpm -C sdk build`, `pnpm -C sdk typecheck`, `pnpm -C sdk test`, dan `pnpm -C sdk test:contract`. Uji consumer memasang tarball secara offline dari store pnpm aktif; jalankan `pnpm fetch` saat online jika store belum lengkap. Pengujian aplikasi dan browser nyata tetap dilakukan di proyek host.

Jika UI tidak berubah, cek apakah ada cukup sinyal friksi, `enabled` masih `true`, tombol memakai CSS variables di atas, dan elemen tidak sedang fokus saat plan perlu diterapkan. Jika hanya planner yang gagal, periksa `plannerStatus` serta endpoint host; rule lokal tetap menjadi fallback.
