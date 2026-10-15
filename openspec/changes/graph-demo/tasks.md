# Tasks: graph demo

Before starting: `npm install`, `npx prisma generate`. The demo needs **no** database and no `PRETEND_COHORT`, so it should work even with those unset. One group, one commit; pause after each group and show what changed. Per the team's mid-slice rule, run lint and `tsc` only; Patrick runs the test suites when the PR is open (tests are still written in the group that owns them).

**Needs Patrick's yes before starting group 2 or 4:** they edit slice 4's files (`graphData.ts`, `CohortGraph.tsx`). Group 6 edits slice 1's `make-qr-code.ts`. See design decisions 4, 5 and 8.

## 1. The invented cohort

- [x] 1.1 Create `src/lib/graphDemo/demoCohort.ts` with about 40 people (alias, silhouette id from `public/silhouettes/`, course, and tag ids for Hero Story, Energy, Vibe, Qualities, Seeking) taken from `seedCategories` in `prisma/seed-data.ts`, each with a different Vibe/Energy pair and a "why" comment. Verify: `npx tsc --noEmit` and `npm run lint` pass
- [x] 1.2 Write `tests/unit/graphDemoCohort.test.ts` checking: every tag id exists in `seedCategories`, every person is inside the catalogue's pick limits, no alias or text contains "Pretend", aliases follow the real alias rule, both courses are present. Verify: the file type-checks; Patrick runs it with the suites

## 2. A database-free graph builder (needs approval)

- [x] 2.1 Move `edgeStyle`, `buildGraph`, the graph types and their constants from `src/lib/cohort/graphData.ts` into a new `src/lib/cohort/graphShape.ts` that imports nothing from `@/lib/db`, and re-export them from `graphData.ts`. Verify: `npx tsc --noEmit` passes with no other file changed, and `git diff --stat` shows only these two files
- [x] 2.2 Check that nothing in `graphShape.ts` (or what it imports) reaches `prisma`. Verify: `grep -rn "lib/db" src/lib/cohort/graphShape.ts` shows nothing, and bundling it for the browser (`npx esbuild src/lib/cohort/graphShape.ts --bundle --platform=browser --alias:@=./src`) gives a small file with no `prisma` in it (done this way instead of a throwaway client file; the full `npm run build` is in 7.1)

## 3. Re-scoring around a visitor

- [x] 3.1 Create `src/lib/graphDemo/buildDemoGraph.ts`: given the visitor's picks (or none), score every demo person with `calculateScore` and `seedPairings`, work out the deterministic top 5 and glitch match (design decision 6), and return `{ nodes, links }` through `buildGraph`. Verify: `npx tsc --noEmit` and `npm run lint` pass
- [x] 3.2 Write `tests/unit/buildDemoGraph.test.ts`: same picks give the same graph, different picks change the top 5, no picks gives a graph with no viewer, glitch is never the viewer or in the top 5, nothing but alias addresses appear in the output. Verify: type-checks; Patrick runs it with the suites

## 4. The page and the picker

- [x] 4.1 Add an optional prop to `CohortGraph.tsx` that hides the profile link and any Connect action in the tap panel (default: unchanged). Verify: `/graph` as a pretend student looks and behaves as before; `npx tsc --noEmit` passes
- [x] 4.2 Create `src/app/demo/graph/page.tsx` (Server Component: heading, plain-words explanation that the people are invented and nothing is saved, sign-up link) and `DemoGraphClient.tsx` (holds the picks, calls `buildDemoGraph`, renders the loader-wrapped graph). Verify: `npm run dev`, then `/demo/graph` signed out shows the graph with no database running
- [x] 4.3 Add the "be someone" picker in `DemoGraphClient.tsx`: categories and limits from `seedCategories`, option cards using the existing `OptionCard`/`TagChip` components, collapsed by default on a phone. Verify: picking updates top 5 and glitch, the limit stops further picks, reloading clears them
- [x] 4.4 Write `tests/e2e/graphDemo.spec.ts`: signed-out visit, picker changes the highlighted people, no "Pretend" text anywhere, no Connect or profile link, no horizontal overflow at 375px in both themes. Verify: type-checks; Patrick runs it with the suites

## 5. Looks right on a phone

- [x] 5.1 Check `/demo/graph` at 375px wide in light and dark, with the picker open and closed, with a finger-sized drag and tap. Fix spacing in the demo files only. Verify: screenshots attached to the PR, nothing overflows sideways

## 6. The QR code and the words

- [x] 6.1 Add an optional output-path argument to `scripts/make-qr-code.ts` (no argument: unchanged, still `public/qr-code.png`) with a "why" comment. Verify: `npm run qr -- https://example.com/x public/qr-test.png` writes that file and leaves `public/qr-code.png` untouched; delete the test file
- [x] 6.2 Once Patrick has answered the open question, generate `public/qr-graph-demo.png` for the chosen address. Verify: scanning it with a phone opens `/demo/graph`
- [x] 6.3 Add the demo to `README.md` (one short section: what it is, the address, how to remake the QR). Verify: the command in the README runs as written
- [ ] 6.4 At archive time, add a short "graph demo" paragraph to `ARCHITECTURE.md` (the new route, that it is static and database-free, and the two small edits to slice 4). Verify: the paragraph matches what was built

## 7. Integration

- [x] 7.1 `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass; `/graph` for a pretend student is unchanged; Patrick runs the unit and e2e suites once the PR is open. Verify: build output lists `/demo/graph` (done: tsc and the build pass, lint passes on `src tests scripts prisma`, and `/graph` for a pretend student still shows 29 dots, a top 5 and the panel's View profile link. A bare `npm run lint` also scans the untracked `brag-output/` promo-video folder, whose bundled `gsap.min.js` has 8 errors that are not from this change)
