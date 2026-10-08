# Proposal: Foundation: shared schema, pretend cohort, dev sign-in (#7)

## Why

Five of us are about to build nine slices at the same time (slice map, #18), but today the database only has the three catalogue tables and there is no way to be "signed in". Every track would have to wait for the one before it: you can't build matching without profiles, or messaging without connections. This slice lays the floor plan once, so each track can start straight away against the same tables, the same pretend students and the same helper names. It is the only slice everyone waits for.

## What Changes

- **Every MVP table is added to `schema.prisma` in one migration**, from `4-brief-alignment` D-new-2: `User`, `Profile`, `ProfileTag`, `TagPairing`, `Edge`, `GlitchMatch`, `ConnectionRequest`, `Conversation`, `Message`, `Block`, `Report`, plus the Auth.js tables (`Account`, `Session`, `VerificationToken`). After this, slices should rarely need to touch the schema.
- **Two schema items the onboarding plan (#9) asked for are included here**, so track 2 needs no migration of its own: a `Tag.aliasWord` column and a unique `Profile.alias`.
- **A pretend cohort** (`npm run seed:fake`): 32 pretend users across both courses. 30 have finished profiles built from real catalogue tags, with scores for every pair, a glitch match each, some connection requests, a few conversations with messages, one block and one report. One is an admin, one is suspended, and two have signed up but not onboarded yet. It is safe to run twice and refuses to run on production.
- **A dev-only "sign in as…" switcher** in the nav bar: pick any pretend user and see the app as them. It does not exist on production. Slice 1's real sign-in replaces it.
- **Five shared helpers with fixed names**, so tracks call each other through an agreed interface and never through each other's code:
  - `getCurrentUser()`: the signed-in user, or nothing. Uses the switcher for now. Slice 1 swaps in Auth.js behind the same name.
  - `requireAdmin()`: the signed-in user if they are an admin, otherwise access is refused. Added to the issue's four at Patrick's decision, because the slice map already tells track 3 to "use the shared admin check".
  - `scoreUser(userId)`: does nothing yet. Slice 3 fills it in.
  - `openConversation(userAId, userBId)` and `closeConversation(conversationId)`: minimal versions. Slice 6 owns them.
- **A page at every planned route and one shared nav bar**, so tracks don't create clashing pages. Each page is a placeholder that says which slice will build it.
- **Tests keep sharing the dev database and put the pretend cohort back when they finish.** Tests empty the tables, which would otherwise delete the cohort every time anyone ran `npm test`.

No real feature logic is included. Each helper and page is just enough for the other tracks to build on.

### Decisions made for this change (asked of Patrick, 8 Oct 2026)

| Question | Decision |
|---|---|
| Where do tests run, now that the dev database holds the pretend cohort? | Keep sharing the dev database. Tests re-seed the pretend cohort when they finish |
| Include #9's `Tag.aliasWord` and unique `Profile.alias` in this schema? | Yes, both |
| Add a shared admin check? | Yes: `requireAdmin()` as a fifth helper |
| Size of the pretend cohort (open question on #7) | About 30, as the issue proposed: 30 finished profiles plus 2 users who haven't onboarded |

## Capabilities

### New Capabilities

- `pretend-cohort`: the pretend students and the "sign in as…" switcher that let us build and test before real sign-up exists, and the rules that keep both off production. Join-up (#17) removes this capability.
- `app-navigation`: the shared navigation bar and the set of pages it links to (the route plan).

### Modified Capabilities

- `admin`: the "Admin role" requirement now says what "access is refused" looks like for a member and for a visitor who isn't signed in, because the shared admin check that decides it is built here.

## Impact

- **Schema:** 14 new tables, 3 small enums and 1 new column on `Tag`, in one migration. It only adds things, so nothing built in slice 0 changes.
- **Code (new):** `src/lib/` (the five helpers and the on/off switch for the pretend cohort), `prisma/` (the pretend cohort seed, separate from the catalogue seed), `src/app/` (twelve placeholder pages, the nav bar, the switcher and one `/api/dev/` route), and tests.
- **Code (changed):** `src/app/layout.tsx` gets the nav bar. The test helpers and the two existing test files change so they empty every table in a safe order and restore the cohort afterwards.
- **Environment:** one new variable, `PRETEND_COHORT`. It is set to `on` in each person's `.env` and in Vercel's Preview settings, and is **never** set in Production.
- **Dependencies:** none added. Auth.js itself is installed by slice 1. Only its tables are defined here.
- **Other tracks:** every track builds on these tables and helpers. #9's tasks 1.1 and 2.1 (flag and make the schema change) are no longer needed. Tom (#8) should check the `User` and Auth.js tables before approval (see `design.md`, Open Questions).
- **Running `npm test` now resets the shared dev data** to the fresh pretend cohort. Anything a teammate changed by hand on dev (a request they approved, a message they sent) is lost. This is the accepted cost of sharing one database.
- **Docs:** `README.md` gains the pretend cohort, the switcher, the helpers and the route plan. `ARCHITECTURE.md` is updated at archive, because this adds the shared helpers and the full data model.
- **Out of scope:** any real feature (sign-up, onboarding screens, scoring, the graph, requests, messaging, admin screens, reports), Skills and Interests tags and alias words (#9), Seeking↔Quality pairings (#10), and installing Auth.js (#8).
