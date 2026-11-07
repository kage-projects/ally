# Ally — Judge Dashboard Plan & Tracking

> Dokumen kerja khusus dashboard pada branch `feature/dashboard`.
> Sumber utama: `ALLY_PRD.md`, `ALLY_BUILD_PLAN.md`, dan `ALLY_PLAYBOOK.md`.
> Tujuan: menjaga implementasi dashboard tetap sesuai scope, mudah diintegrasikan dengan SDK, dan siap didemokan kepada juri.

| Field | Value |
|---|---|
| Product | **Ally — Adaptive UI Engine** |
| Feature | **Judge Dashboard / Ally Live Control Center** |
| Route | `/dashboard` |
| Owner | Dashboard developer |
| Branch | `feature/dashboard` |
| Status | Phase 1 complete → static dashboard shell runnable with Arc UI and mock fixtures |
| Target | Hackathon MVP, projector 1080p, live two-window demo |

---

## 1. Ringkasan

Judge Dashboard adalah layar observability untuk menunjukkan proses kerja Ally secara live:

```text
Observe → Decide → Adapt → Prove
```

Dashboard harus membuat juri dapat memahami empat hal dalam beberapa detik:

| Pertanyaan juri | Jawaban di dashboard |
|---|---|
| Apa yang sedang dialami user? | **Live Signals** |
| Apa yang Ally simpulkan? | **User Profile** |
| Keputusan apa yang dibuat? | **Decision Stream** |
| Apakah adaptasinya membantu? | **Session Impact / Before-After** |

Cerita utama yang harus terlihat:

```text
User mengalami 3 miss-tap
        ↓
Dashboard menunjukkan missTap meningkat
        ↓
Motor profile naik, misalnya menjadi 82%
        ↓
Rule engine memilih Motor Support
        ↓
Checkout berubah: target 44px → 56px, spacing lebih lebar
        ↓
Mis-tap rate dan time-to-target setelah adaptasi membaik
```

Dashboard bukan merchant admin panel lengkap dan bukan analytics platform permanen. Dashboard adalah alat demo, observability, explainability, dan evidence untuk hackathon.

---

## 2. Tujuan dan non-tujuan

### 2.1 Goals

- Menampilkan `FrictionSummary` secara live.
- Menampilkan profile `motor`, `visual`, dan `cognitive`.
- Menampilkan keputusan dari rule layer atau OpenAI.
- Menjelaskan perubahan token/layout dalam bahasa yang mudah dibaca.
- Menampilkan status keputusan: applied, kept, undone, expired, atau fallback.
- Menghitung metrik session sebelum dan setelah adaptasi.
- Menampilkan hasil evaluation harness jika tersedia.
- Membantu pitch membuktikan Ally bukan sekadar perubahan CSS atau chatbot wrapper.
- Tetap berfungsi saat OpenAI tidak tersedia karena rule path tetap berjalan.
- Menampilkan data agregat tanpa PII, form values, atau screen content.

### 2.2 Non-goals MVP

- Tidak ada login atau user management.
- Tidak ada database atau session history permanen.
- Tidak ada multi-merchant dashboard.
- Tidak ada WebSocket sebelum flow `BroadcastChannel` stabil.
- Tidak ada merchant policy editor pada MVP.
- Tidak ada export CSV/PDF.
- Tidak ada complex animation atau visual effect berlebihan.
- Tidak membuat Next.js app terpisah.
- Dashboard tidak ikut diadaptasi oleh `AllyProvider`.

---

## 3. Preview tampilan

