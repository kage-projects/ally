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
- `npm test`: 14 tests passed across the two required mobile sizes.
- `npm run visual:check`: 27 captures across all 12 screens, zero page errors,
  broken images, or horizontal overflow; 12 comparisons match source image dimensions.
- Matching-size captures and the 390px overview were visually inspected.
- Gallery: `screenshots/actual/review.html`; overview: `mobile-overview.png`;
  runtime results: `validation.json`; per-screen differences: `*-diff.png` and
  `*-comparison.json`.
- All homepage and M1–M5 slicing tasks are complete. Residual rasterization,
  reconstructed artwork, and fixture-data limits are documented in DESIGN_SPEC.
