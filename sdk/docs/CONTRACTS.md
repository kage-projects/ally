# Kontrak Bersama Implementasi MVP

Status: keputusan desain v1; Fase 0–1 sudah berupa kode, lifecycle provider dan planner masih tahap berikutnya. Dokumen ini merinci dan memperbaiki rancangan awal PRD. Perubahan yang disengaja dicatat di [indeks fase](IMPLEMENTATION_PHASES.md). Semua fase memakai kontrak ini agar tidak mendefinisikan ulang API.

## Batas package dan kepemilikan

- sdk dapat dibangun sebagai package mandiri dengan pnpm; workspace root opsional untuk integrasi tim.
- sdk: package @ally/react, source src/, pengujian test/, dokumentasi docs/.
- Aplikasi React host dan endpoint server dimiliki rekan satu tim. SDK hanya mendokumentasikan kontrak keduanya dan mengujinya dengan fixture skrip di sdk/test/.
- Hasil verifikasi SDK berada di sdk/test-results/ bila perlu disimpan; tidak ada dependensi pada apps/demo, eval/ root, atau Playwright.
- Ekspor package: entry React dengan directive 'use client'; subpath @ally/react/core hanya schema, rule, preset, guard; @ally/react/styles.css berisi default scope. Core tidak mengimpor React atau API browser. Pilih build ESM + deklarasi tipe untuk MVP; CJS ditunda. Kunci versi dependensi dan package manager di manifest/lockfile saat scaffold, bukan di setiap fase.

## Antarmuka host

AllyProvider menerima policy, children, onDecision opsional, dan config. Provider membuat satu div dengan data-ally-root untuk membatasi token. Host memasangnya di luar form/section, bukan di dalam table/select. MVP hanya mendukung satu provider per subtree, tanpa nested provider. Portal di luar scope tidak otomatis diadaptasi.

Config v1: enabled (default true), endpoint (default /api/ally/plan), storageKey (default ally:pref:v1), persistence (memory atau local; default memory), steps (array nama step yang ditetapkan developer), allowedFields dan errorCategories (array allowlist host, default kosong). Endpoint relatif same-origin. SSR dan render pertama tidak mengakses DOM/storage; pemulihan preferensi dilakukan setelah mount.

useAlly menghasilkan plan, profile, summary, explanation, status, plannerStatus, keep(), undo(), resetPreferences(), reportStep(step), dan reportError({field, category}). Pemakaian hook di luar provider menghasilkan error developer yang jelas. field/category harus berasal dari allowlist host, tanpa pesan error, nilai field, URL, atau ID pengguna. Nilai field hanya disimpan sementara untuk menghitung duplikasi lokal; payload keluar berisi counter.

Status UI: disabled, observing, pending, applied, kept. Status planner terpisah: idle, loading, fallback. Tidak ada plan valid berarti tidak mengubah UI.

## Kontrak data dan provenance

Pertahankan field FrictionSummary, Profile, AdaptationPlan, dan AllyPolicy dari PRD. Tambahkan envelope v1, jangan memasukkan metadata ke dalam output token:
- DecisionInput: schemaVersion=1, summary, profile, policy, preferences (array kosong sebelum Fase 4).
- DecisionResult internal: source (rule/llm/cache), preset, plan, reasonCodes, contextEpoch. Hanya objek plan mengikuti schema AdaptationPlan.
- Metadata observasi lokal: durasi aktual, sinyal tersedia, sumber live/simulation, jumlah sampel. Signal yang belum diimplementasikan bernilai nol pada payload demi kompatibilitas; daftar kemampuan tetap di konfigurasi server dan prompt, sehingga nol tidak dianggap bukti ketiadaan friksi.
- contextEpoch integer lokal bertambah pada step/policy berubah, Undo, Keep, reset, disable, dan unmount. Bukan identifier pengguna; jangan kirim ke model.

