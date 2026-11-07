# Arsitektur Proyek Ally SDK — React Web MVP

Status: Fase 0–5 package SDK selesai dan lolos verifikasi berbasis skrip. Dokumen ini menyatukan [kontrak bersama](CONTRACTS.md) dan [enam fase](IMPLEMENTATION_PHASES.md). Bila detail field atau perilaku berbeda, CONTRACTS.md dan dokumen fase pemilik keputusan harus diperbarui bersama sebelum kode berubah.

## Tujuan dan batas sistem

Ally mengamati friksi interaksi di aplikasi React web, menghitung profil serta preset lokal, lalu mengubah token dan opsi layout yang telah disediakan host. Pengguna dapat melihat alasan, memilih Keep, atau Undo. Kasus ambigu boleh memakai OpenAI lewat endpoint server milik host; keputusan lokal tetap dapat berjalan saat endpoint gagal. Implementasi di repo ini hanya package SDK, kontrak untuk host, dan pengujian skrip. Aplikasi host beserta endpoint OpenAI dibangun rekan satu tim. React Native, overlay DOM pihak ketiga, HTML keluaran model, dan pelatihan ulang model berada di luar lingkup.

Alur utama: interaksi → agregat anonim → gate evidence → rule/preset atau planner → validasi dan guard → cek konteks/fokus → penerapan → feedback → preferensi lokal dan pengukuran hasil.

## Topologi dan kepemilikan

~~~text
Repo ini: sdk/                   package @ally/react
│  ├─ src/schema.ts             kontrak Zod dan tipe
│  ├─ src/rules.ts, presets.ts   evidence gate dan preset murni
│  ├─ src/guard.ts, core.ts      batas policy dan entry server-safe
│  ├─ src/sensor.ts              observasi browser dalam scope
│  ├─ src/applier.ts, runtime.ts transaksi DOM dan lifecycle
│  ├─ src/engine-client.ts       request, timeout, cache planner
│  ├─ src/planner-contract.ts    payload dan response schema
│  ├─ src/preferences.ts         rekam feedback, konteks, reuse, outcome
│  ├─ src/preference-storage.ts  adapter memori/localStorage
│  ├─ src/provider.tsx           integrasi React dan context hook
│  ├─ src/state.ts, ui/          status, Toast, Why
│  ├─ src/styles.css            default token/selector slot host
│  ├─ test/                     unit, jsdom, mock HTTP, consumer, fixture AI
│  ├─ test-results/             hasil evaluator AI lokal (diabaikan Git)
│  └─ docs/                     desain ini dan panduan fase

Di luar scope pekerjaan SDK:
└─ Aplikasi rekan tim           React host, CSS token, endpoint OpenAI,
                               dashboard, checkout, dan bukti browser
~~~

Implementasi memakai modul datar agar package hackathon tetap ringkas, sambil mempertahankan batas tanggung jawab core, browser, dan React sesuai [panduan sdk](../AGENTS.md). Export publik tetap @ally/react untuk komponen, @ally/react/core untuk logika server-safe, dan @ally/react/styles.css untuk default CSS. ESM dan deklarasi tipe menjadi hasil build; React adalah peer dependency. Entry React mempertahankan client boundary, sedangkan core dapat diimpor route server tanpa akses browser.

~~~mermaid
flowchart LR
  H["Host React milik rekan tim"] --> P["Provider dan applier SDK"]
  H --> E["Event step dan error"]
  E --> S["Sensor browser SDK"]
  S --> R["Core: schema, evidence, rule, guard"]
  R --> P
  R --> C["Planner client SDK"]
  C --> A["Endpoint server host"]
  A --> O["OpenAI API di server host"]
  O --> A
  A --> C
  C --> P
  P --> F["Keep / Undo / Why"]
  F --> M["Preferensi perangkat"]
  M --> R
  M --> C
~~~

SDK bertanggung jawab atas sensor, interpretasi, penerapan, feedback, preferensi, client planner, tipe/guard core yang dapat dipakai host, dan API publik. Rekan pemilik host bertanggung jawab atas markup semantik, token-aware CSS, langkah checkout, kategori error, policy merchant, slot terlindungi, endpoint server, API key, dan browser end-to-end. Model hanya menyarankan plan; ia tidak dapat menulis DOM atau mengubah policy.

## Komponen dan hubungan

