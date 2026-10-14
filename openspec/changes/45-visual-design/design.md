# Design: Slice 10, visual design (#45)

## Context

See `proposal.md` for why and for what is out of scope. The facts this plan is built on, checked against master `7f53597` on 14 Oct 2026:

- Styling is Tailwind 4. `src/app/globals.css` has two colours (`--background`, `--foreground`) switched by `prefers-color-scheme`, and the layout loads Geist.
- The graph's colours live in `src/app/graph/graphColours.module.css` (one place read by the legend and by the canvas), named in `graphColours.ts`. Layout, drag limit and fit-to-screen numbers are in `CohortGraph.tsx` and were tuned in slice 4.
- Silhouettes are drawn by `SilhouetteStandIn` in `src/lib/cohort/standIns` (slice 2's stand-in), used by matches, people, requests, messages, graph and profile. Each person's silhouette is stored as an id like `silhouette-03`.
- The nav bar (`src/components/NavBar.tsx`) is a wrapping row of links for every page, with the signed-in status and the dev switcher.
- The design reference is the exported bundle; its boards are plain HTML with inline styles, so they are a visual spec, not code to copy.
- CLAUDE.md warns this is a newer Next.js than we know. File conventions for icons, manifest and `next/font` were read in `node_modules/next/dist/docs/01-app/` before planning.

## Goals / Non-Goals

**Goals:**
- One place that defines every colour, size and radius, so a later change to the look is one edit.
- Each shared component is built once, then reused by every screen.
- Every restyled screen is checked at 375px and 1280px, light and dark.

**Non-Goals:**
- No new features, routes, copy meaning, data or schema.
- No component library, CSS-in-JS or animation library.
- No change to the graph's layout, edge weights or dash pattern.

## Decisions

### 1. Tokens are CSS variables, exposed to Tailwind with `@theme inline`

`globals.css` defines named variables once for light (`:root`) and overrides them inside `@media (prefers-color-scheme: dark)`, exactly the pattern the file already uses. `@theme inline` then maps them to Tailwind colour names (`bg-surface`, `text-muted`, `border-line-strong`, `bg-primary`, `text-on-primary`, `text-primary-text`, `software`, `business`, `business-text`, `glitch`, `danger`). Spacing keeps Tailwind's 4px scale, so only radii and shadows need custom tokens.
*Why:* it is the smallest change from what we have and beginners can read it in one file. *Alternative:* a JS theme object, rejected because the canvas and Tailwind would then need two copies.
Note the design has two values we must not mix up: `primary` is a **fill** colour (same in both themes) and `primary-text` is the readable text version (darker in light mode); `business` is for shapes and `business-text` for text.

### 2. Fonts through `next/font/google`

Instrument Serif and Figtree are loaded in the root layout with CSS variables, replacing Geist, and wired to `--font-display` and `--font-sans`. *Why:* self-hosted at build time, no layout shift, no extra files in the repo. *Alternative:* the woff2 files from the export in `public/`, rejected as more files for no gain. Aliases always use the display font with `overflow-wrap: anywhere`.

### 3. Brand files use Next.js file conventions

`icon.svg`, `apple-icon.png`, `manifest.webmanifest` and `opengraph-image.png` go in `src/app/`; Next serves them and, for the manifest and share image, writes the head tags. The icon and apple-icon links are listed by hand in the layout's `metadata.icons`, because setting `icons` there (needed for the pinned-tab icon, which has no file convention) makes Next ignore the icon files it would otherwise find. Theme colours go in the layout's `viewport` export (light `#F6F3EA`, dark `#0D100C`). `favicon.ico` and the 192, 512 and maskable PNGs stay in `public/`: the export's ico holds PNGs without an alpha channel, which Next's image processing refuses when the file is in `src/app/` (found building group 1), and the manifest already points at the PNGs by `/icon-192.png` etc. Page titles already end "· Collabz", so no title template is added (it would double the suffix). *Alternative:* hand-written `<link>` tags for everything, which is what the export's snippet shows; the conventions give the same result with less to maintain. The untracked `public/collabz-brand-assets/` folder is gone once the files are moved.

### 4. Course is one small component and one rule

A `CourseMark` component draws the shape (circle or rounded square) in the course colour and writes the name, used by the course badge, person rows and cards, and the graph legend. The graph's canvas code draws the same two shapes from the same colour names. A course that isn't Software or Business keeps the grey circle fallback that already exists. *Why:* "never colour alone" is the single most important accessibility rule here, so there is one place that enforces it.

### 5. Silhouettes keep their component and their ids

The twelve designs become one React SVG component, with a lookup from the stored id (`silhouette-01` to `silhouette-12`, in the board's order: Sprout, Capped, Antennae, Specs, Beanie, Curls, Bun, Spiky, Hooded, Headphones, Halo, Wide hat) to the drawing. `SilhouetteStandIn` keeps its props and calls it, so no caller changes. They use `currentColor` plus the foxfire detail so they work in both themes. Unknown ids fall back to the first. **Assumption to check in task 2.1:** the seed's ids really are `silhouette-01` to `silhouette-12`.

### 6. Graph: restyle only

`CohortGraph.tsx` keeps every number it has: edge width and faintness mapping, dash pattern, link distances, drag limit, fit-to-screen. The export's graph numbers are deliberately not used. What changes is the look:
- `graphColours.module.css` stops holding hex values: it points at the global tokens so the legend (HTML) and the canvas still read the same names. A canvas can't read Tailwind classes, so it keeps reading CSS variables at start-up, as now;
- nodes are drawn as a circle (Software) or rounded square (Business), so course is colour plus shape plus legend;
- the highlight, glitch, line and label colours come from the new palette (top five in `primary`, glitch in the `glitch` token), keeping the existing roles;
- the panel and list under the graph use the shared components.
Reduced motion for the graph is not touched because its motion isn't changed.

### 7. Navigation: restyle, keep every link

`NavBar` stays the single nav, rendered once in the layout, and keeps every link it has today, because the `app-navigation` spec requires a link to each page and that spec takes precedence over the design's smaller tab set. Only its look changes: tokens, display wordmark, 44px tap targets, focus ring, the Requests count badge, and the same wrapping layout so nothing scrolls sideways at 375px. A bottom tab bar is **not** built. The dev switcher becomes the dashed orange strip.

### 8. States are components, not copy

Empty, error, loading, 404 and placeholder states become small shared components that take text as props, so each screen keeps its existing words. Loading is shape-only (no spinner), as designed.

### 9. Testing

Visual work is mostly looked at, so the checks are specific: the existing e2e suite must stay green (selectors that depended on the old nav text are updated in the group that changes it); a new e2e test that opens each main page at 375px and fails on horizontal scroll; and a manual checklist per group (both themes, 375 and 1280, reduced motion on the graph). Contrast is taken from the Design language board's measured ratios; any colour used that is not on it is measured before use.

## Risks / Trade-offs

- **Silhouette ids don't match the seed** → checked in task 2.1 before anything is drawn; stop and ask if not.
- **Touching shared components others import** (`SilhouetteStandIn`, `NavBar`, `PlaceholderPage`) → props unchanged, so no caller breaks; flag to the #9 owner in the PR.
- **Tests that match old text or classes break** → fix in the group that causes them, never at the end.
- **Merge conflicts with #9** → `/onboarding` is not touched.
- **Graph readability regresses** → check with the full pretend cohort (29 people, 406 edges) at 375px, both themes, before the group is called done.
- **Fonts blocked at build** (no network) → Vercel builds have network; locally `next/font` caches. Fallback stack is `system-ui` and `Georgia`.
- **Large PR** → split into the groups in `tasks.md`, each ending in a commit and a pause; PRs can go per group if the team prefers.

## Migration Plan

No data or schema change. Deploy as normal; roll back by reverting the PR. Because the app reads `prefers-color-scheme` only, there's nothing to migrate for existing users. Delete `public/collabz-brand-assets/` once the files are moved (task 1.2).

## Open Questions

The three open questions in `proposal.md`; none changes what gets built.
