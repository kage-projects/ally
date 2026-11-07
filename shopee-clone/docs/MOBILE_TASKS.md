# Mobile implementation tasks

Each task is completed with a build, relevant interaction checks, and an
inspection of actual screenshots. Completion means visually close to the
reference with any residual differences recorded; it does not mean a claim of
pixel-perfect equivalence.

## Homepage — completed

| ID | Task | Status | Evidence |
| --- | --- | --- | --- |
| H1 | Repair npm/Vite; configure mobile-only Playwright | Complete | Production build and two mobile test projects pass |
| H2 | Finish the header pattern, search, and icon proportions | Complete | Header RGB error reduced from 11.84 to 5.32; source icons and background inspected at both mobile sizes |
| H3 | Match wallet and service-row density | Complete | Measurements and screenshot comparison in `DESIGN_SPEC.md` |
| H4 | Match promotion, live/video, and recommendation imagery | Complete | Source crops, corrected image geometry, and comparison artifacts |
| H5 | Match fixed navigation and mobile scrolling | Complete | Source icons and mobile interaction tests |
| H6 | Final mobile regression and visual review | Complete | Both mobile captures inspected; build, visual check, and all four mobile tests pass |

## Remaining mobile tasks — authorized by "okey lanjut"

Continue in this sequence, validating one task before moving to the next:

| ID | Task | Status |
| --- | --- | --- |
| M1 | Profile and navigation to the existing homepage | Complete — both captures inspected, navigation tested |
| M2 | Shopping cart and selection/quantity controls | Complete — both captures inspected, totals/quantity tests pass |
| M3 | Checkout, voucher selection, shipping options, payment methods | Complete — four screens compared; confirmed choices persist across navigation |
| M4 | Address selection and edit-address form | Complete — both screens compared; selection and form submit tested |
| M5 | Purchases, order details, delivery tracking | Complete — three screens compared; order/tracking navigation and tabs tested |

These are frontend slicing tasks based on the supplied images. They do not
include backend services, real transactions, or invented screens.

## Final validation

- `npm run build`: passed.
- `npm test`: 16 calculation/validation/SDK/backend unit tests and 18 browser tests;
  browser journeys run at both required mobile sizes.
- `npm run visual:check`: 27 captures across all 12 screens, zero page errors,
  broken images, or horizontal overflow; 12 comparisons match source image dimensions.
- Matching-size captures and the 390px overview were visually inspected.
- Gallery: `screenshots/actual/review.html`;
  runtime results: `validation.json`; per-screen differences: `*-diff.png` and
  `*-comparison.json`.
- All homepage and M1–M5 slicing tasks are complete. Residual rasterization,
  reconstructed artwork, and fixture-data limits are documented in DESIGN_SPEC.

## Interaction follow-up — completed

| ID | Task | Status |
| --- | --- | --- |
| I1 | Cart editing, empty state, selected-product checkout, local search | Complete — deletion confirmation/cancel, search-to-cart, and UGREEN checkout regression tested |
| I2 | Checkout draft, vouchers, shipping, payment, local order confirmation | Complete — quantities/prices follow selected items, choices persist, simulated orders appear under To Pay |
| I3 | Address validation, quick-fill, local pin, add/delete and route return | Complete — invalid form data is blocked; supported fields and settings save locally |
| I4 | Order-specific details, local ratings, return requests, repeat purchase | Complete — correct order data and explicit local simulation feedback |
| I5 | Existing visible controls, previews, notices and header cleanup | Complete — native buttons/dialogs, useful local previews, truthful service availability, source-based profile polish |

These interactions use in-memory data. Order placement and return requests are
explicit simulations; unsupported account, financial, delivery, chat and media
services show availability information or local source-image previews.
No live financial service was added. The later hackathon authorization adds the
Ally SDK and planner backend below; commerce actions still remain local.

## Ally hackathon integration

- Installed the supplied SDK runtime with a policy-aware transport deadline;
  original sibling SDK source remains unchanged.
- Added persistent provider, coarse shopping phases, form error reporting,
  protected markup and opt-in adaptive styling. Keep/Why/Undo is browser-tested
  at both required mobile sizes, including responses delayed beyond two seconds.
- Added the same-origin Node/OpenAI planner with schema/evidence/policy guards,
  bounded request size, origin checks, concurrency and rate limits.
- Added server-only `.env.local` configuration, ignored from Git, and `.env.example`.
- Preserved all reference screenshots: 27 captures, 12 matching-dimension
  comparisons, no page errors, broken images or horizontal overflow.
- Setup, demo steps and explicit live smoke commands are in `README.md`.
- Live browser smoke passed against OpenAI: valid `source: llm` plan in about
  3 seconds, form text changed from 13.5px to 14.3px, Keep succeeded, and Undo
  restored 13.5px; zero page errors or horizontal overflow.

### Ally usability follow-up

- Reproduced a lost opt-in: navigating from `/address/edit?ally=1` to
  `/addresses` dropped the query parameter, and reloading disabled Ally.
- Internal links and programmatic navigation now preserve explicit `ally=1`
  and `ally=0`; mode selection also follows browser history. Plain routes
  continue to use reference mode by default.
