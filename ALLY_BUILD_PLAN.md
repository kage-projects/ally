# Ally — Build Plan & Milestones

> Dokumen eksekusi. PRD ada di `ALLY_PRD.md`, strategi/pitch di `ALLY_PLAYBOOK.md`.
> Tujuan dry-run ini: **membuktikan arsitektur bisa dibangun & didemokan**, lalu mengekstrak *pola* yang bisa direplikasi dari repo kosong dalam ±7 jam di hari-H.

---

## 0. Aturan main dry-run

1. Build sekarang = **latihan**. Kode ini **tidak boleh dibawa** ke hari-H. Yang dibawa: pemahaman, urutan kerja, prompt, dan angka target.
2. Setiap milestone punya **Definition of Done (DoD)** yang bisa dicek. Tidak lanjut sebelum DoD hijau.
3. Setiap milestone dicatat **durasi aktualnya** → jadi dasar jadwal hari-H (bab 8).
4. Kerjakan dengan Codex (atau agen coding apa pun) persis seperti yang akan dilakukan di hari-H: `AGENTS.md` dulu, task kecil, review diff, test.
5. Setelah selesai: hapus repo lokal (atau arsipkan di luar workspace lomba), tulis `LESSONS.md`.

---

## 1. Struktur repo target

```
ally/
├─ AGENTS.md                     # konvensi untuk Codex (lihat bab 6)
├─ package.json                  # pnpm workspaces
├─ pnpm-workspace.yaml
├─ packages/
│  └─ ally-react/
│     ├─ src/
│     │  ├─ index.ts
│     │  ├─ provider.tsx         # <AllyProvider>, context, apply tokens
│     │  ├─ sensor.ts            # event listeners → FrictionSummary
│     │  ├─ rules.ts             # summary → profile/preset/confidence
│     │  ├─ presets.ts           # preset → tokens/layout
│     │  ├─ schema.ts            # zod: FrictionSummary, AdaptationPlan, Policy
│     │  ├─ guard.ts             # clamp + lock
│     │  ├─ engine-client.ts     # fetch /api/ally/plan, cache, timeout
│     │  ├─ bus.ts               # BroadcastChannel('ally')
│     │  ├─ ui/Toast.tsx         # Keep / Undo / Why
│     │  ├─ ui/WhyPanel.tsx
│     │  └─ useAlly.ts
│     ├─ test/ (vitest)
│     └─ package.json
├─ apps/
│  └─ demo/                      # Next.js 15 App Router
│     ├─ app/
│     │  ├─ layout.tsx           # <AllyProvider policy={...}>
│     │  ├─ page.tsx             # redirect → /checkout
│     │  ├─ checkout/page.tsx    # 3 steps
│     │  ├─ dashboard/page.tsx   # judge dashboard
│     │  └─ api/ally/plan/route.ts
│     ├─ components/             # Cart, Address, Payment, Success, PromoBanner, Recs, Simulator
│     ├─ lib/seed.ts             # produk, kota, kurir (Rp)
│     ├─ styles/tokens.css       # --ally-* + [data-ally-*] rules
│     └─ .env.local              # OPENAI_API_KEY
├─ eval/
│  ├─ run.ts                     # Playwright sessions
│  └─ results.md
└─ README.md
```

**Keputusan teknis tetap:**
- pnpm workspaces (tanpa turbo — lebih sedikit setup).
- `ally-react` dibundel dengan `tsup` (esm+cjs+dts), atau cukup `"main": "src/index.ts"` + transpile oleh Next (`transpilePackages`) untuk hemat waktu. **Pilih yang kedua di hari-H.**
- Tailwind untuk layout, tapi semua ukuran interaktif via CSS variables `--ally-*`.
- OpenAI model: `gpt-4o-mini` (atau `gpt-5-mini` jika tersedia & cepat). Structured Outputs `strict: true`.
- Sinkron checkout ↔ dashboard: `BroadcastChannel` (tanpa DB).

