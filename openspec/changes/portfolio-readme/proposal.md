# Proposal: turn the repo into a portfolio piece

## Why

Collabz is finished enough to show people, and the repo is public, but its front door is a developer manual: the README opens with "Tinder for Business" and a list of prerequisites. Someone who finds it from a CV, a LinkedIn post or the presentation sees none of the good things we made: the promo video, the live site, the architecture, the course that explains it, or the story of how five beginners learned to work with AI professionally.

We want a visitor to understand in one minute what Collabz is, see it, try it, and see how we built it. The developer manual stays, but moves below the showcase.

## What Changes

- **README.md gets a portfolio front door** above the existing manual:
  - the tagline "LinkedIn for feral genius goblins" and a two-line pitch
  - the promo video (a thumbnail that opens `brag.mp4`)
  - a link to the live site, `https://collabz-ten.vercel.app`, with a new QR code
  - a clear **student-project disclaimer**: there are no active admins, anyone can raise an issue on GitHub, and a GitHub issue is also how to tell us if something dodgy is going on (no email address is published)
  - the architecture diagram, shown in light and dark mode, with a link to the interactive version
  - links to the interactive course, to Tom's presentation slides, and to `openspec/changes/archive/` as the evidence trail
  - **our learning journey** and who built what
- **The existing developer manual stays** in the README, unchanged, under a new `## For developers` heading.
- **The interactive course is hosted on the Vercel deployment.** It moves from `docs/Collabz-course/` to `public/course/`, so it is served at `/course/index.html`, and `/course` redirects there.
- **The architecture diagram is published** as a standalone page at `/architecture.html` (interactive, light and dark themes), with a PNG of each theme for the README.
- **Tom's presentation slides are hosted on the site too**, as a lighter, cleaned copy at `/slides/collabz.html`. It stays an HTML deck (people read slides on their phones, not PDFs). The copy drops one slide (a photo of a teammate), paints Tom's personal email out of one screenshot, and recompresses the images, so the file goes from 17 MB to under 3 MB. Tom's original file is not changed.
- **A new QR code** for the live site's home page, `public/qr-live-site.png`, made with the existing `npm run qr` command. It does not overwrite `qr-code.png` (sign-up) or `qr-graph-demo.png` (graph demo).
- **The video and its thumbnail** are copied into `docs/media/`.

Not changing: `schema.prisma`, any app route, the nav bar, the matching formula, sign-in, or any other slice's code. The only edit to app configuration is one redirect in `next.config.ts`.

## Capabilities

### New Capabilities
- `portfolio-showcase`: public, sign-in-free pages that explain Collabz to an outside visitor: the interactive course, the architecture diagram and the presentation slides.

### Modified Capabilities
<!-- None. The README is documentation, so it is described in design.md and tasks.md rather than in a spec. -->

## Impact

- **New files served by the app:** `public/course/` (about 230 KB of static HTML, CSS and JS), `public/architecture.html` (about 760 KB, one self-contained file), `public/slides/collabz.html` (about 2.8 MB, one self-contained file) and `public/qr-live-site.png`.
- **One small edit to existing config:** `next.config.ts` gains a `redirects()` entry for `/course`. It is the only code change, and it is flagged for approval in `design.md`.
- **New docs files:** `docs/media/` (video, thumbnail, two diagram PNGs, the diagram's JSON source).
- **README.md:** new top section; the old title block and "What this is" paragraph are replaced by it, and the rest is kept as is.
- **Tests:** one small read-only Playwright spec that checks `/course`, `/architecture.html` and `/slides/collabz.html` open without signing in.
- **Dependencies:** none new.
- **Docs:** `ARCHITECTURE.md` gets one sentence at archive time (static showcase files in `public/`).
- **No issue number yet.** `WORKFLOW.md` wants one name everywhere. This change follows `landing-page-demo` and `graph-demo` in having none; if you open an issue, the change and branch should be renamed to match.
