# Repository Guidelines

## Cakupan & Struktur Package

Folder `sdk/` menjadi root implementasi package React SDK Ally (`@ally/react`). Teman satu tim membangun aplikasi host dan endpoint server. Pekerjaan dalam folder ini hanya membangun package, kontrak integrasi, dokumentasi, dan pengujian berbasis skrip.

Package Fase 0–5 sudah memiliki schema, guard, sensor, rule, preset, applier, provider, kontrol UI, planner client, preferensi lokal, entry React/core, dan pengujian skrip:

- `src/index.ts`: ekspor API publik, termasuk `AllyProvider` dan `useAlly`.
- `src/provider.tsx`, `src/useAlly.ts`, `src/runtime.ts`, `src/state.ts`: lifecycle, context, status, Keep/Undo.
- `src/applier.ts`: transaksi DOM, token, marker slot, dan restore.
- `src/sensor.ts`, `src/rules.ts`, `src/presets.ts`: agregasi sinyal, keputusan deterministik, pemetaan preset.
- `src/schema.ts`, `src/guard.ts`: kontrak Zod, validasi, dan batas policy.
- `src/engine-client.ts`, `src/planner-contract.ts`: request planner, cache/timeout, dan protokol HTTP. `src/bus.ts` masih opsional.
- `src/preferences.ts`, `src/preference-storage.ts`: feedback eksplisit, reuse sesuai konteks, outcome, dan penyimpanan memori/localStorage.
- `src/ui/`: `Toast.tsx` dan `WhyPanel.tsx`; `test/`: pengujian SDK.

Rujuk `../ALLY_PRD.md` untuk tujuan produk, `docs/ARCHITECTURE.md` untuk batas sistem, `docs/CONTRACTS.md` untuk kontrak implementasi, dan `docs/IMPLEMENTATION_PHASES.md` untuk fase. Pertahankan nama field kontrak agar kompatibel dengan host.

## Build, Test, dan Pengembangan

Gunakan pnpm. Perintah berikut tersedia dari `sdk/`:

- `pnpm build`: menghasilkan package dan deklarasi tipe.
- `pnpm test`: menjalankan Vitest dan simulasi DOM.
- `pnpm typecheck`: memeriksa TypeScript tanpa menghasilkan berkas.
- `pnpm test:contract`: memeriksa SSR dan consumer dari tarball package.
- `pnpm test:package`: memeriksa consumer tarball secara terpisah.
- `pnpm test:ai:mock`: menjalankan tujuh fixture sintetis sebanyak tiga kali.
- `pnpm test:ai`: mengevaluasi endpoint host bila `ALLY_AI_ENDPOINT` tersedia.

Jadikan React sebagai peer dependency. Uji kontrak host dengan fixture React/jsdom dan mock HTTP dalam folder test/. Pengujian aplikasi serta browser langsung menjadi tanggung jawab pembangun host.

## Gaya Kode & Arsitektur

Gunakan TypeScript strict, indentasi dua spasi, dan function component React. Nama modul mengikuti `engine-client.ts`; komponen memakai PascalCase. Konfigurasi formatter/linter belum tersedia.

Pusatkan `FrictionSummary`, `AdaptationPlan`, dan `AllyPolicy` di `schema.ts`. Pertahankan rule/guard sebagai fungsi deterministik. Gunakan CSS variables `--ally-*` dan data attributes untuk adaptasi. Hindari akses browser saat import agar aman untuk SSR; bersihkan listener, timer, dan channel saat unmount.

## Pengujian

Gunakan Vitest dan jsdom untuk perilaku DOM; namai test `*.test.ts` atau `*.test.tsx`. Uji geometri miss-tap, timing sensor, preset, clamping policy, komponen terkunci, respons invalid, timeout/fallback, Keep/Undo, preferensi, dan reset. Setiap perubahan rule atau guard harus disertai test. Belum ada ambang coverage.

## Privasi & Guardrail

Kirim hanya counter, durasi, dan ukuran anonim. Jangan kirim nilai form, teks, identifier, screenshot, atau koordinat absolut. Simpan API key dan pemanggilan model di server host. Validasi dan clamp setiap plan sebelum diterapkan; sediakan fallback rule, penjelasan, dan Undo. Jangan gunakan HTML keluaran model atau `dangerouslySetInnerHTML`.

## Commit & Pull Request

Ikuti gaya imperatif commit awal: `Add Ally PRD for hackathon`. Buat perubahan terfokus. Jelaskan perilaku, milestone terkait, dan hasil skrip pengujian di PR.
