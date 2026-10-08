# Collabz

**Tinder for Business.**

Team coursework project (Wave 7 bootcamp) demonstrating a professional, human-directed agentic software development lifecycle — from feature idea through to a reviewed, deployed change.

This README covers what the project is and how to get it running locally. For the full team process — OpenSpec, GitHub Issues, branching, commit format, approvals — see [`WORKFLOW.md`](./WORKFLOW.md).

## What this is

A small web app built collaboratively, with every feature tracked through the same chain: ticket → spec → approval → build → review → merge → deploy. The point of the exercise is as much about the evidenced process as the product itself.

## Prerequisites

Check these are installed before you start:

```bash
node --version    # v20.19.0 or higher
npm --version
git --version
gh --version       # GitHub CLI, authenticated (gh auth status)
```

You'll also need:
- **Claude Code** (or your preferred coding agent), installed and signed in
- **OpenSpec CLI**, installed once per machine:
  ```bash
  npm install -g @fission-ai/openspec@latest
  openspec --version
  ```

## Getting set up

```bash
git clone https://github.com/pjfpotter/Collabz.git
cd Collabz
npm install
```

`npm install` also builds Prisma's database client into `src/generated/prisma` (the `postinstall` script runs `prisma generate`). That folder isn't committed, so if your editor complains it can't find `@/generated/prisma`, run `npm install` again.

`openspec/` and `.claude/` are already committed to this repo, so OpenSpec and Claude Code's slash commands (`/opsx:...`) should work as soon as you clone and restart your terminal/IDE.

### Connect to the database (`.env`)

The app reads its data from a Neon Postgres database, so it won't start without the connection details. These are secrets, so they live in a `.env` file on your machine that git ignores.

```bash
cp .env.example .env
```

Then fill in the three values in `.env`:

| Variable | What it is | Used by |
|---|---|---|
| `DATABASE_URL` | The **pooled** URL of the Neon `dev` branch (the host contains `-pooler`) | The running app |
| `DIRECT_URL` | The same URL with `-pooler` removed | Prisma migrations |
| `TEST_DATABASE_URL` | For now, the same value as `DATABASE_URL` | The tests |

The Neon project is on Patrick's account with no collaborators, so **ask Patrick for the `dev` branch URLs**. Pass them privately: never paste them into the repo, an issue, a PR or a group chat.

Only ever use the `dev` branch here, never `production`. The tests empty every table, which is why they have their own variable and refuse to run without it.

You don't need to create any tables: the shared `dev` database already has them, with the catalogue seeded.

## Running locally

```bash
npm run dev
```

Then open <http://localhost:3000>. The home page links to the one feature so far, the tag catalogue at <http://localhost:3000/catalogue>: every profile category with its tags and descriptions, read from the database on each request.

## Running the tests

```bash
npm test             # Vitest: the seed and the catalogue's data logic
npm run test:e2e     # Playwright: opens /catalogue in a real browser
```

Before the first `npm run test:e2e` on a machine, download the browser Playwright drives:

```bash
npx playwright install chromium
```

Things to know:

