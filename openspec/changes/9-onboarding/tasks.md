# Tasks: Slice 2, onboarding: pick-from-list profile (#9)

Start only once #6 and #7 have merged into `master` and this branch has been rebased onto it. Each group adds its own tests. Steps marked **(human)** need a team conversation or a browser login.

> **Names used (task 1.2, checked 14 Oct 2026 against `master`).** Everything matches `design.md`, with these notes:
> - Category ids: `hero-story`, `energy`, `vibe-diagnosis`, `qualities`, `seeking`; this change adds `skills` and `interests`.
> - `getCurrentUser()` is in `src/lib/currentUser.ts`; `scoreUser(userId)` is in `src/lib/scoring.ts` and is real now (slice 3), not a no-op.
> - `Profile` has `userId`, `silhouette`, `alias` (already `@unique`), `photoKey`, `completedAt`. `Tag.aliasWord String?` **already exists**: the foundation (#7, design decision 2) added both, so this slice needs **no schema change and no migration**.
> - `pickMin` is already 1 for Qualities and Seeking in `seed-data.ts` (Patrick's decision, 1 Oct), so the `pickMin` data migration isn't needed either.
> - `getCatalogue()` returns names and descriptions only, so onboarding has its own query (`getOnboardingCatalogue()`) with the limits and alias words.
> - Slices 4 and 7 built against stand-ins of this slice's helpers (`src/lib/cohort/standIns.ts`, `src/lib/account/standIns.ts`). Swapping them is join-up (#17), not this slice (only our own routes are changed).

## 1. Check the starting point and flag the schema change

- [x] 1.1 **(human)** Flag the schema change to Patrick (#7 owner): `Tag.aliasWord String?`, `Profile.alias` unique, and the `pickMin` fix for Qualities and Seeking (design 4, 8). Agree whether it goes into #7 or this slice. Verify: Patrick's answer is recorded as a comment on #9
  - Done 14 Oct: nothing to flag. The foundation (#7) already added `Tag.aliasWord` and `Profile.alias @unique`, and Qualities and Seeking already have `pickMin` 1 (see "Names used" above).
- [x] 1.2 Read the merged `schema.prisma`, `prisma/seed-data.ts`, `src/lib/` and the route plan, and note any name that differs from `design.md` (category ids, `getCurrentUser`, `scoreUser`, `Profile` fields) in a short "Names used" note at the top of this file. Verify: the note exists, and `npm test` passes on the untouched branch
  - Done: the note is above. `npm test` on the untouched branch hit a teammate's run on the shared database; the full suite passes on this branch (635 tests).

## 2. Schema and seed

- [x] 2.1 Add `aliasWord String?` to `Tag` and `@unique` to `Profile.alias` (if it isn't already), with a comment on each saying why, then create the migration with `npx prisma migrate dev` and add the `pickMin` `UPDATE` to it (design 8). Verify: the migration applies on `dev`, and Neon shows the new column
  - Done without a migration: both columns already exist and the dev database already has `pickMin` 1 (checked 14 Oct). `npx prisma migrate status`: up to date.
- [x] 2.2 Add the Skills and Interests categories (1–4 picks, order 6 and 7) and their 24 tags to `prisma/seed-data.ts`, set Qualities and Seeking `pickMin` to 1, and add `aliasWord` to the 12 Energy and 12 Vibe tags, using the lists in design 4 and 8 as edited by the team. Verify: `npx tsc --noEmit` passes, and the lists match the approved design by eye
- [x] 2.3 In `prisma/seed.ts`, after the existing inserts, fill alias words only where they are empty (`updateMany` with `aliasWord: null`). Verify: `npx prisma db seed` run twice on `dev` gives 7 categories, 84 tags and 24 alias words
  - Checked by `tests/integration/onboardingSeed.test.ts` (7 categories x 12 tags, 24 alias words, a changed word kept). The test teardown re-seeds `dev` with this code.
- [x] 2.4 Seed tests: a fresh seed gives 7 categories with the right pick limits and 12 tags each; a changed alias word survives a re-seed; an empty alias word is filled in; and the existing #6 seed tests still pass. Verify: `npm test` passes
  - Also updated other tracks' tests that added their own Skills/Interests or expected 5 categories: `adminCategories`, `catalogue`, `search`, `explainMatch`, `standIns`, `seed-fake` (Vitest) and `navigation`, `people` (Playwright). No app code outside slice 2's files changed.

## 3. Profile logic (pure functions, no database)

- [x] 3.1 `src/lib/profile/silhouettes.ts`: 12 ids with alt labels and `silhouetteUrl(id)`; and draw `public/silhouettes/silhouette-01.svg` … `-12.svg`, each a different one-colour shape using `currentColor` (design 7). Verify: a temporary page or the browser shows all 12 files, and a unit test checks every id has a file
  - The pictures are slice 10's designs (#45, merged 14 Oct), at the path this design named, so this slice uses them rather than drawing its own. They carry their own light and dark colours instead of `currentColor` (#45 design decision 5). `src/lib/profile/silhouettes.ts` uses their names as labels.
- [x] 3.2 `src/lib/profile/validateAnswers.ts`: `validateOnboardingAnswers(answers, catalogue)` returns a list of problems by category (below the minimum, above the maximum, wrong category, retired or unknown tag, unknown silhouette) (design 3). Verify: Vitest covers each problem plus a valid set
- [x] 3.3 `src/lib/profile/alias.ts`: `baseAlias`, `toRoman` and `generateAlias` with the fallback words (design 4). Verify: Vitest covers the spec's "The Feral Sea Captain" case, "II" when it's taken, "III" when II is taken too, and a tag with no alias word
- [x] 3.4 `src/lib/profile/bio.ts`: `generateBio(tagsByCategory)` with "a", "a and b" and "a, b and c" joining (design 5). Verify: Vitest covers the spec's Corporate Escapee scenario, a bio for each of the 12 Hero Stories and 12 Energies, and a missing optional category

## 4. Saving: `POST /api/onboarding`

- [x] 4.1 Build `src/app/api/onboarding/route.ts`: 401 if not signed in; 409 if the profile is already complete; 400 with problems if invalid; otherwise one transaction that creates the `Profile` (alias, silhouette, `completedAt`) and its `ProfileTag` rows, retrying the alias up to 3 times on a unique-constraint clash, then calls `scoreUser` after the commit and returns `{ alias }` (design 3, 4). Verify: `npx tsc --noEmit` passes
- [x] 4.2 Integration tests against the test database: a valid save writes 1 profile and every tag; an invalid save (5 Seeking, a wrong-category tag, a retired tag) writes nothing; a second save gets 409; two users with the same Vibe and Energy get "… " and "… II"; `scoreUser` is called once. Verify: `npm test` passes

## 5. Onboarding screens

- [x] 5.1 `src/lib/profile/onboardingRedirect.ts` with `redirectIfOnboardingIncomplete()` (design 6), and `src/app/onboarding/page.tsx` as a Server Component that sends visitors who aren't signed in to sign in and finished users to `/onboarding/done`, then loads `getCatalogue()` and renders the wizard. Verify: with the dev switcher, a pretend user with a complete profile lands on `/onboarding/done`, and one without stays on `/onboarding`
- [x] 5.2 `src/app/onboarding/PickStep.tsx`: tags as toggle buttons with `aria-pressed`, single-pick replaces the old pick, the rest are disabled at `pickMax` with a "You can pick up to N" line, and Next stays disabled below `pickMin` (design 2). Verify: by hand at phone width in devtools on Hero Story (1) and Qualities (1–4)
- [x] 5.3 `src/app/onboarding/SilhouetteStep.tsx` (a grid of the 12 pictures, pick exactly 1) and `OnboardingWizard.tsx` (steps in category order, then silhouette, then a summary with Back and "Finish"). On Finish it posts to `/api/onboarding`, goes to `/onboarding/done` on success, and on a 400 jumps to the first step with a problem and shows the message. Verify: by hand, all eight steps complete with a pretend user who has no profile
  - Checked by hand at phone width (390px) with pretend user 31, and by `tests/e2e/onboarding.spec.ts`.
- [x] 5.4 `src/components/ProfileCard.tsx` and `src/app/onboarding/done/page.tsx`, which loads the user's profile and tags and shows alias, silhouette, bio, skills and interests (never an email or photo) (design 9). Verify: by hand, the done page shows a readable bio for the profile just made
- [x] 5.5 Playwright: a pretend user with no profile completes onboarding by clicking only; the page has no `input[type=text]` or `textarea`; a fifth Quality can't be picked; Next is blocked on an empty Interests step; the done page shows alias, silhouette and bio; going back to `/onboarding` redirects to done. Verify: `npm run test:e2e` passes

## 6. Docs, deploy and wrap-up

- [x] 6.1 Add a short "Onboarding" section to `README.md`: the routes, the shared helpers other tracks may call (`redirectIfOnboardingIncomplete`, `generateBio`, `ProfileCard`), and how to try it with the dev switcher. Verify: a teammate follows it on their machine
  - Written. The "teammate follows it" check is left for review.
- [ ] 6.2 Push, open the PR, and on the preview deploy repeat the four success checks from #9 with a pretend user who has no profile. Verify: all four ticked in the PR description
- [ ] 6.3 Note the join-up items on #17: other tracks' pages call `redirectIfOnboardingIncomplete()`; slice 7 reuses `PickStep`, `validateOnboardingAnswers` and `ProfileCard`; slice 4 decides how an alias becomes a URL. Verify: comment posted on #17
- [x] 6.4 Add `contributions.md` to this change folder: who drove which group and one decision each person can explain. Verify: file present
