# Fase 1 — Sensor, interpretasi sinyal, dan preset

Dependensi: [Fase 0](PHASE_0_FOUNDATION.md) dan [kontrak bersama](CONTRACTS.md). Keluaran: src/sensor.ts, rules.ts, presets.ts, serta fixture/test. Target awal 60 menit; implementasikan sinyal MVP dahulu.

## Kekurangan rancangan awal dan solusi

- elementsFromPoint hanya membaca elemen tepat pada koordinat, bukan mencari tombol terdekat. Solusi: registrasi kandidat interaktif dalam scope dan hitung jarak ke bounding rectangle; API titik hanya membantu memeriksa elemen yang menutupi target. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/elementsFromPoint).
- Raw counter dan confidence selisih skor bisa membuat zero activity memanggil AI atau profil gabungan tidak pernah diterapkan. Solusi: pisahkan evidence strength dari confidence; wajib lolos gate evidence sebelum AI.
- Hesitation dan zoom dapat terhitung terus selama keadaan yang sama. Solusi: hitung episode, bukan setiap timer/resize.
- sensor.inject dapat menghasilkan metrik yang terlihat seperti event DOM. Solusi: hanya aktif pada fixture pengujian dan diberi label simulation; hasilnya tidak dicampur dengan event DOM yang dipicu skrip.

## Flow

Event dalam scope → cek kelayakan dan deduplikasi → agregasi window → snapshot → gate evidence → rule/preset atau no-op → guard → kandidat keputusan. Sensor tidak langsung mengubah DOM.

## Langkah implementasi

1. Sediakan createSensor(scope, clock, emit) agar waktu dapat dikontrol test. Pasang listener setelah mount, hanya ketika enabled dan halaman terlihat. Pause saat tab tersembunyi; buang window parsial saat kembali agar durasi background tidak menjadi hesitation.
2. Tangkap pointerdown primer untuk touch/mouse, satu event menjadi satu tap. Cari kandidat button/a/input/select/role=button yang terlihat, aktif, dan berada dalam scope. Abaikan UI Ally. Hit langsung pada child sebuah tombol bukan miss. Untuk miss, hitung dx/dy terdekat ke rectangle; jika jarak >0 dan <=24px, tambah missTap sekali. Koordinat hanya dipakai sesaat. Batasi scan pada scope provider, tanpa polling DOM setiap frame.
3. Rage click: tiga click pada elemen sama dalam 1 detik dihitung satu episode; reset setelah jeda. Hesitation: satu hitungan per focus episode setelah 8 detik tanpa input; dengarkan input tanpa membaca value. Zoom: hitung kenaikan skala/episode wheel-ctrl dengan debounce, bukan semua resize saat keyboard terbuka. Dukungan zoom yang tidak tersedia dicatat sebagai unavailable.
4. reportStep memakai urutan config.steps; backtrack hanya jika indeks menurun. reportError memakai field/category allowlist: pengulangan kategori pada field sama menaikkan errorLoop, lalu reset saat step berubah. Error field tidak dikirim. slowTargeting dan scrollThrash ditunda; metadata kemampuan menyatakan keduanya belum diukur.
5. Flush snapshot tiap 10 detik, catat windowMs aktual. Fast path pada tiga miss atau satu episode rage click: emit snapshot yang sama hanya sekali untuk evaluasi, tetapi jangan mereset denominator metrik. Saat akhir window, jangan menerapkan keputusan yang sama dua kali. Sediakan sequence lokal untuk deduplikasi.
6. Gunakan skor PRD sebagai baseline yang perlu dievaluasi: motor=min(1,missTap*0.25+rageClick*0.1), visual=min(1,zoomEvent*0.3+errorLoop*0.15), cognitive=min(1,hesitation*0.2+backtrack*0.25+errorLoop*0.1). Hilangkan kontribusi ukuran target ketika tidak ada sampel. Dengan tiga miss, motor=0.75. Baseline ini tidak disebut probabilitas atau diagnosis.
7. Definisikan strength=max(scores), confidence=max-secondMax. Jika strength<0.6 dan tidak ada dua dimensi >=0.5: no-op dan tanpa AI. Jika dua dimensi >=0.5: combined; jika tidak: dimensi terkuat. Rule single diterapkan bila confidence>=policy.thresholds.apply. Combined menunggu planner sambil mempertahankan UI aktif; cold start tetap default. AI hanya boleh dipanggil setelah gate evidence dan combined atau confidence<policy.thresholds.llm.
8. Buat preset sesuai PRD, explanation dari reason codes, dan TTL 120 detik. Terapkan guard sebelum menyerahkan kandidat ke provider. Debounce keputusan identik, cooldown penerapan 10 detik, dan larang reapply plan yang di-Undo selama 60 detik pada konteks sama; aturan lifecycle ada di Fase 2. sensor.inject hanya dipakai skrip pengujian, bukan API produksi.

## Verifikasi dan edge cases

Fake timers: focus tanpa input memicu satu kali; unmount menghentikan emit; hidden tab tidak memicu. Geometri jsdom memakai stub getBoundingClientRect: hit child, titik 10px di luar target, 30px di luar, target disabled, dan scope berbeda. Tiga miss menghasilkan motor 0.75; snapshot nol tidak memanggil planner; dua skor 0.6 masuk combined walau confidence nol. sensor.inject menguji pipeline; event DOM yang didispatch skrip menguji listener. Keduanya belum membuktikan geometri browser nyata.

## Checklist bukti — 0/4 (0%)

- [ ] 1A — Sensor scope, waktu, lifecycle, dan payload tersaring terimplementasi serta diuji.
- [ ] 1B — Host step/error dan deduplikasi episode bekerja.
- [ ] 1C — Rule no-op/single/combined, preset, dan guard lulus fixture.
- [ ] 1D — sensor.inject dan event DOM lewat skrip menghasilkan sinyal yang diharapkan, dengan hasil berlabel.

Setiap item bernilai 25% fase; catat artefak dan hasil pemeriksaannya.