> Angka di preview berikut hanya mock data untuk perencanaan. Angka evaluation final wajib berasal dari hasil test nyata.

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│  ALLY / LIVE CONTROL CENTER                                                                   │
│  Observe → Decide → Adapt → Prove            ● LIVE · Touch · Address Step                    │
│                                                   [Open Checkout] [Run Evaluation] [Reset]     │
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│  ACTIVE ADAPTATION                                                                            │
│  Motor Support     RULE · 3ms     Confidence 82%     Status: APPLIED                           │
│  Target 44→56px  ·  Spacing 1.0→1.5  ·  Sticky CTA ON  ·  Policy validated                    │
├───────────────────────┬────────────────────────────────────────────┬──────────────────────────┤
│ LIVE SIGNALS          │ DECISION STREAM                            │ SESSION IMPACT           │
│ Window: 10 seconds    │                                            │                          │
│                       │ [All] [Rule] [LLM]                          │ MIS-TAP RATE             │
│ Taps              17  │                                            │ Before       After        │
│ ━━━━━━━━━━━━━━━       │ 09:42:13  RULE                              │ 23%    →     5%           │
│                       │ Motor Support · 3ms                         │          ↓ 78%            │
│ Miss taps          4  │ Target: 44px → 56px                        │                          │
│ ━━━━━━━●━━━━━━        │ Spacing: 1.0 → 1.5                         │ TIME TO TARGET           │
│                       │ Status: APPLIED                             │ 1.8s   →     0.8s         │
│ Rage clicks        0  │                                            │          ↓ 56%            │
│ ━━━━━━━━━━━━━━━       │ “Repeated misses around Continue suggest   │                          │
│                       │ motor difficulty...”                        │ ERROR LOOPS              │
│ Hesitation         1  │                                            │ 2      →     0            │
│ ━━━●━━━━━━━━━━        │────────────────────────────────────────────│                          │
│                       │ 09:41:58  LLM                               │ SESSION DETAILS          │
│ Error loops        0  │ Combined Support · 742ms                    │ Step: Address            │
│ ━━━━━━━━━━━━━━━       │ Font: 1.0 → 1.25                            │ Modality: Touch          │
│                       │ Contrast: Normal → High                     │ Windows: 4 before / 2 after│
│ USER PROFILE          │ Status: KEPT                               │                          │
│                       │                                            │ EVALUATION EVIDENCE      │
│ Motor       82%       │────────────────────────────────────────────│ N = 20 sessions          │
│ ████████████████░░░   │ 09:40:22  RULE                              │ Completion: 95%           │
│                       │ Default · 2ms                               │                          │
│ Visual      31%       │ No adaptation applied                      │ [View full results]      │
│ ██████░░░░░░░░░░░░░   │                                            │                          │
│                       │                                            │                          │
│ Cognitive   22%       │                                            │                          │
│ ████░░░░░░░░░░░░░░░   │                                            │                          │
├───────────────────────┴────────────────────────────────────────────┴──────────────────────────┤
│  Privacy by design: counters and timings only · No screen content · No form values · No PII │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Layout desktop

Gunakan grid 12 kolom:

```text
Live Signals + Profile : 3 kolom
Decision Stream        : 5 kolom
Session Impact         : 4 kolom
```

Target utama adalah layar proyektor 1920×1080. Body text minimal 16px dan angka penting minimal 28px.

### 3.2 Layout layar kecil

Urutan panel ketika layout menjadi satu kolom:

1. Header dan status.
2. Active adaptation.
3. Session impact.
4. Live signals.
5. User profile.
6. Decision stream.
7. Privacy footer.

Dashboard tidak harus dioptimalkan untuk HP sebaik checkout, tetapi tidak boleh rusak ketika viewport mengecil.

---

## 4. Information architecture

### 4.1 Dashboard Header

Isi:

- Logo/name: `ALLY / LIVE CONTROL CENTER`.
- Tagline: `Observe → Decide → Adapt → Prove`.
- Status listener/event.
- Input modality saat ini.
- Current checkout step.
- Tombol `Open Checkout`.
- Tombol `Run Evaluation` jika integrasi eval tersedia.
- Tombol `Reset`.

Status yang digunakan:

```text
Listening
Live · Last event 2s ago
Idle · Waiting for checkout
```

Catatan: `BroadcastChannel` tidak menyediakan peer count atau status koneksi langsung. Jangan mengklaim `Connected` kecuali SDK mengirim heartbeat.

### 4.2 Active Adaptation Banner

Banner menampilkan keputusan aktif terakhir:

```text
Motor Support
RULE · 3ms
Confidence 82%
Status: APPLIED
```

Perubahan utama ditampilkan sebagai chips:

```text
Target 44px → 56px
Spacing 1.0 → 1.5
Font 1.0 → 1.25
Contrast HIGH
Sticky CTA ON
```

Possible status:

- `PENDING`
- `APPLIED`
- `KEPT`
- `UNDONE`
- `EXPIRED`
- `FALLBACK`

Possible source:

- `RULE`
- `LLM`
- `FALLBACK`

### 4.3 Live Signals Panel

Panel menampilkan seluruh counter dari `FrictionSummary`:

| Signal | Definisi singkat | Indikasi |
|---|---|---|
| `taps` | Total tap | Baseline |
| `missTap` | Tap dekat target tetapi meleset | Motor |
| `rageClick` | ≥3 klik cepat pada elemen sama | Frustrasi |
| `hesitation` | Fokus >8 detik tanpa input | Cognitive |
| `backtrack` | Kembali ke step sebelumnya | Cognitive |
| `errorLoop` | Error form yang sama berulang | Visual/Cognitive |
| `zoomEvent` | Pinch/ctrl+wheel/viewport zoom | Visual |
| `scrollThrash` | Scroll bolak-balik cepat | Cognitive/searching |
| `slowTargeting` | Lama menuju target kecil | Motor/Visual |

Informasi context:

```text
Window       10 seconds
Modality     Touch
Viewport     412 × 915
DPR          2.6
Current step Address
Prior preset Motor
Undo count   0
```

MVP visualization:

- Angka counter.
- CSS progress bar sederhana.
- Highlight singkat ketika nilai berubah.
- Maksimal 30 summary windows pada memory.