---

## 2. Milestone overview

| MS | Nama | Output | Estimasi dry-run | Target hari-H |
|---|---|---|---|---|
| M0 | Scaffold & kontrak | Monorepo jalan, token CSS, schema zod, AGENTS.md | 45 m | 09.30–10.00 |
| M1 | Checkout token-aware | 3 step checkout realistis, `?ally=off` | 75 m | 10.00–11.00 |
| M2 | Sensor + rule + apply | Simulator → preset diterapkan live, toast Keep/Undo, Why | 120 m | 11.00–12.45 |
| M3 | LLM engine + guardrails | `/api/ally/plan` strict JSON, clamp, fallback, decision log | 75 m | 12.45–14.00 ← **demo-able** |
| M4 | Dashboard | Live sinyal, log, metrik before/after | 60 m | 14.00–15.00 |
| M5 | Eval harness | `pnpm eval` → `results.md` | 60 m | 15.00–15.45 |
| M6 | Polish, README, video | Freeze, backup video, README "How we used Codex" | 45 m | 15.45–16.30 |
| S1 | (Stretch) Voice assist | Realtime API offer | — | hanya jika M0–M5 hijau sebelum 15.30 |

Total inti: ±8 jam dry-run (boleh dibagi beberapa hari). Di hari-H dengan 4 orang paralel → muat di 7 jam.

---

## 3. Detail milestone

### M0 — Scaffold & kontrak (45 m)

