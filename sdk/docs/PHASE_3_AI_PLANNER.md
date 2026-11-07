# Fase 3 — Client planner dan kontrak endpoint

Fase ini hanya membangun kode SDK. Rekan satu tim membangun route server serta panggilan OpenAI. Dependensi: [kontrak bersama](CONTRACTS.md), evidence gate Fase 1, state/epoch Fase 2. Target awal 75 menit.

## Celah dan keputusan

- SDK tidak boleh membawa API key atau implementasi endpoint produksi. Solusi: transport HTTP client dan kontrak request/response, dengan mock server dalam skrip uji.
- Confidence rendah tanpa evidence dapat menghasilkan request sia-sia. Solusi: gate core sebelum request; host server juga harus memakai gate itu.
- Respons valid JSON belum tentu aman. Solusi: schema runtime, guard policy, pemeriksaan epoch, dan opsi no-op.
- Cache berdasarkan preset saja mencampur policy dan preferensi. Solusi: key dari schema version, step, modality, bucket sinyal, policy efektif, dan ringkasan preferensi.

## Flow

Snapshot FrictionSummary → gate evidence → aturan lokal cukup? → bila ambigu, requestPlan() → mock/endpoint host → parse 200 atau 204 → validasi schema dan guard → epoch masih sama? → kandidat untuk provider. Timeout, 400/429/5xx, body invalid, atau response stale mempertahankan plan rule yang valid.

## Kontrak yang diberikan kepada rekan host

POST /api/ally/plan menerima DecisionInput v1 {schemaVersion, summary, profile, policy, preferences}. preferences=[] sebelum Fase 4. Body maksimum yang disarankan 16 KB; hanya agregat dan ringkasan preferensi, tanpa isi form. Respons 200 {schemaVersion:1, plan, source:"llm", latencyMs}; 204 tanpa body berarti no plan. Host memakai policy/model/API key otoritatif di server, menghitung ulang profile/evidence dengan @ally/react/core, memvalidasi output model, lalu melakukan guard. SDK kembali menjalankan validasi dan guard saat menerima respons. Model boleh memilih none; host menerjemahkannya menjadi 204. Rincian model dan endpoint menjadi tanggung jawab rekan host, bukan file SDK.

## Langkah implementasi SDK

1. Ekspor tipe input/response dan payload builder yang mengambil allowlist field saja. Tolak step/field/category di luar kontrak sebelum fetch. Buat requestPlan(summary, profile, policy, preferences, signal) dengan endpoint relatif same-origin.
2. Satu request aktif per provider. Mulai dengan timeout client 2000ms, AbortController, dan cooldown 10 detik. Jangan retry otomatis pada window yang sama. Tangani 204 tanpa memanggil response.json(), status error, JSON rusak, schemaVersion salah, dan refusal yang diterjemahkan host ke 204.
3. Cache hanya plan tervalidasi dan telah dijaga, dalam memori dengan TTL=min(plan.ttlSeconds,60). Revalidasi terhadap policy saat cache hit. Invalidasi saat policy/preferensi berubah atau provider di-reset.
4. Simpan contextEpoch saat request dibuat. Setelah respons datang, buang jika epoch berubah, provider disabled, plan kedaluwarsa, atau pengguna memilih Keep/Undo. Kandidat yang lolos dikirim ke provider; SDK tidak langsung menulis CSS dari callback fetch.
5. Buat mock HTTP handler berbasis skrip untuk hasil apply, none, timeout, 400, 429, 5xx, payload tidak valid, dan late response. Uji kebocoran data dengan sentinel form dalam fixture. Tidak perlu menjalankan aplikasi host.
6. Sediakan script opsional test:ai yang menerima URL endpoint host dari environment ketika route teman sudah tersedia. Ia menjalankan tujuh fixture × tiga run: dua membuktikan routing tanpa model dan lima kasus ambigu. Catat routing, keputusan semantik, schema/policy, serta latensi terpisah. Tanpa endpoint asli, status kualitas model adalah belum terverifikasi dan tidak mengurangi status verifikasi kode client SDK.

## Verifikasi dengan skrip

Jalankan unit/contract suite SDK: request body allowlist, 204 tanpa body, guard ulang respons, cache berbeda policy, timeout, dan respons terlambat setelah Undo. Fixture golden AI ditulis sebagai handoff untuk host. Skrip test:ai bila endpoint tersedia memakai gate routing 21/21, keputusan model minimal 12/15, dan pelanggaran schema/policy 0/21; kegagalan normal→perubahan atau hide terlarang adalah blocker kualitas model. Angka ini belum hasil pengukuran.

## Checklist bukti — 0/4 (0%)

- [ ] 3A — Tipe, payload builder, dan mock protokol lulus skrip kontrak.
- [ ] 3B — requestPlan menangani semua status/timeout tanpa menjatuhkan rule path.
- [ ] 3C — Cache, guard ulang, dan epoch membuang respons yang tidak relevan.
- [ ] 3D — Fixture golden dan script test:ai tersedia sebagai handoff; hasil mock tercatat.

Setiap item bernilai 25% fase. Keberhasilan SDK tidak menyiratkan endpoint atau kualitas model host telah diverifikasi.