Upgrade jika waktu cukup:

- Sparkline 10–12 window terakhir.
- Recharts `LineChart` dengan animation dimatikan.

### 4.4 User Profile Gauge

Tiga profile score:

```text
Motor       82%
Visual      31%
Cognitive   22%
```

Tampilkan threshold 60% secara visual karena rule layer memakai threshold tersebut untuk single preset.

Aturan interpretasi:

- Max score `≥ 0.6` → single preset.
- Dua profile `≥ 0.5` → `combined`.
- `combined` dapat memicu LLM path.

Warna yang disarankan:

| Profile | Warna |
|---|---|
| Motor | Orange/amber |
| Visual | Cyan/blue |
| Cognitive | Violet |
| Combined | Violet-blue |

Warna tidak boleh menjadi satu-satunya indikator. Selalu tampilkan label dan persentase.

### 4.5 Decision Stream

Kolom minimal:

```text
Time
Source
Preset
Latency
Changes
Explanation
Status
```

Contoh row:

```text
09:42:13
RULE
Motor Support
3ms
Target 44→56, Spacing 1→1.5
Three miss-taps near Continue...
APPLIED
```

Filter:

```text
All | Rule | LLM
```

Token/layout diff ditampilkan sebagai human-readable values, bukan raw JSON:

```text
targetMinSize     44 → 56 px
spacingScale      1.0 → 1.5
fontScale         1.0 → 1.25
contrast          normal → high
density           compact → comfortable
stepMode          default → one-per-screen
primaryAction     normal → sticky
hidden            none → promo, recommendations
```

Klik row membuka detail drawer/dialog:

```text
Decision details
─────────────────────────────────
Source       OpenAI / Rule
Preset       Combined
Confidence   82%
Latency      742ms
TTL          120 seconds

Why this happened
Three mis-taps near Continue and a zoom event
suggest combined motor and visual friction.

Signals considered
Miss taps       3
Zoom events     1
Slow targeting  2

Adaptation
Target size     44 → 56px
Font scale      1.0 → 1.25
Contrast        Normal → High

Guardrails
✓ Schema validated
✓ Policy limits applied
✓ Locked components unchanged
```

Guardrail status hanya boleh ditampilkan jika benar-benar dikirim oleh SDK/engine. Jangan membuat klaim palsu.

### 4.6 Session Impact

Live before/after metrics:

#### Mis-tap rate

```text
missTap / taps × 100%
```

Jika `taps === 0`, tampilkan `—`, bukan `0%`.

#### Average time-to-target

Gunakan:

```text
summary.timings.avgTimeToTarget
```

#### Error loops

Gunakan:

```text
summary.counts.errorLoop
```

Pembagian before/after:

```text
Summary 1 ─┐
Summary 2 ─┼─ BEFORE
Summary 3 ─┘
              ↓ applied
Summary 4 ─┐
Summary 5 ─┼─ AFTER
Summary 6 ─┘
```

Simpan maksimal enam window sebelum dan enam window setelah event `applied`.

Jika belum ada cukup data:

```text
Collecting post-adaptation data...
0 / 1 window
```

### 4.7 Evaluation Evidence

Evaluation evidence berasal dari Playwright, berbeda dari live session metrics.

Metrics:

- Mis-tap rate.
- Time-to-complete.
- Error loops.
- Completion rate.

Format tampilan:

```text
EVALUATION EVIDENCE
20 synthetic tremor sessions

                  Ally OFF    Ally ON
Mis-tap rate        X%          Y%
Completion time     Xs          Ys
Error loops         X           Y
Completion rate     X%          Y%
```

Angka wajib dibaca dari hasil nyata, idealnya:

```text
eval/results.json
```

Jangan hardcode angka contoh dari playbook.

### 4.8 Privacy Footer

Copy:

```text
Privacy by design · Counters and timings only · No screen content · No form values · No PII
```

---

## 5. Visual design

### 5.1 Direction

```text
AI control center
+ high contrast
+ projector-friendly
+ minimal animation
```

### 5.2 Suggested palette

```text
Background      #07111F
Card            #0F1B2D
Elevated card   #142238
Border          #263750
Primary text    #F8FAFC
Secondary text  #A8B3C7
Accent          #FF6B35
Success         #34D399
Warning         #FBBF24
Danger          #FB7185
LLM/Violet      #A78BFA
```

### 5.3 Typography

- Body minimal 16px.
- Page heading 24–28px.
- Primary metric 28–36px.
- Gunakan tabular numbers untuk angka.
- Secondary text tetap harus memiliki contrast yang cukup.
- Copy dashboard dan demo menggunakan English; mata uang/data checkout tetap Indonesia/Rp.

### 5.4 Motion

