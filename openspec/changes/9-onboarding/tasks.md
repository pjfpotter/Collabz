# Tasks: Slice 2, onboarding: pick-from-list profile (#9)

Start only once #6 and #7 have merged into `master` and this branch has been rebased onto it. Each group adds its own tests. Steps marked **(human)** need a team conversation or a browser login.

## 1. Check the starting point and flag the schema change

- [ ] 1.1 **(human)** Flag the schema change to Patrick (#7 owner): `Tag.aliasWord String?`, `Profile.alias` unique, and the `pickMin` fix for Qualities and Seeking (design 4, 8). Agree whether it goes into #7 or this slice. Verify: Patrick's answer is recorded as a comment on #9
- [ ] 1.2 Read the merged `schema.prisma`, `prisma/seed-data.ts`, `src/lib/` and the route plan, and note any name that differs from `design.md` (category ids, `getCurrentUser`, `scoreUser`, `Profile` fields) in a short "Names used" note at the top of this file. Verify: the note exists, and `npm test` passes on the untouched branch

## 2. Schema and seed

- [ ] 2.1 Add `aliasWord String?` to `Tag` and `@unique` to `Profile.alias` (if it isn't already), with a comment on each saying why, then create the migration with `npx prisma migrate dev` and add the `pickMin` `UPDATE` to it (design 8). Verify: the migration applies on `dev`, and Neon shows the new column
- [ ] 2.2 Add the Skills and Interests categories (1–4 picks, order 6 and 7) and their 24 tags to `prisma/seed-data.ts`, set Qualities and Seeking `pickMin` to 1, and add `aliasWord` to the 12 Energy and 12 Vibe tags, using the lists in design 4 and 8 as edited by the team. Verify: `npx tsc --noEmit` passes, and the lists match the approved design by eye
- [ ] 2.3 In `prisma/seed.ts`, after the existing inserts, fill alias words only where they are empty (`updateMany` with `aliasWord: null`). Verify: `npx prisma db seed` run twice on `dev` gives 7 categories, 84 tags and 24 alias words
- [ ] 2.4 Seed tests: a fresh seed gives 7 categories with the right pick limits and 12 tags each; a changed alias word survives a re-seed; an empty alias word is filled in; and the existing #6 seed tests still pass. Verify: `npm test` passes

## 3. Profile logic (pure functions, no database)

- [ ] 3.1 `src/lib/profile/silhouettes.ts`: 12 ids with alt labels and `silhouetteUrl(id)`; and draw `public/silhouettes/silhouette-01.svg` … `-12.svg`, each a different one-colour shape using `currentColor` (design 7). Verify: a temporary page or the browser shows all 12 files, and a unit test checks every id has a file
- [ ] 3.2 `src/lib/profile/validateAnswers.ts`: `validateOnboardingAnswers(answers, catalogue)` returns a list of problems by category (below the minimum, above the maximum, wrong category, retired or unknown tag, unknown silhouette) (design 3). Verify: Vitest covers each problem plus a valid set
- [ ] 3.3 `src/lib/profile/alias.ts`: `baseAlias`, `toRoman` and `generateAlias` with the fallback words (design 4). Verify: Vitest covers the spec's "The Feral Sea Captain" case, "II" when it's taken, "III" when II is taken too, and a tag with no alias word
- [ ] 3.4 `src/lib/profile/bio.ts`: `generateBio(tagsByCategory)` with "a", "a and b" and "a, b and c" joining (design 5). Verify: Vitest covers the spec's Corporate Escapee scenario, a bio for each of the 12 Hero Stories and 12 Energies, and a missing optional category

## 4. Saving: `POST /api/onboarding`

- [ ] 4.1 Build `src/app/api/onboarding/route.ts`: 401 if not signed in; 409 if the profile is already complete; 400 with problems if invalid; otherwise one transaction that creates the `Profile` (alias, silhouette, `completedAt`) and its `ProfileTag` rows, retrying the alias up to 3 times on a unique-constraint clash, then calls `scoreUser` after the commit and returns `{ alias }` (design 3, 4). Verify: `npx tsc --noEmit` passes
- [ ] 4.2 Integration tests against the test database: a valid save writes 1 profile and every tag; an invalid save (5 Seeking, a wrong-category tag, a retired tag) writes nothing; a second save gets 409; two users with the same Vibe and Energy get "… " and "… II"; `scoreUser` is called once. Verify: `npm test` passes

## 5. Onboarding screens

- [ ] 5.1 `src/lib/profile/onboardingRedirect.ts` with `redirectIfOnboardingIncomplete()` (design 6), and `src/app/onboarding/page.tsx` as a Server Component that sends visitors who aren't signed in to sign in and finished users to `/onboarding/done`, then loads `getCatalogue()` and renders the wizard. Verify: with the dev switcher, a pretend user with a complete profile lands on `/onboarding/done`, and one without stays on `/onboarding`
- [ ] 5.2 `src/app/onboarding/PickStep.tsx`: tags as toggle buttons with `aria-pressed`, single-pick replaces the old pick, the rest are disabled at `pickMax` with a "You can pick up to N" line, and Next stays disabled below `pickMin` (design 2). Verify: by hand at phone width in devtools on Hero Story (1) and Qualities (1–4)
- [ ] 5.3 `src/app/onboarding/SilhouetteStep.tsx` (a grid of the 12 pictures, pick exactly 1) and `OnboardingWizard.tsx` (steps in category order, then silhouette, then a summary with Back and "Finish"). On Finish it posts to `/api/onboarding`, goes to `/onboarding/done` on success, and on a 400 jumps to the first step with a problem and shows the message. Verify: by hand, all eight steps complete with a pretend user who has no profile
- [ ] 5.4 `src/components/ProfileCard.tsx` and `src/app/onboarding/done/page.tsx`, which loads the user's profile and tags and shows alias, silhouette, bio, skills and interests (never an email or photo) (design 9). Verify: by hand, the done page shows a readable bio for the profile just made
- [ ] 5.5 Playwright: a pretend user with no profile completes onboarding by clicking only; the page has no `input[type=text]` or `textarea`; a fifth Quality can't be picked; Next is blocked on an empty Interests step; the done page shows alias, silhouette and bio; going back to `/onboarding` redirects to done. Verify: `npm run test:e2e` passes

## 6. Docs, deploy and wrap-up

- [ ] 6.1 Add a short "Onboarding" section to `README.md`: the routes, the shared helpers other tracks may call (`redirectIfOnboardingIncomplete`, `generateBio`, `ProfileCard`), and how to try it with the dev switcher. Verify: a teammate follows it on their machine
- [ ] 6.2 Push, open the PR, and on the preview deploy repeat the four success checks from #9 with a pretend user who has no profile. Verify: all four ticked in the PR description
- [ ] 6.3 Note the join-up items on #17: other tracks' pages call `redirectIfOnboardingIncomplete()`; slice 7 reuses `PickStep`, `validateOnboardingAnswers` and `ProfileCard`; slice 4 decides how an alias becomes a URL. Verify: comment posted on #17
- [ ] 6.4 Add `contributions.md` to this change folder: who drove which group and one decision each person can explain. Verify: file present
