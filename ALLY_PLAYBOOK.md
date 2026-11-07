# ALLY — Winning Playbook
### Sea x OpenAI Regional Codex Hackathon, Indonesia Edition (7 Nov 2026, Shopee Jakarta)

> Dokumen ini adalah "kitab" lengkap tim Ally: posisi tema, evaluasi jujur, data, kompetitor, bentuk produk, ide final, arsitektur, pembagian tim, run-of-day, pitch script (English), Q&A juri, dan tips. Semua angka diberi sumber. Yang belum terverifikasi ditandai `[unverified]` — jangan pakai di slide sebelum dicek.

---

## 0. TL;DR — 10 hal yang WAJIB kamu tahu

1. **Semua kode ditulis di hari-H.** Hacking ±7 jam (09.30–16.30 WIB). Pre-built code/design = **diskualifikasi**. Yang boleh disiapkan: riset, arsitektur di kepala/kertas, prompt plan, latihan Codex, pitch.
2. **"Project must use Codex"** — dan *"how effectively Codex was leveraged"* adalah 1 dari 4 kriteria resmi. Submission-mu menyebut **Google Gemini → WAJIB diganti ke OpenAI** (Structured Outputs). Pakai Gemini di hackathon OpenAI = bunuh diri.
3. **4 kriteria resmi:** problem framing · quality of build · depth of thinking · Codex leverage. Juri Singapura juga menggali: **trade-off teknis (latency), privasi data, rencana pasca-hackathon.**
4. **Presentasi WAJIB bahasa Inggris**, dua ronde: Round 1 rotasi ke juri (16.45), Top-5 diumumkan 18.30, Final di panggung 18.40.
5. Tema terbaik Ally: **Autonomous & Adaptive AI** (primer) + **AI-Native Products** (sekunder). Jangan klaim Deep Domain.
6. Pemenang Singapura semuanya sistem yang **belajar/beradaptasi dan bisa dijelaskan (white-box)**. Ally harus terlihat seperti itu — bukan "chatbot wrapper".
7. Bentuk produk yang paling kuat: **SDK/library React (`@ally/react`) + Decision Engine + Dashboard** — didemokan di checkout mock. Bukan extension, bukan app baru.
8. Nama "Ally" = *ally* (sekutu) + *a11y* (singkatan accessibility). Pakai ini di 10 detik pertama pitch.
9. Demo harus **menunjukkan perubahan terjadi live** dari perilaku user (mis-tap 3x → UI adaptif dalam <1 detik) dengan **panel "Why?"** yang menjelaskan keputusan AI.
10. Sertakan **angka hasil** dari uji sendiri di hari-H (mis-tap turun X%, waktu checkout turun Y detik) — juri menyukai evidence, sekecil apa pun.

---

## 1. Konteks Lomba (fakta terverifikasi)

| Item | Detail |
|---|---|
| Nama | Sea x OpenAI Regional Codex Hackathon — Indonesia |
| Tanggal / tempat | Sabtu, 7 Nov 2026, 07.30–20.30 WIB, Shopee Indonesia HQ Jakarta |
| Tim | 3–4 orang, semua wajib hadir seluruh sesi |
| Tema besar | **"Solving Unmet Needs with AI"** |
| 3 pilar | Autonomous & Adaptive AI · AI-Native Products & Operations · Deep Domain AI (boleh lintas pilar) |
| Hadiah | 1st US$30k · 2nd US$15k · 3rd US$5k (OpenAI API credits) + ChatGPT Pro 1 tahun untuk anggota Top-5 |
| Aturan kunci | **Project must use Codex.** Tidak boleh bawa kode/desain/solusi lama. Presentasi dalam **bahasa Inggris**. |
| Kriteria resmi (FAQ 10) | *"problem framing, quality of build, depth of thinking, and how effectively Codex was leveraged"* |
| Kriteria tambahan (laporan juri SG) | insight & originality, real-world value, alignment ke pilar; juri menggali latency, privasi, dan roadmap |
| Kontak | sea-openai-idhackathon@sea.com |

**Agenda hari-H (resmi):**

```
07.30 Doors open          12.00 Working lunch
08.00 Breakfast           16.30 CODE FREEZE & submission
08.30 Opening             16.45 Round 1 — present to judges in rotation
09.00 Technical sharing   18.30 Top-5 announced
      & rules briefing    18.40 Final round presentations
09.30 HACKING STARTS      20.00 Awards
                          20.30 End
```

**Benchmark edisi Singapura (6 Jun 2026, 1.200+ pendaftar, 40 tim):**

| Juara | Tim | Produk | Kenapa menang |
|---|---|---|---|
| 1 | Untitled.ai | **Evoloop** — game AI yang berevolusi saat bermain | **White-box**: dev bisa lihat perubahan kode yang dibuat AI; generalizable ke domain lain |
| 2 | TripCanvas | Itinerary dari Reels/TikTok + booking & bayar | End-to-end, agentic, konkret |
| 3 | Techbros | Co-host AI live selling yang **belajar** dari jawaban host | Relevan Shopee, adaptif, "retains & reuses" |

Pola: **adaptif + explainable + real-world value + relevan ekosistem Sea.** Ally secara natural ada di kuadran ini.

Sumber: luma.com/kv0kks2a · seaxopenai-hackathon-id.sea.com · sea.com/news/407 · businesstimes.com.sg (AI innovation inaugural Sea OpenAI hackathon).

---

## 2. Ally masuk tema mana?

### Jawaban: **Autonomous & Adaptive AI** (primer), dengan **AI-Native Products & Operations** (sekunder)

**Kenapa Autonomous & Adaptive AI (primer):**
- Definisi pilar: *"agents that can be trusted to operate without constant human oversight — handling the unexpected and staying reliable when real-world conditions change."*
- Ally **persis** itu: agen yang memantau sinyal interaksi, mendeteksi friksi yang tidak terduga (tremor, salah tap, bingung), dan mengubah UI **tanpa user harus mengonfigurasi apa pun** — tapi tetap **reliable** karena output dibatasi schema (bukan HTML liar) dan ada guardrail.
- Elemen "stay reliable when conditions change" → kondisi user berubah (lelah, tremor memburuk, pakai HP di angkot) → UI ikut berubah.
- Elemen "human in control" → user selalu bisa *undo* / *tolak* adaptasi; merchant bisa set policy.

**Kenapa AI-Native Products (sekunder):**
- Accessibility selama ini = "add-on" (menu settings, overlay widget). Ally membuat accessibility menjadi **sifat bawaan produk** yang digerakkan AI. Ini argumen "AI shapes the product fundamentally" yang kuat untuk satu kalimat di pitch.

