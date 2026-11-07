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
2. Jalankan skrip pnpm -C sdk build, typecheck, test, dan test:contract. test memakai Vitest/jsdom dan fake timers; test:contract menguji fetch dengan mock handler serta memasang tarball package ke consumer fixture sementara. Gunakan package output, bukan import src langsung, pada contract test.
3. Uji pipeline: no-op tanpa friksi, tiga miss→motor, combined→request, invalid plan/guard, target opsional berisi totalAmount, focus/IME menunda apply, Keep/Undo/TTL, timeout, response stale, reset preferensi, Strict Mode mount/cleanup. Uji properti CSS dan atribut DOM yang dihasilkan; jangan mengklaim hasil visual nyata dari jsdom.
4. Untuk miss-tap, stub rectangle dan dispatch pointer event pada node fixture. Uji jalur sensor nyata secara programatik selain sensor.inject; keduanya berlabel terpisah. Mock window/visualViewport bila tersedia, dan tandai dukungan yang tidak diuji.
5. Pastikan payload tidak memuat sentinel value/text dari form. Periksa bundle output agar tidak memuat OPENAI_API_KEY. Tidak ada API key yang disimpan dalam file, log, atau fixture.
6. Tulis README SDK: cara install/import CSS, provider policy/config, event step/error, slot host, endpoint yang harus disediakan rekan, persistence/reset, fallback, SSR, dan contoh request/response. Sertakan script commands dan hasil batas pengujian.
7. Hasil skrip ditulis ringkas ke sdk/test-results/ bila diperlukan oleh hackathon: nama perintah, exit code, jumlah kasus, versi package, mock/real, dan keterbatasan. Jangan membuat metrik dampak pengguna dari skrip sintetik.
8. Serahkan tarball/README/kontrak ke rekan host. Jika endpoint host tersedia, jalankan test:ai opsional terhadap URL tersebut dan laporkan hasilnya terpisah. Pengujian browser, checkout end-to-end, dan dampak pengguna adalah gate proyek host, bukan gate SDK.

## Gate selesai SDK

Fase selesai ketika build/typecheck/test/test:contract lulus, consumer fixture memakai package hasil build, dan tidak ada pelanggaran payload atau slot terkunci. Hasil model nyata boleh tetap unknown jika endpoint host belum tersedia; labeli secara eksplisit. Jangan menyebut SDK teruji pada browser nyata atau efektif bagi pengguna hanya dari skrip.

## Checklist bukti — 0/4 (0%)

- [ ] 5A — Build, typecheck, unit/DOM script, dan consumer tarball lulus.
- [ ] 5B — Mock HTTP, race, fallback, serta guard dan slot terlindungi lulus.
- [ ] 5C — Pemeriksaan payload/bundle dan laporan hasil skrip lengkap, dengan batas klaim jelas.
- [ ] 5D — README, contoh integrasi, fixture, dan kontrak endpoint siap diserahkan ke rekan host.

Setiap item bernilai 25% fase; sertakan path hasil dan exit code skrip ketika dicentang.
