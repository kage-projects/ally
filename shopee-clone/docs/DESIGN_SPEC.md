# Shopee Indonesia — Mobile Design Specification

## Scope and reference inventory

Updated 2026-11-07. The user authorized continuing all twelve supplied mobile screens. Preserve the existing homepage and implement the remaining screens as separate mobile routes. Do not build desktop or tablet layouts or add sections beyond the supplied references.

Primary reference: `screenshots/reference/home.jpeg`, 720 × 1600 image pixels. The working mapping is 360 × 800 CSS pixels at device scale factor 2. This mapping matches the captured image dimensions; the original device's CSS viewport cannot be established from the JPEG metadata alone.

The other eleven references are `profile.jpeg`, `shopping cart.jpeg`, `checkout.jpeg`, `select voucher.jpeg`, `shipping option.jpeg`, `payment method.jpeg`, `address selection.jpeg`, `edit address.jpeg`, `my purchases.jpeg`, `delivered.jpeg`, and `orders details.jpeg`. They are implemented as separate mobile routes. The narrower checkout, edit-address, and order-detail images are not alternative homepage viewports.

## Measured structure

Positions below use screenshot pixels and are measured or rounded to approximately one pixel. CSS measurements divide these by two. Typography and color identification remain estimates because the source is a compressed JPEG.

| Section | Image position and size | CSS implementation at 360px |
| --- | --- | --- |
| Header | x=0, y=0, 720 × 178 | 89px high; status row 43.5px; search 38px high |
| Search field | x=15, y=87, 533 × 76 | 7.5px left inset; camera within the field; cart and chat on the right |
| Wallet | x=15, y=178, 690 × 106 | 53px high; QRIS, balance, coins, SPayLater; thin dividers |
| Services | x=15, y=298, 690 × 188 | 94px high; 62.7px service slots; 34 × 34.5px icons; horizontal scrolling |
| Coin banner | x=15, y=508, 690 × 201 | 345 × 100.5px; 11px top margin; source includes the card edges |
| Media cards | x=15 and 365, y=731, approx. 340 × 307 each | Two equal columns; 5px gap; 153.5px high |
| Media thumbnails | x=27, 189, 377, 539; y=805; 155 × 210 | 77.5 × 105px; 3.5px gap; 3px corner radius |
| Recommendations | starts around y=1053 | Two columns; 8px gap; 7.5px horizontal padding; 9px top padding |
| Recommendation images | x=15 and 368, y=1071, widths 337 | Live promotion on left; product on right; no invented rows |
| Bottom navigation | y=1475–1600 | Fixed 62.5px high; six evenly spaced items; Home selected |

## Visual tokens and hierarchy

- Background: approximately #efefef; cards white; most corner radii 8 CSS pixels.
- Brand accents: approximately #ee4d2d; section heading ink approximately #cf5d44; main text #151515; secondary text #888.
- Font: the reference resembles Android Roboto. A local Roboto regular font from Google Fonts is used. Search and wallet titles are 13.5px, service labels 9.7px with 11.5px lines, media titles 13.5px, product title 12px with 15px lines, navigation labels 9.5px. These are fitted estimates, not verified original style values.
- Header includes a decorative status row to match the screenshot. The original patterned artwork is retained as a clean background asset. Original control pixels are removed using an unobscured strip with an estimated 146 image-pixel repeat; only those small masked regions require approximate reconstruction. Status, camera, cart, and chat artwork are rendered separately in React.
- The hierarchy is header → wallet → services → coin promotion → live/video → visible recommendations. Navigation stays fixed while content scrolls.
- Only mobile widths are supported, with a 430px maximum frame. No desktop or tablet composition or tests are defined.

## Components and source assets

The homepage components remain in `src/main.jsx`: Header, WalletBar, Categories, MediaPanel, BottomNav, and Home. App selects the current route using the browser History API. New screens share the status bar, toolbar, rows, badges, footer, and switches in `src/mobile-ui.jsx`. `src/commerce.jsx` holds local selection and form state. Search is editable; the services row scrolls horizontally. Backend interactions are outside this slicing scope.

