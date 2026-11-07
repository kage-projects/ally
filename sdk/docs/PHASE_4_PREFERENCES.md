# Fase 4 — Preferensi lokal sebagai konteks keputusan

Dependensi: feedback eksplisit Fase 2 dan preferences envelope Fase 0/3. Target awal 45 menit untuk memori sederhana; pembobotan statistik lanjutan ditunda.

## Kekurangan rancangan awal dan solusi

- Diam/timeout dianggap Keep. Hanya aksi eksplisit menjadi preferensi; dismissal bernilai unknown.
- Keep pada gabungan perubahan belum menjelaskan komponen mana disukai. Simpan feedback pada keseluruhan plan efektif; jangan mengasumsikan setiap token diterima terpisah.
- Perbaikan sesudah adaptasi belum membuktikan sebab-akibat. Hasil observasi dicatat sebagai indikasi, tidak otomatis menjadi reward atau menaikkan skor.
- localStorage bisa rusak, ditolak, atau dipakai orang lain pada browser yang sama. Gunakan expiry, reset, memory fallback, dan istilah preferensi perangkat, bukan identitas pengguna.
- Riwayat lama dapat melawan policy baru. Guard dan validasi konteks selalu mengalahkan memori.

## Flow

Aksi Keep/Undo → identifikasi plan efektif → upsert feedback → batasi/expire → ringkasan relevan → rule reuse atau input AI → guard → apply → observasi hasil. Reset → hapus storage/cache/pending → keputusan berikutnya tanpa memori.

## Langkah implementasi

1. Buat preferences.ts dan adapter storage terpisah. Record v1 berisi konteks {step, modality, preset, policyFingerprint}, pilihan token/layout/assist dari plan efektif tanpa explanation bebas, keptCount, undoneCount, updatedAt, expiresAt. Fingerprint hanya hash konfigurasi, bukan device ID. Simpan maksimal 20 record, expiry 7 hari sebagai default demonstrasi. Record ini bukan AdaptationPlan lengkap dan tidak boleh langsung diterapkan.
2. Simpan deduplikasi feedback per decision pada memori sesi. Keep dua kali tidak menggandakan hitungan; Undo setelah Keep pada decision sama mengganti feedback Keep menjadi Undo. Snapshot event dan plan efektif harus sesuai, bukan hasil model sebelum guard.
3. Default persistence=memory. Host boleh memilih local setelah menjelaskan preferensi tersimpan di browser dan menyediakan reset. Read/write storage dibungkus try/catch; JSON korup atau versi tidak dikenal dibuang, kemudian lanjut memory. Jangan baca storage selama SSR.
4. Pilih record hanya pada step/modality/preset/policy yang sama dan belum expired. Prioritas sederhana: kandidat diterima dengan keptCount>undoneCount, urutkan paling baru. Record penolakan melarang pengulangan plan sama dalam cooldown sesi. Cold start memakai rule bawaan.
5. Reuse pilihan tersimpan memerlukan sinyal friksi saat ini; jangan menerapkan preferensi secara otomatis hanya karena pengguna membuka halaman. Bentuk AdaptationPlan baru memakai token/layout/assist tersimpan, profile/confidence dari ringkasan terkini, explanation lokal dari reason codes, serta TTL baru yang dibatasi. Validasi schema dan guard plan baru sebelum apply; anggap plan berubah sebagai kandidat baru yang perlu feedback. Preferensi tidak dapat membuka slot terlarang.
6. Untuk planner, ambil paling banyak tiga record relevan. Kirim hanya action tokens/flags, feedback counts, dan age bucket. Jangan kirim timestamp presisi, storage key, ID, seluruh history, atau teks bebas. Semua data masuk schema allowlist server.
7. Ukur hasil dengan dua window aktif berdurasi sama pada step/modality yang sama dan minimal lima tap per window. Bandingkan missTap/taps, bukan raw count. Jika pengguna pindah step, window tumpang tindih, atau sampel kurang, hasil unknown. Completion/kecepatan bukan reward otomatis; Keep adalah preferensi eksplisit, bukan bukti kausal manfaat.
8. resetPreferences menghapus memori dan storage, membatalkan request/pending yang memakai preferensi lama, serta mengosongkan cache. Reset preferensi tidak otomatis Undo tampilan aktif; tombol Undo tersedia terpisah. Jika persistence berubah, reset state adapter secara eksplisit.

## Verifikasi dan serah terima

Uji Keep→request berikutnya memuat ringkasan relevan, Undo menggantikan feedback sebelumnya, history beda step tidak bocor, policy berubah mengabaikan record lama, reset membersihkan cache, storage denial tidak merusak UI, dan expiry membuang record. Tampilkan contoh payload sintetis dalam README, tanpa menyebut model telah dilatih.

## Checklist bukti — 4/4 (100%)

- [x] 4A — `preferences.ts` menyimpan record v1, expiry 7 hari, maksimum 20; `preference-storage.ts` memakai memori secara default dan menangani storage korup/ditolak.
- [x] 4B — Runtime mencatat hanya Keep/Undo eksplisit dari plan efektif; Keep→Undo pada keputusan sama mengoreksi hitungan. Timeout netral. Reset menghapus record, membatalkan request/pending, dan mempertahankan tampilan aktif.
- [x] 4C — Reuse mensyaratkan friksi terkini dan konteks step/modality/preset/policy yang cocok, lalu melewati guard. Planner menerima maksimum tiga ringkasan allowlist; reset membersihkan cache. Pergantian mode persistence membersihkan adapter lama dan baru.
- [x] 4D — Outcome membandingkan missTap/taps dari dua window lengkap, berturut, berdurasi setara, masing-masing minimal lima tap; kasus overlap atau sampel kurang bernilai unknown.

Setiap item bernilai 25% fase; bukti bukan sekadar adanya entry localStorage.

Verifikasi skrip: `pnpm -C sdk typecheck` dan `pnpm -C sdk test` lulus pada 2026-11-07 (69 tes). Skenario utama ada di `sdk/test/preferences.test.ts`, `sdk/test/runtime-preferences.test.ts`, dan `sdk/test/provider.test.tsx`, termasuk regresi agar feedback plan lama tidak dikaitkan ke step atau policy baru serta outcome dibatalkan saat policy berubah. Outcome adalah observasi, bukan bukti kausal atau pelatihan ulang model.
