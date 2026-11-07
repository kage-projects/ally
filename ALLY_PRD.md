# Ally — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | **Ally** — Adaptive UI Engine (*a11y, as an ally*) |
| Version | 0.1 (Hackathon MVP / dry-run) |
| Owner | Team Ally (4) |
| Status | Draft → Build |
| Related | `ALLY_PLAYBOOK.md` (strategi & pitch), `ALLY_BUILD_PLAN.md` (milestone & eksekusi) |

---

## 1. Ringkasan

Ally adalah **SDK React + decision engine** yang mendeteksi friksi interaksi (mis-tap, rage-click, hesitasi, error loop) secara real-time dan **mengubah UI aplikasi host** — ukuran target, spasi, skala font, kontras, kompleksitas layout — untuk orang yang sedang memakainya, tanpa user harus membuka pengaturan apa pun.

Keputusan adaptasi dihasilkan secara **hybrid**: rule layer deterministik di client untuk kasus jelas, dan **OpenAI Structured Outputs** (strict JSON schema) untuk kasus ambigu/multi-faktor. Output model dibatasi schema `AdaptationPlan` yang dipetakan ke **design token & props komponen yang sudah ada** — model tidak pernah menghasilkan HTML.

Setiap adaptasi **dapat dijelaskan** (panel "Why?"), **dapat dibatalkan** (Keep/Undo), dan **dibatasi policy merchant** (guardrails).

Demo MVP: checkout e-commerce 3 langkah ("Toko Ally") dengan Friction Simulator dan Judge Dashboard.

---

## 2. Latar belakang & masalah

Ringkasan (detail + sumber di Playbook bab 4):

- 34 juta lansia di Indonesia (11,97%), ~59% dari usia 60–78 sudah online.
- 95,9% situs top-1M gagal WCAG; kategori *shopping* terburuk; halaman bahasa Indonesia +29% lebih banyak error (WebAIM 2026).
- Cart abandonment 70%; 17% karena checkout terlalu rumit (Baymard).
- Solusi eksisting: (a) menu pengaturan — user harus tahu apa yang ia butuhkan; (b) overlay widget — ditolak komunitas a11y, rapuh di React, tidak melindungi dari gugatan.

**Problem statement:** Antarmuka digital bersifat statis, sementara kemampuan user bersifat dinamis (tremor, lelah, cahaya buruk, kacamata ketinggalan). Beban adaptasi saat ini dibebankan ke user yang paling tidak mampu menanggungnya.

**Hipotesis:** Jika UI beradaptasi *secara otomatis dari perilaku* dengan perubahan yang *terprediksi, dapat dijelaskan, dan dapat dibatalkan*, maka mis-tap dan waktu penyelesaian tugas turun secara signifikan tanpa menurunkan rasa kontrol user.

---

## 3. Tujuan & non-tujuan

### Goals (MVP)
| # | Goal | Ukuran keberhasilan |
|---|---|---|
| G1 | Deteksi friksi motor/visual/kognitif dari sinyal interaksi lokal | ≥4 sinyal terimplementasi; preset terpicu ≤10 detik setelah friksi |
| G2 | Adaptasi UI terjadi live tanpa reload | Perubahan terlihat <1 detik setelah keputusan (rule path) |
| G3 | Keputusan LLM terstruktur & aman | 100% respons lolos schema + clamp; 0 HTML dihasilkan |
| G4 | Human-in-control | Toast Keep/Undo di setiap adaptasi; Undo mengembalikan 100% state |
| G5 | White-box | Setiap plan punya `explanation` yang tampil di panel "Why?" + decision log di dashboard |
| G6 | Evidence | Evaluation harness menghasilkan tabel before/after (mis-tap rate, time-to-complete) |
| G7 | Reusable | Host app memakai Ally hanya lewat `<AllyProvider>` + token CSS; SDK terpisah dari demo |

### Non-goals (MVP)
- Tidak mengklaim kepatuhan WCAG/ADA/EAA.
- Tidak mem-patch DOM aplikasi pihak ketiga (bukan overlay).
- Tidak ada akun/login, pembayaran nyata, atau persistensi server.
- Tidak ada ML training kustom; tidak ada screen recording.
- Mobile native SDK, voice assist (Realtime API) = stretch, bukan komitmen.