- Highlight event baru maksimal 500ms.
- Bar transition 150–200ms.
- Tidak ada animation yang berjalan terus.
- Hormati `prefers-reduced-motion`.
- Chart animation dimatikan untuk menjaga keterbacaan dan determinisme demo.

---

## 6. Stack dashboard

```text
Next.js App Router
React + TypeScript
Tailwind CSS
Arc UI for presentation components
React useReducer for state
BroadcastChannel for same-origin live events
CSS/SVG bars for MVP
Recharts only after MVP is stable
```

### 6.1 Pembagian tanggung jawab library

```text
Tailwind     → grid, responsive layout, spacing, typography
Arc UI       → cards, badges, buttons, segmented control, table, dialog/drawer
Custom code  → Ally state, metrics, event validation, token diff
Recharts     → optional sparkline and evaluation charts
```

### 6.2 Yang tidak digunakan untuk MVP

- Redux.
- Zustand.
- Supabase/Firebase.
- WebSocket/Socket.io sebelum dibutuhkan.
- Separate backend.
- Separate dashboard app.
- Complex motion library.

---

## 7. Data architecture

```text
Checkout
  │
  ├─ Sensor
  │    └─ FrictionSummary
  │
  ├─ Rule Layer
  │    └─ Profile + Preset
  │
  ├─ OpenAI Engine
  │    └─ AdaptationPlan
  │
  └─ bus.ts
       │
       └─ BroadcastChannel("ally")
                │
                ▼
         Dashboard Client
                │
                ├─ useAllyBus()
                ├─ dashboardReducer
                ├─ metrics calculator
                └─ UI panels
```

Dashboard adalah Client Component dan membuka `BroadcastChannel` di `useEffect`. Channel harus ditutup pada cleanup.

### 7.1 Important limitation: physical HP → laptop

`BroadcastChannel` hanya bekerja pada browser/device dan origin/storage partition yang sama.

Berikut ini tidak dapat berjalan langsung:

```text
Physical HP → BroadcastChannel → Laptop dashboard
```

Demo paling aman:

```text
Laptop window kiri  → /checkout dengan mobile viewport
Laptop window kanan → /dashboard
Keduanya menggunakan origin yang sama
```

HP fisik boleh dipakai untuk menunjukkan responsive checkout, tetapi tidak akan mengirim event ke dashboard laptop melalui `BroadcastChannel`.

Jika physical HP wajib terhubung, diperlukan network relay seperti WebSocket/SSE/API polling. Jangan menambah transport tersebut sebelum flow dua-window stabil.

### 7.2 Dashboard must not adapt

Dashboard adalah observer dan tidak boleh ikut menerima adaptive tokens.

Rekomendasi route layout:

```text
app/
├─ (shop)/
│  ├─ layout.tsx       ← AllyProvider
│  └─ checkout/
│     └─ page.tsx
└─ dashboard/
   └─ page.tsx         ← tanpa AllyProvider
```

Dashboard tidak menggunakan `--ally-target`, `--ally-space`, atau `--ally-font` untuk styling-nya sendiri.

---

## 8. Data contracts

### 8.1 FrictionSummary

Dashboard mengikuti tipe resmi dari SDK:

```ts
type FrictionSummary = {
  windowMs: number;
  viewport: { w: number; h: number; dpr: number };
  inputModality: "touch" | "mouse" | "keyboard" | "mixed";
  counts: {
    taps: number;
    missTap: number;
    rageClick: number;
    hesitation: number;
    backtrack: number;
    errorLoop: number;
    zoomEvent: number;
    scrollThrash: number;
    slowTargeting: number;
  };
  timings: {
    avgTargetSize: number;
    avgTimeToTarget: number;
    stepDurations: number[];
  };
  context: {
    step: string;
    priorPreset: Preset | null;
    undoCount: number;
  };
};
```

### 8.2 Recommended bus event

Tipe final harus dimiliki SDK di:

```text
packages/ally-react/src/bus.ts
```

Dashboard hanya mengimpor tipe tersebut.

```ts
type AllyBusEvent =
  | {
      version: 1;
      eventId: string;
      type: "heartbeat";
      at: number;
      payload: {
        step: string;
        inputModality: "touch" | "mouse" | "keyboard" | "mixed";
      };
    }
  | {
      version: 1;
      eventId: string;
      type: "summary";
      at: number;
      payload: {
        summary: FrictionSummary;
        profile: Profile;
        preset: Preset;
        confidence: number;
      };
    }
  | {
      version: 1;
      eventId: string;
      type: "decision";
      at: number;
      payload: {
        id: string;
        source: "rule" | "llm" | "fallback";
        preset: Preset;
        latencyMs: number;
        confidence: number;
        previousPlan: AdaptationPlan | null;
        plan: AdaptationPlan;
        explanation: string;
        guardrails: {
          schemaValid: boolean;
          policyClamped: boolean;
          lockedComponentsPreserved: boolean;
        };
      };
    }
  | {
      version: 1;
      eventId: string;
      type: "applied";
      at: number;
      payload: { decisionId: string };
    }
  | {
      version: 1;
      eventId: string;
      type: "keep";
      at: number;
      payload: { decisionId: string };
    }
  | {
      version: 1;
      eventId: string;
      type: "undo";
      at: number;
      payload: { decisionId: string };
    }
  | {
      version: 1;
      eventId: string;
      type: "reset";
      at: number;
      payload: Record<string, never>;
    };
```

