# Fase 2 — Provider, penerapan plan, dan kendali pengguna

Dependensi: guard [Fase 0](PHASE_0_FOUNDATION.md), kandidat keputusan [Fase 1](PHASE_1_SENSORS_RULES.md), dan [kontrak bersama](CONTRACTS.md). Target awal 100 menit. File: provider.tsx, useAlly.ts, applier.ts, ui/Toast.tsx, ui/WhyPanel.tsx, bus.ts.

## Kekurangan rancangan awal dan solusi

- Satu status tidak bisa menjelaskan UI yang sudah beradaptasi sambil menunggu AI. Pisahkan status UI dari plannerStatus.
- Snapshot berlapis, Keep, dan TTL belum mempunyai aturan. Terapkan satu transaksi aktif, satu baseline, dan satu kandidat pending.
- Toast auto-hide dianggap Keep di PRD, sehingga diam pengguna menjadi preferensi palsu. Keputusan MVP baru: hanya klik Keep menjadi feedback positif; dismiss/timeout berarti tidak diketahui.
- CSS yang diwariskan tidak otomatis menghormati lockedComponents. Adapter host wajib menandai data-ally-slot dan data-ally-optional sesuai kontrak; pemeriksaan DOM membatalkan hide bila slot opsional memuat slot terkunci.
- Respons terlambat dapat membatalkan Undo. Semua perubahan kendali pengguna menaikkan contextEpoch dan membatalkan request/pending.

## Flow

observing → kandidat tervalidasi → fokus aman? → pending atau snapshot+apply → applied → Keep: kept; Undo/TTL: restore baseline → observing. Disable/unmount: batalkan pekerjaan dan restore. Planner boleh loading tanpa mengganti status UI.

## Langkah implementasi