**Kenapa BUKAN Deep Domain AI:**
- Deep Domain = pemahaman mendalam satu bidang kerja (misal: hukum pajak, logistik gudang). Ally lebih ke *horizontal infra*. Kalau dipaksa klaim Deep Domain, juri akan tanya "apa domain expertise-nya?" dan kamu akan kalah dari tim yang benar-benar deep.

**Kalimat untuk pitch:** *"Ally sits in Autonomous & Adaptive AI: an agent that watches how a person actually struggles with an interface and reshapes it — reliably, within guardrails — without the user ever opening a settings menu. It also makes accessibility AI-native: not a widget bolted on, but a property of the product itself."*

---

## 3. Evaluasi Jujur: Seberapa Standout?

### Skor awal submission (versi Gemini) — sebelum perbaikan

| Kriteria | Skor (1–5) | Catatan |
|---|---|---|
| Problem framing | 4 | Masalah nyata, stakeholder jelas. Kurang angka & kurang "kenapa sekarang". |
| Quality of build (potensi) | 3 | 3 mode (motor/kognitif/visual) scope-nya pas untuk 7 jam. Tapi risiko terlihat seperti "toggle theme" kalau deteksinya lemah. |
| Depth of thinking | 3 | Hybrid rule+LLM dan JSON-declarative = bagus. Belum ada: explainability, privacy design, evaluasi, failure mode, roadmap. |
| Codex leverage | **1** | Menyebut **Gemini**. Fatal di Codex Hackathon. |
| Originality | 3 | "Adaptive UI for elderly" sudah ada di paper. Yang baru: behavior-inferred + LLM-planned + schema-constrained. Harus ditonjolkan. |
| Relevansi Sea/Shopee | 5 | Checkout e-commerce di kantor Shopee. Sangat relevan. |

**Total estimasi: ~medium.** Lolos Top-10 mungkin, Top-5 belum pasti.

### Kekuatan (pertahankan)
- Masalah **manusiawi & relatable** — setiap juri punya orang tua/kakek-nenek yang susah pakai HP. Ini emosi yang bisa dipakai di opening.
- Hybrid rule-based + LLM structured JSON → **predictable, aman, murah**. Ini arsitektur yang "dewasa", bukan vibe-coded.
- Sangat cocok dengan DNA Shopee (checkout, conversion, lansia = segmen pertumbuhan).

### Kelemahan (harus diperbaiki)
1. **Gemini → OpenAI.** Non-negotiable.
2. **Terlihat seperti "3 tema yang di-switch"** — juri akan bilang "ini cuma CSS class toggle". Harus tunjukkan: deteksi *real-time* dari perilaku, keputusan *granular* (bukan 3 mode kaku, tapi kombinasi token), dan *penjelasan*.
3. **Tidak ada "white-box".** Pemenang SG menang karena transparan. Ally butuh panel "Why did Ally change this?" + log keputusan.
4. **Tidak ada evaluasi.** Tambahkan mini-benchmark: simulasi 20 sesi tremor → ukur mis-tap sebelum/sesudah.
5. **Privasi tidak dijelaskan.** Juri SG menggali ini. Harus jelas: sinyal yang dikirim ke LLM hanya **agregat/event-level** (counter, durasi, ukuran target), bukan screen recording, bukan PII, bukan keystroke.
6. **Bentuk produk kabur.** "Prototype checkout" bukan produk. Harus jelas: ini **SDK**.
7. **Nama belum dibunyikan.** "Ally = a11y" adalah hook yang bagus dan gratis.

### Setelah perbaikan (target)

| Kriteria | Target | Cara |
|---|---|---|
| Problem framing | 5 | Data (bagian 4) + story 20 detik + "why now" (EAA 2025, lansia RI 12%, WebAIM makin buruk) |
| Quality of build | 4–5 | Demo live, SDK terpisah dari demo app, adaptasi <1 detik, no crash, undo works |
| Depth of thinking | 5 | White-box panel, privacy by design, guardrails, evaluation harness, roadmap |
| Codex leverage | 5 | Tunjukkan workflow Codex: AGENTS.md, task decomposition, Codex menulis test & evaluation harness, Codex cloud parallel tasks |
| Originality | 4 | Posisi: "not an overlay, not a settings menu — ability-based design, inferred from behavior, constrained by schema" |

**Potensi realistis setelah perbaikan: Top-5 sangat mungkin; Top-3 tergantung eksekusi demo & pitch.** Kompetitor terberatmu akan tim yang bikin agent otomatis untuk seller Shopee (live selling, ops, logistik). Senjatamu: emosi + data + white-box + relevansi checkout.

---

## 4. Kenapa Ally adalah solusi masalah nyata — dengan data

### 4.1 Skala populasi yang terdampak

| Fakta | Angka | Sumber |
|---|---|---|
| Penyandang disabilitas global | **1,3 miliar (16%, 1 dari 6 orang)** | WHO Disability fact sheet |
| Lansia 60+ global | 1,0 M (2020) → **1,4 M (2030)** → **2,1 M (2050)** | WHO Ageing fact sheet |
| Kondisi umum lansia yang memengaruhi UI | gangguan pendengaran, katarak/refraksi, osteoartritis, demensia | WHO Ageing |
| **Lansia Indonesia (60+)** | **11,97% ≈ 34 juta jiwa** (SUPAS 2025) — Indonesia resmi *aging population* | BPS via geriatri.co.id; bps.go.id Statistik Lansia 2025 |
| Lansia Indonesia yang online (60–78 th) | **59,40%** (APJII 2025; nasional 80,66%, 229 juta user) | APJII 2025 via kontan.co.id |
| Pre-boomer 79+ online | 20,88% | APJII 2025 |
| Penyandang disabilitas Indonesia | ≈22,97 juta (8,5%) Susenas 2020 `[unverified — cek BPS]` | — |
| Ekonomi digital SEA | GMV **US$263 M (+15% YoY)**, e-commerce +15% | Google-Temasek-Bain e-Conomy SEA 2024 |

**Kalimat pitch:** *"Indonesia has 34 million people over 60. Six in ten of them are already online. That's roughly 20 million users on interfaces that were never designed for their hands or their eyes."*

### 4.2 Web/e-commerce saat ini *tidak* accessible — dan makin buruk