Semua bilangan finite; counter integer nonnegatif. Limit policy wajib min <= max; threshold 0..1; explanation maksimum 240 karakter; ttlSeconds 60..300. Profile/confidence dibatasi 0..1. Schema menolak property tak dikenal dan tipe salah; guard menormalkan angka token yang valid tetapi keluar rentang. Policy invalid menonaktifkan adaptasi dan melaporkan error developer.

## Policy dan adaptasi

Default demonstrasi: target 44..72px, spacing 1..2, font 1..1.6; apply=0.6, llm=0.2, timeout server 1500ms. Model dipilih server dari konfigurasi yang telah diuji; nama model dari browser tidak dipercaya. Tidak ada kemampuan voice pada MVP, sehingga voiceOffer selalu false.

Guard dasar hadir sejak Fase 0 dan wajib sebelum semua penerapan, termasuk rule lokal. Server memiliki policy otoritatif sendiri; request client hanya dapat mempersempit izin. Irisan rentang kosong menghasilkan tidak ada plan. Server juga menghitung ulang profile dari summary agar tidak mempercayai skor client.

Host menandai elemen dengan atribut data-ally-slot bernilai price, legalText, totalAmount, payButton, atau primaryAction. Empat nilai pertama terlindungi; primaryAction hanya dipakai sebagai target sticky dan tidak boleh menjadi ancestor payButton. Elemen yang boleh disembunyikan memakai data-ally-optional dengan nilai enum allowHide: promoBanner, recommendations, voucherCarousel, atau socialProof. Contoh markup host: `<strong data-ally-slot="totalAmount">...</strong>` dan `<aside data-ally-optional="promoBanner">...</aside>`. Host mendaftarkan selector melalui atribut ini; tidak ada API registrasi kedua. Elemen opsional tidak boleh menjadi ancestor elemen terkunci.

Sebelum menulis atribut root, adapter memeriksa seluruh target untuk setiap nama hide. Jika satu target memuat slot terlindungi, hapus **nama hide itu** dari plan efektif dan dari data-ally-hide, lalu laporkan kesalahan integrasi; jangan hanya melewati elemen dalam loop, karena CSS tetap akan menyembunyikannya. Jalankan pemeriksaan ulang saat step host berubah atau target opsional berubah; bila invariant rusak, hapus token hide terkait sebelum UI berikutnya dipakai. Root provider memakai data-ally-hide berisi hanya nama yang lolos policy dan pemeriksaan DOM. Selector stylesheet harus tepat pada slot opsional, misalnya [data-ally-hide~="promoBanner"] [data-ally-optional="promoBanner"] { display: none; }; jangan sembunyikan container induk umum. Price/total/legal tidak boleh diubah kontennya, disembunyikan, atau dipindah; payButton hanya boleh membesar. Sticky CTA hanya berlaku pada primaryAction yang terpisah dari payButton. Fixture SDK menguji marker lengkap; rekan host bertanggung jawab memberi marker yang sama pada aplikasinya.

SDK mengekspor evidence gate dari core: bila strength di bawah 0.6 dan tidak ada dua dimensi dengan skor minimal 0.5, host endpoint seharusnya mengembalikan 204 tanpa panggilan model. Rekan pemilik endpoint memakai core untuk menghitung ulang profile dari summary dan menguji gate ini di proyek host. Skrip SDK menguji kontrak tersebut melalui mock HTTP; SDK tidak mengimplementasikan endpoint produksi.

## Pengendalian perubahan

Kontrak v1 adalah satu sumber keputusan di dokumentasi; src/schema.ts menjadi sumber tipe/runtime setelah ditulis. Perubahan field, status, default, atau makna Keep/Undo harus diperbarui di sini, contoh payload, seluruh konsumen, dan pengujian kontrak dalam satu perubahan. Jangan membuat nama alternatif pada fase berikutnya. Simpan alasan perubahan sebagai catatan singkat di PR.