1. Buat state machine eksplisit dan unit test reducer. Status initial SSR observing atau disabled sesuai config; jangan baca localStorage pada render. Mount memasang sensor dan scope; cleanup melepas sensor, timer, request, dan channel. React dapat menjalankan setup/cleanup ekstra di development, sehingga operasi harus idempoten. [React useEffect](https://react.dev/reference/react/useEffect).
2. Implementasikan applyPlan sebagai satu transaksi sinkron: validasi/guard → periksa epoch → snapshot → tulis token dan atribut → publish applied. Snapshot menyimpan nilai, priority CSS, dan keadaan atribut absent/present. Atribut yang tidak disentuh Ally tidak diubah.
3. Jangan menerapkan ketika input/textarea/select/contenteditable dalam scope masih fokus atau IME composition aktif. Simpan satu kandidat terbaru; setelah blur periksa lagi fokus, epoch, dan TTL sebelum apply. Tidak ada forced idle apply saat field masih fokus.
4. Saat mengganti plan otomatis yang belum di-Keep, pertahankan baseline transaksi pertama sehingga Undo kembali ke keadaan sebelum adaptasi otomatis, bukan ke plan AI/rule antara. Setelah Keep, plan sekarang menjadi baseline untuk adaptasi berikutnya. Keep sendiri tidak menghilangkan tombol Undo untuk perubahan yang baru disimpan.
5. Simpan juga snapshot awal scope untuk disable/unmount. Untuk MVP host tidak menulis token milik Ally saat provider aktif; dokumentasikan ownership. Pending kandidat dibuang bila step, policy, atau lifecycle berubah. Saat step berubah, lepaskan lock Keep dan pertahankan plan valid sebagai baseline sambil memulai TTL baru; keputusan baru memerlukan evidence baru. Policy baru memicu validasi ulang plan aktif sebelum keputusan berikutnya; bila plan tidak valid, restore baseline awal yang netral dan hapus lock. Threshold tambahan akibat Undo hanya hidup selama mount/sesi dan tidak disimpan sebagai preferensi permanen.
6. Keep mengunci plan aktif untuk step saat ini, menghentikan TTL, membatalkan pending AI, dan mengirim feedback eksplisit sekali. Undo mengembalikan baseline transaksi, membatalkan pekerjaan, menandai plan ditolak, dan menaikkan threshold sesi sebesar 0.15 hingga maksimum 1. TTL plan yang tidak di-Keep memulihkan baseline; jika input sedang fokus, antrikan pemulihan sampai blur.
7. Toast dapat hilang setelah 8 detik, tetapi menu kontrol Ally tetap menyediakan Why/Undo. Why tidak memindahkan fokus tanpa aksi pengguna. Announcement role=status/aria-live=polite untuk perubahan saja. Fokus tidak boleh hilang ketika container disembunyikan; bila fokus ada di target yang akan di-hide, tunda.
8. Gunakan token --ally-target sebagai min-height/min-width, bukan tinggi tetap; --ally-font sebagai multiplier rem dengan base tetap agar tidak mengalikan berulang. Palet high contrast adalah tanggung jawab host; SDK memberi token dan contoh CSS. Sebelum menulis data-ally-hide, periksa semua target data-ally-optional untuk tiap nama hide; jika satu memuat slot terkunci, hapus nama itu dari plan efektif dan atribut root. Periksa ulang pada step change dan perubahan target dalam scope memakai MutationObserver yang dibersihkan saat unmount; ketika invariant rusak, cabut token hide terkait. Sticky hanya pada primaryAction terpisah; payButton tidak dipindah oleh sticky atau step layout. Kegagalan marker wajib harus terlihat sebagai error integrasi dalam fixture skrip.
9. Event callback adalah jalur utama log. BroadcastChannel opsional untuk dashboard, payload tervalidasi dan terbatas; kegagalannya tidak memengaruhi SDK. Tidak ada sinkronisasi plan lintas tab pada MVP.

## Verifikasi dan serah terima

Uji apply rule → replace AI → Undo kembali ke baseline awal; Keep → plan berikutnya → Undo kembali ke kept baseline. Uji Keep lalu Undo sebelum plan berikutnya membatalkan Keep yang sama. Callback feedback dideduplikasi per keputusan. Uji timeout toast tidak mengirim Keep, pending saat composition, cleanup Strict Mode, nested provider ditolak, data-* host dipertahankan, serta hide slot opsional yang memuat totalAmount menghapus nama hide dari atribut root. Uji juga target baru yang menjadi ancestor slot terkunci saat hide aktif.

## Checklist bukti — 4/4 (100%)

Terverifikasi 7 November 2026 dengan `pnpm -C sdk typecheck`, `test` (34 test lulus), `build`, dan `test:contract`.

- [x] 2A — `src/state.ts`, `src/runtime.ts`, dan `src/provider.tsx` menjalankan status UI, epoch, mount/cleanup, sensor scoped, serta disable dan perubahan policy. `test/runtime.test.ts` memeriksa transisi; `test/provider.test.tsx` memeriksa Strict Mode, SSR boundary, dan nested provider.
- [x] 2B — `src/applier.ts` menyimpan nilai dan priority token serta kehadiran atribut sebelum transaksi. Ia menjalankan guard dan menulis `--ally-*`/`data-ally-*` pada wrapper. Hide berbahaya dibuang untuk seluruh nama ketika marker opsional memuat slot terlindungi; MutationObserver mencabut hide saat marker berubah atau memuat elemen yang sedang fokus. Sticky hanya aktif pada `primaryAction` yang terpisah dari `payButton`; pelanggaran marker dilaporkan melalui error integrasi.
- [x] 2C — Satu baseline transaksi mendukung replace rule→LLM→Undo dan Keep→plan baru→Undo. Kandidat ditunda saat input atau composition aktif dan dibuang pada epoch/TTL lama. Keep/Undo eksplisit, toast timeout netral, TTL restore ditunda sampai blur, cooldown 10 detik, dan blokir reapply 60 detik diuji dengan fake timers.
- [x] 2D — `src/ui/Toast.tsx` dan `WhyPanel.tsx` memberi announcement sopan, tombol native Keep/Undo/Why, serta kontrol yang tetap ada sesudah toast hilang. Test jsdom memeriksa fokus Why, event callback yang dideduplikasi, payload tanpa nilai input, dan pengembalian status.

Planner AI sudah terhubung pada Fase 3; preferensi persisten tetap Fase 4. `plannerStatus` kini mencerminkan request HTTP dan fallback. BroadcastChannel opsional ditunda. Uji jsdom tidak membuktikan layout atau perilaku rendering browser nyata; itu memerlukan aplikasi host.
