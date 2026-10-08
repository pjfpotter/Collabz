# Design: Foundation: shared schema, pretend cohort, dev sign-in (#7)

## Context

- See `proposal.md` (Why) for the motivation and `specs/` for the requirements. The slice map is issue #18.
- **What exists today** (slice 0, merged): a Next.js 16 app on Vercel, Neon Postgres through Prisma 7.10, three tables (`Category`, `Tag`, `Course`), a catalogue seed that only adds missing rows, a `/catalogue` page, and Vitest and Playwright tests that run against the Neon `dev` branch.
- **What does not exist:** any user table, any way to be signed in, any shared helper, any page other than `/` and `/catalogue`.
- The table shapes come from `4-brief-alignment` D-new-2, which amends `2-mvp-overview` D3. References like **D3** and **B2** point at those two archived designs.
- **Next.js 16 differs from older tutorials.** Checked in `node_modules/next/dist/docs/`: `cookies()` is async and can only be *set* in a Route Handler or Server Function, and `forbidden()` is still experimental.
- `TEST_DATABASE_URL` and `DATABASE_URL` point at the same Neon `dev` branch today, so tests and hand-testing share one database.
- Five beginners will read this code, so every non-obvious line gets a comment explaining *why*.

## Goals / Non-Goals

**Goals:**
- After this merges, no track needs another track's code to exist, and no track needs a schema change to start.
- Each shared helper has one fixed name, one file and one owner, so the join-up (#17) is a matter of swapping what is *inside* a helper, never who calls it.
- Nothing pretend can reach production, even by mistake.

**Non-Goals:**
- Installing or configuring Auth.js. Slice 1 (#8) does that. We only define its tables.
- Making placeholder pages look good. They are replaced by the tracks.
- A separate test database. Patrick chose to keep sharing `dev` (decision 12).

## Decisions

### 1. Every MVP table in one migration
```
User               id, email (unique), emailVerified?, role (MEMBER/ADMIN), courseId? → Course,
                   suspendedAt?, acceptedTermsAt?, createdAt
Profile            userId (id) → User, silhouette, alias (unique), photoKey?, completedAt?
ProfileTag         userId → Profile, tagId → Tag                       (id: both together)
TagPairing         seekingTagId → Tag, qualityTagId → Tag              (id: both together)
Edge               userAId, userBId → User, score, complement, overlap, tension   (id: both together)
GlitchMatch        userId (id) → User, matchedUserId → User
ConnectionRequest  id, fromUserId, toUserId → User, status (PENDING/APPROVED/DECLINED), createdAt
Conversation       id, userAId, userBId → User, createdAt, closedAt?   (unique: the pair)
Message            id, conversationId → Conversation, senderId → User, body, createdAt
Block              blockerId, blockedId → User, createdAt              (id: both together)
Report             id, reporterId, reportedId → User, reason, status (OPEN/RESOLVED),
                   resolvedById? → User, createdAt
Account, Session, VerificationToken    (Auth.js, decision 3)
Tag                + aliasWord?        (decision 2)
```
- *Why one migration:* five tracks each adding "their" tables would mean five migrations racing on one shared `dev` database. One file, reviewed once, removes that.
- *Why the tables are empty of logic:* a table is only a shape. Defining `Message` now doesn't build messaging; it lets track 5 start without asking anyone.

Details that D-new-2's sketch left open, each with its reason:

| Detail | Choice | Why |
|---|---|---|
| `User.id` and other generated ids | Random string (`cuid()`) | It's what Auth.js's own schema uses, so slice 1 needs no change. Catalogue rows keep their readable ids |
| `User.courseId`, `acceptedTermsAt` | Can be empty | Auth.js creates the `User` row when the magic link is opened. Leaving these empty-able lets slice 1 choose how it holds back the account until course and terms are given. The rule "no account without them" stays in `user-auth`'s spec and slice 1's code |
| `Profile.completedAt` | Can be empty | Empty means "not finished", which admin's "reset onboarding" (slice 8) needs |
| `role` and the two `status` columns | Database enums | A fixed, short list that code branches on. An enum makes a typo impossible |
| `Report.reason` | Plain text column | Slice 9 decides the list of reasons (D-new-4 open question). An enum now would lock that in |
| `Edge` and `Conversation` pairs | Stored once, lower user id in `userAId` | D3: a pair has one score, so one row can't disagree with itself. A small helper, `orderUserPair(a, b)`, puts two ids in that order so nobody has to remember the rule |
| `Conversation` | One per pair (unique) | `openConversation` can then be called twice safely and return the same one |
| `ConnectionRequest` | *Not* unique per pair | Whether a declined request can be sent again is slice 5's open question. A unique rule would answer it by accident |
| Deleting | Our tables: the database refuses to delete a row that others point at. Auth.js tables: deleted with their user, as in Auth.js's schema | Matches slice 0's "safety net" for retire-never-delete. Tests and join-up delete in a set order instead (decision 12) |

### 2. Two items from the onboarding plan (#9) are folded in
`Tag.aliasWord String?` and `@unique` on `Profile.alias` (Patrick's decision, 8 Oct 2026).
- *Why:* #9's own design says "the cleanest option is to fold them into #7's schema". Track 2 then starts with no migration.
- **Not included:** #9's `pickMin` fix. It isn't needed, because slice 0 already seeded Qualities and Seeking with a minimum of 1. The alias *words* and the Skills and Interests tags stay with #9, since they are content, not shape.

### 3. Auth.js tables are copied from Auth.js's Prisma schema, without installing Auth.js
`Account`, `Session` and `VerificationToken` follow the schema in the Auth.js Prisma adapter docs. `User` gets `emailVerified`, which the adapter needs. We leave out Auth.js's optional `name` and `image` columns.
- *Why leave them out:* we never collect names (no free text), and photos live in private storage under `Profile.photoKey` (B3). An unused `name` column is an invitation to fill it.
- *Why not install Auth.js here:* choosing the email service and wiring sign-in is slice 1's job. Tables alone are enough for nobody to be blocked.
- *Alternative:* leave the Auth.js tables to slice 1. Rejected because the issue asks for them here, and `User` is the table every other table points at.

### 4. One switch, `PRETEND_COHORT`, turns on both the pretend seed and the switcher
`src/lib/pretendCohort.ts` exports `isPretendCohortEnabled()`. It returns true only when the environment variable `PRETEND_COHORT` is exactly `on` **and** `VERCEL_ENV` is not `production`.
- *Why opt-in and not "on unless production":* the switcher lets anyone become any user, including the admin. If the check were "on unless we detect production", any mistake in detecting production would leave it on. With opt-in, forgetting the variable leaves it **off**, which is the safe way to fail.
- *Why also check `VERCEL_ENV`:* a second lock. If someone adds the variable to Vercel's Production settings by mistake, production still refuses.
- *Why not `NODE_ENV`:* Vercel preview deploys also run with `NODE_ENV=production`, and the switcher must work on previews (issue #7, success check 3).
- *Where it is set:* each person's `.env`, Vercel → Preview, and the Playwright test server. Never Vercel → Production.

### 5. The pretend cohort: who is in it
| Who | How many | Why they exist |
|---|---|---|
| Finished profiles | 30 (15 Software, 15 Business) | The realistic cohort for matching, the graph and search |
| …of which an admin | 1 (`pretend-user-01`) | Tracks 2 and 3 need to reach `/admin` |
| …of which suspended | 1 | Track 4 must hide suspended users from the graph and search |
| Signed up, no profile | 2 (one per course) | Track 2 needs someone to take through onboarding (#9's Playwright test) |

Between the 30 finished profiles:
- **435 edges** (every pair). The three parts are made-up numbers and `score` is worked out from them with the brief's formula (complement × 3 + overlap + tension), so the numbers are consistent with each other. *Why made up:* real scoring is slice 3. The graph and top 5 only need believable numbers.
- **30 glitch matches**: not yourself, not in your top 5 (D9).
- **14 connection requests**: 8 pending, 4 approved, 2 declined, each sent to someone in the sender's top 5 or their glitch match, as the real rule will require.
- **4 conversations**, one per approved request. Three are open with a few messages each. One is closed, because…
- **1 block** between the two people in the closed conversation, and **1 open report**.
- `pretend-user-02` is set up as the "main character": one incoming pending request, one outgoing one, and one open conversation with messages. *Why:* a teammate can sign in as one person and see every feature with data in it. The README says so.

Other choices:
- **Ids and emails:** ids `pretend-user-01` … `pretend-user-32`, emails `pretend-01@collabz.test` and so on. *Why:* `.test` is a domain reserved for testing that can never receive email, so no real person is ever emailed. The `pretend-` prefix lets join-up (#17) find and remove all of them in one query, with no extra "is pretend" column in the schema.
- **Aliases:** "The Pretend " + the profile's Energy tag name + a number, e.g. *"The Pretend Sea Captain 07"*. *Why:* #9's alias words don't exist yet, the number keeps them unique, and "Pretend" makes it obvious on a preview that this isn't a real student.
- **Silhouettes:** the ids #9 plans, `silhouette-01` … `silhouette-12`, spread across the cohort. The picture files arrive with #9. Placeholder pages don't draw them.
- **No Seeking↔Quality pairings.** `TagPairing` stays empty. Agreeing the pairs is slice 3's open question.
- **Same cohort for everyone:** the picks come from a small seeded number generator (a few lines of arithmetic, no new dependency), started from a fixed number. *Why:* "ask pretend-user-07" must mean the same person on every laptop and on the preview. *Alternative:* `Math.random()`, which gives everyone a different cohort and makes tests unrepeatable.

### 6. The pretend seed: a separate file that only adds what's missing
- **`prisma/pretend-cohort.ts`** builds the cohort as plain data from the catalogue it is given. It doesn't touch the database, so Vitest can check it quickly (limits respected, counts right, same result twice).
- **`prisma/seed-fake.ts`** exports `seedPretendCohort(prisma)` and is what `npm run seed:fake` runs. It first calls `isPretendCohortEnabled()` and throws with a clear message if it's off. It then inserts with `createMany({ skipDuplicates: true })`, the same pattern as slice 0's seed.
- **Filling in a new category:** after the inserts, for each finished pretend profile, any active category with no picks gets picks. *Why:* #9 adds Skills and Interests *after* this merges. Without this, pretend profiles would have no skills and track 4's filters would have nothing to filter. It only ever adds to empty categories, so it stays safe to repeat.
- *Why add-only and not "wipe and rebuild":* a teammate who approved a pretend request to test something shouldn't lose it because someone else ran the seed. (`npm test` does reset everything; see decision 12.)
- *Why separate from `prisma/seed.ts`:* that seed runs on **every** deploy, including production. Keeping the pretend cohort in a different file with a different command means the production build never even loads it.
- **It needs the catalogue first.** If there are no categories, it stops and says to run `npx prisma db seed`.

### 7. The switcher: a cookie, a form and one route
- **`src/app/api/dev/sign-in-as/route.ts`** (a Route Handler) accepts a posted form with a user id and the page to return to. If `isPretendCohortEnabled()` is false it answers 404. Otherwise it checks the id starts with `pretend-` and exists, sets a cookie holding that id (or clears it for "Signed out"), and redirects back.
- **`src/components/DevUserSwitcher.tsx`** is a Server Component in the nav bar: a `<form>` with a `<select>` of pretend users and a button. It renders nothing when the switch is off.
- *Why a plain form and a Route Handler:* it works with no browser JavaScript, so there is nothing to hydrate, and Next.js only allows cookies to be set in a Route Handler or Server Function. The project uses API routes as its backend, and #9 made the same choice.
- *Why only ids starting `pretend-`:* once slice 1 lands, real users may exist on `dev`. The switcher must never be a way to become a real person.
- *Why the return address is checked to start with `/`:* otherwise the form could be used to bounce someone to another website.
- The cookie is `httpOnly` (page scripts can't read it) and lasts for the browser session.

### 8. The shared helpers: one file each, one owner each
| Helper | File | Now | Owner afterwards |
|---|---|---|---|
| `getCurrentUser()` | `src/lib/currentUser.ts` | Returns the `User` row for the switcher's cookie, or `null`. Always `null` when the pretend cohort is off | Slice 1 (#8) swaps in Auth.js |
| `requireAdmin()` | `src/lib/currentUser.ts` | See decision 9 | Slice 8 (#15) |
| `scoreUser(userId)` | `src/lib/scoring.ts` | Does nothing and returns | Slice 3 (#10) |
| `openConversation(userAId, userBId)` | `src/lib/conversations.ts` | Returns the pair's conversation, creating it if there isn't one | Slice 6 (#13) |
| `closeConversation(conversationId)` | `src/lib/conversations.ts` | Sets `closedAt` if it's empty | Slice 6 (#13) |
| `orderUserPair(a, b)` | `src/lib/userPair.ts` | Returns the two ids, lower first | Foundation |

- Every helper is `async` and has a header comment saying who owns it, what it does now, and what it will do. *Why `async` even for the one that does nothing:* slice 3 will make `scoreUser` talk to the database. If it were synchronous now, every caller would have to change later.
- `getCurrentUser()` returns the whole `User` row. Callers who need the profile load it themselves. *Why:* slice 1 must be able to replace the inside without knowing what each caller wanted.
- It does **not** hide suspended users. *Why:* "suspended users cannot sign in" is slice 1's and slice 8's rule. Until then the switcher needs to be able to *be* the suspended user so track 4 can test that they vanish from the graph.
- If `openConversation` finds a closed conversation, it returns it unchanged. Whether it can be reopened is slice 6's decision.
- The cookie lookup is split out as `findPretendUser(id)`, so Vitest can test it without a browser. Reading the cookie itself is covered by Playwright.

### 9. `requireAdmin()`: not signed in → sign-in page; a member → "page not found"
It calls `getCurrentUser()`. No user → `redirect("/signin")`. Role isn't admin → `notFound()`. Otherwise it returns the user.
- *Why "not found" and not a "forbidden" page:* Next.js's `forbidden()` is still marked experimental and needs a config flag. `notFound()` is stable, and it doesn't confirm to a curious member that an admin area exists.
- *Why one shared function:* tracks 2 and 3 both build pages under `/admin`. Two hand-written checks would be two chances to get it wrong.

### 10. Route plan: one placeholder page per route
| Route | Slice | Issue | Track |
|---|---|---|---|
| `/signup`, `/signin` | 1 | #8 | 1 |
| `/onboarding` | 2 | #9 | 2 |
| `/matches` | 3 | #10 | 3 |
| `/graph`, `/people`, `/people/[alias]` | 4 | #11 | 4 |
| `/requests` | 5 | #12 | 5 |
| `/messages` | 6 | #13 | 5 |
| `/account` | 7 | #14 | 1 |
| `/admin` (and anything under it except reports) | 8 | #15 | 2 |
| `/admin/reports` | 9 | #16 | 3 |
| `/api/dev/*`, the nav bar, `src/lib/` helper files | foundation | #7 | — |

- Each page is a few lines that render a shared `PlaceholderPage` component with the title, slice and issue. The two admin pages call `requireAdmin()` first.
- **Ownership rule:** a slice owns its routes above, anything nested under them (e.g. `/onboarding/done`), and the API routes under the same name (e.g. `/api/onboarding/*`). The owning track deletes its placeholder when it builds the real page.
- *Why create the pages at all:* two tracks can't both invent `/people`. An existing file with the owner's name on it settles it.

### 11. The nav bar
`src/components/NavBar.tsx`, a Server Component used in `src/app/layout.tsx`. It shows "Collabz" (home), a link to each route that doesn't need a person chosen, and the switcher. The links wrap onto more lines on a phone.
- It shows **every** link to everyone for now, including Admin. *Why:* during the build, people need to reach every page quickly. Hiding links by sign-in state and role is tidied in join-up (#17), once real sign-in exists.
- Because the bar reads a cookie, every page is now rendered on each request. *Why that's fine:* `/catalogue` already is, and the home page is tiny.

### 12. Tests keep sharing `dev`, and put the pretend cohort back afterwards
Patrick's decision (8 Oct 2026), instead of a separate Neon test branch.
- `tests/helpers/database.ts` replaces `emptyCatalogueTables` with `emptyDatabase(prisma)`, which deletes from every table in an order the database accepts (messages before conversations, profile tags before profiles and tags, users near the end, the catalogue last). *Why it has to change:* once pretend profiles point at tags, the database refuses to delete a tag, so the slice 0 helper would fail.
- **One restore at the end of the run:** a Vitest `globalSetup` teardown and a Playwright `globalTeardown` both run the catalogue seed, then the pretend seed. The existing "re-seed in `afterAll`" lines in the two slice 0 test files are removed in favour of it. *Why one place:* five tracks will each add test files, and every one would otherwise need to remember to restore.
- *Alternative offered and not chosen:* a separate Neon `test` branch, which would keep hand-made dev data safe from test runs.

### 13. Who changes the schema after this
Patrick, as owner of #7, creates migrations (`npx prisma migrate dev`). Anyone who needs a change flags it in the team chat or on #18 first, as CLAUDE.md says. Everyone else gets schema changes by pulling `master` and running `npx prisma migrate deploy`.
- *Why one person:* `migrate dev` writes to the shared `dev` database. Two people running it with different schemas at once leaves the database matching neither.

## Risks / Trade-offs

- **[`npm test` wipes hand-made dev data]** Any test run empties the shared `dev` database and restores the fresh pretend cohort, so a teammate's hand-approved request or sent message disappears. → Accepted (decision 12). The README warns about it. The cohort always comes back in the same known state.
- **[Pages break while someone's tests are running]** For the minute or two a test run takes, `dev` may be empty, so a teammate's local page or a preview may show nothing or an error. → Accepted. If it starts hurting, a Neon `test` branch is a one-line change to `TEST_DATABASE_URL`.
- **[Two people running tests at the same moment]** Both empty and fill the same tables and can fail each other's tests. → Say "running tests" in the team chat for now. Same escape hatch as above.
- **[Slice 1 may need the Auth.js tables shaped differently]** The email-only flow shouldn't need `name` or `image`, but we haven't run it. → Tom reviews decisions 1 and 3 before approval, and a task checks our tables against the Auth.js adapter docs. A later tweak is one small announced migration.
- **[The switcher is a way to become an admin]** → Off unless explicitly switched on, hard-off on production, pretend ids only, and the route answers 404 when off (decisions 4 and 7). A unit test covers the on/off rule, and the last task checks the production URL by hand.
- **[Placeholder pages get forgotten]** A track might build beside its placeholder rather than replacing it. → Each placeholder names its owner, and the README's route table says "delete the placeholder when you build the page".
- **[Made-up scores disagree with the tags]** A pretend pair's "why you match" won't line up with their real tags until slice 3's `scoreUser` runs. → Expected. Slice 3 rescoring the pretend cohort is the first real test of its code.
- **[Preview deploys run this migration against the shared `dev`]** → That is where we want it tried first. It only adds tables and one empty-able column, so slice 0's pages keep working throughout.

## Migration Plan

1. Create the migration locally against Neon `dev` (`npx prisma migrate dev`).
2. Add `PRETEND_COHORT=on` to local `.env` files and to Vercel → Preview. Leave Production without it.
3. Run `npm run seed:fake` once against `dev`.
4. Open the PR. The preview build runs `prisma migrate deploy`, which finds `dev` already up to date.
5. Merging deploys production. The build migrates the Neon `production` branch, creating the new tables **empty**. No pretend data goes there.
6. Tell the team: pull `master`, run `npm install`, add `PRETEND_COHORT=on` to `.env`.

**Rollback:** Vercel Instant Rollback to the previous deploy. The migration only adds tables and one optional column, so slice 0's code runs unchanged against the new database.

## Open Questions

Neither changes the approach or the task list. Both are small enough to settle at approval.

- **For Tom (#8):** are you happy with `User.courseId` and `acceptedTermsAt` being empty-able, and with leaving out Auth.js's `name` and `image` columns (decisions 1 and 3)?
- **For the team:** is Patrick the one person who creates migrations (decision 13)? This answers #7's open question "who keeps an eye on `schema.prisma`".