Current build plan menyebut `summary`, `decision`, `applied`, dan `undo`. Mock contract v1 menambahkan explicit `keep`, optional `heartbeat`, unique `eventId`, dan explicit guardrail results agar dashboard tidak mengarang status validasi.

### 8.3 Event validation

- Abaikan event dengan shape yang tidak valid.
- Abaikan versi event yang belum didukung.
- Jangan membuat dashboard crash karena payload rusak.
- Log warning hanya di development.
- Event tidak boleh membawa PII atau form values.

### 8.4 Mock-first fixture

Dashboard development tidak perlu menunggu SDK selesai. Provisional contract dan
fixture tersedia di:

```text
mocks/dashboard/contracts.ts
mocks/dashboard/ally-events.v1.json
mocks/dashboard/eval-results.mock.json
mocks/dashboard/README.md
```

Contract memakai `version: 1`, event `keep` eksplisit, dan optional `heartbeat`.
Jika contract SDK final berbeda, buat adapter kecil atau increment version; jangan
mengubah dashboard reducer secara ad hoc di banyak komponen.

Evaluation fixture wajib menampilkan label mock selama `isMock === true` dan harus
diganti dengan hasil nyata dari `eval/results.json` sebelum submission.

---

## 9. Dashboard state

Gunakan `useReducer`:

```ts
type DashboardState = {
  status: "waiting" | "live" | "idle";
  lastEventAt: number | null;

  currentSummary: FrictionSummary | null;
  summaryHistory: FrictionSummary[];

  profile: Profile;
  preset: Preset;
  confidence: number;

  activeDecisionId: string | null;
  decisions: DashboardDecision[];

  beforeWindows: FrictionSummary[];
  afterWindows: FrictionSummary[];

  evalResults: EvalResults | null;
};
```

Memory limits:

```text
Summary history  max 30
Decision log     max 100
Before windows   max 6
After windows    max 6
```

### 9.1 Reducer actions

```text
event/summary
event/decision
event/applied
event/keep
event/undo
session/reset
eval/loaded
```

### 9.2 Metric rules

```text
misTapRate = totalMissTap / totalTaps
```

- Jika total taps nol, hasil `null`/`—`.
- Improvement positif jika nilai after lebih kecil.
- Jangan membandingkan sebelum dan sesudah jika belum ada minimal satu window pada masing-masing side.
- Tampilkan sample/window count agar juri tidak mengira data live session sama dengan evaluation N=20.

---

## 10. Target file structure

```text
apps/demo/
├─ app/
│  └─ dashboard/
│     └─ page.tsx
├─ components/
│  └─ dashboard/
│     ├─ DashboardClient.tsx
│     ├─ DashboardHeader.tsx
│     ├─ ActiveAdaptationBanner.tsx
│     ├─ LiveSignalsPanel.tsx
│     ├─ SignalRow.tsx
│     ├─ ProfileGauge.tsx
│     ├─ DecisionLog.tsx
│     ├─ DecisionDetails.tsx
│     ├─ SessionImpactPanel.tsx
│     ├─ EvaluationPanel.tsx
│     ├─ ConnectionStatus.tsx
│     └─ DashboardEmptyState.tsx
└─ lib/
   └─ dashboard/
      ├─ reducer.ts
      ├─ metrics.ts
      ├─ formatters.ts
      ├─ mock-data.ts
      └─ use-ally-bus.ts
```

Shared event type:

```text
packages/ally-react/src/bus.ts
```

---

## 11. Implementation phases and tracking

### Phase 0 — Team synchronization

- [x] Dashboard branch created a minimal shared `apps/demo` scaffold because no remote scaffold was available.
- [x] Confirm stack: Next.js 15.5.29, React 19.1, TypeScript, Tailwind CSS 4.
- [x] Tetapkan ownership Arc UI: dashboard owns components; checkout owns scaffold/global layout.
- [x] Tetapkan provisional `AllyBusEvent` v1 untuk mock-first development.
- [x] Tambahkan event `keep` secara eksplisit.
- [x] Tetapkan source evaluation final: `eval/results.json`.
- [x] Tetapkan `heartbeat` sebagai optional; fallback menggunakan `lastEventAt`.
- [x] Tetapkan `/dashboard` tidak dibungkus `AllyProvider`.
- [x] Tambahkan fixture Tremor → Rule → Applied → Keep dan Combined → LLM → Undo.
- [x] Tambahkan mock evaluation dengan guard `isMock: true`.