- **Schema dan policy** memvalidasi FrictionSummary, Profile, AdaptationPlan, AllyPolicy, serta DecisionInput v1. Satu sumber tipe/runtime berada di src/schema.ts. Guard adalah fungsi murni yang membatasi angka, hide flags, dan aksi terlarang sebelum tiap apply.
- **Sensor browser** dipasang setelah provider mount. Ia mengamati pointer/focus/zoom dan event step/error dari host, mengelompokkan hitungan per 10 detik, serta menghasilkan snapshot cepat pada sinyal kuat. Konten form dan koordinat tidak disimpan.
- **Rule engine** menghitung skor motor, visual, dan cognitive dari summary. strength menentukan apakah evidence cukup; confidence mengukur selisih skor teratas. Outputnya no-op, single preset, atau combined. Rule tidak menebak kondisi medis.
- **Planner client** meminta plan secara asinkron bila gate evidence lolos dan kasus ambigu. Ia memakai cache singkat, timeout, dan contextEpoch. Respons lama dibuang setelah step/policy berubah, Keep/Undo, reset, disable, atau unmount.
- **Provider dan applier** memegang state UI, snapshot CSS sebelumnya, timer TTL, fokus aktif, dan scope. Satu transaksi adaptasi aktif mengendalikan penerapan dan Undo. Callback keputusan memberi log host; BroadcastChannel opsional hanya untuk dashboard.
- **Preference store** mencatat feedback eksplisit per plan efektif pada memori, atau localStorage jika host memilihnya. Record memiliki konteks, expiry, batas jumlah, dan reset. Pilihan tersimpan dirakit lagi menjadi plan baru, lalu divalidasi serta dijaga sebelum dipakai.
- **Server host (milik rekan)** memvalidasi body, memakai policy dan model yang dikonfigurasi server, menghitung ulang profil dan evidence dengan core SDK, lalu meminta keluaran terstruktur dari OpenAI. Respons model diperlakukan sebagai input tidak tepercaya dan dijaga kembali. Endpoint mengembalikan 204 untuk tidak ada plan. SDK menyediakan kontrak dan mock server untuk skripnya, tanpa mengimplementasikan endpoint produksi.

## Kontrak integrasi host

Provider menerima policy, config, children, dan onDecision opsional. Config v1 mencakup enabled, endpoint same-origin, persistence, storageKey, urutan steps, allowedFields, serta errorCategories. useAlly menyediakan plan, profile, summary, outcome, explanation, status UI, plannerStatus, keep(), undo(), resetPreferences(), reportStep(), dan reportError(). Host melaporkan step dan kategori error yang sudah didaftarkan, tanpa value atau teks pesan.

Provider membuat satu wrapper data-ally-root. Host menggunakan --ally-target, --ally-space, --ally-font, dan data attributes untuk gaya komponen. Elemen terlindungi ditandai data-ally-slot dengan salah satu nilai price, legalText, totalAmount, atau payButton; primaryAction adalah slot sticky terpisah. Konten opsional ditandai data-ally-optional dengan salah satu nilai promoBanner, recommendations, voucherCarousel, atau socialProof. Root hanya menulis nama hide yang lolos policy dan pemeriksaan DOM ke data-ally-hide. Jika slot opsional memuat slot terlindungi, hapus nama hide terkait dari plan efektif dan atribut root; cek lagi saat step atau target berubah. Host harus menjaga payButton tidak berpindah/disembunyikan.

## Flow keputusan saat runtime

1. Provider mount, memvalidasi policy, memasang sensor dalam scope, dan memulihkan preferensi setelah mount bila local persistence diaktifkan. Policy invalid menonaktifkan adaptasi. Pada SSR, hasil render awal tidak membaca window, document, atau storage.
2. Sensor mengeluarkan FrictionSummary dengan windowMs aktual, modality, viewport, counter, timing, dan konteks step terbatas. Sinyal belum diimplementasikan bernilai nol untuk kompatibilitas, tetapi kemampuan yang tidak tersedia dicatat terpisah agar nol tidak ditafsirkan sebagai bukti tidak ada friksi.
3. Core menghitung skor. Jika strength<0.6 dan tidak ada dua dimensi >=0.5, hasilnya no-op. Single preset yang memenuhi confidence>=policy.thresholds.apply boleh diterapkan segera. Combined atau ambigu yang lolos gate dapat meminta planner; UI lama tetap aktif selama menunggu.
4. Setiap kandidat melewati schema dan guard. Applier memeriksa contextEpoch, expiry, dan apakah pengguna sedang mengisi input atau memakai IME. Kandidat ditunda hingga blur bila fokus belum aman. Snapshot token/atribut dibuat sebelum satu transaksi ditulis.
5. Toast menjelaskan perubahan. Keep menghentikan TTL dan mengirim feedback positif eksplisit; hilangnya toast tidak dianggap Keep. Undo mengembalikan baseline transaksi, mengirim feedback negatif, menaikkan threshold sesi, dan membatalkan request pending. TTL plan yang belum di-Keep mengembalikan baseline dengan aman.
6. Preference store memilih record yang cocok pada step/modality/preset/policy. Keep bukan bukti bahwa seluruh token secara individual bermanfaat; feedback berlaku untuk plan efektif secara utuh. Pengukuran sebelum/sesudah disimpan terpisah dan bernilai unknown bila sampel kurang.