| Fakta | Angka | Sumber |
|---|---|---|
| Homepage top-1M dengan WCAG failure | **95,9%** (2026), rata-rata **56,1 error/halaman (+10,1% YoY)** | WebAIM Million 2026 |
| Low contrast | 83,9% halaman | WebAIM 2026 |
| Form input tanpa label | 33,1% | WebAIM 2026 |
| **Kategori Shopping = terburuk** | 71,0 error/halaman (+26,6% vs rata-rata) | WebAIM 2026 |
| **Halaman berbahasa Indonesia** | **72,5 error (+29,2% vs rata-rata)** | WebAIM 2026 |
| Shopify / WooCommerce / Magento | +33,9% / +48,4% / +67,5% error | WebAIM 2025/2026 |
| Penyebab regresi 2026 (menurut WebAIM) | sebagian dari "vibe coding" / AI-assisted dev | WebAIM 2026 |

**Insight tajam untuk juri:** *"AI-assisted coding is making the web LESS accessible — WebAIM's 2026 report shows the first regression in years. Ally uses AI to reverse that: instead of generating inaccessible UI, it adapts UI to the person."* (Ini twist yang bagus di hackathon AI coding.)

### 4.3 Friksi checkout = uang hilang

| Fakta | Angka | Sumber |
|---|---|---|
| Rata-rata cart abandonment | **70,22%** | Baymard (50 studi, 2025) |
| Abandon karena checkout "too long/complicated" | **17%** | Baymard |
| Abandon karena site error/crash | 17% | Baymard |
| Abandon karena wajib buat akun | 18% | Baymard |
| Field checkout ideal vs rata-rata US | 12–14 elemen vs **23,48** | Baymard |
| Uplift konversi dari desain checkout lebih baik | **35,26%**; US$260 M recoverable (US+EU) | Baymard |
| UK "Click-Away Pound": user disabilitas yang pergi karena barrier | **£17,1 miliar** hilang (2019) | clickawaypound.com |
| Gugatan ADA web (US) | **4.928 kasus di 2025**; retail/e-commerce #1 | UsableNet tracker |
| Defendants yang **sedang pakai overlay widget** tetap digugat | 91 di Sept 2026 saja | UsableNet |
| FTC denda accessiBe atas klaim "auto-compliance" | US$1 juta (Jan 2025) | UsableNet `[FTC URL unverified]` |

### 4.4 Standar touch target (dasar teknis adaptasi Ally)

| Standar | Ukuran | Sumber |
|---|---|---|
| WCAG 2.2 SC 2.5.8 (AA) | **≥24×24 CSS px** — eksplisit untuk "hand tremors, spasticity" | w3.org WCAG22 |
| WCAG 2.5.5 (AAA) | **≥44×44 px**, lebih besar jika aksi *irreversible* atau *sequential* (= checkout!) | w3.org |
| Android/Material | 48×48 dp, spacing ≥8 dp, fisik 7–10 mm | support.google.com |
| Apple HIG | 44×44 pt `[unverified by fetch]` | developer.apple.com |

**Catatan penting:** WCAG 2.5.8 Understanding doc *merekomendasikan agar user bisa mengubah layout density* — Ally mengotomasi rekomendasi W3C ini.

### 4.5 Regulasi ("why now")

- **EU European Accessibility Act** — berlaku penuh **28 Juni 2025**, eksplisit mencakup **e-commerce**. Setiap merchant/platform yang jual ke EU wajib comply.
- **Indonesia UU No. 8/2016** tentang Penyandang Disabilitas (hak aksesibilitas informasi & komunikasi).
- **PP 70/2019** — perencanaan & penyelenggaraan hak penyandang disabilitas, termasuk TIK `[unverified text]`.
- Kesimpulan: tekanan hukum naik, tapi solusi yang ada (overlay) **terbukti tidak melindungi** dari gugatan.

### 4.6 Fondasi akademik

- **Wobbrock et al., "Ability-Based Design" (ACM TACCESS 2011)** — prinsip: sistem harus beradaptasi ke kemampuan user, *sensing performance at runtime*. Ini **landasan teoretis langsung** Ally. Sebut nama ini ke juri = instant credibility.
- Studi mis-tap lansia: Kobayashi et al. 2011 (INTERACT), Hourcade & Berkel 2008 `[unverified — cek sebelum dikutip]`.

---

## 5. Project serupa & posisi Ally

| Produk | Apa | Model bisnis | Kelemahan (evidence) | Posisi Ally |
|---|---|---|---|---|
| **accessiBe / UserWay / AudioEye** | Overlay widget JS: toggle font/kontras + "auto-repair" DOM | SaaS per-site | **Overlay Fact Sheet** (ditandatangani editor WCAG, staf a11y Google/MS/Apple): redundan dgn OS, auto-repair tidak reliable, rusak di React/Vue, **tidak bisa capai compliance**, risiko privasi. 67% praktisi WebAIM: "tidak efektif". Masih digugat. FTC denda $1M. | **"Ally is NOT an overlay."** Ally tidak menyentuh DOM orang lain; ia mengubah *props & design token* komponen merchant sendiri lewat SDK. Tidak klaim compliance. |
| **Apple Assistive Access (iOS 17)** | Mode OS yang "menyuling" app: tombol besar, kontras tinggi, grid | Gratis, OS | Hanya app Apple; **statis**, di-setup caregiver, tidak behavior-driven | Ally bekerja di *web app mana pun* via SDK & adaptasi *inferred* dari perilaku |
| **Android Accessibility Scanner / Material 48dp** | Lint & guideline dev-time | Gratis | Hanya saat development | Ally runtime |
| **Vercel AI SDK Generative UI** | LLM tool-call → React component | OSS | Chat-centric; generate UI baru, bukan adaptasi checkout existing | Ally adaptasi *existing* komponen, schema-constrained |
| **Evinced / Stark / axe DevTools** | Audit otomatis | Dev SaaS | Menemukan masalah, tidak memperbaiki untuk user `[unverified]` | Komplementer |
| **ChatGPT "Intelligent UI" (GPT-6, Okt 2026)** | Jawaban chat jadi widget interaktif | — | Generatif untuk chat, bukan adaptasi aksesibilitas | Tren mendukung narasi "UI should respond to the person" |
| Shopee/Tokopedia "mode lansia" | — | — | **Tidak ditemukan bukti ada** | Peluang: *"Shopee has no elderly mode. Ally could be it."* |

**Kalimat pembeda (hafalkan):**
> *"Existing tools are either static toggles the user must discover, or overlays the accessibility community has publicly rejected. Ally is different in three ways: it infers need from behavior, it adapts the merchant's own components through a schema — never arbitrary HTML — and every change is explainable and reversible."*

