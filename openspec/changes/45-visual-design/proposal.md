# Proposal: Slice 10, visual design (#45)

## Why

The app works but looks unfinished: Arial on white, a plain link bar, and a graph whose colours were picked in a hurry. The cohort will meet it by scanning a QR code on a phone, so the first impression is the design. Claude Design has produced a full visual identity (brand mark, light and dark themes, type, components, silhouettes, graph encoding, mobile and desktop screens). This slice puts that identity into the app without changing what any screen does.

The design is exported at `/home/patrick/Documents/TechNativeBootCamp/design-export/Collabz.html` (outside the repo, read-only reference). The brand files are already in `public/collabz-brand-assets/`.

## What Changes

- **Brand files wired in.** Favicon, app icons, web manifest, theme colour (light and dark) and share image (OG) are added to the app head, so tabs, home-screen installs and link previews show Collabz.
- **Design tokens.** The colours, type sizes, spacing, radii and shadows from the Design language board become Tailwind 4 theme variables, with a light ("paper") and dark ("loam") value for each, switched by `prefers-color-scheme` as the app already does.
- **Fonts.** Instrument Serif (aliases, headings) and Figtree (body) replace Geist and Arial.
- **Shared components**, built once and reused: navigation (restyled, every link the `app-navigation` spec requires stays, Requests count badge), signed-in status, dev switcher strip, course badge, status pills, tag chip and option card, person row and person card, score and "why you match" list, and the empty, error, loading, 404 and placeholder states.
- **Silhouettes.** The twelve designed silhouettes replace the stand-in drawing, behind the same component and the same stored ids, so every screen (and onboarding when #9 lands) gets them.
- **Screens restyled** on the new tokens and components: sign up, sign in, matches, profile (`/people/[alias]`), graph, people, requests, messages, account, admin, catalogue, privacy, terms and home. Desktop layouts follow the Desktop board.
- **Graph restyled, behaviour untouched.** Only the look changes: the new palette, course as colour plus shape (circle or rounded square) plus legend label, and the canvas fonts and label colours. Edge weights, dash pattern, layout distances, drag limit and fit-to-screen all stay exactly as slice 4 built them (team decision, 14 Oct 2026: the export's numbers are ignored, only its aesthetics are used).
- **Reduced motion respected** for the new chip and panel transitions. The graph's motion is not changed.

### What does NOT change

- **No route, data, schema or behaviour change.** Same pages, same actions, same permissions, same words. **Copy is not changed**: the boards' wording is a layout guide only.
- **Onboarding screens (`/onboarding`) are not restyled.** Slice 2 (#9) is still being built; that track adopts the new tokens and components when it finishes. Only the shared pieces it uses (silhouettes, nav, option card) are ready for it.
- **Safety (#16)** has no board and hasn't started; it is built on these tokens by its own track.

## Capabilities

### New Capabilities

- `visual-design`: the app's look as a set of checkable rules: light and dark themes with measured contrast, the course colour-plus-shape-plus-label rule, readable long aliases, phone-first layout with no sideways scroll, reduced motion, and brand metadata. It owns no feature behaviour.

### Modified Capabilities

- `collab-graph`: "Course is shown on the graph" gains shape alongside colour, so colour is never the only cue. Nothing else in that spec changes.

## Impact

- **Depends on** everything merged (slices 0, 1, 3, 4, 5, 6, 7, 8). Checked against master `7f53597` on 14 Oct 2026.
- **Code changed:** `src/app/globals.css`, `src/app/layout.tsx`, `src/components/*` (NavBar, SignedInStatus, DevUserSwitcher, PlaceholderPage, LegalPage), `src/lib/cohort/standIns` (silhouette drawing only), the page and component files of each restyled route, and `src/app/graph/` (colours, node shapes and legend only).
- **Code added:** brand files and manifest, a small set of shared components (see design.md), a silhouette set.
- **Dependencies:** none new. Fonts come through `next/font/google`, already part of Next.js.
- **Schema:** none. **Routes:** none added or removed.
- **Shared code touched that belongs to another track:** `SilhouetteStandIn` (slice 2's stand-in) changes what it draws, not its props. To be flagged to the #9 owner before it lands.
- **Tests:** existing unit and e2e tests must keep passing; selectors that rely on class names or text may need updating, and the nav test changes if link order or labels change. Visual checks are done by hand at 375px and 1280px in both themes.
- **Open merge risk:** `/onboarding` is untouched, so there is no overlap with #9 beyond the shared silhouette component.

## Decisions made (team, 14 Oct 2026)

| Question | Decision |
|---|---|
| Graph numbers from the export (edge width, opacity, link distance)? | **Ignored.** Slice 4's graph is kept as is; only the look changes |
| Brand file location | **Next.js file conventions** (`src/app/icon.svg`, `favicon.ico`, `apple-icon.png`, `manifest.webmanifest`, `opengraph-image.png`) |
| New wording on the boards | **Not used.** No copy changes |
| Which links the nav shows | **The `app-navigation` spec wins.** The design's smaller tab set is not adopted; link visibility by role stays #17's |

## Open questions

1. **Option wording** on the boards is placeholder; the real catalogue text is kept, so nothing to do unless the team wants it reworded.
2. **Screens with no board** (account, people search, requests, admin, catalogue, privacy, terms): default is tokens and shared components only, no bespoke layout.
3. **OG image** uses a fallback serif and a draft strapline; ship as is or regenerate?