### Phase 1 — Static dashboard shell

Target: tampilan lengkap menggunakan mock data tanpa bergantung pada SDK.

- [x] Buat route `/dashboard`.
- [x] Buat desktop grid tiga kolom.
- [x] Buat dashboard header.
- [x] Buat active adaptation banner.
- [x] Buat live signal rows untuk sembilan counter.
- [x] Buat profile gauge tiga dimensi.
- [x] Buat decision log table.
- [x] Buat before/after metric cards.
- [x] Buat evaluation evidence placeholder.
- [x] Buat privacy footer.
- [x] Buat waiting/empty state.
- [x] Label mock data secara jelas selama belum live.
- [x] Install Arc foundation, Button, Badge, dan Segmented Control.
- [x] Validate with typecheck, ESLint, production build, and HTTP smoke test.
- [x] Visual QA at 1440×1000 using a fresh production server and Chrome headless.

Suggested commit:

```text
feat(dashboard): add judge dashboard shell and mock states
```

### Phase 2 — Live bus integration

- [x] Implement `useAllyBus()`.
- [x] Subscribe ke `BroadcastChannel("ally")`.
- [x] Close channel saat component unmount.
- [x] Validate incoming event.
- [x] Dispatch events ke reducer.
- [x] Update last event timestamp.
- [x] Tampilkan `Listening`, `Live`, dan `Idle` secara jujur.
- [x] Limit summary history ke 30.
- [x] Test dengan dua tab origin yang sama.

Implementation notes: dashboard starts in live-listening mode with no fixture data.
Local demo mode is explicit and is replaced by the first valid bus event. Idle
starts after 15 seconds measured from local receipt, independent of producer clock
skew. `/dashboard/simulator` provides synthetic replay and step-by-step sending.
Automated tests cover two real Node channel instances; this does not replace the
same-origin browser-tab check above.

Suggested commit:

```text
feat(dashboard): subscribe to live Ally events
```

### Phase 3 — Decision stream

- [x] Render source badge `RULE`, `LLM`, atau `FALLBACK`.
- [x] Render preset dan confidence.
- [x] Render latency.
- [x] Generate human-readable token/layout diff.
- [x] Render explanation.
- [x] Update status on applied/keep/undo.
- [x] Add Rule/LLM filter.
- [x] Add decision detail dialog/drawer.
- [x] Limit log ke 100 entries.

Suggested commit:

```text
feat(dashboard): add adaptation decision stream
```

### Phase 4 — Before/after live metrics

- [x] Collect baseline summary windows.
- [x] Freeze before group ketika event `applied` diterima.
- [x] Collect after windows.
- [x] Calculate mis-tap rate.
- [x] Calculate average time-to-target.
- [x] Calculate error loops.
- [x] Calculate improvement percentage.
- [x] Handle zero taps.
- [x] Display sample/window count.
- [x] Display collecting state jika data belum cukup.

Suggested commit:

```text
feat(dashboard): add live before and after metrics
```

### Phase 5 — Evaluation evidence

- [x] Validate the shared `EvaluationResults` v1 contract at runtime.
- [x] Load `eval/results.json` through a validated no-store API when measured output is available.
- [x] Render Ally OFF vs Ally ON.
- [x] Display N/session count.
- [x] Display mean ± standard deviation jika tersedia.
- [x] Keep mock numbers out of live mode; samples appear only in explicit demo mode.
- [x] Add `View full results` only when valid measured JSON and an actual `results.md` exist.
- [ ] Produce the measured `eval/results.json` with the checkout evaluation harness before submission.

Integration is ready; actual checkout/evaluation producers are not present in this
repository. Missing/invalid/unreadable results show an explicit unavailable state.
The browser refreshes evidence every 15 seconds or on demand. Fixed evaluation
files are included in Next.js output tracing when present at build time.

Suggested commit:

```text
feat(dashboard): display evaluation evidence
```

### Phase 6 — Polish and verification

- [ ] Test at 1920×1080.
- [ ] Test at 1366×768.
- [ ] Test narrower/tablet layout.
- [x] Primary body/data text minimal 16px; secondary metadata 14px and outcome values 28px.
- [x] Implement visible keyboard focus and a persistent skip-link target.
- [ ] Dialog/drawer keyboard accessible.
- [x] Color contrast checked for text and action affordances.
- [x] Respect `prefers-reduced-motion`.
- [x] Disable continuous/chart animation.
- [ ] Console clean.
- [x] Production build passes.
- [ ] Demo rehearsal with checkout and dashboard side-by-side.

Fresh screenshots at target widths, native-dialog keyboard interaction, and
browser-console verification remain open because the browser access host is
unavailable. Static responsive, wrapping, focus, contrast, dialog lifecycle, and
polling cleanup checks passed. Checkout rehearsal also needs the real SDK.