Images and custom service/navigation/wallet icons are extracted from `home.jpeg` into local PNG assets. Run `npm run assets:extract` to reproduce the crops using Chromium's decoder. Text and layout use React/CSS. The source product crop contains part of a translation popup visible in the original screenshot; the missing part is not reconstructed as an app feature.

On 2× displays, the large raster assets are translated by -0.5 CSS pixels in both directions to correct a measured device-pixel rasterization offset. Their layout boxes retain the measured dimensions.

## Setup and mobile validation

- npm dependencies are installed locally and the production Vite build passes. `package-lock.json` records the resolved dependencies; no additional UI framework was introduced.
- Vite's dependency scanner encountered Windows sandbox access denials. Starting the dev server with the approved escalation resolved the issue; this is separate from dependency availability.
- Playwright uses its installed Chromium when available, otherwise the installed Chrome channel. `VISUAL_BROWSER_CHANNEL` can explicitly select a channel. No browser download is required on this machine.
- Both `playwright.config.js` and `scripts/visual-check.mjs` target mobile only: 360 × 800 at 2×, and 390 × 844 at 1×, with mobile/touch emulation.
- Run `npm run dev -- --host 127.0.0.1`, then `npm run visual:check`. `VISUAL_BASE_URL` optionally selects another running server. Captures are viewport screenshots so the reference capture is exactly 720 × 1600.
- `npm test` covers both sizes: homepage visibility, images, overflow, search, service scrolling, fixed navigation, profile/home navigation, cart selection/quantity/coins, confirmed checkout options, address edits, and purchase/order/tracking navigation.
- `npm run build`, `npm run visual:check`, and all 14 Playwright tests pass. All 27 captures have zero broken images, page errors, or horizontal overflow; all twelve reference comparisons match source image dimensions.

Artifacts in `screenshots/actual/`: `mobile-reference.png` (homepage, 720 × 1600), `mobile.png` (homepage, 390 × 844), `<screen>-mobile-reference.png`, `<screen>-mobile.png`, and the three tall `<screen>-reference-native.png` captures. Differences amplified 3× are saved as `*-diff.png`; measurements are in `*-comparison.json`. `validation.json` records runtime checks, `review.html` shows each reference beside its matching capture, and `mobile-overview.png` shows all twelve 390px screens.

## Visual comparison and refinements

The captures were opened and compared repeatedly with the homepage reference. The five largest initial discrepancy groups were corrected:

1. Header: replace the unrelated generated pattern, repair corrupted status text, align the search field, and fit the camera/cart/chat proportions.
2. Wallet and typography: use local Roboto, source wallet icons, fitted text baselines, and adjusted coin/balance spacing.
3. Services and promotion: preserve partial next-service clipping, fit label widths, and restore the full coin artwork rather than clipping its headline.
4. Media and recommendation geometry: match image widths, column padding, heights, and device-pixel positioning.
5. Navigation: use the actual source icon shapes, fit label sizes and badge positioning, and match the fixed bar/gesture area.

Final diagnostic mean absolute RGB errors (0–255 scale, lower is closer) are header 5.32, wallet 10.25, services 6.41, banner 3.15, media 5.98, recommendations 5.85, navigation 6.94. Before the final alignment/refinement rounds, header error was 11.84, banner 8.38, media 12.32, recommendations 11.78, and wallet 13.26. These figures describe pixel differences, not a percentage accuracy score or pass threshold.

Remaining differences: small parts of the header pattern under controls are reconstructed, icon silhouettes extracted from the compressed screenshot have softer edges, font rasterization differs from Android, source imagery is already compressed, and the source translation popup is partially baked into the product crop. No claim of pixel-perfect equivalence is made. The 390px capture has no separate matching reference and is validated for mobile layout integrity.

## Homepage task completion

`docs/MOBILE_TASKS.md` records the six homepage tasks, their completion status,
and validation evidence. All six are complete within the mobile-homepage scope.
The remaining mobile tasks and their validation evidence are recorded there as well.

## Additional mobile screens — authorized continuation

The user authorized implementing the other eleven mobile screens. These are
separate routes; the existing homepage hierarchy remains intact. All routes
are tested at 360 × 800 @2× and 390 × 844 @1×. No desktop/tablet layouts are added.

Measured/estimated CSS dimensions at the working 2× mapping for 720px images:

| Screen | Layout observations |
| --- | --- |
| Profile | 122.5px brand header; verify card y=130, h=96; purchases card y=233, h=223; wallet y=463.5, h=180; six fixed bottom tabs |
| Cart | 89px header; 7.5px outer margins; first shop h=211; subsequent shop h≈198; 90px product thumbnails; fixed 147px voucher/coins/checkout footer |
| Vouchers | 89px header; 58px code area; 99px voucher tiles with 99px colored left artwork; fixed footer from approximately y=683 |
| Shipping | 89px header; 84.5px introduction; instant option h=84; other options h=64.5; fixed confirm footer |
| Payment | 89px header; card x=7.5,y=96.5; bank row h=45.5; SPayLater promotion 236.5 × 67.5; first plan h=86, later plans h=67 |
| Address selection | 89px header; 32px gray section label; radio at x≈11.5; address text at x≈41; edit link on right; thin rules between entries |
| Purchases | 89px header; 34px horizontal tabs; shop cards at y≈126.5,333,644; product thumbs 78 × 78 |
| Delivered | Gray page, rounded toolbar; delivery progress card y≈97.5 h≈101; guarantee, driver, parcel, then vertical tracking timeline |

Checkout (379 × 1600), edit address (532 × 1600), and order details (391 × 1600)
are taller/narrower exports. Their original CSS viewport is not known. For an
additional image-dimension comparison, the capture uses a 360px CSS width,
DPR = source width / 360, and a taller viewport preserving the source aspect
ratio. These extra tall captures supplement the two required phone viewports;
text metrics remain estimates rather than claims about original device metadata.

Native-width layout observations: checkout has 8px card margins, an address
card at y≈102, shop y≈224–793, vouchers y≈801–895, payment y≈903–1171,
price details y≈1178–1404, and a fixed bottom summary. Edit address has a
paste panel, grouped form inputs, a map image, three switches, and two bottom
buttons. Order details has a teal completion banner, shipping and recipient
cards, product, support rows, order metadata, and a two-column recommendation
grid. Only visible recommendation cards are included.

## Final routes and comparison results

| Screen | Route | Mean absolute RGB error, 0–255 |
| --- | --- | --- |
| Home | `/` | Per-section values above |
| Profile | `/profile` | Header 8.46; other sections 6.17–13.16 |
| Shopping cart | `/cart` | 10.15 |
| Checkout | `/checkout` | 9.86 |
| Vouchers | `/vouchers` | 9.95 |
| Shipping | `/shipping` | 5.07 |
| Payment | `/payment` | 6.85 |
| Address selection | `/addresses` | 13.80 |
| Edit address | `/address/edit` | 9.30 |
| Purchases | `/purchases` | 10.84 |
| Order details | `/orders/1` | 13.45 |
| Delivery tracking | `/delivery` | 8.04 |

The five largest additional discrepancy groups were corrected in repeated comparisons:
shared toolbar title offsets; cart shop-heading baselines and thumbnail columns;
voucher headline wrapping and logo cropping; address form/map vertical spacing
and saved-address line wrapping; purchase quantity alignment and delivery
progress/timeline spacing. The profile header error fell from 15.50 to 8.46,
voucher error from 12.61 to 9.95, edit address from 12.78 to 9.30, and shipping
from 5.64 to 5.07. Scores are diagnostics, not an accuracy percentage.

All twelve reference layouts were inspected against captures. Some detailed
icon strokes use Lucide equivalents, Android and Windows font rendering differ,
small masked header regions are reconstructed, and low-resolution crops retain
the compression and overlays in their sources. These remaining differences are
not represented as pixel-perfect completion.

The implementation is a frontend replica with reference fixture data and
in-memory choices. It does not submit real orders, activate credit products,
perform bank transfers, provide live map pinning, or implement unreferenced
support/verification screens. Checkout prices mirror the reference fixture;
they are not a production pricing engine. Refresh resets local demo selections.
No backend, additional UI dependencies, desktop/tablet layouts, or publication
were introduced.

Run `npm run assets:extract` to regenerate both homepage and remaining-screen
assets. For one task's visual QA, use e.g. `npm run visual:check -- profile cart`;
without arguments all twelve screens are captured. Keep the development server
running on port 5173, or supply `VISUAL_BASE_URL`.