**Tugas**
1. `pnpm init`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`).
2. `apps/demo`: `create-next-app` (TS, Tailwind, App Router, no src dir). Tambah `transpilePackages: ['@ally/react']`.
3. `packages/ally-react`: `package.json` (`name: @ally/react`, `main: src/index.ts`, peerDeps react), `tsconfig`, `vitest`.
4. `packages/ally-react/src/schema.ts`: zod untuk `FrictionSummary`, `Profile`, `AdaptationPlan`, `AllyPolicy` (dari PRD 6.x). Ekspor juga **JSON Schema** untuk OpenAI (pakai `zod-to-json-schema` atau tulis manual — manual lebih aman untuk `strict`).
5. `apps/demo/styles/tokens.css`: `--ally-target/space/font/contrast` + selector `[data-ally-*]`.
6. `AGENTS.md` (bab 6).
7. `.env.local` dengan `OPENAI_API_KEY`.

**DoD**
- [ ] `pnpm dev` membuka halaman kosong tanpa error.
- [ ] `pnpm -F @ally/react test` jalan (1 test placeholder lolos).
- [ ] `import { AdaptationPlanSchema } from '@ally/react'` berhasil di demo.
- [ ] Mengubah `--ally-font` di DevTools mengubah ukuran teks halaman.

---

### M1 — Checkout token-aware (75 m)

**Tugas**
1. `lib/seed.ts`: 3 produk (nama, harga Rp, gambar placeholder), 5 kota, 3 kurir, 3 metode bayar.
2. Komponen: `CartStep`, `AddressStep` (nama, telp, alamat, kota select, kodepos), `PaymentStep` (radio metode, ringkasan total), `SuccessStep`.
3. `PromoBanner`, `Recommendations`, `VoucherCarousel`, `SocialProof` — diberi class/id yang cocok dengan enum `hideNonEssential`.
4. Semua `button`, `input`, `select`, `a` interaktif: `min-height: var(--ally-target)`, padding/gap × `var(--ally-space)`, font × `var(--ally-font)`.
5. Validasi form sederhana (telp numerik, kodepos 5 digit) dengan pesan error inline + `aria-describedby`.
6. Progress indicator 3 step; tombol "Kembali" & "Lanjut".
7. `?ally=off` → provider tidak aktif (untuk A/B saat demo).
8. Stepper state di URL hash atau `useState` — sederhana.

**DoD**
- [ ] Bisa menyelesaikan checkout end-to-end sampai Sukses di desktop & HP (DevTools mobile).
- [ ] Mengubah `--ally-target: 64px` di DevTools memperbesar **semua** tombol/input tanpa layout rusak.
- [ ] `data-ally-hide="promoBanner recommendations"` di `<html>` menyembunyikan keduanya.
- [ ] Lighthouse a11y ≥90 pada `/checkout`.

---

### M2 — Sensor + rule + apply (120 m) ← milestone paling penting

**Tugas**
1. `sensor.ts`
   - Listener global: `pointerdown/up`, `click`, `focusin/out`, `input`, `invalid`/custom error event, `scroll`, `visualViewport.resize`, `wheel` (ctrl).
   - Deteksi **missTap**: pada `pointerdown`, cari elemen interaktif terdekat (`button,a,input,select,[role=button]`) dalam radius 24px via `elementsFromPoint` + bbox; jika titik di luar bbox target terdekat tapi ≤24px → `missTap++`.
   - **rageClick**: ≥3 click pada elemen sama ≤1000ms.
   - **hesitation**: timer per fokus; >8000ms tanpa `input` → `hesitation++`.
   - **errorLoop**: map `fieldId → lastErrorMessage`; sama ≥2x → `errorLoop++`.
   - **zoomEvent**: `visualViewport.scale > 1.05` atau ctrl+wheel.
   - **scrollThrash**: reversal arah ≥4 dalam 2000ms.
   - **slowTargeting**: `pointermove` dekat target <44px lalu klik >1500ms.
   - **backtrack**: custom event `ally:step` dari app (`detail: {from,to}`); `to < from` → `backtrack++`.
   - Emit `FrictionSummary` setiap 10 detik **dan** segera jika `missTap ≥3` atau `rageClick ≥1` (fast path).
2. `rules.ts`: implementasi skor PRD 6.2, output `{profile, preset, confidence}`.
3. `presets.ts`: tabel PRD 6.5 → `AdaptationPlan` (dengan `explanation` templated, `source: 'rule'`).
4. `provider.tsx`
   - Context state: `plan`, `prevTokens`, `status`, `explanation`, `summary`.
   - `applyPlan()`: tulis CSS vars ke `document.documentElement.style`, set `data-ally-*`. Tunda jika ada `activeElement` input (apply saat blur/idle 1s).
   - `undo()`: restore, `undoCount++`, `threshold += 0.15`.
   - Persist `keep` ke `localStorage('ally:pref')`.
   - Hormati `prefers-reduced-motion`.
5. `ui/Toast.tsx`, `ui/WhyPanel.tsx` — keyboard-accessible, `aria-live`.
6. `useAlly()` hook.
7. `bus.ts`: broadcast `summary`, `decision`, `applied`, `undo`.
8. **Friction Simulator** (`apps/demo/components/Simulator.tsx`): panel floating; tombol *Tremor* (dispatch 4 `pointerdown` sintetis 10–20px di luar tombol "Lanjut" + 1 slowTargeting), *Low Vision* (dispatch zoom + 2 errorLoop pada kodepos), *Fatigue* (2 backtrack + 2 hesitation + scrollThrash), *Reset*. Sintesis dilakukan via **fungsi `sensor.inject(partialCounts)`** (lebih deterministik daripada memalsukan event DOM) — tapi tetap sediakan 1 tombol yang memalsukan event DOM nyata untuk membuktikan sensor bekerja.

**DoD**
- [ ] Tap meleset 3x secara **manual** di HP → ≤1 detik UI berubah ke preset motor, toast muncul.
- [ ] Simulator *Low Vision* → font & kontras berubah, promo hilang.
- [ ] Simulator *Fatigue* → one-per-screen, hint inline.
- [ ] Undo mengembalikan tampilan 100%; tap meleset 3x lagi **tidak** langsung memicu (threshold naik).
- [ ] "Why?" menampilkan penjelasan + counter.
- [ ] Tidak ada layout jump saat sedang mengetik di input.
- [ ] Unit test: `rules.test.ts` (≥6 kasus), `sensor.test.ts` (missTap geometry, rageClick timing).
- [ ] Console bersih.

---

### M3 — LLM engine + guardrails (75 m) ← setelah ini **demo-able**

**Tugas**
1. `app/api/ally/plan/route.ts`
   - Validate body (zod). Jika `policy.llm.enabled=false` → 204.
   - Panggil OpenAI (Responses API atau Chat Completions) dengan `response_format: { type: 'json_schema', json_schema: { name: 'AdaptationPlan', strict: true, schema } }`.
   - System prompt (bab 7). User content = JSON `summary + profile + policy.limits + lockedComponents`.
   - `AbortController` timeout `policy.llm.timeoutMs`.
   - Parse → zod → `guard.clamp(plan, policy)` → simpan ke `decisionLog` (in-memory array, max 100) → 200.
   - Error/timeout → 204 (client fallback).
2. `engine-client.ts`: `requestPlan(summary, profile, policy)`; cache `Map<signature, plan>` (signature = preset + bucket counters); `source: 'llm'`.
3. Integrasi di provider: jika `preset === 'combined'` atau `confidence < thresholds.llm` → request LLM; sementara itu apply rule preset bila `≥ thresholds.apply` (jangan tunggu).
4. `guard.ts`: clamp tokens ke `limits`, hapus `hideNonEssential` yang tidak di `allowHide`, paksa `confirmDestructive=true` jika `lockedComponents` berisi `payButton`.
5. Endpoint `GET /api/ally/log` untuk dashboard (atau broadcast via bus dari client — pilih bus agar tanpa server state; server log opsional).

**DoD**
- [ ] Simulator *Tremor + Low Vision* bersamaan → request LLM → plan "combined" diterapkan, `explanation` dari model tampil di Why.
- [ ] 20 request berturut → 20/20 lolos zod (log pass rate).
- [ ] Matikan `OPENAI_API_KEY` → sistem tetap bekerja (rule path), tidak ada error di UI.
- [ ] p50 latency LLM ≤900ms (catat angkanya).
- [ ] Model **tidak bisa** mengeluarkan `fontScale > limit` — uji dengan prompt sabotase ("make font 5x") → ter-clamp.

---

### M4 — Judge Dashboard (60 m)

**Tugas**
1. `/dashboard`: subscribe `BroadcastChannel('ally')`.
2. Panel sinyal: 9 counter dengan bar/sparkline sederhana (tanpa chart lib; div bars cukup).
3. Profile gauge 3 batang (motor/visual/cognitive).
4. Decision log: tabel (time, source, preset, latency, diff token, explanation, status keep/undo).
5. Metrik sesi: mis-tap rate, avg time-to-target, errors, **before adaptasi vs after** (hitung dari summary sebelum/sesudah `applied`).
6. Tombol "Open checkout (phone)" menampilkan QR ngrok URL (opsional).

**DoD**
- [ ] Dua tab: checkout di kiri, dashboard di kanan → aksi di checkout muncul <200ms di dashboard.
- [ ] Setelah 1 adaptasi + beberapa tap, metrik before/after terisi.
- [ ] Tampilan rapi di layar proyektor 1080p (font ≥16px, kontras tinggi).

---

### M5 — Evaluation harness (60 m)

**Tugas**
1. `eval/run.ts` (Playwright, chromium, device "Pixel 7").
2. Fungsi `tremorTap(page, selector)`: ambil bbox, dengan p=0.15 klik di luar bbox (offset 8–20px) lalu retry sampai kena; catat miss.
3. Skenario: isi alamat (ketik dengan delay 80ms), pilih kurir, pilih bayar, sampai Sukses. Ukur `time-to-complete`, `missTaps`, `taps`, `errorLoops`.
4. Jalankan N=20 dengan `?ally=off` dan N=20 dengan Ally (seed random tetap).
5. Tulis `eval/results.md` (tabel mean ± sd) + `results.json`.
6. `package.json` script `eval`.

**DoD**
- [ ] `pnpm eval` selesai <5 menit dan menghasilkan tabel.
- [ ] Mis-tap rate dengan Ally lebih rendah (target ≥50% penurunan); jika tidak → tune `targetMinSize`/`spacingScale` preset motor dan catat.
- [ ] Angka masuk ke README & slide.

---

### M6 — Polish, README, video (45 m)

**Tugas**
1. README: one-liner, GIF/screenshot, arsitektur (diagram ASCII dari PRD), cara run, **"How we used Codex"** (link AGENTS.md, 5 momen), hasil eval, privacy note, roadmap.
2. Seed data & copy rapi (EN untuk demo juri; Rp tetap).
3. Rekam video 60 detik demo flow (Playbook 9.4).
4. Cek: console bersih, build `pnpm build` sukses, HP via ngrok jalan.
5. Tag `v0.1-dryrun`.

**DoD**
- [ ] Orang lain bisa `pnpm i && pnpm dev` dari README tanpa tanya.
- [ ] Video backup tersimpan.
- [ ] `pnpm build` hijau.

---

### S1 — Stretch: Voice assist (hanya jika waktu)

- Saat `profile.cognitive ≥ 0.8` dan `assist.voiceOffer=true` → tombol "Bantu saya dengan suara".
- Realtime API via WebRTC + ephemeral key endpoint `/api/ally/rt-token`.
- Agent instruksi: bantu isi alamat step-by-step, konfirmasi sebelum mengisi field (tool call `fillField(id, value)` → app menerapkan ke form).
- DoD: satu percakapan mengisi "kota" dan "kodepos" dengan benar.

---

## 4. Pembagian kerja paralel (4 orang) per milestone

| MS | A (Captain/Engine) | B (SDK) | C (Checkout/UI) | D (Eval/Ops/Story) |
|---|---|---|---|---|
| M0 | AGENTS.md, schema zod + JSON schema | package ally-react, vitest | create-next-app, tokens.css | repo, .env, ngrok, slide skeleton |
| M1 | review + policy default | sensor.ts (mulai) | checkout 3 step + distraksi | seed data, README skeleton, Playwright install |
| M2 | provider.tsx + applyPlan + undo | sensor + rules + tests | Simulator + Toast/Why styling | catat Codex log, mulai eval/run.ts |
| M3 | /api/ally/plan + guard + prompt | engine-client + cache + integrasi | dashboard layout (mulai) | eval harness selesai, run pertama |
| M4 | fallback/timeouts, bug | bus + metrics calc | dashboard | slide + angka |
| M5 | integrasi akhir | tests hijau | polish UI/HP | eval final, results.md |
| M6 | pitch rehearsal | build check | video demo | README + submit |

Sync: akhir setiap milestone (merge ke `main`, smoke test bersama, 5 menit).

---

## 5. Definisi "demo-able" (gate jam 14.00 hari-H)

Semua ini harus jalan tanpa penjelasan tambahan:
1. HP membuka `/checkout` via ngrok.
2. Tap meleset 3x → UI membesar → toast → Why → Undo.
3. Simulator Low Vision & Fatigue bekerja.
4. Dashboard di laptop menampilkan sinyal & log.
5. Satu request LLM sukses dengan explanation tampil (atau fallback jelas bila API down).

Jika salah satu gagal jam 14.00 → **hentikan fitur baru**, perbaiki itu dulu.

---

## 6. `AGENTS.md` (template — tulis ulang di hari-H dari ingatan)

```md
# Ally — Agent Instructions

