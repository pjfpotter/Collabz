# Tasks: Foundation: shared schema, pretend cohort, dev sign-in (#7)

Groups build on each other in order: tables (1), then the helpers that read them (2), then the pretend data (3), then the switcher (4), then the pages and nav that show it all (5). Each group lands its own tests and its own part of the README. Steps marked **(human)** need a browser login or a team conversation, so Patrick does them.

## Auth.js check (task 1.2)

Checked on 8 Oct 2026 against the PostgreSQL schema on https://authjs.dev/getting-started/adapters/prisma.

- `Account`, `Session` and `VerificationToken`: ours are copied field for field, including the "deleted with their user" rule on `Account` and `Session`.
- `User`: Auth.js has `id`, `name?`, `email? @unique`, `emailVerified?`, `image?`. Ours differs in three ways, all on purpose (design 3):
  - no `name` and no `image` (we never collect a name, and photos live under `Profile.photoKey`);
  - `email` is required, not optional, because magic-link sign-in always has one and every pretend user has one.
- The docs say `Session` is only needed for database sessions and `VerificationToken` for the email (magic link) provider. Slice 1 uses both.
- The page also mentions an `Authenticator` table for passkeys. We don't use passkeys, so it is left out.

## 1. Schema: every MVP table

- [ ] 1.1 **(human)** Ask Tom (#8) to check `design.md` decisions 1 and 3 (the `User` and Auth.js tables, `courseId` and `acceptedTermsAt` empty-able, no `name` or `image`), and ask the team to confirm Patrick creates migrations (decision 13). Verify: both answers are recorded as comments on #7
- [x] 1.2 Compare the planned `Account`, `Session` and `VerificationToken` tables and `User.emailVerified` with the Prisma schema in the current Auth.js adapter docs, and note any difference at the top of this file under "Auth.js check" (design 3). Verify: the note exists and names the docs page and date checked
- [x] 1.3 Add the three enums and the `User`, `Profile`, `ProfileTag` and `TagPairing` models to `prisma/schema.prisma`, plus `aliasWord String?` on `Tag`, with a comment on every model and every non-obvious column saying why (design 1, 2). Verify: `npx prisma validate` passes
- [x] 1.4 Add the `Edge`, `GlitchMatch`, `ConnectionRequest`, `Conversation`, `Message`, `Block` and `Report` models, with comments (including the "lower user id goes in `userAId`" rule on `Edge` and `Conversation`) (design 1). Verify: `npx prisma validate` passes
- [x] 1.5 Add the Auth.js `Account`, `Session` and `VerificationToken` models as checked in 1.2, with a comment that slice 1 (#8) owns them (design 3). Verify: `npx prisma validate` passes
- [x] 1.6 Create the single migration against Neon `dev` with `npx prisma migrate dev --name add_mvp_tables`. Verify: one new folder in `prisma/migrations/`, Neon's table view shows the 14 new tables and the `aliasWord` column, and `npx tsc --noEmit` passes
- [x] 1.7 In `tests/helpers/database.ts`, replace `emptyCatalogueTables` with `emptyDatabase(prisma)`, which deletes from every table in an order the database accepts, with a comment explaining the order, and update the two slice 0 test files to call it (design 12). Verify: `npm test` and `npm run test:e2e` both pass
- [x] 1.8 Add `tests/integration/schema.test.ts`: two profiles can't share an alias; an edge can't be stored twice for the same pair; a second conversation for the same pair is refused; a tag that a profile uses can't be deleted. Verify: `npm test` passes

## 2. The on/off switch and the shared helpers

- [x] 2.1 Add `src/lib/pretendCohort.ts` with `isPretendCohortEnabled()` (on only when `PRETEND_COHORT` is exactly `on` and `VERCEL_ENV` is not `production`), with a comment on why it is opt-in and why it doesn't use `NODE_ENV` (design 4). Add `PRETEND_COHORT` to `.env.example` with a warning never to set it in Production. Unit test it in `tests/unit/`: unset → off; `on` → on; `on` with `VERCEL_ENV=production` → off; `true` or `ON` → off. Verify: `npm test` passes
- [x] 2.2 Add `src/lib/userPair.ts` with `orderUserPair(a, b)`, and unit test it: both orders give the same result, and the same id twice throws (design 1). Verify: `npm test` passes
- [x] 2.3 Add `src/lib/currentUser.ts` with `findPretendUser(id)`, `getCurrentUser()` and `requireAdmin()`, each with a header comment naming its owner, what it does now and what it will do (design 8, 9). Integration test `findPretendUser`: a pretend id returns the user; an id without the `pretend-` prefix returns nothing; an unknown id returns nothing; any id returns nothing when the switch is off. Verify: `npm test` and `npx tsc --noEmit` pass
- [x] 2.4 Add `src/lib/scoring.ts` with `scoreUser(userId)` (does nothing, `async`) and `src/lib/conversations.ts` with `openConversation` and `closeConversation`, each with the owner comment (design 8). Integration tests: `openConversation(a, b)` and `openConversation(b, a)` return the same conversation and only one row exists; `closeConversation` sets `closedAt` once and a second call doesn't change it; `scoreUser` resolves without changing any table. Verify: `npm test` passes
- [x] 2.5 Add a "Shared helpers" section to `README.md`: a table of the five helpers and `orderUserPair` with file, what each does today and which slice owns it, plus the rule that tracks call these and never import another track's files. Verify: every name and path in the table matches the code

## 3. The pretend cohort

- [ ] 3.1 Add `prisma/pretend-cohort.ts`: the seeded number generator (with a comment on why not `Math.random()`) and `buildPretendCohort(catalogue)`, which returns the 32 users, 30 profiles and their tag picks as plain data, without touching the database (design 5, 6). Unit test with a small made-up catalogue: 32 users, 16 per course, 30 profiles, exactly one admin, one suspended and two with no profile; every profile is within each category's limits and uses no retired tag; aliases are unique; two calls return identical data. Verify: `npm test` passes
- [ ] 3.2 Extend `buildPretendCohort` with the 435 edges, 30 glitch matches, 14 requests (8 pending, 4 approved, 2 declined), 4 conversations (3 open with messages, 1 closed), 1 block and 1 open report, and make `pretend-user-02` the "main character" (design 5). Unit test: one edge per pair with the lower id first; every score equals complement × 3 + overlap + tension; no glitch match is the user or in their top 5; every request goes to the sender's top 5 or glitch match; every approved request has a conversation; `pretend-user-02` has an incoming pending request, an outgoing one and an open conversation with messages. Verify: `npm test` passes
- [ ] 3.3 Add `prisma/seed-fake.ts` exporting `seedPretendCohort(prisma)`: refuse with a clear message if `isPretendCohortEnabled()` is false or the catalogue is empty, insert with `createMany({ skipDuplicates: true })`, then give any finished pretend profile picks in an active category it has none in. Add the `seed:fake` script to `package.json` (design 6). Verify: `npm run seed:fake` against `dev` prints the number of new rows, and a second run prints 0 for everything
- [ ] 3.4 Add `tests/integration/seed-fake.test.ts`: a fresh run gives the counts in the spec; a second run changes no count; a request approved by hand stays approved after another run; a category added after the first run is filled in on the next; with the switch off it throws and creates nothing; with `VERCEL_ENV=production` it throws and creates nothing; with an empty catalogue it throws and says to seed the catalogue first. Verify: `npm test` passes
- [ ] 3.5 Restore the cohort once at the end of a test run: add a Vitest `globalSetup` file whose teardown runs the catalogue seed and then the pretend seed, and a Playwright `globalTeardown` that does the same, and remove the re-seed-in-`afterAll` lines from the two slice 0 test files (design 12). Verify: after `npm test` and again after `npm run test:e2e`, the `dev` database holds 32 pretend users
- [ ] 3.6 Add a "Pretend cohort" section to `README.md`: what is in it, `npm run seed:fake`, adding `PRETEND_COHORT=on` to `.env`, that `pretend-user-02` has data for every feature, and a clear warning that `npm test` resets the shared dev data and that pages may be empty while someone's tests run. Verify: the command and variable name match the code

## 4. The "sign in as…" switcher

- [ ] 4.1 Add `src/app/api/dev/sign-in-as/route.ts`: answer 404 when the switch is off; accept only ids starting `pretend-` that exist; accept only a return address starting with a single `/`; set or clear the `httpOnly` cookie; redirect back (design 7). Verify: `npx tsc --noEmit` passes, and with the app running locally a form post with a made-up id leaves the visitor signed out
- [ ] 4.2 Add `src/components/DevUserSwitcher.tsx`: a Server Component that renders nothing when the switch is off, and otherwise a form with a `<select>` of pretend users (alias or "no profile yet", course, and admin or suspended labels), a "Signed out" option, the current user selected, and a button (design 7). Verify: with a temporary line on the home page, picking a user shows them as selected after the page reloads. Remove the temporary line afterwards
- [ ] 4.3 Add `PRETEND_COHORT: "on"` to the Playwright test server's environment in `playwright.config.ts`, with a comment. Verify: `npm run test:e2e` still passes

## 5. Route plan, placeholder pages and nav bar

- [ ] 5.1 Add `src/components/PlaceholderPage.tsx` (title, slice number, issue number, and a line saying the owning track replaces it), and one `page.tsx` for each of `/signup`, `/signin`, `/onboarding`, `/matches`, `/graph`, `/people`, `/people/[alias]`, `/requests`, `/messages` and `/account`, each with a comment naming its owner (design 10). Verify: `npm run dev`, then each address shows its placeholder
- [ ] 5.2 Add `/admin` and `/admin/reports` placeholder pages that call `requireAdmin()` before rendering (design 9, 10). Verify: by hand with a temporary cookie or after 5.3, a member gets "page not found" and the admin sees the placeholder
- [ ] 5.3 Add `src/components/NavBar.tsx` (home link, a link to each route that needs no alias, and `DevUserSwitcher`, wrapping at phone width) and render it in `src/app/layout.tsx`, with a comment that link hiding by role is left to join-up (design 11). Verify: `npm run dev`, then every page shows the bar, and at 375 pixels wide in devtools nothing scrolls sideways
- [ ] 5.4 Add `tests/e2e/navigation.spec.ts`: every nav link opens a page that still shows the nav bar; `/people/anything` shows the profile placeholder; `/catalogue` still shows the catalogue. Tests that need the switcher skip themselves when `BASE_URL` is set. Verify: `npm run test:e2e` passes
- [ ] 5.5 Add `tests/e2e/switcher.spec.ts`: picking `pretend-user-02` shows them as signed in and they stay signed in on another page; "Signed out" signs them out; signed out, `/admin` goes to `/signin`; as a member, `/admin` shows "page not found"; as `pretend-user-01`, `/admin` and `/admin/reports` show their placeholders. Verify: `npm run test:e2e` passes
- [ ] 5.6 Add a "Routes" section to `README.md` with the route plan table from design 10, the ownership rule, and "delete the placeholder when you build the real page". Verify: every route in the table opens locally

## 6. Deploy and hand over to the tracks

- [ ] 6.1 **(human)** In Vercel, add `PRETEND_COHORT=on` to the Preview environment only, and check Production does not have it. Verify: Vercel's environment settings show the variable under Preview and not under Production
- [ ] 6.2 Push, open the PR, and on the preview URL: become `pretend-user-02`, open every nav link, then become `pretend-user-01` and open `/admin`. Verify: #7's success checks 1 to 3 and 5 are ticked in the PR description
- [ ] 6.3 After merge, on the production URL: check the page has no "sign in as…" control, and run `curl -i -X POST <production url>/api/dev/sign-in-as -d "userId=pretend-user-01"`. Verify: the response is 404, and #7's success check 4 is ticked
- [ ] 6.4 **(human)** Tell the team on #18 that the foundation is merged: pull `master`, run `npm install`, add `PRETEND_COHORT=on` to `.env`, and that `npm test` resets dev data. Comment on #9 that its tasks 1.1 and 2.1 are already done here. Verify: both comments are posted
