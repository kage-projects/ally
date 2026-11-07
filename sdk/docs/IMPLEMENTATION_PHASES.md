# Rencana Implementasi SDK Ally — Analisis dan Indeks Fase

Status: rancangan teknis siap menjadi panduan coding; implementasi kode belum dimulai. Lingkup kerja ini hanya package sdk dan pengujian berbasis skrip. Aplikasi React host serta endpoint OpenAI dibangun rekan tim. Mulai dari [arsitektur proyek](ARCHITECTURE.md) dan [kontrak bersama](CONTRACTS.md).

## Temuan analisis dan keputusan perbaikan

1. **Fase 0: kontrak belum lengkap dan guard terlambat.** Provider/scope, event host, entry package, dan protokol preferensi sebelumnya belum dibekukan. Solusi: kontrak v1 tunggal, core terpisah dari React, fixture bersama, serta schema dan guard dasar sejak scaffold. Detail: [Fase 0 — Fondasi](PHASE_0_FOUNDATION.md).
2. **Fase 1: sinyal dapat salah hitung dan confidence bisa salah dipakai.** elementsFromPoint tidak mencari target di sekitar titik; focus/zoom dapat terhitung berulang; skor nol dapat memicu AI. Solusi: geometri kandidat scope, episode/deduplikasi, gate evidence, pemisahan strength/confidence, dan label simulator. Detail: [Fase 1 — Sensor dan rule](PHASE_1_SENSORS_RULES.md).
3. **Fase 2: lifecycle perubahan belum pasti.** Undo setelah AI, Keep, TTL, input aktif, dan slot terkunci berpotensi saling bertentangan. Solusi: state machine, snapshot transaksi, scope yang dimiliki provider, contextEpoch, feedback eksplisit, dan mapping slot host. Detail: [Fase 2 — Adaptasi React](PHASE_2_REACT_ADAPTATION.md).
4. **Fase 3: model dan browser belum memiliki batas kepercayaan jelas.** Policy client bisa dimanipulasi; plan valid JSON bisa keliru; cache/response lama bisa melawan Undo. Solusi: policy server otoritatif, none/refusal path, guard dua sisi, cache lengkap, pembatalan dan epoch check. Detail: [Fase 3 — Planner AI](PHASE_3_AI_PLANNER.md).
5. **Fase 4: feedback berisiko dipelajari secara salah.** Diam bukan persetujuan; Keep pada satu plan tidak berarti semua komponennya disukai; history lintas konteks bisa menyesatkan. Solusi: feedback eksplisit per plan, konteks ketat, TTL/cap storage, fallback memory, reset, serta pemisahan preferensi dan pengukuran hasil. Detail: [Fase 4 — Preferensi](PHASE_4_PREFERENCES.md).
6. **Fase 5: pengujian SDK sebelumnya bergantung pada app teman.** sensor.inject tidak membuktikan listener, import source belum membuktikan package, dan jsdom tidak membuktikan rendering browser. Solusi: test skrip sensor dengan event DOM, mock HTTP, dan consumer tarball; laporan secara eksplisit membatasi klaim. Detail: [Fase 5 — Verifikasi SDK](PHASE_5_SDK_VERIFICATION.md).

## Flow lintas fase

Kontrak dan guard (0) → sensor/rule (1) → provider/applier/feedback (2) → client planner/kontrak endpoint (3) → memori preferensi (4) → verifikasi skrip dan handoff (5).

Siklus runtime: event host → ringkasan friksi → evidence gate → rule atau planner + preferensi → guard → cek epoch/fokus → apply → Keep/Undo → pembaruan preferensi. Tidak ada evidence yang cukup berarti tidak ada perubahan.

Mock endpoint Fase 3 dan fixture evaluasi Fase 5 boleh disiapkan setelah Fase 0. Integrasi planner ke UI menunggu lifecycle Fase 2. Fase 3 menerima preferences kosong sebelum Fase 4, sehingga tidak ada dependensi melingkar.

## Perubahan yang disengaja terhadap rancangan awal