---

## 6. Bentuk produk: Extension vs Web vs SDK vs Mobile

### Perbandingan

| Bentuk | Dampak riil | Feasible 7 jam | Demo-ability | Business model | Risiko |
|---|---|---|---|---|---|
| **SDK / React library** (`@ally/react`) | **Tinggi** — merchant pasang 10 baris, semua user terbantu | **Ya** | Bagus (demo app + SDK terpisah) | B2B SaaS per MAU / usage | Harus bikin demo app sendiri |
| Browser extension | Sedang — user harus install & tahu dia butuh (friksi yang mau kita hilangkan!) | Ya, tapi setengah waktu habis di manifest/CSP | Rapuh (DOM asing) | B2C sulit | Jadi "overlay" yang dikritik |
| Web app standalone | Rendah — "another checkout" | Ya | OK | Tidak ada | Juri: "siapa yang pakai ini?" |
| Mobile app (RN/Flutter) | Tinggi jangka panjang | **Tidak** (build, emulator, signing) | Sulit di-screen share | — | Waktu habis |
| Mobile SDK | Tinggi | Tidak | — | — | — |

### Keputusan: **SDK-first, demo-second**

**Ally = 3 lapis:**

```
┌──────────────────────────────────────────────────────────┐
│ 1. @ally/react  (SDK)                                    │
│    <AllyProvider>  +  useAlly()  +  design tokens        │
│    - Sensor: mis-tap, rage-click, hesitation, zoom,     │
│      backtrack, scroll thrash, form error loops         │
│    - Local rule layer (deterministic, <5 ms)            │
│    - Applies AdaptationPlan (tokens + layout props)     │
│    - Undo / "Why?" panel / user override                │
├──────────────────────────────────────────────────────────┤
│ 2. Ally Decision Engine  (Next.js API route)            │
│    - Receives anonymized FrictionSummary                │
│    - OpenAI Structured Outputs → AdaptationPlan JSON    │
│    - Guardrails: schema validation + policy limits      │
│    - Explanation string (white-box)                     │
├──────────────────────────────────────────────────────────┤
│ 3. Demo: "Toko Ally" checkout (Next.js)                 │
│    - Realistic 3-step checkout (cart → address → pay)   │
│    - Friction Simulator (tremor / low-vision / fatigue) │
│    - Judge Dashboard: live signals, decisions, metrics  │
└──────────────────────────────────────────────────────────┘
```

**Kenapa ini "bener-bener solve problem riil":** user lansia **tidak perlu tahu Ally ada**. Tidak install, tidak setting. Merchant yang pasang. Ini membalik beban: dari user yang paling lemah → ke platform yang paling mampu. Dan untuk Shopee: 1 integrasi = puluhan juta user.

**Pitch line:** *"We ship Ally as an SDK, not an extension — because the person who needs it most is the person least able to find and install it."*

---

## 7. Ide Final Ally (versi disempurnakan)

### 7.1 One-liner
**Ally** — an adaptive UI engine that senses interaction friction and reshapes the interface for the person in front of it. *a11y, as an ally.*

### 7.2 Perubahan dari submission awal

| Aspek | Awal | Final | Alasan |
|---|---|---|---|
| AI engine | Google Gemini | **OpenAI (gpt-4o-mini / gpt-5-mini) Structured Outputs**, dibangun dengan **Codex** | Aturan lomba + kriteria |
| Mode | 3 mode kaku | **Continuous adaptation**: AI mengeluarkan *AdaptationPlan* = kombinasi token (targetSize, spacing, fontScale, contrast, density, stepMode, assist). 3 "mode" tetap ada sebagai **preset nama** untuk komunikasi | Terlihat lebih cerdas; bukan toggle |
| Explainability | — | **"Why?" panel** + decision log (white-box) | Pemenang SG; kepercayaan |
| Privacy | "privacy-conscious" (kata saja) | **Privacy by design**: hanya counter/durasi/ukuran target yang dikirim; no PII, no screen, no text input; on-device rule layer; LLM dipanggil hanya saat rule layer bilang "ambiguous" | Juri menggali ini |
| Kontrol user | — | **Toast "Ally made buttons bigger. Keep / Undo"** + persist preferensi | Human-in-control (pilar 1) |
| Evaluasi | — | **Evaluation harness**: simulator friksi + metrik (mis-tap rate, time-to-complete, error loops) sebelum/sesudah | Evidence |
| Bentuk | Prototype | **SDK + engine + demo + dashboard** | Dampak & bisnis |
| Merchant control | — | **Policy config**: batas maksimum adaptasi, komponen yang dikunci (harga, legal text) | Reliability |
| Voice fallback (stretch) | — | OpenAI Realtime API: "Mau saya bantu isi alamat?" jika friksi ekstrem | Wow factor, hanya jika waktu ada |

### 7.3 Sinyal friksi yang dipantau (semua lokal, agregat)

| Sinyal | Definisi | Indikasi |
|---|---|---|
| `missTap` | pointerdown dalam 24px dari target tapi di luar hit area, atau tap di area kosong dekat tombol | Motor |
| `rageClick` | ≥3 klik dalam 1 detik di elemen yang sama | Frustrasi / tidak responsif |
| `hesitation` | fokus pada field >8 detik tanpa input | Kognitif |
| `backtrack` | kembali ke step sebelumnya ≥2x | Kognitif / bingung |
| `zoomEvent` | pinch-zoom / ctrl+ browser | Visual |
| `errorLoop` | validasi error yang sama ≥2x | Kognitif / visual |
| `scrollThrash` | scroll bolak-balik cepat | Mencari / bingung |
| `slowTargeting` | waktu pointer hover→click >1,5 detik pada tombol kecil | Motor / visual |

### 7.4 Arsitektur keputusan (hybrid)

```
events ──▶ Sensor (SDK) ──▶ FrictionSummary (windowed, 10s)
                                   │
                        ┌──────────▼──────────┐
                        │  Rule Layer (local) │  deterministic, instant
                        │  score motor/vis/cog│
                        └──────────┬──────────┘
               confident? ─────────┤
              yes │                │ ambiguous / multi-factor
                  ▼                ▼
        apply preset         OpenAI Structured Outputs
        (no network)         → AdaptationPlan JSON + explanation
                                   │
                        ┌──────────▼──────────┐
                        │ Guardrails          │ schema validate, clamp,
                        │ (policy limits)     │ locked components
                        └──────────┬──────────┘
                                   ▼
                       Apply tokens + layout props
                       Toast: "Keep / Undo"  +  "Why?" panel
                                   ▼
                       Outcome tracking → next window
```