- Added an opt-in-only pending prompt, "Selesai mengisi, terapkan", so users
  can leave a focused field when an adaptation is ready. The SDK's focus and
  composition guards remain in control; no interaction counters are simulated.
- Regression tests cover opt-in navigation/reload and applying a pending plan
  through touch input at both required mobile sizes. Production build, all 16
  unit tests and all 20 Playwright tests pass. Visual validation produced 27
  captures across all 12 reference screens with no page errors, broken images
  or horizontal overflow.
- Re-tested the real browser/SDK/backend/OpenAI flow using touch input and the
  pending prompt: valid `source: llm` response in 2.8 seconds, form text
  13.5px → 14.3px, Keep succeeded, and Undo restored 13.5px. The pending and
  applied screenshots were visually inspected at 360px; automated interaction
  checks also pass at 390px.

### Faster Ally trigger

- Updated the host SDK snapshot to `0.1.0-shopee.2`. Five genuine repeated
  validation errors emit an early snapshot, without waiting for the regular
  10-second window or depending on the motor fast-event latch. Existing rule
  thresholds, server evidence gates, focus/composition guards and Undo remain
  unchanged. The sibling SDK source was not modified.
- The address demo now needs four Submit attempts with two invalid fields.
  The demo pill immediately shows "Memproses…" once the planner is called.
- Browser regression checks require a planner request within two seconds of
  the repeated attempts, reject a single validation failure as insufficient,
  and exercise a 2.5-second mock response plus Keep/Why/Undo at both mobile sizes.
  Production build, all 16 unit tests, all 20 browser tests and the 27 reference
  captures pass with no page errors, broken images or horizontal overflow.
- A browser timing check at 360px/390px sent the request in 224ms/232ms from
  the first Submit tap; the pending prompt appeared in 3.23s/3.17s with an
  explicitly mocked 2.5-second response. Processing-pill screenshots at both
  mobile sizes were visually inspected. These timings are not live AI latency.
- A fresh live smoke could not reach OpenAI in the current execution sandbox:
  the network call returned `EACCES`. Live latency for this snapshot is
  unverified; the earlier live results above belong to the previous snapshot.
- Confirmed the demo pill is visible immediately on `/cart?ally=1` and
  `/address/edit?ally=1`. It is hidden on plain `/` by design. Homepage demo
  mode (`/?ally=1`) shows the pill but does not activate shopping adaptations.

### Expanded Ally scenarios — complete

| ID | Work | Status |
| --- | --- | --- |
| A1 | Observe browsing, account navigation, purchases, order details and tracking with coarse anonymous phases | Complete — all 12 routes tested at both mobile sizes |
| A2 | Contextual guidance on all 12 supplied screens plus review/return dialogs; scenario catalog in demo panel | Complete — 14 linked scenarios and adaptive screenshots inspected |
| A3 | Genuine repeated errors from product/order search, unavailable payment activation, reviews and returns | Complete — genuine form events, no automatic commerce choices |
| A4 | Fast zoom observations and guarded local combined help, with optional asynchronous AI refinement | Complete — weak evidence rejected; strict merchant thresholds respected |
| A5 | Keep/Undo/Why within native modal dialogs; preserve form values and commerce choices | Complete — modal controls, AI failure and late-response cancellation pass |
| A6 | Reference screenshot regression, complete mobile suite and final screenshots | Complete — production build, 17 unit tests, 66 Playwright tests and 27 reference captures pass |

The current host snapshot is `0.1.0-shopee.3`. This supersedes the earlier
checkout-only and AI-required combined-friction behavior above. The original
sibling SDK source remains unchanged. Reference mode remains the default.

- A combined local preset requires both supported dimensions to meet the
  merchant apply threshold; its confidence is the weaker supported score.
  Fast validation snapshots now emit at six repeated errors. This corresponds
  to four invalid Submit attempts with two fields, or seven attempts with one.
- Reference captures retain the previous diagnostic comparison scores, with
  zero broken images, page errors or horizontal overflow. Adaptive captures
  are under `screenshots/actual/ally-cases/`; modal controls and the compact
  transient explanation were also inspected.
- A browser run against the actual local server, without mocked endpoints,
  produced local help in 247ms from the first of four Submit taps. The planner
  returned HTTP 502 under the current network restriction, while the guarded
  local plan applied successfully with no horizontal overflow. This measures
  local assistance, not successful live AI refinement.

### Ally quantity glyph refinement

- Center plus/minus glyphs inside the existing adaptive quantity targets.
  Scale icons to 20–24px with a 2.25 stroke so the visible symbol grows with
  the hit area. Default cart and dialog icon sizes remain unchanged.
- Validation: production build and six relevant Playwright checks pass at
  360×800 @2 and 390×844 @1. Before/after card screenshots were inspected.
  Browser measurements confirm centered 24px glyphs in 56px motor targets and
  20px glyphs in 48px visual targets, including the quantity dialog. Plus/minus
  actions work, Undo restores 12px cart glyphs while retaining the selected
  quantity, and neither mobile size has horizontal overflow.
