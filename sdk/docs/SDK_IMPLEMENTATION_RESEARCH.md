# Riset Implementasi SDK Ally

Riset ini mencakup alur produk secara luas. Lingkup implementasi saat ini hanya package SDK dan tes berbasis skrip; aplikasi serta endpoint server dikerjakan rekan satu tim. Acuan eksekusi terbaru: [arsitektur](ARCHITECTURE.md), [indeks fase](IMPLEMENTATION_PHASES.md), dan [kontrak bersama](CONTRACTS.md). Bagian riset yang menyebut evaluasi aplikasi adalah konteks untuk handoff, bukan tugas implementasi SDK.

## Tujuan dan batas riset

Dokumen ini menerjemahkan masalah dalam [PRD](../../ALLY_PRD.md) dan [build plan](../../ALLY_BUILD_PLAN.md) menjadi rancangan integrasi SDK React untuk aplikasi lain. Ally ditujukan untuk kondisi pengguna yang berubah saat memakai antarmuka statis: tap meleset, kesulitan membaca, atau kelelahan saat menyelesaikan tugas. Hipotesis produk adalah perubahan UI yang terukur, dapat dijelaskan, dan dapat dibatalkan akan mengurangi friksi tanpa mengambil kendali dari pengguna. Klaim perbaikan hasil masih perlu dibuktikan lewat evaluasi, bukan diasumsikan dari sinyal sensor.

## Alur penggunaan pada proyek host

1. **Integrasi.** Aplikasi memasang package `@ally/react`, memuat CSS token Ally, dan membungkus bagian UI yang relevan dengan `AllyProvider`. Host memberikan policy berisi batas ukuran, komponen yang terkunci, elemen yang boleh disembunyikan, dan opsi planner. Server host menyediakan `/api/ally/plan` hanya bila fitur model diaktifkan. API key tetap di server.
2. **Persiapan UI.** Tombol, input, jarak, dan ukuran teks aplikasi membaca `--ally-target`, `--ally-space`, dan `--ally-font`; aturan `[data-ally-*]` mengatur layout. Host memberi nama semantik untuk step dan kategori error melalui API SDK. Integrasi tidak boleh bergantung pada isi form atau selector unik pengguna.
3. **Pengamatan.** Sensor di browser mengagregasi counter, durasi, ukuran target, dan modality dalam jendela 10 detik. Sinyal kuat dapat memicu evaluasi lebih awal. Sensor tidak mengirim nilai field, teks, identifier, screenshot, atau koordinat absolut. Event listener, timer, dan channel dibersihkan saat provider dilepas.
4. **Keputusan.** Rule deterministik menghitung profil motor, visual, kognitif, preset, dan confidence. Preset lokal cukup untuk kasus jelas. Kasus gabungan atau ambigu dapat meminta plan pada endpoint host; UI tidak perlu menunggu jaringan jika rule sudah menghasilkan keputusan yang layak. Setiap plan divalidasi dengan schema dan dibatasi lagi oleh policy di client.
5. **Penerapan dan kendali.** SDK menulis token CSS dan atribut data, menunda perubahan ketika pengguna sedang mengisi input, lalu menampilkan alasan serta Keep/Undo. Undo memulihkan seluruh state yang diubah dan menaikkan threshold sesi untuk menekan pemicu ulang. `useAlly()` membuka status, ringkasan, plan, penjelasan, dan aksi kepada komponen host.
6. **Pengukuran.** Host dapat membaca event ringkasan, keputusan, penerapan, dan undo untuk dashboard. Evaluasi membandingkan mis-tap, waktu penyelesaian, error loop, completion, dan undo antara sesi dengan dan tanpa Ally.

Contoh bentuk API integrasi yang disarankan (kontrak final masih perlu dibekukan):

```tsx
<AllyProvider policy={merchantPolicy} config={{ endpoint: '/api/ally/plan' }}>
  <Checkout />
</AllyProvider>
```

Host tetap bertanggung jawab menerapkan token pada komponennya. SDK tidak dapat memperbesar tombol yang memakai ukuran tetap dan mengabaikan token.

## Temuan teknis

- **React dan SSR.** Effect React berjalan di client dan memerlukan cleanup untuk integrasi browser. React Strict Mode menjalankan satu siklus setup dan cleanup tambahan di development. Karena itu, sensor dan `BroadcastChannel` harus aman dipasang ulang; akses `window`, `document`, dan `localStorage` dilakukan setelah mount. [Dokumentasi React `useEffect`](https://react.dev/reference/react/useEffect).
- **Ukuran target.** WCAG 2.2 AA menetapkan target pointer minimum 24 × 24 CSS px dengan pengecualian tertentu; 44 × 44 px adalah kriteria Enhanced pada level AAA. Default Ally 44 px tetap pilihan produk yang baik, tetapi tidak boleh dipresentasikan sebagai satu-satunya syarat WCAG AA. [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- **Sinyal tidak selalu berarti kebutuhan aksesibilitas.** Fokus lama bisa berarti pengguna membaca, zoom bisa disengaja, dan tap meleset dapat terjadi karena gerakan kendaraan. Gunakan threshold konservatif, confidence, TTL, Undo, dan penjelasan yang tidak mengklaim diagnosis.
- **Batas ruang adaptasi.** Penulisan token pada `document.documentElement` dapat memengaruhi seluruh halaman dan bentrok dengan lebih dari satu provider. Tambahkan `scope` berupa root element agar host bisa membatasi perubahan pada subtree. Gunakan document root hanya bila host memilihnya.
- **Kontrak data.** PRD mendefinisikan `FrictionSummary`, `AdaptationPlan`, dan `AllyPolicy`; rencana implementasi menambahkan detail event host yang belum menjadi kontrak publik. Versikan payload, batasi `context.step` ke nilai pendek yang ditetapkan host, dan definisikan kategori error tanpa teks pesan.
- **Planner opsional.** Server dan client sama-sama harus memvalidasi plan dan menerapkan guard. Cache harus punya masa berlaku, key yang mengikutkan policy yang relevan, dan fallback lokal saat timeout atau respons tidak valid. Output model hanya berupa token dan flags yang dikenal; HTML dari model tidak diterapkan.

## Kesimpulan untuk improvisasi development

Prioritas pertama ialah membekukan API package sebelum menambah fitur model: props provider, hook, event semantik host, token CSS, status, schema, dan perilaku Undo. Pisahkan core deterministik (`schema`, `rules`, `presets`, `guard`) dari adapter React dan browser. Ini membuat logika mudah diuji dan mencegah ketergantungan pada DOM host.

Bangun alur rule lokal, penerapan token, alasan, serta Keep/Undo sebagai MVP package. Setelah alur ini stabil, tambahkan planner server untuk kasus ambigu. Perbaikan penting terhadap rancangan awal adalah `scope` untuk membatasi efek CSS, kontrak event host yang eksplisit untuk backtrack/error, dan payload builder yang hanya mengizinkan agregat anonim. Rilis SDK perlu menyertakan contoh integrasi Next.js, referensi token, peer dependency React, tipe publik, dan daftar browser yang didukung.

Keberhasilan development sebaiknya dinilai dari berkurangnya friksi tugas, rendahnya Undo akibat false positive, penerapan tanpa layout jump, dan tidak adanya data form dalam payload. Simulator berguna untuk demo deterministik, tetapi evaluasi tetap perlu memasukkan interaksi DOM nyata serta perbandingan sebelum/sesudah.