Suggested commit:

```text
style(dashboard): polish projector layout and accessibility
```

---

## 12. Priority and cut-list

### P0 — Must have

- [x] `/dashboard` opens without error.
- [x] Subscribe to `BroadcastChannel("ally")`.
- [x] All signal counters are rendered from validated live summaries.
- [x] Motor/visual/cognitive profile is rendered from validated live summaries.
- [x] Decision log shows source, preset, latency, diff, explanation, and status.
- [x] Before/after live metrics work with bounded, clean adaptation windows.
- [x] Undo updates decision status.
- [ ] Dashboard is readable at 1080p.
- [x] Empty/waiting state exists.
- [x] Privacy footer exists.
- [x] Dashboard is outside the checkout provider and uses its own style tokens.

### P1 — Add after P0 is stable

- [x] Active adaptation banner.
- [x] Rule/LLM/Fallback filter.
- [x] Decision detail dialog.
- [x] Validated evaluation adapter and panel; actual measured run is pending.
- [x] Heartbeat context and honest receive-time status; no peer-count claim.
- [ ] Open checkout button/QR.

### P2 — Only if safe

- [ ] Recharts signal sparkline.
- [ ] Before/after chart.
- [ ] Export results.
- [ ] Session replay.
- [ ] Merchant policy viewer/editor.

### Cut order if late

1. Remove chart/sparkline; keep numbers and CSS bars.
2. Remove decision filters.
3. Remove decision detail drawer; show explanation inline.
4. Remove QR; keep `Open Checkout` button.
5. Show evaluation as static table loaded from real JSON.

Never cut:

- Live signal stream.
- Profile gauge.
- Decision log.
- Before/after metrics.
- Rule-vs-LLM source.
- Explanation.
- Undo/Keep status.

---

## 13. Test scenarios

### Scenario 1 — Empty state

- [ ] Open dashboard without checkout.
- [ ] Dashboard does not crash.
- [ ] Shows `Waiting for Ally events`.

### Scenario 2 — Tremor / motor

- [ ] Trigger Tremor simulator or three manual miss-taps.
- [ ] `missTap` increases.
- [ ] Motor profile increases.
- [ ] Motor decision appears.
- [ ] Rule latency appears.
- [ ] Active adaptation changes.
- [ ] Event appears in dashboard within 200ms target.

### Scenario 3 — Low vision

- [ ] Trigger Low Vision simulator.
- [ ] `zoomEvent`/`errorLoop` increases.
- [ ] Visual profile increases.
- [ ] Font and contrast diff appears.

### Scenario 4 — Fatigue/cognitive

- [ ] Trigger Fatigue simulator.
- [ ] `hesitation`, `backtrack`, or `scrollThrash` increases.
- [ ] Cognitive profile increases.
- [ ] One-per-screen/inline hints appear in diff if selected.

### Scenario 5 — Combined / LLM

- [ ] Trigger Tremor + Low Vision.
- [ ] Preset becomes `combined`.
- [ ] Source shows `LLM` when API succeeds.
- [ ] LLM latency appears.
- [ ] Explanation appears.

### Scenario 6 — Undo and Keep

- [ ] Apply an adaptation.
- [ ] Keep updates status to `KEPT`.
- [ ] Undo updates status to `UNDONE`.
- [ ] Active adaptation reflects restored state.

### Scenario 7 — API offline

- [ ] Disable/unset OpenAI API key.
- [ ] Rule events still appear.
- [ ] Dashboard shows rule/fallback state.
- [ ] No uncaught UI error.

### Scenario 8 — Metrics

- [ ] Receive baseline summary.
- [ ] Receive applied event.
- [ ] Receive post-adaptation summary.
- [ ] Before/after values appear.
- [ ] Zero taps does not produce divide-by-zero/NaN.

### Scenario 9 — Accessibility and projector

- [ ] All controls reachable with keyboard.
- [ ] Visible focus state.
- [ ] Dialog closes with Escape.
- [ ] Screen text readable at 1920×1080.
- [ ] No horizontal scroll.
- [ ] Reduced motion disables non-essential transitions.

---

## 14. Definition of Done

- [ ] Route `/dashboard` works without runtime errors.
- [ ] Checkout and dashboard can run in two same-origin windows.
- [ ] All signals appear live.
- [ ] Profile scores update live.
- [ ] Decision log includes rule/LLM, latency, diff, explanation, and status.
- [ ] Before/after fills after at least one adaptation.
- [ ] Keep and Undo update status correctly.
- [ ] Dashboard is isolated from adaptive checkout tokens.
- [ ] No PII, form values, or screen content is received/stored.
- [ ] Console is clean.
- [ ] Dashboard is projector-readable.
- [ ] Keyboard interaction and focus state work.
- [ ] Reduced motion is respected.
- [ ] Production build passes.
- [ ] Demo rehearsal succeeds at least twice.

