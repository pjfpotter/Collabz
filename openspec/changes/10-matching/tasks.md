# Tasks: Slice 3, chemistry matching (#10)

Start only once the proposal is approved and this branch has been rebased onto `master`. Each group adds its own tests. Steps marked **(human)** need a team conversation or a browser login.

## Names used

Checked on 12 Oct 2026 against the merged `master` (task 1.3). Everything in `design.md` matches the code except the points below, which the build follows:

- **`Edge`** has `userAId`, `userBId`, `score`, `complement`, `overlap`, `tension`; **`GlitchMatch`** has `userId` (the owner) and `matchedUserId`; **`TagPairing`** has `seekingTagId` and `qualityTagId`. All as the design says.
- **Category ids** in `prisma/seed-data.ts` are `hero-story`, `energy`, `vibe-diagnosis`, `qualities` and `seeking`. There are no `skills` or `interests` categories yet (slice 2 adds them), so the shared Skills and Interests lists are empty until then. The stand-in already uses the ids `"skills"` and `"interests"`, and this slice uses the same two.
- **Tag ids** are `seeking-<short name>` and `qualities-<short name>` (note `qualities-`, plural). The 23 pairs in design 3 use these ids and all exist.
- **`explainMatch`'s stand-in returns `MatchExplanation | null`**, with `null` when no score is stored for the pair. Design 7 does not mention the `null`. The real function keeps it, so join-up stays a swap.
- **`getTopFive`'s stand-in** returns `{ userId, score }[]` (the type is `TopMatch`) and already uses the spec's tie-break, via slice 4's `getVisiblePeople` (people have `userId` and `completedAt`). The real one returns the same shape.
- **`scoreUser(userId): Promise<void>`** is the stub to fill in; keep the name and signature.
- **The pretend cohort's edges** are invented by `prisma/pretend-cohort.ts`, so `npm run rescore:all` (7.1) replaces them with calculated ones.
- **Tests share the dev database.** `TEST_DATABASE_URL` is currently the same URL as `DATABASE_URL`, and the test run empties the tables and restores the dev data afterwards (`tests/helpers/restoreDevData.ts`). Do not run two test runs, or the dev server's pages, at the same time.

## 1. Settle the open decisions

- [x] 1.1 **(human)** Team edits and agrees the 12 Seeking→Quality pairings in design 3 (23 rows). Verify: the agreed list is recorded as a comment on #10 and `design.md` is updated to match
  - *Assumed approved by Patrick on 12 Oct 2026 so the build could start. The list is on #10 (comment 6124729602) and in design 3, unchanged. If the team edits it, only task 2.1's data changes, then `npm run rescore:all`.*
