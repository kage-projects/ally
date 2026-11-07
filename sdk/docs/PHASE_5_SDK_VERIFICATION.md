# Fase 5 — Verifikasi SDK dan handoff integrasi

Fase ini menutup package SDK melalui skrip, tanpa membangun atau menjalankan aplikasi teman satu tim. Target 30 menit hanya masuk akal jika fixture dan pengujian sudah dibuat pada Fase 0–4.

## Celah dan keputusan

- Rencana lama bergantung pada checkout, Playwright, screenshot, dan rehearsal UI. Solusi: fixture React minimal di sdk/test/ memakai jsdom, fake timers, dan mock fetch.
- Import workspace tidak membuktikan package build. Solusi: skrip pack lalu import tarball ke consumer fixture sementara, termasuk import core tanpa DOM.
- Mock tidak membuktikan ketepatan model atau manfaat bagi pengguna. Solusi: laporkan tiga status terpisah: SDK terverifikasi dengan skrip, model host belum/sudah dievaluasi lewat endpoint asli, dan dampak pengguna belum diukur oleh tim host.
- Pengujian jsdom tidak punya layout browser nyata. Solusi: stub getBoundingClientRect untuk geometri deterministik; klaim hanya logika yang diuji, bukan kompatibilitas visual/browser.

## Flow

Build package → typecheck → unit sensor/rule/guard → render fixture React/jsdom → mock HTTP contract → tarball consumer script → laporan hasil → kirim kontrak dan contoh integrasi ke rekan host. Kegagalan kembali ke fase pemiliknya; ulang hanya skrip terdampak.

## Langkah implementasi

1. Buat sdk/test/fixtures/consumer.tsx dengan form tiga step minimal, tombol token-aware, marker data-ally-slot dan data-ally-optional. Fixture ini hanya untuk test, tidak dikemas sebagai aplikasi dan tidak memiliki route server.
2. Jalankan skrip `pnpm -C sdk build`, `typecheck`, `test`, dan `test:contract`. `test` memakai Vitest/jsdom, fake timers, dan mock fetch. `test:contract` menjalankan SSR contract serta memasang tarball package secara offline ke consumer sementara dengan `--ignore-workspace`. Consumer memakai package output, bukan import `src/` langsung.
3. Uji pipeline: no-op tanpa friksi, tiga miss→motor, combined→request, invalid plan/guard, target opsional berisi totalAmount, focus/IME menunda apply, Keep/Undo/TTL, timeout, response stale, reset preferensi, Strict Mode mount/cleanup. Uji properti CSS dan atribut DOM yang dihasilkan; jangan mengklaim hasil visual nyata dari jsdom.
4. Untuk miss-tap, stub rectangle dan dispatch pointer event pada node fixture. Uji jalur sensor nyata secara programatik selain sensor.inject; keduanya berlabel terpisah. Mock window/visualViewport bila tersedia, dan tandai dukungan yang tidak diuji.
5. Pastikan payload tidak memuat sentinel value/text dari form. Periksa bundle output agar tidak memuat OPENAI_API_KEY. Tidak ada API key yang disimpan dalam file, log, atau fixture.
6. Tulis README SDK: cara install/import CSS, provider policy/config, event step/error, slot host, endpoint yang harus disediakan rekan, persistence/reset, fallback, SSR, dan contoh request/response. Sertakan script commands dan hasil batas pengujian.
7. Hasil skrip ditulis ringkas ke sdk/test-results/ bila diperlukan oleh hackathon: nama perintah, exit code, jumlah kasus, versi package, mock/real, dan keterbatasan. Jangan membuat metrik dampak pengguna dari skrip sintetik.
8. Serahkan tarball/README/kontrak ke rekan host. Jika endpoint host tersedia, jalankan test:ai opsional terhadap URL tersebut dan laporkan hasilnya terpisah. Pengujian browser, checkout end-to-end, dan dampak pengguna adalah gate proyek host, bukan gate SDK.

## Gate selesai SDK

Fase selesai ketika build/typecheck/test/test:contract lulus, consumer fixture memakai package hasil build, dan tidak ada pelanggaran payload atau slot terkunci. Hasil model nyata boleh tetap unknown jika endpoint host belum tersedia; labeli secara eksplisit. Jangan menyebut SDK teruji pada browser nyata atau efektif bagi pengguna hanya dari skrip.

## Hasil verifikasi SDK — 2026-11-07

`pnpm -C sdk build`, `typecheck`, `test`, `test:contract`, dan `test:ai:mock` masing-masing exit code 0. Vitest: 11 file dan 69 kasus lulus. Evaluator sintetis: routing 21/21, semantik 15/15, pelanggaran schema/policy 0. `test:ai` exit code 0 tetapi **melewati evaluasi live** karena `ALLY_AI_ENDPOINT` belum disetel; angka tersebut bukan bukti kualitas model.

`test:contract` menguji SSR dan consumer baru dari `sdk/test-results/ally-react-0.1.0.tgz`. Skrip memeriksa ekspor React/core, import core tanpa DOM, marker fixture, stylesheet, deklarasi tipe, allowlist isi tarball, sentinel value/text yang tidak ada dalam payload, dan ketiadaan string `OPENAI_API_KEY` dalam output `dist/`. Uji jsdom fixture juga mengirim event DOM dan mock request untuk memeriksa payload tanpa sentinel. Detail mesin ada di `sdk/test-results/package-contract.json`; hasil mock di `sdk/test-results/ai-mock.json`. File `test-results/` dibuat oleh skrip dan tidak dikomit.

Setelah store pnpm aktif diisi, consumer baru berhasil memasang **tarball** dan dependency secara offline melalui pnpm, tanpa tautan ke instalasi SDK. `--ignore-workspace` diperlukan karena direktori consumer berada di bawah `sdk/`; tanpa itu pnpm memakai lockfile induk. Pengujian harus memakai store yang sudah diisi pada lingkungan yang sama. Publikasi dan instalasi registry bersih belum diuji. jsdom/SSR tidak memverifikasi layout browser nyata. Pengujian visual, host app, endpoint/model nyata, dan dampak pengguna tetap milik gate integrasi host.

## Checklist bukti — 4/4 (100%)

- [x] 5A — Build, typecheck, 69 unit/DOM test, dan consumer tarball lulus (exit 0).
- [x] 5B — Mock HTTP, race, fallback, guard, dan slot terlindungi lulus dalam `sdk/test/` (exit 0).
- [x] 5C — Pemeriksaan sentinel payload, scan bundle, dan laporan skrip lengkap dalam `sdk/test-results/` (exit 0).
- [x] 5D — `sdk/README.md`, fixture, dan kontrak endpoint siap diserahkan ke rekan host.

Setiap item bernilai 25% fase; sertakan path hasil dan exit code skrip ketika dicentang.