- **Both sets of tests use the real `dev` database, not a fake one.** Proving that Prisma and Neon work together was the point of slice 0.
- **We all share that one database.** The tests empty every table and put the catalogue and the pretend cohort back when they finish (see [Pretend cohort](#pretend-cohort)). If two of us run them at the same moment they can trip each other up, and `/catalogue` can look empty for a few seconds. If a run is interrupted and the catalogue stays empty, `npx prisma db seed` refills it.
- **`npm run test:e2e` starts its own copy of the app** on port 3100, so it doesn't clash with an `npm run dev` you already have open.
- **To check a deployed site instead**, such as a Vercel preview, give it the URL. Only the read-only test runs; the tests that change data skip themselves:
  ```bash
  BASE_URL=https://<preview-url> npm run test:e2e
  ```

Other checks worth running before a PR:

```bash
npm run lint                           # ESLint
npx next typegen && npx tsc --noEmit   # type check
npm run build                          # the same Next.js build Vercel runs
```

The type check runs `next typegen` first because Next.js generates some types itself (such as `LayoutProps`). On a fresh clone they don't exist yet, and `tsc` alone fails with "Cannot find name 'LayoutProps'".

## Deployment

Vercel builds every commit pushed to GitHub. A commit on `master` becomes the live **Production** site, using the Neon `production` branch. A commit on any other branch gets its own **Preview** URL, using the Neon `dev` branch; Vercel posts that URL on the PR.

Each build runs `prisma migrate deploy && prisma db seed && next build`, so a deploy brings its own database up to date before the app is built. The seed only adds rows that are missing, so running it every time is safe.

## Routes

Every page the app will have already exists, so that two tracks can't invent the same address. Until a page's feature is built it shows a **placeholder** naming the slice that owns it. The nav bar at the top of every page links to all of them.

| Route | Slice | Issue | Track |
|---|---|---|---|
| `/`, `/catalogue` | 0 | #6 | built |
| `/signup`, `/signin` | 1 | #8 | 1 |
| `/onboarding` | 2 | #9 | 2 |
| `/matches` | 3 | #10 | 3 |
| `/graph`, `/people`, `/people/[alias]` | 4 | #11 | 4 |
| `/requests` | 5 | #12 | 5 |
| `/messages` | 6 | #13 | 5 |
| `/account` | 7 | #14 | 1 |
| `/admin` (and anything under it except reports) | 8 | #15 | 2 |
| `/admin/reports` | 9 | #16 | 3 |
| `/api/dev/*`, the nav bar, the shared helpers | foundation | #7 | all |

**What you own.** Your slice owns its routes in the table, anything nested under them (for example `/onboarding/done`), and the API routes of the same name (for example `/api/onboarding/*`). Only change files inside your own routes.

**When you build your page:** replace the placeholder `page.tsx` with the real one. Don't build beside it. If you add a page the nav bar should link to, add it to `navLinks` in `src/components/NavBar.tsx`.

**Admin pages** start with `await requireAdmin();`. Keep that as the first line when you replace the placeholder.

## Dev sign-in

There is no real sign-in until slice 1. Instead, the nav bar has a **"Dev sign-in as"** list of the pretend students. Pick one and press **Switch**, and the whole app treats you as that person until you pick someone else or "Signed out". `getCurrentUser()` returns whoever you picked.

It only appears where `PRETEND_COHORT="on"` is set (see below), and never on the live site.

In Playwright tests, sign in with the helper:

```ts
import { signInAs } from "../helpers/devSignIn";

await signInAs(page, "pretend-user-02");
```

The test database needs the cohort first: call `loadPretendCohortForTests(prisma)` from `tests/helpers/database.ts` in your `beforeAll` (see `tests/e2e/switcher.spec.ts` for a full example).

## Pretend cohort

Real students can't sign up yet, so the dev database is filled with **32 pretend students** to build and test against. They only exist on the dev database, never on the live site.

**Switch it on (once per laptop).** Add this line to your `.env`, on its own line:

```
PRETEND_COHORT="on"
```

It must be exactly `on`. This one switch allows both the pretend students and the "sign in as…" switcher. It is never set in Vercel's Production settings, and the code refuses on the live site even if it is.

**Load it:**

```bash
npm run seed:fake
```

It is safe to run again: it only adds what's missing and never overwrites, so something you changed by hand (say, a request you approved) survives. It needs the tag catalogue first (`npx prisma db seed`).

**Who is in it:**

| Who | Id | Notes |
|---|---|---|
| The admin | `pretend-user-01` | Can open `/admin`. Also has a finished profile |
| The "main character" | `pretend-user-02` | **Start here.** Has an incoming request, an outgoing request and an open conversation with messages, so every feature has something to show |
| Finished profiles | `pretend-user-01` to `30` | 15 Software, 15 Business, with tags, an alias like "The Pretend Sea Captain 07" and a silhouette |
| Suspended | `pretend-user-30` | Should not appear on the graph or in search |
| Not onboarded yet | `pretend-user-31`, `32` | Signed up, no profile: use these to test onboarding |

Between the 30 finished profiles there is a score for every pair (435), a glitch match each, 14 connection requests (8 pending, 4 approved, 2 declined), 4 conversations (3 open with messages, 1 closed), 1 block and 1 open report.

Everyone gets exactly the same cohort, so "sign in as pretend-user-07" means the same person on every laptop and on preview links. The scores are made up until slice 3 builds real scoring.

> **Running the tests resets the shared dev database.** `npm test` and `npm run test:e2e` empty every table and then load a fresh pretend cohort. Anything you changed by hand on dev is lost, and for the minute or two a run takes, a teammate's page (or a preview link) may show nothing or an error. Say "running tests" in the team chat first.

## Shared helpers

Five of us build different parts at the same time. To stop one track depending on another track's unfinished code, the parts talk to each other only through a few **shared helpers** with fixed names. Each one has an owner who fills in the real version later; the name, and what it gives back, stay the same.

**The rule:** call these, and never import another track's files. If you need something from another track that isn't here, raise it on the slice map (#18) instead of reaching into their code.

| Helper | File | What it does today | Owner |
|---|---|---|---|
| `getCurrentUser()` | `src/lib/currentUser.ts` | Returns the signed-in user, or `null`. For now "signed in" means "picked in the dev switcher" | Slice 1 (#8) swaps in real sign-in |
| `requireAdmin()` | `src/lib/currentUser.ts` | For admin pages. Sends a signed-out visitor to `/signin`, shows a member "page not found", and returns the user if they are an admin | Slice 8 (#15) |
| `scoreUser(userId)` | `src/lib/scoring.ts` | Does nothing yet. Call it after a user finishes onboarding or edits their answers | Slice 3 (#10) fills it in |
| `openConversation(userAId, userBId)` | `src/lib/conversations.ts` | Returns the conversation between two users, creating it if needed. Safe to call twice | Slice 6 (#13) |
| `closeConversation(conversationId)` | `src/lib/conversations.ts` | Marks a conversation as closed. Safe to call twice | Slice 6 (#13) |
| `orderUserPair(a, b)` | `src/lib/userPair.ts` | Puts two user ids in the agreed order (lower first) for the `Edge` and `Conversation` tables, which store each pair once | Foundation (#7) |

Each file starts with a comment that says the same in more detail, including what the helper will do once its owner has built it.

## Graph and people search

Track 4 (slice 4, issue #11) builds the cohort graph, the people list and the profile page. **This section is being built**: the helpers below exist, and the three pages are still placeholders.

**Routes this track owns:**

| Route | What it will show |
|---|---|
| `/graph` | The whole cohort as a graph, with a line for every pair's score |
| `/people` | Everyone as a list, with filters for course, skill and interest |
| `/people/[alias]` | One person's profile and why you match |
| `/api/people/[alias]/connect` | Where the "Connect" button posts to |

**Helpers other tracks may use** (all in `src/lib/cohort/`):

| Helper | File | What it does |
|---|---|---|
| `getVisiblePeople()` | `visiblePeople.ts` | Everyone who has finished their profile and isn't suspended, with alias, silhouette, course and tags. Never an email. If your page lists people, start from this, so a suspended person can't slip through |
| `aliasToAddress(alias)` | `aliasAddress.ts` | Turns an alias into the last part of a profile address: "The Feral Sea Captain II" becomes `the-feral-sea-captain-ii`. Link to a profile with `/people/` followed by this |
| `findPersonByAddress(people, address)` | `aliasAddress.ts` | The other way round: finds the person a profile address belongs to |

**Stand-ins.** This track needs six things that other tracks own and haven't built yet. Rather than wait, it uses simple temporary versions, all in one file: `src/lib/cohort/standIns.tsx`. Join-up (#17) replaces each one with a call to the real thing.

| Stand-in | What it does for now | Real owner | What replaces it |
|---|---|---|---|
| `getTopFive(userId)` | Reads the stored scores and returns the five best visible matches. Ties go to whoever finished their profile first | Track 3 (#10) | Track 3's top 5 query |
| `explainMatch(userAId, userBId)` | A few short sentences from the three stored parts of a score, plus the skills and interests both people picked | Track 3 (#10) | Track 3's real breakdown |
| `sendConnectionRequest(fromUserId, toUserId)` | Stores nothing and answers "Connection requests aren't switched on yet." | Track 5 (#12) | Track 5's request helper |
| `profileBio(tagsByCategory)` | One sentence from the Hero Story and Energy tag names | Track 2 (#9) | `generateBio()` |
| `SilhouetteStandIn` | The same head-and-shoulders shape for everyone | Track 2 (#9) | `silhouetteUrl()` and the 12 pictures |
| `requireFinishedProfile()` | Sends a signed-out visitor to `/signin` and someone with no finished profile to `/onboarding` | Track 2 (#9) | `redirectIfOnboardingIncomplete()` |

The names for tracks 3 and 5 are track 4's proposal and aren't agreed yet. **If you are on track 2, 3 or 5:** you don't need to do anything with this file. Build your real version under whatever name you settle on, and join-up does the swap.

## Project structure

```
src/
  app/                 # the screens (Next.js App Router): one folder per URL
    layout.tsx         #   wraps every page: puts the nav bar on top
    page.tsx           #   /            home page
    catalogue/page.tsx #   /catalogue   the tag catalogue
    <route>/page.tsx   #   one placeholder per planned route (see Routes)
    api/dev/           #   the dev sign-in switcher's API route
  components/
    NavBar.tsx         # the nav bar and the list of routes it links to
    DevUserSwitcher.tsx  # the "Dev sign-in as" list (dev only)
    PlaceholderPage.tsx  # what an unbuilt page shows
  lib/
    db.ts              # the one shared database client
    catalogue.ts       # getCatalogue(): reads categories and tags in order
    currentUser.ts     # getCurrentUser(), requireAdmin()   (shared helpers)
    scoring.ts         # scoreUser()                        (shared helper)
    conversations.ts   # openConversation(), closeConversation() (shared helpers)
    userPair.ts        # orderUserPair(): one agreed order for a pair of users
    pretendCohort.ts   # the on/off switch for pretend students and the dev switcher
    cohort/            # slice 4: who is visible, alias addresses, and the stand-ins
  generated/prisma/    # Prisma's generated client (not committed)
prisma/
  schema.prisma        # the database tables. Flag changes first (see CLAUDE.md)
  migrations/          # the SQL that creates and changes those tables
  seed-data.ts         # the categories, tags and courses from the brief
  seed.ts              # adds any of those rows that are missing
  pretend-cohort.ts    # works out the 32 pretend students (no database)
  seed-fake.ts         # npm run seed:fake: saves them to the dev database
tests/
  unit/                # Vitest tests that need no database (npm test)
  integration/         # Vitest tests against the test database (npm test)
  e2e/                 # Playwright browser tests (npm run test:e2e)
  helpers/             # shared test helpers
openspec/
  specs/               # permanent, current spec for each part of the system
  changes/             # in-flight and archived change proposals — the evidence trail
.claude/               # Claude Code skills/commands for the OpenSpec workflow
.env.example           # template for your local .env (no real values)
prisma.config.ts       # settings for the Prisma command-line tool
ARCHITECTURE.md        # plain-English overview of how the pieces fit together
CLAUDE.md              # project context for the coding agent
WORKFLOW.md            # how we collaborate — process, tooling, conventions
README.md              # this file
```

## How we work

Every feature follows the same ten-stage chain (pick → branch → spec → approve → build → verify → commit → PR → review, merge & deploy → archive), and keeps one ticket number across its branch, OpenSpec folder, PR and commits. Full details, board columns, commit message format, and the ticket template are in [`WORKFLOW.md`](./WORKFLOW.md).
