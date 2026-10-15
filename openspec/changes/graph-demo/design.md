# Design

## Context

- The real graph is drawn by `src/app/graph/CohortGraph.tsx`, which takes `{ nodes, links }` and draws them on a canvas. All the rules (top 5, glitch, line thickness) are decided before it, by `buildGraph()` in `src/lib/cohort/graphData.ts`, which is a plain function with no database.
- The same file also imports `prisma` at the top, so anything that imports `buildGraph` from it pulls the database client along. That is fine on the server and not fine in the browser.
- The score formula (`calculateScore` in `src/lib/matching/score.ts`) and the pairings (`seedPairings` in `prisma/seed-data.ts`) are plain data and plain functions.
- The tag catalogue's ids, names and alias words are in `prisma/seed-data.ts`. The landing-page demo (`src/components/landing/demoCast.ts`) already sets the precedent: invented people written straight into source, never read from the database.
- There is no middleware, so a new route under `/demo` is reachable signed out.
- `scripts/make-qr-code.ts` always writes `public/qr-code.png`, which is the **sign-up** QR code the cohort uses.

See `proposal.md` for why.

## Goals / Non-Goals

**Goals:**
- Reuse the real graph component and the real score formula, so the demo is honest about what the product does.
- Work with no database, no sign-in and no environment switch.
- Re-score instantly in the browser when the visitor changes tags.
- Keep every beginner-readable: small files, named for what they do, "why" comments.

**Non-Goals:**
- No saving, accounts, analytics or sharing a result.
- No new database tables and no change to `schema.prisma`.
- No Connect, messaging, photos or profile pages in the demo.
- No change to how the real `/graph` behaves.

## Decisions

### 1. The invented cohort is static data in source

About 40 people, each a short list of tag ids from the real catalogue (one Hero Story, one Energy, one Vibe, a few Qualities and Seeking tags), a silhouette from `public/silhouettes/`, and a course. Written in `src/lib/graphDemo/demoCohort.ts`.

**Why:** it is safe on the live site (nothing to leak, nothing to switch on), it can never be broken by someone editing the real catalogue in admin, and it follows what the landing-page demo already does.
**Alternative:** seed these people into the production database behind a flag. Rejected: it puts fake people in the real cohort's tables and needs cleanup.

### 2. Aliases follow the real rule, but are written out

The alias is "The" + the Vibe's alias word + the Energy's alias word, as in `src/lib/profile/alias.ts`. Each of the 40 gets a different Vibe/Energy pair, so no "II" or "III" is needed. The aliases are written into the data file next to the tags, and a test checks that each equals what the rule would produce.

**Why:** they read like real aliases without the demo importing database-touching code, and a drift between the two gets caught by the test.
**Alternative:** hand-invent funny names. Rejected: they would stop looking like the product, and the point is to show the product.

### 3. Re-scoring happens in the browser

The picker is a Client Component. On each change it calls plain functions (`calculateScore` with `seedPairings`, then `buildGraph`) and hands the result to `CohortGraph`.

**Why:** a tap should feel instant on a phone on poor signal, and there is nothing to ask a server for. It also means no API route to defend.
**Alternative:** re-render on the server through a URL like `/demo/graph?hero=...`. Rejected for feel (a full navigation per tap), but it would work with JavaScript off, which is not a goal here.

### 4. A database-free home for `buildGraph` (needs approval)

Move `edgeStyle`, `buildGraph` and the graph types out of `graphData.ts` into a new `src/lib/cohort/graphShape.ts` that imports nothing from the database. `graphData.ts` re-exports them, so every existing import keeps working and `buildGraphData()` (the database loader) stays where it is.

**Why:** decision 3 needs the browser to import `buildGraph`. This is the smallest way to let it.
**Alternative A:** copy `buildGraph` into the demo. Rejected: two copies of the line-thickness and top-5 rules would drift.
**Alternative B:** build the demo graph on the server only and send it as JSON for every possible pick. Rejected: too many combinations.

**This edits slice 4's file.** CLAUDE.md says to flag that first; this is the flag.

### 5. One optional prop on `CohortGraph` to hide the profile link (needs approval)

The tap panel inside `CohortGraph.tsx` links to the person's real profile page. For demo people that page does not exist. Add an optional prop (for example `profileLinks={false}`), default on, and have the panel skip the link and any Connect action when it is off.

**Why:** the smallest change that keeps one graph component and one panel.
**Alternative:** a second, demo-only panel. Rejected: it duplicates the drawing and would diverge from the real one.

**This edits slice 4's file as well,** and is flagged for the same reason.

### 6. Top 5 and glitch for the visitor are worked out deterministically

Top 5 is the five highest scores, ties broken by alias. The glitch match is one person outside the top 5, chosen by a fixed rule from the visitor's picks (not `Math.random`), so the same picks give the same graph on every device.

**Why:** two students comparing phones should see the same thing for the same picks, and tests can pin it.
**Alternative:** reuse `getTopFive` / glitch code from `src/lib/matching/`. Not used: they are built around database rows and stored glitch matches. If a later check shows they take plain arrays, swapping is a one-file change.

### 7. The picker reads its categories and limits from the catalogue seed

The picker lists the categories and tags from `prisma/seed-data.ts` (`seedCategories`) and uses each category's `pickMin` / `pickMax`.

**Why:** the demo always offers exactly what onboarding offers, with the same limits, and the tags have the same names as the real ones.
**Trade-off:** if an admin renames a tag in production, the demo still shows the seed name. Acceptable for a demo.

### 8. The QR code gets its own file

`scripts/make-qr-code.ts` takes an optional second argument for the output path. With none, it behaves exactly as it does now. The demo QR is written to `public/qr-graph-demo.png`.

**Why:** running it as-is would overwrite the sign-up QR students may already have printed. **This edits slice 1's script,** also flagged.

### 9. Where the files live

- `src/app/demo/graph/page.tsx`: the page, a Server Component with the words and the sign-up link.
- `src/app/demo/graph/DemoGraphClient.tsx`: the client wrapper holding the picks and the picker.
- `src/lib/graphDemo/demoCohort.ts`: the invented people.
- `src/lib/graphDemo/buildDemoGraph.ts`: picks in, `{ nodes, links }` out.

The folder name says it is the demo, so nobody mistakes it for the real cohort code.

## Risks / Trade-offs

- [Importing `prisma/seed-data.ts` from `src/` feels backwards] → it is a plain data file with no database in it; confirmed when building group 1. If the build objects, copy the needed tags into `src/lib/graphDemo/` instead, with a test that they match the seed.
- [Slice 4 is still being worked on by another track, so the `CohortGraph` and `graphData` edits could collide] → each is a few lines, done in its own group so it can be dropped or rebased; ask before touching either.
- [Canvas dragging on a phone competes with page scrolling] → the real graph already handles this (spec: "The graph works on a phone"); the demo page keeps the picker outside the canvas and re-checks at 375px.
- [A public page on the live site is a new surface] → it reads nothing, writes nothing and has no forms that post anywhere.
- [The demo scores look different from what a real student would get on the real cohort] → expected, and said in words on the page.

## Open Questions

- Which address does the QR code point at: the production URL, or a Vercel preview for this branch? Only affects the last task.