**AdaptationPlan schema (contoh — ini yang dihasilkan OpenAI, strict JSON):**

```json
{
  "profile": { "motor": 0.8, "visual": 0.3, "cognitive": 0.5 },
  "tokens": {
    "targetMinSize": 56,
    "spacingScale": 1.5,
    "fontScale": 1.25,
    "contrast": "high",
    "density": "comfortable"
  },
  "layout": {
    "stepMode": "one-per-screen",
    "hideNonEssential": ["promoBanner", "recommendations"],
    "primaryActionSticky": true,
    "confirmDestructive": true
  },
  "assist": { "inlineHints": true, "voiceOffer": false },
  "confidence": 0.82,
  "explanation": "Three mis-taps near 'Continue' within 10s and slow targeting suggest motor difficulty. Enlarged targets to 56px, increased spacing, and made the primary action sticky.",
  "ttlSeconds": 120
}
```

Gunakan `response_format: { type: "json_schema", strict: true }` — OpenAI menjamin kepatuhan schema. Ini poin teknis yang harus kamu sebut: **"the model cannot emit anything our renderer doesn't understand."**

### 7.5 Tech stack final

- **Codex** (CLI + IDE + cloud tasks) — alat utama. Dokumentasikan penggunaannya (lihat 9.4).
- Next.js 15 (App Router), React, TypeScript, Tailwind + CSS variables (design tokens)
- `@ally/react` sebagai workspace package (monorepo pnpm/turbo sederhana — atau folder `packages/ally` biasa)
- OpenAI SDK: `gpt-4o-mini` atau `gpt-5-mini` (murah, cepat, structured outputs). Biaya per keputusan: <0,01 sen.
- Stretch: OpenAI Realtime API (WebRTC) untuk voice assist.
- Evaluasi: script Playwright/Node yang mensimulasikan tremor (jitter pointer ±12px, 15% mis-tap) & low-vision (zoom events) → output tabel metrik.
- Deploy: Vercel (kalau diizinkan) atau localhost + ngrok untuk demo HP.

### 7.6 MVP scope 7 jam (prioritas)

**P0 (wajib, 09.30–14.00):**
1. Checkout 3 step realistis (cart → alamat → bayar) — token-driven styling.
2. SDK sensor: missTap, rageClick, hesitation, errorLoop.
3. Rule layer → 3 preset (motor / visual / cognitive).
4. "Keep / Undo" toast + "Why?" panel.
5. Friction Simulator (tombol: Tremor / Low vision / Fatigue) untuk demo deterministik.

**P1 (14.00–15.30):**
6. OpenAI Structured Outputs engine → AdaptationPlan + explanation.
7. Guardrails + merchant policy JSON.
8. Judge Dashboard: live signal stream, decision log, before/after metrics.

**P2 (15.30–16.15, jika aman):**
9. Evaluation harness + tabel hasil (masukkan ke slide).
10. Voice assist via Realtime API (hanya jika P0–P1 100% stabil).

**16.15–16.30: freeze, record backup video demo, submit.**

---

## 8. Pembagian Tim (4 orang)

| Role | Nama kode | Tanggung jawab di hari-H | Pre-hackathon (boleh: riset/latihan, bukan kode) |
|---|---|---|---|
| **A — Lead / Pitch / Engine** | "Captain" | Arsitektur, AdaptationPlan schema, OpenAI engine + guardrails, integrasi akhir, **presenter utama** | Latihan pitch English 10x; kuasai data bab 4; siapkan prompt plan Codex; baca docs Structured Outputs |
| **B — SDK Engineer** | "Sensor" | `@ally/react`: sensor events, rule layer, token applier, undo/why panel | Pelajari pointer events, Fitts, WCAG 2.5.8; latihan Codex bikin library + unit test |
| **C — Product/Frontend** | "Checkout" | Demo checkout app, komponen token-aware, Friction Simulator, Judge Dashboard, UI polish, **co-presenter demo** | Sketsa wireframe di kepala (jangan simpan desain file!); latihan Tailwind tokens; kuasai demo flow |
| **D — Eval / Codex Ops / Story** | "Proof" | Evaluation harness (Playwright/Node), metrik before/after, **mencatat Codex usage** (screenshot, AGENTS.md, task log), slide deck, backup video, Q&A prep | Baca Overlay Fact Sheet, Baymard, WebAIM; siapkan slide outline di kepala; siapkan Q&A bank (bab 11) |

**Kalau cuma 3 orang:** gabungkan C + D; A ambil dashboard.

**Aturan tim:**
- **Integrasi tiap 90 menit** (11.00 / 12.30 / 14.00 / 15.30). Branch kecil, merge sering.
- Jam **14.00 = "demo-able checkpoint"**: apa pun yang ada harus bisa didemokan end-to-end. Setelah itu hanya tambah, jangan refactor.
- Jam **15.45 = feature freeze**. 15.45–16.30: bug fix, rekam video backup, latihan pitch 2x.
- Satu orang (D) **tidak boleh** nge-code fitur baru setelah 15.00 — fokus proof + slide.

---

## 9. Run-of-Day & Strategi Codex

### 9.1 Timeline tim

| Waktu | Aksi |
|---|---|
| 07.30–08.30 | Datang, setup laptop, cek wifi, Codex login, buat repo kosong, pnpm cache hangat (install dependensi *boilerplate* biasanya diizinkan — tanyakan saat briefing 09.00) |
| 09.00–09.30 | **Dengarkan briefing baik-baik** — "more context will be shared on the day". Kalau ada twist/tema tambahan, adaptasi. Tanya: boleh scaffold `create-next-app`? boleh pakai Vercel? |
| 09.30–09.45 | Captain tulis `AGENTS.md` + `PLAN.md` (arsitektur, schema, task list) — ini juga bukti "Codex leverage" |
| 09.45–11.00 | Parallel: B sensor+rules · C checkout+tokens · A engine+schema · D eval harness skeleton + slide skeleton |
| 11.00 | Integrasi #1: checkout memakai tokens dari SDK |
| 12.00–12.30 | Lunch sambil kerja (bergantian) |
| 12.30 | Integrasi #2: simulator → sensor → rule → preset applied |
| 14.00 | **Demo-able checkpoint**. Rekam video kasar. |
| 14.00–15.30 | OpenAI engine, guardrails, Why panel, dashboard |
| 15.30 | Integrasi #3. Eval run → angka masuk slide |
| 15.45 | Feature freeze. Rekam video backup final. |
| 16.00–16.30 | Pitch rehearsal 2x (English, timer), submit |
| 16.45–18.30 | Round 1 rotasi: **semua** anggota bicara minimal satu kalimat; laptop + HP (ngrok) siap |
| 18.40 | Final (jika Top-5): versi pitch lebih tajam + demo paling aman |