---

## 15. Integration and conflict map

Potential shared/conflict files:

```text
apps/demo/package.json
apps/demo/app/layout.tsx
apps/demo/app/globals.css
apps/demo/components/ui/*
packages/ally-react/src/bus.ts
```

Rules:

- Checkout developer owns initial `apps/demo` scaffold.
- SDK developer owns final bus/event types.
- Dashboard imports types; avoid duplicating contracts.
- Agree before modifying root layout/global styles.
- Merge main into `feature/dashboard` after each team sync.
- Integrate every milestone; do not wait until all features are complete.

Suggested branch workflow:

```text
git switch main
git pull origin main
git switch feature/dashboard
git merge main
```

Then continue dashboard work and push to `feature/dashboard`.

---

## 16. Demo flow contribution

Dashboard must support the 90-second flow:

1. Open normal checkout in mobile-sized window.
2. Open dashboard next to checkout.
3. Trigger three miss-taps or Tremor simulator.
4. Signal count updates.
5. Motor score increases.
6. Rule decision appears with latency.
7. Checkout target becomes 56px and spacing increases.
8. Open Why/explanation.
9. Press Undo or Keep.
10. Trigger Low Vision.
11. Show font/contrast decision.
12. Show real evaluation result.

Desired visual sequence on dashboard:

```text
missTap 0 → 3
    ↓
Motor 0% → 82%
    ↓
RULE · Motor Support · 3ms
    ↓
Target 44px → 56px
    ↓
Before 23% → After 5% (only when real/collected)
```

---

## 17. Open decisions

Track decisions that need team confirmation:

| Decision | Owner | Status | Final answer |
|---|---|---|---|
| Final `AllyBusEvent` shape | SDK + Dashboard | Provisional locked | Use mock contract v1; SDK may adopt or provide adapter |
| Add explicit `keep` event | SDK | Decided | Yes |
| Add heartbeat event | SDK | Decided | Optional; dashboard derives status from `lastEventAt` if absent |
| Arc UI installation owner | Checkout + Dashboard | Decided | Dashboard owns components; checkout owns scaffold/global layout |
| Evaluation JSON schema/path | Eval + Dashboard | Decided | Final source `eval/results.json`; current fixture is mock only |
| Physical HP sync required? | Team lead | Decided for MVP | Use two same-origin laptop windows for live dashboard |
| Dashboard language | Team lead | Decided for MVP | English |
| Recharts before freeze? | Dashboard | Decided | Only after P0 is stable |

---

## 18. Progress log

Update this table while implementing:

| Date/time | Phase | Work completed | Blocker | Next action |
|---|---|---|---|---|
| 2026-11-07 | Phases 3–6 | Three parallel subagents completed decision dialogs/full diffs, honest weighted/normalized metrics, measured-evidence integration, and static QA; 37 tests, typecheck, lint, and production build pass; UI remains a flat grid | Actual checkout/eval output absent; fresh browser width/keyboard/console QA blocked by unavailable browser host | Run real checkout evaluation, load results, and finish browser/rehearsal gates |
| 2026-11-07 | Phase 2 | Validated v1 bus listener, bounded reducer, receive-time connection status, explicit demo/live isolation, and synthetic event sender implemented; 15 tests, typecheck, lint, and production build pass. Playwright verified two same-origin tabs, 11-event replay, Kept/Undone, Idle, reset, live replacement of demo data, unavailable-channel fallback, and tablet overflow | None for Phase 2; checkout SDK integration still uses provisional contract | Continue Phase 3 decision stream refinements |
| 2026-11-07 | Phase 1 | Next.js workspace scaffold, responsive dashboard shell, Arc UI primitives, mock adapter, reset/empty state, metrics, and decision filters completed | Must reconcile shared scaffold when checkout branch becomes available | Start Phase 2 live `BroadcastChannel` adapter |
| 2026-11-07 | Phase 0 | Provisional contract v1, event fixtures, mock evaluation, ownership decisions, and integration rules added | Resolved by minimal dashboard-owned scaffold | Build static dashboard shell |
| 2026-11-07 | Planning | Dashboard plan, architecture, preview, event proposal, tests, and DoD documented | Waiting for app scaffold/event contract | Sync with checkout and SDK developers |
| | | | | |
| | | | | |

---

## 19. Final implementation principle

The dashboard is successful when a judge can see this without a long explanation:

```text
3 miss-taps
→ motor score 82%
→ rule decision in 3ms
→ target 44px becomes 56px
→ outcome improves
→ user can Keep or Undo
```

Build in this order:

```text
Correct data flow
→ clear decision story
→ measurable evidence
→ polished visual
→ optional charts
```

Do not reverse the order. A simple dashboard with correct live data is more valuable than a beautiful dashboard using disconnected mock values.