- [x] 1.2 **(human)** Confirm with track 4 (Patrick) the names `getTopFive` and `explainMatch` and their return shapes, and with the team that a glitch match is kept on rescore unless it becomes invalid (design 5, 7). Verify: answers recorded as a comment on #10
  - *Assumed confirmed by Patrick on 12 Oct 2026 (he is track 4 and the glitch rule is the design's own): the names and shapes in design 7 stand, with `explainMatch` keeping its `| null`, and a glitch match is kept on rescore unless it becomes invalid. Not yet written up as a comment on #10.*
- [x] 1.3 Read the merged `src/lib/scoring.ts`, `src/lib/userPair.ts`, `src/lib/cohort/standIns.ts` and `prisma/schema.prisma` (`Edge`, `GlitchMatch`, `TagPairing`) and note any name that differs from `design.md` in a short "Names used" note at the top of this file. Verify: the note exists and `npm test` passes on the untouched branch

## 2. Pairings as data

- [x] 2.1 Add the agreed pairings to `prisma/seed-data.ts` by stable tag id, and seed them in `prisma/seed.ts` with `createMany` and `skipDuplicates`, with a comment saying why a re-seed must never remove rows. Verify: `npx tsc --noEmit` passes and `npx prisma db seed` run twice on `dev` gives 23 `TagPairing` rows
- [x] 2.2 Seed tests: a fresh seed gives every Seeking tag at least one pairing, all pairing ids exist, and a deleted pairing is re-added while an existing one is not duplicated. Verify: `npm test` passes

## 3. The formula (pure functions, no database)

- [x] 3.1 `src/lib/matching/score.ts`: `calculateScore(a, b, pairings)` returning `{ score, complement, overlap, tension }`, counting satisfied Seeking tags once each (design 1, 2). Verify: Vitest covers a hand-worked example from the brief, a Seeking tag with two satisfying Qualities counting once, both directions, same Energy and same Vibe, same and different Hero Story, and "Skills and Interests change nothing"
- [x] 3.2 `src/lib/matching/explain.ts`: pure function that turns the same inputs into the list of plain sentences and the shared Skills and Interests (design 8). Verify: Vitest covers a pair with every reason, a pair with none, and that the listed reasons add up to the number from `calculateScore`

## 4. Saving scores and picking glitch matches

- [x] 4.1 `src/lib/matching/eligiblePeople.ts`: finished and not suspended, with their tag ids, with a comment pointing at slice 4's `getVisiblePeople` (design 6). Verify: integration test with a finished, an unfinished and a suspended pretend user returns only the finished one
- [x] 4.2 `src/lib/matching/glitch.ts`: `pickGlitchMatch(userId, candidates, topFiveIds, random)` and `ensureGlitchMatch(userId)`, keeping a stored match while it is valid (design 5). Verify: Vitest covers never yourself, never in the top 5, kept on reload, replaced when suspended, replaced when it enters the top 5, and nobody eligible
- [x] 4.3 Fill in `scoreUser` in `src/lib/scoring.ts` following design 4: one transaction, delete this user's edges, write new ones with `skipDuplicates`, ensure the glitch match and repair others' glitch matches that now point into their top 5. Keep the name and signature, and update its header comment. Verify: `npx tsc --noEmit` passes
- [x] 4.4 Integration tests against the test database: a newcomer gets one edge per other finished person; changing one user's answers changes only that user's edges (another pair's row is byte-for-byte the same); an unfinished user gets no edges; a suspended user drops out; a second `scoreUser` call gives identical rows. Verify: `npm test` passes

## 5. Top 5 and explanation for pages

- [ ] 5.1 `src/lib/matching/topFive.ts`: `getTopFive(userId)` with the tie-break from the spec (score, earliest finisher, lower id), leaving out suspended and unfinished people (design 7). Verify: integration test with equal scores returns the earlier finisher first and the same order on two calls
- [ ] 5.2 `explainMatch(userAId, userBId)` loading the two people and calling the pure function from 3.2, returning `{ score, sentences, sharedSkills, sharedInterests }`. Verify: integration test for a pretend pair, including one with shared Skills that do not change the score
- [ ] 5.3 `src/lib/matching/index.ts` exporting `scoreUser`, `getTopFive`, `explainMatch` and `ensureGlitchMatch`, and add them to the shared helper list in the README. Verify: `src/lib/` import check in `tests/integration/sharedHelpers.test.ts` still passes

## 6. The `/matches` page

- [ ] 6.1 Replace `src/app/matches/page.tsx` (Server Component): signed-out to sign-in, unfinished profile to `/onboarding`, otherwise load the top 5, the glitch match (calling `ensureGlitchMatch`) and one explanation each. Verify: with the dev switcher, a pretend user with a finished profile sees five rows and one glitch match, and one without a profile is sent to onboarding
- [ ] 6.2 Match card component: alias, silhouette, score, reasons, and the glitch match drawn in a different style and labelled as a surprise; no email or photo anywhere. Verify: by hand at phone width in devtools
- [ ] 6.3 Playwright: a pretend user sees five matches in score order and one glitch match that is not among them; reloading shows the same list; the page text contains no email address. Verify: `npm run test:e2e` passes

## 7. Real scores for the pretend cohort, docs and wrap-up

- [ ] 7.1 `scripts/rescore-all.ts` and the `rescore:all` npm script: calls `scoreUser` for every eligible person and prints only counts, never the database address (design 10). Verify: running it twice on `dev` gives the same edge count and `npm test` still passes
- [ ] 7.2 Run the existing graph, search and seed-fake tests after the rescore and fix any that assumed the invented scores. Verify: `npm test` and `npm run test:e2e` pass
- [ ] 7.3 Add a short "Matching" section to `README.md`: the formula, the helper names other tracks may call, and how to run `rescore:all`. Verify: a teammate follows it on their machine
- [ ] 7.4 Push, open the PR, and on the preview deploy repeat the success checks from #10 as a pretend user. Verify: all five ticked in the PR description
- [ ] 7.5 Note the join-up items on #17: replace the two stand-ins in `src/lib/cohort/standIns.ts`, merge the two visibility rules, and swap the inline onboarding check on `/matches` for `redirectIfOnboardingIncomplete()`. Verify: comment posted on #17
- [ ] 7.6 Add `contributions.md` to this change folder: who drove which group and one decision each person can explain. Verify: file present