Status UI: disabled → observing → pending bila menunggu blur → applied → kept atau kembali observing melalui Undo/TTL. plannerStatus idle/loading/fallback berjalan terpisah, sehingga UI dapat sudah applied sambil planner loading.

## Batas kepercayaan, data, dan kegagalan

Browser tidak dipercaya untuk menentukan policy/model server. Kontrak yang diserahkan ke rekan mewajibkan server mengambil konfigurasi otoritatif dan hanya menerima penyempitan izin client. Request DecisionInput v1 berisi schemaVersion, summary, profile, policy yang diminta, dan paling banyak tiga ringkasan preferensi relevan; server menghitung ulang profile. Tidak ada nama pengguna, device ID, field value, error text, selector unik, screenshot, atau koordinat absolut. API key hanya ada di server host dan tidak ditulis ke log/bundle client SDK.

Kontrak POST /api/ally/plan menyarankan body paling besar 16 KB. Respons 200 berisi schemaVersion, plan, source, latencyMs; 204 berarti tidak ada plan; 400/429/5xx ditangani sebagai fallback. Endpoint host seharusnya mengembalikan 204 sebelum memanggil model bila evidence kurang. Server host memberi timeout 1500ms, client SDK 2000ms; tidak ada retry otomatis pada window yang sama. Client memvalidasi/guard ulang respons maupun cache. Cache memakai versi schema, step, bucket signal, policy, dan preferensi; TTL paling lama 60 detik. Refusal, output tidak lengkap, timeout, policy yang berubah, dan respons dari epoch lama tidak mengubah UI.

Structured Outputs membatasi bentuk jawaban, sedangkan schema runtime, guard, policy server, dan pemeriksaan slot DOM menjaga efek nyata. Model dapat memilih action none; server menerjemahkannya menjadi 204. Penjelasan yang tidak sesuai plan efektif setelah guard diganti dengan penjelasan lokal. Tidak ada HTML model yang dirender.

## Build, verifikasi, dan observabilitas

Tahap pembangunan SDK: Fase 0 kontrak/guard; Fase 1 sensor/rule; Fase 2 provider/applier; Fase 3 client planner/kontrak HTTP; Fase 4 preferensi; Fase 5 skrip verifikasi dan handoff. Seluruh gate SDK selesai. Evaluasi AI nyata menunggu endpoint rekan; ini status terpisah dari kelulusan SDK. Skrip pnpm build, typecheck, test, test:contract, test:package, dan test:ai:mock tersedia.

Verifikasi SDK memakai skrip pnpm -C sdk build, typecheck, test, dan test:contract. Vitest/jsdom dengan fake timers menguji schema/rule/guard, sensor, scope, fokus, Keep/Undo/TTL, dan slot terkunci. Mock HTTP menguji 200/204/400/429/5xx, timeout, payload, cache, dan respons stale. Consumer fixture yang memasang tarball memeriksa export, tipe, React peer, dan import core tanpa DOM. jsdom memakai stub geometri; hasilnya tidak membuktikan rendering atau kompatibilitas browser nyata. Skrip test:ai opsional dapat menguji endpoint rekan dengan tujuh fixture × tiga run, tetapi kualitas model dinyatakan unknown sampai endpoint nyata tersedia.

Laporan memisahkan tiga klaim: fungsi SDK terverifikasi dengan skrip, kualitas AI host bila test:ai benar-benar berjalan, dan dampak pengguna yang hanya dapat diukur rekan lewat aplikasi host. sensor.inject menguji pipeline keputusan, sementara dispatch event DOM di jsdom menguji listener tanpa membuktikan geometri browser nyata. Tidak ada metrik completion/checkout yang diklaim dari skrip SDK.

Log keputusan hanya berisi timestamp, source, reason codes, jenis preset, koreksi guard, durasi, dan status feedback; tidak memuat request body atau konten form. Callback/BroadcastChannel opsional dapat dipakai dashboard host, tetapi SDK tidak membangun dashboard. Pantau latensi rule, timeout dan fallback melalui skrip; latensi model dilaporkan hanya bila endpoint nyata diuji.

## Keputusan yang masih memerlukan bukti implementasi

Versi model, kompatibilitas browser, latensi model nyata, dan penurunan friksi belum dapat dipastikan dari pengujian SDK. Mock planner menghasilkan routing 21/21, semantik sintetis 15/15, dan pelanggaran schema/policy 0/21; endpoint rekan belum diuji. Consumer tarball menggunakan dependency lokal tertaut dalam lingkungan offline, sehingga instalasi registry bersih juga belum dibuktikan. [Checklist implementasi](IMPLEMENTATION_PHASES.md) kini 24/24 untuk lingkup SDK; bukti Fase 4–5 ada pada dokumen masing-masing.
