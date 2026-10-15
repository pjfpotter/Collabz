# Proposal: graph demo for the cohort to play with

## Why

The cohort graph is the best thing Collabz does, and today the only way to see it is to sign up, finish onboarding and be one of enough real people for it to look like anything. It also only has a crowd on the dev pretend cohort, which never exists in production.

We want fellow students to scan a QR code, land straight on a graph full of people, tap and drag it on their phones, and pick a few tags to see where *they* would sit. No account, no waiting for the cohort to fill up.

## What Changes

- A new public page, **`/demo/graph`**, that draws the real graph component with about 40 invented people. It needs no sign-in and never reads the database.
- The invented people have alias-style names built from the real tag catalogue's alias words ("The Feral Gremlin" style). **None of them is called "Pretend" anything**, and none of them depends on the dev-only pretend cohort or `PRETEND_COHORT`.
- A **"be someone" picker**: a student picks a Hero Story, an Energy, a Vibe, and a few Qualities and Seeking tags. The graph re-scores everyone against them using the real score formula, highlights their top 5 and a glitch match, and puts them in the middle. Nothing is saved anywhere.
- Tapping a person shows the same small panel as the real graph (alias, silhouette, course, tags, why you match), minus the links that only make sense for real accounts (profile page, Connect).
- A printable **QR code** image for the demo page.

Not changing: `schema.prisma`, the database, `/graph`, the score formula, the pretend cohort, sign-up or any real route. See `design.md` for the two small edits to other slices' files this needs, which are flagged for approval.

## Capabilities

### New Capabilities
- `graph-demo`: a public, self-contained, phone-friendly demo of the cohort graph with invented people and a "be someone" picker.

### Modified Capabilities
<!-- None. The real graph's behaviour (collab-graph) does not change. -->

## Impact

- **New code:** `src/app/demo/graph/` (page and client wrapper), `src/lib/graphDemo/` (the invented cohort and the re-scoring), tests beside them.
- **Small edits to existing files (needs approval, see design.md):**
  - `src/lib/cohort/graphData.ts` (slice 4): move the database-free `buildGraph` and `edgeStyle` into their own file so the browser can import them without pulling in Prisma. Re-exported from the old place, so nothing else changes.
  - `src/app/graph/CohortGraph.tsx` (slice 4): one optional prop to hide the "view profile" link in the tap panel.
  - `scripts/make-qr-code.ts` (slice 1): an optional second argument for the output file, because today it always overwrites `public/qr-code.png`, which is the **sign-up** QR.
- **New files in `public/`:** the demo QR code image (`public/qr-graph-demo.png`).
- **Dependencies:** none new.
- **Docs:** `ARCHITECTURE.md` gets a short paragraph at archive time.
- **Open question for Patrick:** which address the QR code points at (production or a preview URL). It is the last task and does not change the design.