### 9.2 Cara "leverage Codex" supaya dinilai tinggi

Juri ingin lihat **cara kerja AI-native**, bukan sekadar "kami pakai Codex buat autocomplete". Lakukan dan **dokumentasikan**:

1. **`AGENTS.md` di root** — konvensi, arsitektur, schema, aturan a11y (WCAG target ≥44px), cara test. Codex membacanya otomatis. Tunjukkan file ini ke juri.
2. **Task decomposition** — satu task Codex = satu unit (misal "implement missTap sensor with unit tests"). Jalankan paralel di Codex cloud/CLI untuk B, C, D sekaligus.
3. **Codex menulis test & evaluation harness** — ini memperlihatkan "quality of build".
4. **Codex melakukan a11y self-review** — prompt: "audit all interactive elements against WCAG 2.5.8 and 1.4.3, fix violations". Simpan diff-nya.
5. **Codex menghasilkan sample AdaptationPlan + schema dari spesifikasi** — tunjukkan iterasinya.
6. **Log**: D menyimpan screenshot/transkrip 5–6 momen Codex paling berdampak ("Codex refactored token system in 4 minutes", "Codex found a race in undo"). Satu slide "How we built it with Codex".
7. **Kalimat untuk juri**: *"Codex wasn't our autocomplete — it was our fourth engineer. We wrote AGENTS.md first, split work into parallel Codex tasks, and had Codex write the evaluation harness that produced the numbers you just saw."*

### 9.3 Prompt plan (hafalkan polanya, jangan simpan kodenya)

- *"Scaffold a Next.js 15 + TypeScript + Tailwind monorepo with `apps/demo` and `packages/ally-react`. Use CSS variables as design tokens: --ally-target, --ally-space, --ally-font, --ally-contrast."*
- *"In packages/ally-react, implement `AllyProvider` that attaches global pointer listeners and computes a windowed FrictionSummary {missTap, rageClick, hesitation, errorLoop, slowTargeting} every 10s. Include unit tests with vitest."*
- *"Implement a deterministic rule layer mapping FrictionSummary → preset ('motor'|'visual'|'cognitive'|null) with confidence. Export `useAlly()` returning {plan, undo, explanation}."*
- *"Create an API route /api/ally/plan that calls OpenAI with strict JSON schema AdaptationPlan (schema attached). Validate with zod. Clamp tokens to policy limits."*
- *"Build a 3-step checkout (cart, address, payment) where every interactive element reads tokens from CSS variables. Add a FrictionSimulator panel with buttons: Tremor, Low Vision, Fatigue that synthesize pointer events."*
- *"Write a Playwright script that runs 20 simulated tremor sessions with and without Ally and reports mis-tap rate and time-to-complete as a markdown table."*

### 9.4 Demo flow (90 detik, deterministik)

1. Buka checkout normal di **HP** (ngrok) + layar laptop menampilkan Judge Dashboard.
2. Presenter C "berpura-pura lansia": tap meleset 3x di tombol "Lanjut" (atau tekan simulator Tremor).
3. Dashboard: sinyal masuk → rule layer skor motor 0.8 → (opsional) panggil OpenAI → AdaptationPlan.
4. **UI berubah live** (<1 detik): tombol 56px, spacing lebar, sticky CTA. Toast: *"Ally made buttons bigger. Keep / Undo."*
5. Klik **"Why?"** → explanation dari model, dalam bahasa manusia.
6. Tekan **Undo** → kembali. Tunjukkan kontrol di tangan user.
7. Tekan simulator **Low vision** → font & kontras naik, hierarchy disederhanakan.
8. Tunjukkan **tabel eval**: mis-tap rate 23% → 4%, time-to-complete 84s → 51s *(contoh — isi dengan hasil nyata hari-H)*.
9. Tutup: *"Ten lines of code for the merchant. Zero settings for grandma."*

**Backup:** video 60 detik yang direkam 15.45. Kalau wifi/OpenAI mati → rule layer tetap jalan tanpa network (fitur, bukan bug: *"graceful degradation"*).

---

## 10. Pitch Script (English) — 3 menit

> Sesuaikan durasi dengan aturan hari-H (tidak dipublikasi; siapkan versi 2, 3, dan 5 menit). Yang di bawah ini versi 3 menit. **[C]** = co-presenter.

**[0:00–0:20] Hook**
> "My grandmother bought a phone last year. She can video-call us. But she has never once completed a checkout — not because she doesn't want to, but because the 'Continue' button is 36 pixels wide and her hands shake.
> She is one of **34 million Indonesians over 60**. Six in ten of them are already online. The interface is the only thing standing between them and the digital economy."

**[0:20–0:50] Problem + why now**
> "Today, 96% of the top million websites fail basic accessibility checks — and shopping sites are the worst category. Indonesian-language pages score 29% worse than average. And here's the uncomfortable part for this room: WebAIM's 2026 report shows accessibility got *worse* this year, partly because of AI-assisted coding.
> The existing answers don't work. Settings menus require the user to know what they need. Overlay widgets have been publicly rejected by the accessibility community — and companies using them are still getting sued. The EU Accessibility Act has been enforceable since June 2025. Seventy percent of carts are abandoned; one in six of those because checkout is too complicated."

**[0:50–1:10] Solution**
> "Ally — spelled like 'ally', pronounced like 'a-eleven-y', the shorthand for accessibility — is an adaptive UI engine. It watches *how* a person struggles — mis-taps, rage clicks, hesitation, error loops — and reshapes the interface for that person, in under a second, without a single settings menu.
> It ships as an SDK. Ten lines for the merchant. Zero configuration for grandma."

**[1:10–2:20] Demo** *(lihat 9.4; C mengoperasikan, A narasi)*
> "[C] Here's a normal checkout on a phone. I'm going to tap the way someone with a tremor taps… three misses.
> [A] On the dashboard you can see Ally's sensor pick that up. The local rule layer scores motor difficulty at 0.8 — that runs on-device, no network. For ambiguous cases it asks OpenAI, using strict Structured Outputs, so the model can *only* return a plan our renderer understands — never arbitrary HTML.
> [C] And… the UI adapts. Targets are now 56 pixels, spacing is wider, the primary action is sticky.
> [A] The user stays in control: 'Keep' or 'Undo'. And it's white-box — tap 'Why?' and Ally explains its decision in plain language.
> [C] Now low vision… font scales, contrast goes high, distractions are removed.
> [A] We ran twenty simulated tremor sessions with and without Ally: mis-tap rate dropped from X% to Y%, time to complete dropped by Z seconds." *(isi angka nyata)*