---

## 4. Persona

| Persona | Deskripsi | Friksi khas | Adaptasi yang diharapkan |
|---|---|---|---|
| **Bu Sri (68)** | Pensiunan guru, tremor ringan, pakai HP 6" | Tap meleset di tombol kecil, salah tekan link di dekat tombol | Target ≥56px, spasi lebar, konfirmasi aksi destruktif, CTA sticky |
| **Pak Hadi (72)** | Katarak awal, sering lupa kacamata | Zoom berulang, salah baca label, error validasi berulang | Font ×1.25–1.5, kontras tinggi, label eksplisit, hierarki disederhanakan |
| **Rina (34)** | Pekerja, checkout jam 23.00 di KRL, lelah | Hesitasi lama di form, bolak-balik step, scroll thrash | Satu langkah per layar, sembunyikan promo/rekomendasi, hint inline, progress jelas |
| **Merchant/PM (Shopee)** | Ingin naikkan konversi & kurangi risiko legal, tanpa kehilangan kontrol brand | Takut UI "berantakan" oleh AI | Policy: batas token, komponen terkunci, log keputusan |

---

## 5. Lingkup fitur

### 5.1 `@ally/react` — SDK (host-facing)

| ID | Fitur | Prioritas |
|---|---|---|
| SDK-1 | `<AllyProvider config policy onDecision>` membungkus app; menyuntik CSS variables token | P0 |
| SDK-2 | **Sensor** global (pointer, focus, form, scroll, resize/zoom) → `FrictionSummary` per window 10 detik | P0 |
| SDK-3 | **Rule layer** deterministik → `profile {motor, visual, cognitive}` + `preset` + `confidence` | P0 |
| SDK-4 | **Token applier**: tulis `--ally-*` ke `:root`, set `data-ally-*` attributes untuk layout flags | P0 |
| SDK-5 | **Undo/Keep toast** + persist preferensi (localStorage) | P0 |
| SDK-6 | **"Why?" panel** menampilkan `explanation` | P0 |
| SDK-7 | `useAlly()` hook: `{ plan, profile, summary, undo, keep, explanation, status }` | P0 |
| SDK-8 | **Engine client**: kirim `FrictionSummary` ke `/api/ally/plan` saat rule layer ambigu; async, TTL, cache per signature | P1 |
| SDK-9 | **Guardrail client-side**: zod validate + clamp sesuai policy sebelum apply | P1 |
| SDK-10 | **Outcome tracking**: setelah adaptasi, hitung mis-tap/hesitasi lagi → reinforce/decay | P1 |
| SDK-11 | Undo = sinyal negatif kuat → naikkan threshold sesi | P1 |
| SDK-12 | Komponen primitif token-aware: `AllyButton`, `AllyInput`, `AllyStep` (opsional; host boleh pakai token langsung) | P1 |

### 5.2 Decision Engine (server)

| ID | Fitur | Prioritas |
|---|---|---|
| ENG-1 | `POST /api/ally/plan` menerima `FrictionSummary` + `policy` → `AdaptationPlan` | P1 |
| ENG-2 | OpenAI Responses/Chat API dengan `json_schema`, `strict: true` | P1 |
| ENG-3 | Server-side zod validate + clamp + lock komponen | P1 |
| ENG-4 | System prompt dengan prinsip a11y (WCAG 2.5.8/2.5.5, 1.4.3) dan aturan "minimal change" | P1 |
| ENG-5 | Fallback: jika API error/timeout >1500ms → `null` (client pakai rule preset) | P1 |
| ENG-6 | Decision log in-memory (untuk dashboard) | P1 |

### 5.3 Demo app — "Toko Ally" checkout

| ID | Fitur | Prioritas |
|---|---|---|
| APP-1 | Checkout 3 langkah: Keranjang → Alamat → Pembayaran → Sukses; data seed Indonesia (Rp, kota, kurir) | P0 |
| APP-2 | Semua elemen interaktif membaca token (`--ally-target`, `--ally-space`, `--ally-font`, `--ally-contrast`) | P0 |
| APP-3 | Elemen "distraksi" (promo banner, rekomendasi, voucher carousel) yang bisa disembunyikan | P0 |
| APP-4 | **Friction Simulator** panel: tombol *Tremor*, *Low Vision*, *Fatigue*, *Reset* → mensintesis event ke sensor | P0 |
| APP-5 | **Judge Dashboard** (`/dashboard`): live `FrictionSummary`, profile gauge, decision log, before/after metrics | P1 |
| APP-6 | Mode layar: `?ally=off` untuk perbandingan A/B saat demo | P0 |
| APP-7 | Responsif HP (demo via ngrok) | P0 |