## What this is
Ally is an adaptive UI engine: a React SDK (`packages/ally-react`) that senses interaction
friction and applies schema-constrained adaptations (design tokens + layout flags) to a host app
(`apps/demo`, a 3-step e-commerce checkout). Decisions come from a deterministic rule layer and,
for ambiguous cases, OpenAI Structured Outputs (strict JSON schema `AdaptationPlan`).

## Hard rules
- Never generate or inject HTML from model output. Only tokens/flags defined in `schema.ts`.
- Never send form values, text content, identifiers, or screenshots to the API. Counters/timings only.
- All interactive elements must read `--ally-target`, `--ally-space`, `--ally-font`.
- WCAG: target ≥44px default (≥24px absolute min), contrast ≥4.5:1 in high mode, visible focus.
- Every adaptation must be undoable and explainable.
- No new runtime dependencies without asking. No `dangerouslySetInnerHTML`.

## Stack
pnpm workspaces · Next.js 15 App Router · React 19 · TypeScript strict · Tailwind · zod · vitest · Playwright
OpenAI: gpt-4o-mini, `response_format: json_schema strict: true`.

## Commands
pnpm dev · pnpm -F @ally/react test · pnpm eval · pnpm build

## Conventions
- Small PR-sized tasks. Add/adjust a test for every rule-layer or guard change.
- Keep `FrictionSummary`, `AdaptationPlan`, `AllyPolicy` as the single source of truth in `schema.ts`.
- Prefer CSS variables + data attributes over conditional React trees for adaptation.
- Log decisions via `bus.ts` (BroadcastChannel 'ally').
```

---

## 7. Prompt engine (system prompt — draf)

```
You are Ally's adaptation planner. You receive anonymized interaction-friction counters for one
user session on an e-commerce checkout, plus merchant policy limits. Return ONE AdaptationPlan.

