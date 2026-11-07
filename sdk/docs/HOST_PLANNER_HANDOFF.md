# Handoff Endpoint Planner untuk Host React

SDK Fase 3 mengirim agregat interaksi ke endpoint milik aplikasi host. Aplikasi dan route server tidak berada dalam repo SDK ini. API key OpenAI hanya boleh ada di server host.

## Mengaktifkan dari aplikasi host

Berikan `policy.llm.enabled: true` dan `config.endpoint: '/api/ally/plan'` pada `AllyProvider`. Endpoint harus berupa path same-origin yang diawali `/`, tanpa query, fragment, atau backslash. SDK melakukan `POST` JSON dengan kredensial same-origin, batas body 16 KB, timeout 2 detik, dan tanpa retry otomatis pada window yang sama. Preferensi dikirim sebagai `[]` sampai Fase 4.

SDK hanya memanggil endpoint setelah evidence gate lolos dan rule lokal belum cukup: preset `combined` atau confidence di bawah `policy.thresholds.llm`. Plan rule yang sudah aktif tetap terlihat saat planner loading atau gagal. Status planner tersedia melalui `useAlly().plannerStatus` (`idle`, `loading`, `fallback`).

## Kontrak route server

1. Parse body dengan `DecisionInputSchema` dari `@ally/react/core`; tolak field tambahan, termasuk nilai form atau pesan error. Ambil policy, model, dan API key otoritatif dari konfigurasi server. Policy browser hanya boleh mempersempit izin server; irisan rentang kosong menghasilkan no-op.
2. Hitung ulang profil memakai `scoreProfile(summary)`. Gunakan `decideRule(summary, effectivePolicy)` untuk evidence gate; kembalikan HTTP `204` tanpa body jika evidence kurang atau model memilih `none`. Jangan percaya `profile` maupun nama model yang dikirim browser.
3. Untuk kasus ambigu, minta keluaran terstruktur dengan `AdaptationPlanJsonSchema`. Validasi hasil dengan `AdaptationPlanSchema`, jalankan `guardPlan` menggunakan policy efektif server, dan pastikan `plan.profile` sama dengan profil yang dihitung ulang.
4. Kembalikan HTTP `200` dengan objek tepat `{ "schemaVersion": 1, "plan": { ... }, "source": "llm", "latencyMs": 100 }`. `latencyMs` harus finite dan nonnegatif. Respons `204` berarti tidak ada plan. Respons `400`, `429`, `5xx`, JSON rusak, versi salah, atau schema yang tidak cocok menjadi fallback aman di SDK.

SDK memvalidasi dan menjaga ulang respons, lalu membuang hasil yang datang setelah step/policy berubah, Keep, Undo, reset, disable, atau unmount. Cache memori paling lama 60 detik dan dibedakan menurut step, modality, bucket sinyal, policy, serta preferensi.

## Pengujian dan batas bukti

Jalankan `pnpm -C sdk build`, `pnpm -C sdk test`, dan `pnpm -C sdk test:ai:mock` untuk memeriksa SDK tanpa aplikasi host. Evaluator mock memakai tujuh fixture sintetis × tiga run; hasilnya ditulis ke `sdk/test-results/ai-mock.json`. Untuk route nyata, set `ALLY_AI_ENDPOINT` ke URL HTTP(S) lengkap lalu jalankan `pnpm -C sdk test:ai`; hasilnya berada di `sdk/test-results/ai-live.json`. Tanpa endpoint nyata, kualitas model dan dampak pada pengguna tetap belum terverifikasi.