- Guard dipindah dari Fase 3 ke Fase 0 agar rule lokal sejak awal aman.
- Toast yang hilang setelah 8 detik tidak lagi dianggap Keep. Hanya aksi eksplisit memperbarui preferensi.
- Scope MVP berupa wrapper provider tunggal; penulisan global document root dan nested provider ditunda.
- Input yang masih fokus tidak diubah hanya karena idle; tunggu blur/composition selesai.
- Model dapat memilih none melalui envelope keputusan; endpoint mengembalikan 204. AdaptationPlan tetap mempertahankan field PRD.
- Policy/model server menjadi otoritatif; browser tidak dapat memperluas izin atau memilih model arbitrer.
- Paket ESM dan tipe diprioritaskan; CJS, framework lain, dan multi-provider ditunda.
- Preferensi perangkat disimpan jika host mengaktifkan persistence local; default memory, dengan reset dan expiry.
- Progres kini dihitung per deliverable terverifikasi agar pekerjaan parsial dapat terlihat. Status fase selesai tetap mensyaratkan seluruh gate fase.

Keputusan ini menggantikan bagian yang bertentangan pada ringkasan lama untuk implementasi MVP. PRD dan build plan tetap menjadi referensi tujuan produk; jangan diam-diam menyalin perilaku lama yang sudah diperbaiki di atas.

Kontrak slot host memakai data-ally-slot untuk elemen terlindungi dan data-ally-optional untuk elemen yang boleh disembunyikan. Fase 3 membangun client planner dan skrip mock; skrip test:ai opsional mengevaluasi endpoint milik rekan ketika tersedia. Fase 5 membuktikan package SDK dengan skrip saja. Kualitas model host dan dampak tugas tetap status terpisah.

## Estimasi hackathon dan pengurangan lingkup

Slot awal 30 + 60 + 100 + 75 + 45 + 30 = 340 menit, dengan buffer 80 menit pada sesi tujuh jam. Ini anggaran kerja, bukan jaminan selesai dari nol. Asumsinya template/toolchain siap dan fixture pengujian SDK dibangun bersama tiap fase. Fase 5 hanya verifikasi final dan handoff, bukan waktu untuk membuat seluruh test suite.

Jika terlambat: tunda slowTargeting/scrollThrash, BroadcastChannel opsional, scoring hasil otomatis, CJS, dan polish. Pertahankan client planner yang lolos mock contract, fallback lokal, guard, Undo, penyaringan payload, dan pembatalan respons lama. Panggilan AI asli adalah gate rekan host; bila belum tersedia, laporkan sebagai unknown tanpa menghambat gate SDK. Fitur SDK yang dipotong tetap dicatat belum selesai; jangan menaikkan persentase.

## Checklist induk dan persentase implementasi

Masing-masing dokumen fase mempunyai empat deliverable bernomor, total 24. Satu deliverable = 25% fase atau 100/24% total (sekitar 4,17%). Rumus: progres total = jumlah deliverable terverifikasi / 24 × 100, dibulatkan dua desimal. Gate fase hanya dicentang setelah 4/4 selesai dan semua kriteria wajib terpenuhi.

- [ ] Fase 0: 0/4 deliverable — **0%**.
- [ ] Fase 1: 0/4 deliverable — **0%**.
- [ ] Fase 2: 0/4 deliverable — **0%**.
- [ ] Fase 3: 0/4 deliverable — **0%**.
- [ ] Fase 4: 0/4 deliverable — **0%**.
- [ ] Fase 5: 0/4 deliverable — **0%**.

**Total implementasi: 0/24 = 0%.** Riset, analisis celah, dan dokumen fase adalah persiapan; tidak dihitung sebagai kode yang selesai. Saat menandai item, tambahkan path artefak, perintah/skenario verifikasi, hasil, dan tanggal pada dokumen fase; kemudian sinkronkan angka di indeks ini.

Referensi proyek: [PRD](../../ALLY_PRD.md), [build plan](../../ALLY_BUILD_PLAN.md), [riset SDK](SDK_IMPLEMENTATION_RESEARCH.md). Referensi teknis yang digunakan pada analisis ditautkan di fase terkait.