**[2:20–2:40] Depth: privacy, reliability, Codex**
> "Privacy by design: Ally sends counters and timings — never screen content, never form text, never identity. Reliability: every plan is schema-validated and clamped by merchant policy; price and legal text are locked. If the API is down, the rule layer still works.
> We built all of this today with Codex as our fourth engineer — AGENTS.md first, parallel tasks, and Codex wrote the evaluation harness that produced those numbers."

**[2:40–3:00] Business + ask**
> "For a platform like Shopee, one integration reaches tens of millions of users and attacks the 17% of abandonment caused by complexity. For users, it's dignity: the interface meets them where they are.
> We're Ally. Accessibility shouldn't be a setting. It should be an ally."

### Versi 60 detik (Round 1 kalau waktunya pendek)
Hook (10s) → "96% sites fail, overlays rejected, EAA live" (10s) → one-liner + SDK (10s) → demo tremor→adapt→why→undo (25s) → privacy+Codex+close (5s).

---

## 11. Q&A Juri — bank pertanyaan & jawaban

### Teknis
**Q: Kenapa perlu LLM? Bukannya rule-based cukup?**
> Rule layer handles the clear cases instantly and offline — that's 70% of traffic. The LLM handles *combinations*: someone who's both low-vision and fatigued, or a pattern our rules didn't anticipate. It produces a *graded* plan, not a preset, plus a human explanation. And it's cheap — fractions of a cent per decision with gpt-4o-mini. The hybrid is the point: deterministic where we can, generative where we must.

**Q: Latency? User tidak mau nunggu.**
> Rule layer: under 5 ms, on-device. LLM path: ~600–900 ms with a small model, and it's *asynchronous* — the UI never blocks; the plan applies when it arrives, with a TTL. We also cache plans per friction signature.

**Q: Bagaimana mencegah model menghasilkan UI yang rusak?**
> Three layers: strict JSON schema at the API (OpenAI guarantees shape), zod validation and clamping on our side (e.g. fontScale ≤ 1.6), and merchant policy that locks components like price and legal text. The model can't emit HTML — only tokens and layout flags our components already understand.

**Q: False positives? Orang yang ga butuh malah diubah UI-nya.**
> Thresholds are conservative, plans carry a confidence score, every change shows a Keep/Undo toast, and Undo is a *strong negative signal* that raises the threshold for that session. Adaptations also expire (TTL) unless reinforced by outcomes.

**Q: Privasi — kalian ngerekam perilaku user?**
> We never send content. The payload is counters and durations: 'three mis-taps near a 36px button, 8s hesitation on field #2'. No text, no screenshots, no identifiers. The rule layer runs entirely client-side. We'd ship a data-flow diagram with the SDK.

**Q: Kenapa SDK dan bukan extension?**
> The person who needs this most is the least able to find and install an extension. Shifting the burden to the platform is the whole idea. Also, extensions become overlays — and overlays break on React apps and have been rejected by the a11y community.

**Q: Bedanya sama accessiBe?**
> accessiBe patches a stranger's DOM and claims compliance; the FTC fined them $1M for that. Ally adapts the merchant's *own* components through tokens, makes no compliance claims, and is driven by behavior, not toggles.

**Q: Ini bisa generalisasi ke luar checkout?**
> Yes — the SDK is domain-agnostic; checkout is where the ROI is most measurable. Next: banking apps, government services (BPJS, Dukcapil), healthcare portals.

**Q: Gimana kalian pakai Codex?**
> (Tunjukkan AGENTS.md + log.) We treated Codex as a teammate: architecture doc first, parallel tasks per package, Codex wrote the sensor unit tests and the Playwright evaluation harness, and ran a WCAG self-audit over our components.

**Q: Bagaimana mengukur keberhasilan?**
> Three metrics: mis-tap rate, task completion rate, time-to-complete — plus Undo rate as a false-positive proxy. Today we measured in simulation; next step is a real study with an elderly user group — e.g. with a panti werdha or Komunitas Lansia.

### Bisnis
**Q: Siapa yang bayar?**
> Platforms and merchants — B2B SaaS, priced per monthly active session. The ROI story is checkout recovery (Baymard: 35% potential uplift from checkout design) plus legal risk reduction under EAA/ADA.

**Q: Kenapa Shopee harus peduli?**
> Indonesia's 60+ population is 12% and growing; they're the fastest-growing online cohort and the least served. One SDK integration touches every category. And it's brand: 'Shopee works for my mother.'

**Q: Apa yang kalian lakukan setelah hackathon?**
> 1) User study with 20 elderly participants. 2) Open-source the SDK core. 3) Pilot with one Indonesian merchant. 4) Add voice assist via the Realtime API.

### Jebakan
**Q: Ini cuma ganti CSS class kan?**
> The *rendering* is deliberately simple — that's what makes it safe. The intelligence is in sensing, inference, explanation, and control. Compare: a thermostat is 'just' a switch, but the value is in knowing when to flip it.

**Q: Kalau usernya tidak suka diubah-ubah?**
> That's why every change is announced, reversible, and persisted as a preference. Ally learns 'this user prefers no changes' just as fast as it learns 'this user needs bigger targets'.

---

## 12. Tips & trik hackathon (yang biasanya tidak diomongin)

### Sebelum hari-H
- **Jangan simpan kode/desain.** Simpan *pemahaman*. Latihan membangun skeleton yang sama 2–3x di rumah lalu **hapus**. Di hari-H kamu akan 3x lebih cepat secara legal.
- Latihan **Codex** sampai hafal: cara bikin AGENTS.md, cara kasih task yang bagus, cara review diff cepat. Pelajari Codex cloud untuk task paralel.
- Siapkan **akun & tooling**: OpenAI API key (jika panitia tidak sediakan), Vercel, ngrok, pnpm. Cek laptop bisa jalanin Playwright (browser download besar — download di rumah; itu bukan "kode project").
- **Latihan pitch English dengan timer** minimal 10x. Rekam diri sendiri. Bahasa Inggris yang *jelas dan pelan* > bahasa Inggris yang cepat.
- Bawa: charger, HDMI/USB-C adapter, HP Android + kabel, power bank, earphone, snack. Hotspot HP sebagai cadangan wifi.
- Tidur cukup. Serius.