### 5.4 Evaluation harness

| ID | Fitur | Prioritas |
|---|---|---|
| EVAL-1 | Script Playwright: N sesi tremor sintetis (jitter ±12px, p(miss)=0.15) menyelesaikan checkout dengan & tanpa Ally | P1 |
| EVAL-2 | Metrik: mis-tap rate, time-to-complete, error loops, completion rate | P1 |
| EVAL-3 | Output `eval/results.md` tabel + JSON | P1 |

### 5.5 Stretch
| ID | Fitur |
|---|---|
| STR-1 | Voice assist via OpenAI Realtime API saat `cognitive ≥0.8` ("Mau saya bantu isi alamat?") |
| STR-2 | Persona preset yang diajarkan dari Undo/Keep history (per device) |
| STR-3 | Merchant policy editor di dashboard |

---

## 6. Spesifikasi data & kontrak

### 6.1 Sinyal (dihitung di client, tidak pernah berisi konten)

```ts
type FrictionSummary = {
  windowMs: number;            // 10000
  viewport: { w: number; h: number; dpr: number };
  inputModality: 'touch' | 'mouse' | 'keyboard' | 'mixed';
  counts: {
    taps: number;
    missTap: number;           // pointerdown ≤24px dari target interaktif tapi di luar hit area
    rageClick: number;         // ≥3 klik pada elemen sama dalam ≤1000ms
    hesitation: number;        // fokus field >8000ms tanpa input
    backtrack: number;         // navigasi ke step sebelumnya
    errorLoop: number;         // error validasi sama ≥2x
    zoomEvent: number;         // pinch / ctrl+wheel / visualViewport.scale>1
    scrollThrash: number;      // ≥4 reversal arah dalam 2000ms
    slowTargeting: number;     // hover→click >1500ms pada target <44px
  };
  timings: { avgTargetSize: number; avgTimeToTarget: number; stepDurations: number[] };
  context: { step: string; priorPreset: Preset | null; undoCount: number };
};
```

**Aturan privasi:** tidak ada `value`, `innerText`, selector unik user, id perangkat, atau koordinat absolut. Hanya counter, durasi, dan ukuran.

### 6.2 Profil & preset (rule layer)

```ts
type Profile = { motor: number; visual: number; cognitive: number }; // 0..1
type Preset = 'motor' | 'visual' | 'cognitive' | 'combined' | null;

// Rule (contoh skor; tune di hari-H):
// motor     = clamp( missTap*0.25 + slowTargeting*0.15 + rageClick*0.1 )
// visual    = clamp( zoomEvent*0.3 + errorLoop*0.15 + (avgTargetSize<32 ? 0.1 : 0) )
// cognitive = clamp( hesitation*0.2 + backtrack*0.25 + scrollThrash*0.1 + errorLoop*0.1 )
// preset: argmax ≥0.6 → single; dua dimensi ≥0.5 → 'combined' (→ minta LLM); else null
// confidence = max - secondMax
```

