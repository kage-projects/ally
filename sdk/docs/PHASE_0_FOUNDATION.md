# Fase 0 — Kontrak, scaffold, dan guard dasar

Rujukan wajib: [kontrak bersama](CONTRACTS.md). Dependensi: tidak ada. Keluaran dipakai semua fase. Slot awal 30 menit adalah target scaffold dengan template siap; sisihkan buffer bila setup toolchain membutuhkan waktu.

## Kekurangan rancangan awal dan solusi

- Lokasi package berbeda antara PRD dan SDK aktual. Solusi: package mandiri berada di sdk; aplikasi host dikerjakan rekan tim.
- Provider belum punya bentuk scope, status, dan API error/step yang pasti. Solusi: bekukan API v1 di kontrak bersama sebelum coding paralel.
- Guard baru dibuat di Fase 3, sehingga Fase 2 sempat menerapkan plan tanpa validasi. Solusi: schema dan guard dasar dibangun di sini; Fase 3 menggunakan ulang guard.
- Menulis dua schema manual membuka perbedaan runtime dan JSON schema model. Solusi: schema.ts sebagai sumber tunggal; ekspor schema planner dari sumber yang sama dan periksa format yang didukung API.

## Flow

Package sdk → kontrak dan fixture skrip → schema/guard → build package → import dari consumer fixture → gate fondasi. Jika kontrak berubah, perbaiki fixture dan konsumen sebelum lanjut.

## Langkah implementasi

1. Buat manifest package sdk mandiri dengan package name @ally/react, lockfile pnpm, React peer dependency, TypeScript strict, Vitest/jsdom, dan build ESM beserta tipe. Workspace root tidak diperlukan untuk menguji SDK. Pilih versi yang kompatibel saat scaffold, lalu pin.
2. Buat src/schema.ts, src/guard.ts, src/core.ts, src/index.ts, src/types.ts, src/styles.css. Pisahkan entry core dari entry React sehingga server dapat memvalidasi payload tanpa mengimpor provider. Jangan memasang listener saat modul diimpor.
3. Implementasikan validasi policy terlebih dahulu: min/max, angka finite, threshold, allowHide, dan slot terkunci. Buat guard(plan, policy) sebagai fungsi murni yang mengembalikan plan efektif dan daftar koreksi. Tipe invalid ditolak; nilai token numerik keluar batas dijepit. Buang hide yang terlarang, matikan voice, dan cegah perubahan posisi payButton.
4. Sediakan fixture kontrak: input kosong, tiga miss-tap, sinyal gabungan, policy ketat, dan plan invalid. Tandai semua fixture sebagai sintetis. Definisikan preferences=[] pada request sejak awal supaya Fase 4 tidak mengganti protokol.
5. Buat kerangka provider/hook bertipe dengan status observing; kerangka harus dinyatakan belum mempunyai sensor. Buat fixture React minimal dalam sdk/test/ yang memasang provider sekali, menghubungkan tombol ke token, dan memberi marker data-ally-slot/data-ally-optional. Sediakan contoh CSS yang menarget slot opsional secara tepat sebagai handoff.
6. Hubungkan scripts: pnpm -C sdk build, typecheck, test, test:contract. Build harus menghasilkan paket dengan export map yang benar dan tanpa membawa React versi kedua. Tambahkan consumer fixture skrip yang mengimpor entry React dan core tanpa DOM.

## Penanganan kegagalan dan batas

Policy invalid: jangan memulai sensor atau menerapkan plan. Build/schema gagal: jangan mengganti dengan any atau menonaktifkan strict. Ketika scope belum tersedia saat mount, tunggu ref terpasang; jangan jatuh ke document root secara diam-diam.

## Verifikasi dan serah terima

Uji schema menolak extra fields, NaN/Infinity, min > max, serta enum invalid. Uji guard menghasilkan plan yang mematuhi policy, tidak memutasi input, dan hasil guard berulang tetap sama. Siapkan fixture DOM dengan slot terkunci di dalam slot opsional; preflight UI pada Fase 2 harus menghapus token hide terkait, bukan hanya melewati node. Periksa build entry React mempertahankan client boundary; server core import tidak mengakses browser.

Serahkan API types, fixture, default policy, dan contoh integrasi ke pengerjaan Fase 1–3 serta rekan pemilik host. Detail UI provider belum dianggap selesai pada fase ini.

## Checklist bukti — 4/4 (100%)

- [x] 0A — Package mandiri, manifest/lockfile, build ESM dan tipe berhasil: `sdk/package.json`, `sdk/pnpm-lock.yaml`, `sdk/dist/`; `pnpm build` exit 0.
- [x] 0B — Schema dan fixture kontrak termasuk preferences kosong lolos: `sdk/src/schema.ts`, `sdk/test/fixtures.ts`, `sdk/test/schema.test.ts`.
- [x] 0C — Guard dasar dan pengujian policy lulus: `sdk/src/guard.ts`, `sdk/test/guard.test.ts`; `pnpm test` 7/7 lulus.
- [x] 0D — Consumer fixture mengimpor entry React/core hasil build tanpa DOM global dan typecheck lulus: `sdk/test/contract.mjs`; `pnpm test:contract` dan `pnpm typecheck` exit 0.

Verifikasi Fase 0: 2026-11-07, Node 24.15.0, pnpm 11.18.0. Provider masih kerangka bertipe; fungsi sensor, penerapan plan, Keep/Undo, dan planner belum aktif.