Principles:
1. Minimal change: adjust only what the evidence supports. Prefer tokens over layout changes.
2. Motor difficulty (mis-taps, slow targeting, rage clicks): raise targetMinSize (48-64),
   spacingScale (1.25-1.75), primaryActionSticky, confirmDestructive.
3. Visual difficulty (zoom, error loops on small text, small average targets): raise fontScale
   (1.2-1.5), contrast "high", hide non-essential content.
4. Cognitive load (hesitation, backtracking, scroll thrash): stepMode "one-per-screen",
   hide all allowed non-essential, inlineHints true.
5. Respect limits exactly. Never exceed. Never touch locked components.
6. confidence reflects evidence strength (0-1). ttlSeconds 60-300.
7. explanation: 1-2 plain sentences a non-technical user understands, stating the observed
   behavior and the change. No jargon, no blame.
```

---

## 8. Codex task list (urutan prompt yang akan dipakai di hari-H)

Hafalkan **pola & urutan**, bukan teksnya.

1. **Scaffold** — "Create a pnpm monorepo: `apps/demo` (Next.js 15, TS, Tailwind, App Router, transpilePackages ['@ally/react']) and `packages/ally-react` (React lib, vitest). Add AGENTS.md from this content: …"
2. **Schema** — "In `packages/ally-react/src/schema.ts` define zod schemas FrictionSummary, Profile, AdaptationPlan, AllyPolicy exactly as follows … Also export a hand-written strict JSON Schema for AdaptationPlan (all fields required, additionalProperties false)."
3. **Tokens** — "Create `apps/demo/styles/tokens.css` with CSS variables --ally-target/--ally-space/--ally-font/--ally-contrast and data-attribute rules for stepMode, hide, sticky, contrast. Import in layout."
4. **Checkout** — "Build a 3-step checkout (Cart → Address → Payment → Success) with Indonesian seed data in Rupiah, inline validation, progress indicator, and distraction components PromoBanner/Recommendations/VoucherCarousel/SocialProof. Every interactive element must use the ally tokens. Support `?ally=off`."
5. **Sensor** — "Implement `sensor.ts` … (list the 9 signals with exact definitions) … emit every 10s and fast-path when missTap≥3 or rageClick≥1. Add vitest tests for missTap geometry and rageClick timing using jsdom."
6. **Rules + presets** — "Implement `rules.ts` scoring … and `presets.ts` mapping … with templated explanations. Tests: 6 cases."
7. **Provider** — "Implement `AllyProvider` with applyPlan (CSS vars + data attrs, defer while an input is focused), undo (restore + raise threshold), keep (persist), Toast and WhyPanel (accessible), `useAlly()`. Broadcast events on BroadcastChannel 'ally'."
8. **Simulator** — "Add a floating Friction Simulator in the demo with Tremor / Low Vision / Fatigue / Reset buttons that inject counters via `sensor.inject`, plus one button that dispatches real synthetic pointer events."
9. **Engine** — "Create `app/api/ally/plan/route.ts` calling OpenAI with strict json_schema … system prompt … timeout … clamp with `guard.ts` … return 204 on failure. Create `engine-client.ts` with cache and integrate in provider for ambiguous cases."
10. **Dashboard** — "Build `/dashboard` subscribing to the bus: counters bars, profile gauge, decision log table, before/after metrics."
11. **Eval** — "Write `eval/run.ts` (Playwright, Pixel 7) simulating 20 tremor sessions with and without Ally and writing results.md with mean±sd for mis-tap rate, time-to-complete, error loops."
12. **A11y self-audit** — "Audit all components in apps/demo and packages/ally-react against WCAG 2.5.8, 1.4.3, 2.4.7, 4.1.2. Fix violations. List what changed."
13. **README** — "Write README with architecture, run steps, 'How we used Codex', eval results, privacy note, roadmap."

---

## 9. Jadwal hari-H (turunan dari estimasi; **update dengan durasi aktual dry-run**)

| Waktu | Milestone | Catatan |
|---|---|---|
| 09.30–10.00 | M0 | A: AGENTS.md pertama (bukti Codex-native) |
| 10.00–11.00 | M1 | C fokus; B mulai sensor paralel |
| 11.00–12.45 | M2 | **Sync 12.00** sambil makan |
| 12.45–14.00 | M3 | **Gate demo-able 14.00** |
| 14.00–15.00 | M4 | D jalankan eval pertama |
| 15.00–15.45 | M5 | angka final → slide |
| 15.45–16.30 | M6 | freeze 15.45; video; submit 16.20 |

Durasi aktual dry-run (isi):

| MS | Estimasi | Aktual | Catatan/hambatan |
|---|---|---|---|
| M0 | 45 m | | |
| M1 | 75 m | | |
| M2 | 120 m | | |
| M3 | 75 m | | |
| M4 | 60 m | | |
| M5 | 60 m | | |
| M6 | 45 m | | |

---

## 10. Risiko eksekusi & cut-list

Jika terlambat, potong dalam urutan ini (dari yang pertama dipotong):
1. S1 voice.
2. Dashboard sparkline → ganti angka polos.
3. Eval N=20 → N=5.
4. `slowTargeting`, `scrollThrash` sensor → sisakan missTap, rageClick, hesitation, errorLoop, zoom, backtrack.
5. Cache engine client.
6. LLM path → **jangan dipotong** (kriteria Codex/OpenAI); kalau terpaksa, tetap tunjukkan endpoint bekerja dengan 1 request.

Jangan pernah potong: checkout end-to-end, missTap→adaptasi live, Undo, Why, toast.

---

## 11. Setelah dry-run: `LESSONS.md`

Tulis:
- Durasi aktual per milestone & apa yang paling lama.
- Prompt Codex yang hasilnya paling bagus / paling buruk (dan kenapa).
- Bug yang muncul (misal: `elementsFromPoint` di iOS Safari, layout jump, race undo).
- Nilai threshold & bobot rule yang terbukti bekerja.
- Angka eval (untuk target realistis di hari-H).
- Hal yang ternyata tidak perlu.

Lalu **hapus kode**. Bawa `LESSONS.md` di kepala.