### 6.3 `AdaptationPlan` (output LLM, strict schema)

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["profile","tokens","layout","assist","confidence","explanation","ttlSeconds"],
  "properties": {
    "profile": { "type":"object","additionalProperties":false,"required":["motor","visual","cognitive"],
      "properties": { "motor":{"type":"number"}, "visual":{"type":"number"}, "cognitive":{"type":"number"} } },
    "tokens": { "type":"object","additionalProperties":false,
      "required":["targetMinSize","spacingScale","fontScale","contrast","density"],
      "properties": {
        "targetMinSize": { "type":"integer" },
        "spacingScale":  { "type":"number" },
        "fontScale":     { "type":"number" },
        "contrast":      { "type":"string","enum":["normal","high"] },
        "density":       { "type":"string","enum":["compact","comfortable","spacious"] } } },
    "layout": { "type":"object","additionalProperties":false,
      "required":["stepMode","hideNonEssential","primaryActionSticky","confirmDestructive"],
      "properties": {
        "stepMode": { "type":"string","enum":["default","one-per-screen"] },
        "hideNonEssential": { "type":"array","items":{"type":"string","enum":["promoBanner","recommendations","voucherCarousel","socialProof"]} },
        "primaryActionSticky": { "type":"boolean" },
        "confirmDestructive": { "type":"boolean" } } },
    "assist": { "type":"object","additionalProperties":false,"required":["inlineHints","voiceOffer"],
      "properties": { "inlineHints":{"type":"boolean"}, "voiceOffer":{"type":"boolean"} } },
    "confidence": { "type":"number" },
    "explanation": { "type":"string" },
    "ttlSeconds": { "type":"integer" }
  }
}
```

### 6.4 Policy (merchant guardrails)

```ts
type AllyPolicy = {
  limits: { targetMinSize: [number, number]; spacingScale: [number, number]; fontScale: [number, number] }; // e.g. [44,72],[1,2],[1,1.6]
  lockedComponents: string[];      // e.g. ['price','legalText','totalAmount']
  allowHide: string[];             // subset of hideNonEssential enum
  llm: { enabled: boolean; model: string; timeoutMs: number };
  thresholds: { apply: number; llm: number };  // confidence to apply preset / to call LLM
};
```

### 6.5 Preset → token mapping (rule path, tanpa LLM)

| Preset | targetMinSize | spacingScale | fontScale | contrast | density | layout |
|---|---|---|---|---|---|---|
| motor | 56 | 1.5 | 1.0 | normal | spacious | sticky CTA, confirmDestructive |
| visual | 48 | 1.25 | 1.35 | high | comfortable | hide promo/recs |
| cognitive | 48 | 1.25 | 1.1 | normal | comfortable | one-per-screen, hide all non-essential, inlineHints |
| default | 44 | 1.0 | 1.0 | normal | compact | — |

### 6.6 API

`POST /api/ally/plan`
- Request: `{ summary: FrictionSummary, profile: Profile, policy: AllyPolicy }`
- Response 200: `{ plan: AdaptationPlan, source: 'llm', latencyMs }`
- Response 204 / 5xx: client fallback ke rule preset
- Timeout server-side: `policy.llm.timeoutMs` (default 1500)

### 6.7 CSS token kontrak (host app)

```css
:root {
  --ally-target: 44px;      /* min-height/min-width elemen interaktif */
  --ally-space: 1;          /* multiplier gap/padding */
  --ally-font: 1;           /* multiplier font-size root */
  --ally-contrast: 0;       /* 0 normal, 1 high → warna via [data-ally-contrast="high"] */
}
[data-ally-step-mode="one-per-screen"] …
[data-ally-hide~="promoBanner"] .promo-banner { display:none }
[data-ally-sticky="true"] .primary-cta { position:sticky; bottom:0 }
```

---

## 7. UX spesifikasi

### 7.1 Alur adaptasi
1. User berinteraksi → sensor mengakumulasi window 10 detik.
2. Rule layer menghitung profile. Jika `confidence ≥ thresholds.apply` → apply preset **segera** (tanpa network).
3. Jika ambigu (`combined` atau `confidence < thresholds.llm`) → panggil engine async. UI tidak diblokir.
4. Saat plan diterapkan: transisi 200ms (tanpa animasi besar), **toast** di bawah: *"Ally memperbesar tombol & jarak. [Pertahankan] [Batalkan] [Kenapa?]"* (EN untuk demo juri).
5. Toast auto-hide 8 detik → dianggap *Keep*.
6. "Kenapa?" membuka sheet dengan `explanation` + ringkasan sinyal (counter saja).
7. Undo → kembali ke token sebelumnya dalam <100ms, catat `undoCount++`, naikkan threshold +0.15 untuk sesi.
8. Plan kedaluwarsa setelah `ttlSeconds` kecuali sinyal friksi berulang (reinforce).

### 7.2 Prinsip desain
- **Minimal change**: ubah sesedikit mungkin yang menyelesaikan friksi.
- **No layout jump saat mengetik**: adaptasi hanya diterapkan saat tidak ada field yang fokus, atau ditunda sampai blur.
- **Jangan sentuh**: harga, total, teks legal, tombol bayar final (hanya boleh diperbesar, tidak dipindah/disembunyikan).
- **Respect OS**: jika `prefers-reduced-motion`, tanpa transisi; jika `prefers-contrast: more`, mulai dari contrast high.
- Semua komponen tetap semantic HTML, fokus keyboard terlihat, kontras ≥4.5:1 pada mode high.

### 7.3 Judge Dashboard (`/dashboard`)
- Kolom kiri: live sinyal (sparkline per counter), profile gauge 3 batang.
- Kolom tengah: decision log (timestamp, source rule/llm, latency, preset/plan diff, explanation).
- Kolom kanan: metrik sesi before/after (mis-tap rate, avg time-to-target, errors) + tombol "Run eval".
- Sinkron via `BroadcastChannel('ally')` antara tab checkout & dashboard (tanpa backend).

---

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| Latency | Rule path ≤5ms; LLM path p50 ≤900ms, timeout 1500ms, non-blocking |
| Reliability | Tanpa network/API, sistem tetap berfungsi (rule-only). Zero uncaught errors di console saat demo |
| Keamanan output | Strict schema + zod + clamp; tidak ada `dangerouslySetInnerHTML`; tidak ada eval |
| Privasi | Payload = counter/durasi/ukuran; tidak ada PII; API key hanya server-side |
| Aksesibilitas SDK sendiri | Toast & panel bisa dioperasikan keyboard, `role="status"`, `aria-live="polite"` |
| Biaya | ≤ US$0.0005 per keputusan (gpt-4o-mini / gpt-5-mini) |
| Kompatibilitas | Chrome/Edge/Safari iOS terbaru; HP Android untuk demo |
| Bundle | `@ally/react` ≤ 15 kB gzip (tanpa dependensi berat) |

---

## 9. Metrik & evaluasi

| Metrik | Definisi | Target dry-run |
|---|---|---|
| Mis-tap rate | missTap / taps | turun ≥50% pada sesi tremor sintetis |
| Time-to-complete | detik dari Keranjang → Sukses | turun ≥25% |
| Error loops | jumlah validasi error berulang | turun ≥40% pada sesi low-vision |
| Completion rate | sesi yang mencapai Sukses | ≥95% dengan Ally |
| Undo rate | undo / adaptasi | ≤20% (proxy false-positive) |
| LLM schema pass | respons valid / total | 100% |

Eval dijalankan via `pnpm eval` → `eval/results.md`. Angka masuk slide & README.

---

## 10. Risiko produk

| Risiko | Dampak | Mitigasi |
|---|---|---|
| False positive mengganggu user normal | Kepercayaan turun | Threshold konservatif, toast, undo menaikkan threshold, TTL |
| Layout jump saat user mengetik | Frustrasi | Tunda apply sampai blur / idle 1s |
| LLM menghasilkan nilai ekstrem | UI rusak | Strict schema + clamp policy |
| Sensor salah tafsir di desktop mouse | Preset motor tidak relevan | Sesuaikan bobot per `inputModality` |
| Host app tidak memakai token | Adaptasi tidak terlihat | Dokumentasi + komponen primitif + lint warning dev-mode |

---

## 11. Rencana pasca-hackathon (untuk juri)
1. Studi pengguna dengan 20 lansia (panti werdha / komunitas lansia) — ukur metrik bab 9 di dunia nyata.
2. Open-source core SDK (`@ally/react`), adapter Vue/Svelte.
3. Pilot dengan 1 merchant Indonesia; dashboard analitik friksi untuk merchant (nilai bisnis tambahan: *mengetahui di mana user kesulitan*).
4. Voice assist (Realtime API) & mobile SDK (React Native).
5. Model kecil on-device untuk klasifikasi friksi (hilangkan network sepenuhnya).

---

## 12. Glosarium
- **Friksi**: tanda terukur bahwa user kesulitan (bukan "error" aplikasi).
- **Preset**: paket token siap pakai dari rule layer.
- **AdaptationPlan**: output terstruktur (dari rule atau LLM) yang diterapkan ke token/layout.
- **Policy**: batasan merchant terhadap apa yang boleh diubah.
- **White-box**: setiap keputusan punya penjelasan & log yang bisa dibaca manusia.
