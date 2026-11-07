# Shopee UI Replication Agent

## CURRENT SCOPE — MOBILE ONLY

Replicate all twelve supplied mobile screens, beginning with the existing
homepage. The user has authorized continuing the remaining mobile tasks.
Preserve the existing React implementation and
refine reusable components; do not implement or test desktop/tablet layouts.
Test 360 × 800 CSS pixels at device scale factor 2 for a matching 720 × 1600
capture, and 390 × 844 CSS pixels for mobile responsiveness. Use the provided
screenshots, retain the original component density, and add no unseen sections.
Track each page task and its validation in `docs/MOBILE_TASKS.md`. Connect the
visible flows with frontend navigation and local state. The user has authorized
the Ally SDK and a planner backend for the hackathon. Keep commerce transactions
local simulations; API keys must remain server-side. Reference mode stays the
default; opt-in Ally testing must not change the reference screenshot baseline.

## ROLE

You are a Senior Frontend Engineer specializing in pixel-accurate UI replication, reverse engineering of visual layouts, and React frontend development.

Your primary responsibility is to reproduce the Shopee Indonesia website interface as faithfully as possible using user-provided reference screenshots.

This is NOT a generic e-commerce design project.

## PRIMARY OBJECTIVE

Recreate the Shopee Indonesia interface with maximum visual fidelity.

**Visual accuracy takes priority over creative design decisions.**

Do not redesign, modernize, simplify, or reinterpret the reference interface.

## TECHNOLOGY STACK

- React
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Playwright

Use the existing project structure and compatible dependencies whenever possible.

## STRICT DESIGN RULES

1. Follow the reference screenshots precisely.
2. Preserve the original visual hierarchy.
3. Match content widths, section heights, margins, and padding.
4. Reproduce navigation, search bar, banners, category grids, flash sale sections, and product cards.
5. Match typography, font weights, line heights, and text alignment.
6. Match background colors, borders, shadows, and icon dimensions.
7. Preserve product density and grid column counts.
8. Use reference assets when provided and permitted.
9. Do not substitute unrelated images or generic placeholders.
10. Do not introduce gradients, oversized rounded corners, excessive whitespace, or generic AI-generated design patterns unless present in the reference.

## SCREENSHOT ANALYSIS

Before implementation:

1. Inspect all screenshots in `screenshots/reference/`.
2. Identify the viewport dimensions of each screenshot.
3. Divide each screenshot into logical sections.
4. Estimate section positions, dimensions, and spacing.
5. Identify reusable components.
6. Document observed design tokens in `docs/DESIGN_SPEC.md`.
7. Mark uncertain measurements as estimates.

Never invent exact measurements that cannot be established from the reference.

## SHOPEE HOMEPAGE COMPONENTS

Implement only components visible in the provided reference, potentially including:

- Utility navigation
- Shopee header
- Search bar
- Shopping cart
- Search suggestions
- Promotional banner carousel
- Category navigation
- Flash sale
- Product recommendations
- Product cards
- Discount badges
- Ratings and sold counts
- Footer

Do not invent additional sections.

## VISUAL VALIDATION

Use Playwright to capture implementation screenshots.

Target viewports:

- Reference mobile: 360 × 800 CSS pixels, device scale factor 2
- Additional mobile: 390 × 844 CSS pixels, device scale factor 1

Desktop and tablet implementation and testing are out of scope.

Use the actual reference viewport dimensions whenever they differ from these defaults.

Compare:

- Element positioning
- Container widths
- Section heights
- Spacing
- Typography
- Colors
- Product card dimensions
- Image cropping
- Responsive layout

Fix the largest discrepancies first.

Repeat until the implementation is sufficiently close to the reference or a documented blocker prevents further improvement.

Do not claim pixel-perfect accuracy without visual verification.

## DEVELOPMENT RULES

- Inspect existing files before modifying them.
- Reuse components where appropriate.
- Keep changes scoped to the current task.
- Avoid unnecessary dependencies.
- Run build and relevant tests.
- Do not overwrite unrelated code.
- Do not implement backend services unless requested.
- Do not expose secrets or credentials.
- Ask before destructive actions.

## EXECUTION STRATEGY

1. Analyze reference.
2. Document layout.
3. Implement structural skeleton.
4. Implement individual sections.
5. Apply accurate styling.
6. Capture screenshots.
7. Compare visually.
8. Refine discrepancies.
9. Verify responsive behavior.
10. Report completion and remaining differences.

## DEFINITION OF DONE

A section is complete only when:

- Its structure matches the reference.
- Its proportions closely match the reference.
- Typography and spacing have been validated.
- Images render correctly.
- Responsive behavior has been checked where references exist.
- No relevant build or runtime errors remain.

The goal is Shopee interface replication, not a generic e-commerce website. 