### Saat hacking
- **Jam 09.00 briefing**: catat setiap aturan baru. Kalau ada "context" tambahan (misal dataset Shopee / twist), **adaptasi narasi**, jangan ganti produk.
- **Demo-able jam 14.00** adalah hukum. Tim yang kalah biasanya punya fitur keren yang tidak jadi diintegrasi.
- **Fake what you can't build, but say it.** Friction Simulator adalah "fake" yang jujur: jelaskan itu alat uji, bukan sihir.
- Tidak ada **refactor** setelah 14.00. Tidak ada **library baru** setelah 15.00.
- Gunakan **data seed yang bagus** (produk, alamat Indonesia, Rp) — polish murah yang meningkatkan persepsi "quality of build".
- Setiap bug yang dibiarkan = pertanyaan juri yang tidak bisa dijawab. Lebih baik 5 fitur mulus daripada 9 fitur setengah.

### Saat Round 1 (rotasi ke juri)
- Juri lelah & lihat 30 tim. **Mulai dengan demo dalam 20 detik pertama**, bukan slide. Slide hanya untuk data & arsitektur.
- Pegang **HP di tangan juri** kalau boleh — biarkan mereka mis-tap sendiri dan rasakan UI berubah. Ini momen "aha" terkuat.
- Setiap anggota bicara. Juri menilai tim, bukan satu orang.
- Jawab pertanyaan **pendek dulu, detail jika diminta**. "Yes — and here's how…" bukan monolog.
- Kalau tidak tahu: *"We haven't tested that yet; our hypothesis is X, and here's how we'd verify it."* Jauh lebih baik daripada ngarang.

### Saat Final (panggung)
- Versi pitch lebih **tajam, bukan lebih panjang**. Buang 20% kata.
- Video backup siap di tab sebelah. Kalau demo live gagal 1x, langsung switch tanpa minta maaf berlebihan.
- Kontak mata ke juri, bukan ke layar. Satu orang mengoperasikan, satu bicara.
- Tutup dengan kalimat yang bisa diingat: *"Accessibility shouldn't be a setting. It should be an ally."*

### Psikologi juri Sea × OpenAI
- Mereka **engineer & product** (Sea co-founder/CPO hadir di SG). Hargai trade-off teknis yang jujur.
- Mereka ingin lihat **"AI-native culture"** — kutipan David Chen: *"experimenting fast, iterating fast"*. Ceritakan iterasi: "versi pertama rule-only, lalu kami tambah LLM untuk kasus kombinasi, lalu guardrail karena model sempat menghasilkan fontScale 3.0".
- OpenAI ingin lihat **Codex & API dipakai dengan cerdas** (Structured Outputs, mungkin Realtime), bukan sekadar chat completion.
- Shopee ingin lihat **relevansi ke bisnis mereka** tanpa menjilat. Satu kalimat "one integration, tens of millions of users" cukup.

---

## 13. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| OpenAI API down / rate limit | Rule layer bekerja offline; cache plan; video backup |
| Wifi venue jelek | Hotspot HP; demo localhost; ngrok hanya untuk HP |
| Demo HP tidak terhubung | Chrome DevTools device mode + touch emulation sebagai cadangan |
| Terlalu ambisius (voice) | Voice = P2, hanya jika P0–P1 stabil jam 15.30 |
| Juri bilang "cuma CSS" | Jawaban 11-Jebakan + tunjukkan dashboard/decision log |
| Tuduhan pre-built | Commit history dari 09.30, AGENTS.md timestamp, semua di repo baru |
| Presenter grogi English | Latihan 10x, script dicetak, co-presenter siap ambil alih |

---

## 14. Checklist submission (16.30)

- [ ] Repo public/private sesuai aturan, README dengan: one-liner, arsitektur, cara run, **"How we used Codex"** section, screenshot
- [ ] AGENTS.md ada di root
- [ ] Demo URL (Vercel/ngrok) + video backup 60s
- [ ] Slide ≤8: Hook · Problem (data) · Solution · Demo · Architecture · Results · Privacy/Reliability · Codex · Next steps
- [ ] Eval table dengan angka nyata
- [ ] Semua anggota tahu bagian bicaranya

---

## 15. Sumber utama

- Lomba: seaxopenai-hackathon-id.sea.com · luma.com/kv0kks2a (SG) · sea.com/news/395 & /407 · businesstimes.com.sg (Sea-OpenAI hackathon SG) · antaranews.com/berita/5745367 · teknopulse.id
- WHO Disability: who.int/news-room/fact-sheets/detail/disability-and-health
- WHO Ageing: who.int/news-room/fact-sheets/detail/ageing-and-health
- BPS Statistik Lansia 2025: bps.go.id/id/publication/2025/12/12/.../statistik-penduduk-lanjut-usia-2025.html · geriatri.co.id/artikel/3586
- APJII 2025: survei.apjii.or.id · style.kontan.co.id (penetrasi internet 2025)
- WebAIM Million 2025/2026: webaim.org/projects/million
- Baymard cart abandonment: baymard.com/lists/cart-abandonment-rate
- Click-Away Pound: clickawaypound.com
- UsableNet ADA tracker: info.usablenet.com/ada-website-compliance-lawsuit-tracker
- Overlay Fact Sheet: overlayfactsheet.com/en
- WCAG 2.5.8 / 2.5.5: w3.org/WAI/WCAG22/Understanding/target-size-minimum.html · target-size-enhanced.html
- Material touch targets: support.google.com/accessibility/android/answer/7101858
- EAA: commission.europa.eu (european-accessibility-act_en)
- UU 8/2016: peraturan.bpk.go.id/Details/37251
- Wobbrock, Ability-Based Design (TACCESS 2011): faculty.washington.edu/wobbrock/pubs/taccess-11.pdf
- e-Conomy SEA 2024: bain.com/insights/e-conomy-sea-2024
- OpenAI: platform.openai.com/docs/guides/structured-outputs · /realtime · /pricing · developers.openai.com/codex · openai.github.io/openai-agents-python
- Vercel Generative UI: ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

`[unverified]` sebelum dipakai di slide: jumlah disabilitas Indonesia (Susenas), angka e-Conomy khusus Indonesia, URL FTC-accessiBe, teks PP 70/2019, Apple HIG 44pt, studi mis-tap lansia (Kobayashi 2011, Hourcade 2008), keberadaan "mode lansia" Shopee/Tokopedia.
