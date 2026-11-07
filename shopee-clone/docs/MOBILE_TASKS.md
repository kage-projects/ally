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
