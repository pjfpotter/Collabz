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
| `/messages`, `/messages/[conversationId]` | 6 | #13 | 5 |
| `/account` | 7 | #14 | 1 |
| `/admin` (and anything under it except reports) | 8 | #15 | 2 |
| `/admin/reports` | 9 | #16 | 3 |
| `/api/dev/*`, the nav bar, the shared helpers | foundation | #7 | all |

**What you own.** Your slice owns its routes in the table, anything nested under them (for example `/onboarding/done`), and the API routes of the same name (for example `/api/onboarding/*`). Only change files inside your own routes.

**When you build your page:** replace the placeholder `page.tsx` with the real one. Don't build beside it. If you add a page the nav bar should link to, add it to `navLinks` in `src/components/NavBar.tsx`.

**Admin pages** start with `await requireAdmin();`. Keep that as the first line when you replace the placeholder.

## Signing in

Real sign-in (slice 1, #8) uses **magic links**: enter your email on `/signup` or `/signin`, open the link that arrives, and you're signed in. No passwords. [Auth.js](https://authjs.dev) v5 does the work (set up in `src/auth.ts`), and the emails are sent **through a dedicated Gmail account**, which is free and needs no domain of our own.

**Settings in `.env`** (see `.env.example` for comments on each):

| Variable | What it is | Where to get it |
|---|---|---|
| `AUTH_SECRET` | Protects sign-in tokens and cookies | Make your own: `npx auth secret` |
| `GMAIL_USER` | The Gmail account the emails come from | The team's Collabz Gmail address |
| `GMAIL_APP_PASSWORD` | Lets the app send as that account | A Gmail app password (below). **Not** the account's normal password |
| `EMAIL_FROM` | Who the email says it's from | The same address with a name: `Collabz <the-address@gmail.com>` |
| `ADMIN_EMAILS` | Emails that become admins | Comma-separated. Locally you can leave it empty |

You only need the Gmail settings to send *real* emails. The tests, and signing in as a pretend student, use the test inbox below instead.

**Getting a Gmail app password.** An app password is a 16-letter password Google makes for one app, which can be cancelled any time without changing the account's own password.
1. Sign in to the Collabz Gmail account.
2. Turn on 2-Step Verification: [myaccount.google.com/security](https://myaccount.google.com/security). Google only offers app passwords once it is on.
3. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), name it "Collabz", and create it.
4. Copy the 16 letters (without the spaces) into `GMAIL_APP_PASSWORD`. Google only shows it once.

Treat it like a password: never commit it or paste it into chat. If it leaks, delete it on the same page and make a new one.

**Limits.** A free Gmail account can send to roughly 500 people a day, plenty for the live test. Send a few test emails from it in the days before, so it isn't brand new on the day.

**Switching back to Resend.** Resend delivers more reliably, but only to anyone once we have a verified domain. Its set-up is kept in `src/auth.ts`, commented out, with the steps to switch back ("To switch back to Resend"). It then needs `AUTH_RESEND_KEY` (see `.env.example`).

**`ADMIN_EMAILS` only applies when an account is first created.** Adding someone after they've signed up does nothing; an existing admin promotes them instead (or edit their `role` in Neon).

**QR code for the live test.** Students sign up by scanning a QR code that points at the live sign-up page. Make it with the real production address:

```bash
npm run qr -- https://<production address>/signup
```

It writes `public/qr-code.png`, which the site then serves at `/qr-code.png`, ready to print. Scan it with a phone before printing, to check it opens the right page.

**Test inbox.** While the pretend cohort is on, links for `@collabz.test` addresses (the pretend students) aren't emailed: they're written to `.magic-links/<email>.txt` (gitignored). That's how the Playwright tests sign in for real. To try it by hand: sign in as `pretend-02@collabz.test` on `/signin`, then open the link in `.magic-links/pretend-02@collabz.test.txt`.

In Playwright tests that are *about* signing in, use the helper:

```ts
import { requestMagicLink } from "../helpers/magicLinkSignIn";

const link = await requestMagicLink(page, "pretend-02@collabz.test");
await page.goto(link);
```

## Dev sign-in

Alongside real sign-in, the nav bar has a **"Dev sign-in as"** list of the pretend students. Pick one and press **Switch**, and the whole app treats you as that person until you pick someone else or "Signed out". `getCurrentUser()` returns whoever you picked.

**The switcher only applies when you are not really signed in.** A real magic-link session always wins, so while you're signed in for real the switcher shows that person (or nobody selected) and picking a pretend user does nothing. Sign out first. Join-up (#17) removes the switcher.

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

It is safe to run again: it only adds what's missing and never overwrites, so something you changed by hand (say, a request you approved) survives. The one exception is chemistry scores, which are recalculated every time (see [Matching](#matching)). It needs the tag catalogue first (`npx prisma db seed`).

**Who is in it:**

| Who | Id | Notes |
|---|---|---|
| The admin | `pretend-user-01` | Can open `/admin`. Also has a finished profile |
| The "main character" | `pretend-user-02` | **Start here.** Has an incoming request, an outgoing request and an open conversation with messages, so every feature has something to show |
| Finished profiles | `pretend-user-01` to `30` | 15 Software, 15 Business, with tags, an alias like "The Pretend Sea Captain 07" and a silhouette |
| Suspended | `pretend-user-30` | Should not appear on the graph or in search |
| Not onboarded yet | `pretend-user-31`, `32` | Signed up, no profile: use these to test onboarding |

Between the 29 finished, unsuspended people there is a score for every pair (406), they each have a glitch match, 14 connection requests (8 pending, 4 approved, 2 declined), 4 conversations (3 open with messages, 1 closed), 1 block and 1 open report.

Everyone gets exactly the same cohort, so "sign in as pretend-user-07" means the same person on every laptop and on preview links. The scores are real: the seed works them out with the matching formula, so they are the same ones a real cohort with these answers would get.

> **Running the tests resets the shared dev database.** `npm test` and `npm run test:e2e` empty every table and then load a fresh pretend cohort. Anything you changed by hand on dev is lost, and for the minute or two a run takes, a teammate's page (or a preview link) may show nothing or an error. Say "running tests" in the team chat first.

## Shared helpers

Five of us build different parts at the same time. To stop one track depending on another track's unfinished code, the parts talk to each other only through a few **shared helpers** with fixed names. Each one has an owner who fills in the real version later; the name, and what it gives back, stay the same.

**The rule:** call these, and never import another track's files. If you need something from another track that isn't here, raise it on the slice map (#18) instead of reaching into their code.

| Helper | File | What it does today | Owner |
|---|---|---|---|
| `getCurrentUser()` | `src/lib/currentUser.ts` | Returns the signed-in user, or `null`. A real magic-link session wins (only if they've finished signing up and aren't suspended); otherwise the dev switcher's pick | Slice 1 (#8). Join-up (#17) removes the switcher part |
| `requireAdmin()` | `src/lib/currentUser.ts` | For admin pages. Sends a signed-out visitor to `/signin`, shows a member "page not found", and returns the user if they are an admin | Slice 8 (#15) |
| `scoreUser(userId)` | `src/lib/scoring.ts` | Rescores one user against everyone with a finished profile and keeps their glitch match valid. Call it after a user finishes onboarding or edits their answers, and after an admin suspends them or resets their onboarding so they drop out | Slice 3 (#10), built |
| `getTopFive(userId)` | `src/lib/matching/` | The user's five best matches, best first, from the stored scores. Suspended and unfinished people are left out | Slice 3 (#10), built |
| `explainMatch(userAId, userBId)` | `src/lib/matching/` | Why two people match, in plain sentences, with the points each is worth. The first id is "you". `null` if either person has no scores | Slice 3 (#10), built |
| `ensureGlitchMatch(userId)` | `src/lib/matching/` | The user's stored glitch match, choosing one if they have none yet. Safe to call on every page load | Slice 3 (#10), built |
| `openConversation(userAId, userBId)` | `src/lib/conversations.ts` | Returns the conversation between two users, creating it if needed. Safe to call twice | Slice 6 (#13) |
| `closeConversation(conversationId)` | `src/lib/conversations.ts` | Marks a conversation as closed. Safe to call twice | Slice 6 (#13) |
| `removeProfilePhoto(userId)` | `src/lib/account/photos.ts` | Removes someone's photo: clears `Profile.photoKey`, then deletes the file from storage. Safe to call when there's no photo. For the admin "remove photo" actions | Slice 7 (#14), built. Slices 8 (#15) and 9 (#16) call it |
| `orderUserPair(a, b)` | `src/lib/userPair.ts` | Puts two user ids in the agreed order (lower first) for the `Edge` and `Conversation` tables, which store each pair once | Foundation (#7) |

Each file starts with a comment that says the same in more detail, including what the helper will do once its owner has built it.

## Matching

Slice 3 (#10) turns people's answers into chemistry scores, a top 5 and one surprise "glitch match" each. The page is `/matches`.

**The formula** (from the brief, in `src/lib/matching/score.ts`):

```
score = (complement x 3) + overlap + tension
```

| Part | What it counts |
|---|---|
| `complement` | How many of A's *Seeking* tags are satisfied by one of B's *Qualities*, plus the same the other way round. A Seeking tag counts once however many Qualities satisfy it. Which Quality satisfies which Seeking tag is the pairing list (see below) |
| `overlap` | +1 if they picked the same Energy, +1 if they picked the same Vibe Diagnosis |
| `tension` | +1 if their Hero Stories are different |

Skills, Interests and course never change a score. They are only listed on the page as things two people share. The highest possible score is 27.

**The pairings** (which Quality satisfies which Seeking tag) are data, not code: 23 rows in `prisma/seed-data.ts`, saved by `npx prisma db seed`. Edit that list and then run `npm run rescore:all`, because every score depends on it.

**The rules around it:**

- Only people with a **finished profile who are not suspended** are scored, appear in a top 5, or are anyone's glitch match.
- The **top 5** is the five highest scores. Ties go to whoever finished their profile first, then the lower user id, so the order is the same on every load.
- The **glitch match** is a random person who is not you and not in your top 5. It is stored, so a reload never changes it, and it is kept until it stops being valid (they are suspended, or they move into your top 5).
- Rescoring one person changes **only the rows that involve them**. Nobody else's scores move.

**Helpers other tracks may call** (import from `@/lib/matching`, nothing deeper). They are also in the [Shared helpers](#shared-helpers) table.

| Helper | Use it to |
|---|---|
| `scoreUser(userId)` | Recalculate someone's scores. Call it **after** their answers are saved, and after they are suspended or their onboarding is reset. It also lives in `src/lib/scoring.ts` |
| `getTopFive(userId)` | Get their five best matches, best first |
| `explainMatch(you, them)` | Get the plain-language reasons for a pair, or `null` if there is no score |
| `ensureGlitchMatch(userId)` | Get their glitch match, choosing one if they have none |

**Recalculating everyone: `npm run rescore:all`.** Run it after editing the pairings, or after changing the formula. It scores every eligible person in one database transaction, so a failure halfway leaves the old scores untouched, and it prints only counts (never the database address). It is safe to run twice: you get the same rows.

```bash
npm run rescore:all
# Rescoring everyone...
# Done.
#   People rescored:  29
#   Edges now stored: 406
#   Glitch matches:   30
```

With N eligible people you should see N x (N - 1) / 2 edges, one row per pair. The glitch match count can be one higher than the number of people, because a suspended person may still have an old one that nobody can see.

**You don't need to run it after `npm run seed:fake`, or after the tests.** Both already score the cohort with the real formula.

**Where the code is:**

| File | What it does |
|---|---|
| `src/lib/matching/score.ts` | The formula. No database, so it can be checked against the brief by hand |
| `src/lib/matching/explain.ts` | Turns a pair into the plain sentences on the match cards |
| `src/lib/matching/eligiblePeople.ts` | Who can be scored, with their tags |
| `src/lib/matching/rescoreUser.ts` | Rescoring one person or everyone, in a transaction |
| `src/lib/matching/glitch.ts` | Picking and keeping the glitch match |
| `src/lib/matching/topFive.ts`, `explainMatch.ts` | `getTopFive` and `explainMatch` |
| `src/app/matches/` | The `/matches` page and its match card |
| `scripts/rescore-all.ts` | The `rescore:all` command |

## Graph and people search

Track 4 (slice 4, issue #11) builds the cohort graph, the people list and the profile page. All three pages are built. The Connect button sends a real connection request, now that slice 5 (#12) has built the helper behind it.

**Routes this track owns:**

| Route | What it will show |
|---|---|
| `/graph` | **Built.** The whole cohort as a graph, with a line for every pair's score |
| `/people` | **Built.** Everyone as a list, best match first, with filters for course, skill and interest |
| `/people/[alias]` | **Built.** One person's profile, why you match, and the Connect button |
| `/api/people/[alias]/connect` | **Built.** Where the "Connect" button posts to |

**To try the graph:** `npm run dev`, pick `02` in the "Dev sign-in as" list, press Switch, and open `/graph`. You need to be signed in as someone with a finished profile: signed out you are sent to `/signin`, and users 31 and 32 (no profile) are sent to `/onboarding`.

**Where the graph's code is:**

| File | What it does |
|---|---|
| `src/lib/cohort/graphData.ts` | Works out the dots and lines on the server, including every rule (who is highlighted, how thick and faint each line is). Tested |
| `src/app/graph/page.tsx` | The page: the legend, the graph, and "Your top 5" and "Your glitch match" as links |
| `src/app/graph/CohortGraph.tsx` | Draws the dots and lines in the browser, and the panel when you tap a dot. No rules in here |
| `src/app/graph/CohortGraphLoader.tsx` | Makes sure the drawing code only ever loads in the browser |
| `src/app/graph/graphColours.module.css` | Every colour the graph uses, for light and dark mode |

**Filters.** `/people` can be narrowed by course, one skill and one interest, and a person must fit all the ones chosen. The filters live in the page address (`/people?course=business`), so they survive a refresh and can be shared, and "Show on the graph" hands the same address to `/graph`, which dims everyone who doesn't fit. The rules are in `src/lib/cohort/search.ts`. **The Skill and Interest dropdowns are hidden for now**: they appear by themselves once slice 2 (#9) adds the `skills` and `interests` categories.

**The profile page and Connect.** `/people/[alias]` shows a person's alias, silhouette, bio, course and tags grouped by category (retired tags included). For someone else it adds the score and the reasons, and then one of: a **Connect** button (they are in your top 5 or are your glitch match), the status of a pending or approved request between you, or nothing. Your own profile shows neither, and links to `/account`. An address nobody visible has, including a suspended person's, shows "page not found". The button posts to `/api/people/[alias]/connect`, which checks the top 5 / glitch rule again on the server (hiding a button stops nobody sending the request by hand): 401 if signed out, 404 if nobody lives there, 403 if the person isn't one of your matches, otherwise it calls `sendConnectionRequest()`, which stores a pending request or answers with the reason it refused (slice 5, #12). The shared rules are in `src/lib/cohort/profile.ts`.

**To change how the graph looks**, the numbers are named constants at the top of `graphData.ts` (line thickness and faintness) and `CohortGraph.tsx` (dot sizes, spacing, labels).

**Helpers other tracks may use** (all in `src/lib/cohort/`):

| Helper | File | What it does |
|---|---|---|
| `getVisiblePeople()` | `visiblePeople.ts` | Everyone who has finished their profile and isn't suspended, with alias, silhouette, course and tags. Never an email. If your page lists people, start from this, so a suspended person can't slip through |
| `aliasToAddress(alias)` | `aliasAddress.ts` | Turns an alias into the last part of a profile address: "The Feral Sea Captain II" becomes `the-feral-sea-captain-ii`. Link to a profile with `/people/` followed by this |
| `findPersonByAddress(people, address)` | `aliasAddress.ts` | The other way round: finds the person a profile address belongs to |
| `getConnectPermission(viewerId, otherUserId)` | `profile.ts` | Says why the viewer may connect with someone (`"top-five"` or `"glitch"`), or `null` if they may not. Slice 5's request screens can use it to stay in step with the profile page |

**Stand-ins.** This track needs five things that other tracks own and haven't built yet. Rather than wait, it uses simple temporary versions, all in one file: `src/lib/cohort/standIns.ts`. (The silhouette picture sits beside it in `SilhouetteStandIn.tsx`, because the browser needs it too.) Join-up (#17) replaces each one with a call to the real thing.

| Stand-in | What it does for now | Real owner | What replaces it |
|---|---|---|---|
| `getTopFive(userId)` | Reads the stored scores and returns the five best visible matches. Ties go to whoever finished their profile first | Track 3 (#10) | Track 3's top 5 query |
| `explainMatch(userAId, userBId)` | A few short sentences from the three stored parts of a score, plus the skills and interests both people picked | Track 3 (#10) | Track 3's real breakdown |
| `profileBio(tagsByCategory)` | One sentence from the Hero Story and Energy tag names | Track 2 (#9) | `generateBio()` |
| `SilhouetteStandIn` | The same head-and-shoulders shape for everyone | Track 2 (#9) | `silhouetteUrl()` and the 12 pictures |
| `requireFinishedProfile()` | Sends a signed-out visitor to `/signin` and someone with no finished profile to `/onboarding` | Track 2 (#9) | `redirectIfOnboardingIncomplete()` |

The names for track 3 are track 4's proposal and aren't agreed yet. **If you are on track 2 or 3:** you don't need to do anything with this file. Build your real version under whatever name you settle on, and join-up does the swap.

**No longer a stand-in:** `sendConnectionRequest(fromUserId, toUserId)`. Slice 5 (#12) built the real one in `src/lib/requests/sendRequest.ts`, and `standIns.ts` passes it on under the same name, so the Connect route needed no change.

## Connection requests

Track 5 (slice 5, issue #12) lets someone ask a match to connect, and the other person approve or decline. Nothing private opens until both say yes: approving opens a conversation, and nobody's email is ever shown. **To try it:** `npm run dev`, pick `02` in the "Dev sign-in as" list, press Switch, and open `/requests`. User 02 has a request waiting, one they sent, and a conversation already open.

**The rules, in plain words:**

- You can only ask someone in your **top 5** or your **glitch match**, and the server refuses anyone else even if the request is sent by hand.
- You can't ask yourself, someone suspended, or someone either of you has blocked.
- **One request per pair, ever.** If a request exists in either direction (waiting, approved or declined), nobody can send another. A **decline is final** for the pair.
- Only the person who was asked can approve or decline, only once, and only while the sender is still allowed (not suspended, not blocked).

**Routes this track owns:**

| Route | What it does |
|---|---|
| `/requests` | **Built.** Requests waiting for your answer (with Approve and Decline) and the ones you sent, each marked Waiting, Connected or Declined. Signed out you are sent to `/signin` |
| `POST /api/requests/[id]/approve` | **Built.** Approves a request sent to you and opens a conversation. 401 signed out, 404 not found or not yours, 409 already answered or no longer allowed |
| `POST /api/requests/[id]/decline` | **Built.** Declines a request sent to you. Same answers |

**Helpers other tracks may use** (all in `src/lib/requests/`):

| Helper | File | What it does |
|---|---|---|
| `sendConnectionRequest(fromUserId, toUserId)` | `sendRequest.ts` | Stores a pending request, or refuses with a `reason` and a sentence the page can show as it is. All the send rules live here. The Connect button already calls it |
| `answerRequest(requestId, viewerId, "approve" or "decline")` | `answerRequest.ts` | Approves or declines, and on approve calls `openConversation()` |
| `areConnected(userIdA, userIdB)` | `areConnected.ts` | True when the two have an approved request and neither has blocked the other. **Slice 7 (#14) uses this before serving a photo.** Slice 5 builds no photo code, only this rule |
| `countWaitingRequests(userId)` | `listRequests.ts` | How many requests are waiting for this person's answer: the number on the nav bar's Requests link. Always the length of the page's waiting list |
| `getRequestsPage(userId)` | `listRequests.ts` | The two lists for `/requests`: waiting for you, and sent by you with their status. Only aliases, addresses and silhouette ids: never an email or a user id |

**The waiting count.** The nav bar's Requests link shows `(2)` when two requests are waiting for you, on every page, and nothing when none are. It is `src/components/WaitingRequestsCount.tsx`, and it uses the same filter as the page's list so the two can't disagree.

**What the page leaves out, quietly:** a request from or to someone who has been suspended or hasn't finished their profile, and any pair where either has blocked the other.

**Two things on the profile page are still rough** (it is slice 4's, so they are tidied at join-up, #17): after a decline it still shows the Connect button, though pressing it answers that a new request can't be sent, and a waiting request says "a request is waiting between you two" without saying who asked. The server always answers correctly; only the wording on that page is behind.

The words people see (every refusal and success sentence) are in `messages.ts`, so the code, the tests and the pages can't drift apart.

## Messaging

Slice 6 (#13). Two people who have agreed to connect can talk in a private conversation, so nobody has to swap personal contact details.

**What the pages show.** `/messages` lists your conversations, newest activity first: the other person's alias and silhouette, the start of the latest message and its time, and "(closed)" on a closed one. Opening one shows the messages oldest first, each with who sent it ("You" for your own) and the time (London time), and a box to send a new one. Signed out you are sent to `/signin`.

**The rules, in plain words:**

- **Only the two people in a conversation can read or write in it**, and the server checks that every time, not only the page. Someone else's conversation, or a made-up address, shows "page not found" (and the route answers 404), so an address can't be probed.
- **Messages are limited to 1000 characters**, and an empty or spaces-only message is refused. The form's counter is a courtesy; the server is the real check.
- **A closed conversation can still be read but takes no new messages, and it never reopens.** A block closes it for good (slice 9 calls `closeConversation()`), and `openConversation()` keeps returning a closed one as it is.
- **Sending is refused if the two are no longer connected** (an approved request and no block), or if the other person is suspended. The refusal is one vague sentence on purpose, so it can't be used to learn who blocked whom.
- **New messages appear when you refresh the page.** Real-time chat and unread markers are "MVP Later" and are not built.

**Routes this track owns:**

| Route | What it does |
|---|---|
| `/messages` | **Built.** Your conversations, newest first. Signed out you are sent to `/signin` |
| `/messages/[conversationId]` | **Built.** One conversation, its messages and the send form. "Page not found" if it isn't yours |
| `POST /api/messages/[conversationId]` | **Built.** Sends a message in one of your conversations. Send `{ "body": "the text" }`. 401 signed out, 404 no such conversation or not yours, 409 closed or no longer connected, 422 empty or longer than 1000 characters |

**Helpers** (in `src/lib/messages/`):

| Helper | File | What it does |
|---|---|---|
| `sendMessage(senderId, conversationId, body)` | `sendMessage.ts` | Stores a message, or refuses with a `reason` and a sentence the form can show as it is. All the sending rules live here: only the two people, not closed, still connected, not empty, at most 1000 characters |
| `listConversations(userId)` | `listConversations.ts` | The conversations this person is in, newest activity first: the other person's alias, address and silhouette, the start of the latest message with its time, and whether it is closed. Never an email or a user id |
| `getConversation(userId, conversationId)` | `getConversation.ts` | One conversation for its page: the other person and the messages, oldest first, with the viewer's own marked. `null` when it isn't theirs or doesn't exist (the same answer for both). A closed conversation can still be read |

The words people see (every refusal sentence) and the 1000 limit are in `messages.ts`, so the code, the tests and the form can't drift apart.

## Admin screens

Slice 8 (#15). Admins (Patrick and Tom) keep the lists up to date, and suspend people, without editing the database by hand. Everything here is admin-only: a signed-out visitor is sent to `/signin` and a member sees "page not found". The check is made on the server, on every page **and** on every action, so posting to an action directly is refused too.

**What the screens do:**

| Route | What it does |
|---|---|
| `/admin` | The admin home, with a menu to the sections below (and a link to `/admin/reports`, which is slice 9's) |
| `/admin/categories` | Categories and tags: add, rename, reorder, retire and un-retire. Edit a tag's description. Seeking and Quality tags also have their pairings and a **Rescore everyone** button |
| `/admin/courses` | Courses: add, rename, reorder, retire and un-retire. Shows how many people are on each |
| `/admin/users` | Everyone, with their course, role and alias. **Suspend** and **Unsuspend** (not on your own row), and **Remove photo** for anyone who has one |

**The rules, in plain words:**

- **Nothing is ever deleted.** A category, tag or course is *retired*: it is no longer offered in onboarding, on `/catalogue` or on the sign-up form, but everyone who already has it keeps it, and so do their stored scores. Un-retiring brings it back.
- **A new item gets a readable id made from its name** (a tag in Energy called "Night Owl" gets `energy-night-owl`). **Renaming never changes the id or any score.**
- **A new Seeking or Quality tag must be paired** with at least one tag on the other side, in the same step, so it can never exist unpaired. Editing a tag's pairings keeps any pair with a retired tag.
- **Changing a pairing does not change anyone's score by itself.** After changing pairings, press **Rescore everyone** to recalculate every finished, active person (it uses slice 3's `rescoreEveryone()`). It tells you how many people were rescored.
- **Suspending someone is reversible.** They can't sign in, they vanish from the graph and search, they have no scores and are nobody's top 5 or glitch match. Unsuspending brings them back. You can't suspend yourself, so the last admin can't lock everyone out.
- **Removing a photo also deletes the stored file.** The button calls slice 7's `removeProfilePhoto()`, which clears the profile's photo and then deletes the file from private storage (Vercel Blob on a deployment, a folder on a laptop). The rest of the profile is untouched.
- **Not built yet:** dashboard stats, and viewing a profile and resetting onboarding (all MVP Later).

**Where the code is:**

| What | Where |
|---|---|
| The pages and their Server Actions | `src/app/admin/` (`categories/`, `courses/`, `users/`; each `actions.ts` starts every action with `requireAdmin()`) |
| The rules, one small function per change | `src/lib/admin/` (`categories.ts`, `tags.ts`, `pairings.ts`, `courses.ts`, `users.ts`, `rescoreEveryone.ts`, `slugify.ts`, `reorder.ts`) |
| Tests | `tests/integration/admin*.test.ts` (rules, and `adminActions.test.ts` for the "refused even when called directly" check), `tests/unit/slugify.test.ts`, `tests/e2e/admin.spec.ts` |

## Account and photos

Slice 7 (#14). Students manage their own account at `/account`: their course, their answers and an optional photo.

**What `/account` shows.** Your email (only you see it), your course with a way to change it, Sign out, and, once you have a finished profile, your alias, silhouette, generated bio and picks (each category with an "Edit" link) and your photo. Without a profile yet (every real user until slice 2 is built) it shows course and Sign out, and points you to onboarding. Signed out you are sent to `/signin`.

**The rules, in plain words:**

- **Changing course** only offers courses that aren't retired, and doesn't rescore anyone: course isn't part of the score.
- **Editing answers** is one category at a time at `/account/edit/[category]` (also `/account/edit/silhouette`), with the same limits as onboarding. Saving replaces that category's picks in one go, then calls `scoreUser()`. Your alias, requests and conversations don't change. Your glitch match doesn't either, unless the edit moves it into your top 5, when slice 3's rules give you a new one. A tag that was retired after you picked it stays until you remove it, but can't be picked again.
- **Photos** are JPEG, PNG or WebP, up to 4 MB, checked by the file's actual bytes (a renamed PDF is refused). Only you, people you're connected with (an approved request and no block), and admins can see yours. Everyone else, including someone with the direct link, gets "not found", the same answer as for no photo at all. Replacing or removing a photo deletes the old file.
- **Photos never appear on the graph, in search or in scoring.** Connected people see them on your profile page (`/people/[alias]`).

**Where photos are kept.** On Vercel, in a **private** Vercel Blob store: the files have no public address, so every view goes through `/api/account/photo/[userId]`, which checks who is asking. That needs `BLOB_READ_WRITE_TOKEN`, which Vercel adds by itself once a Blob store is connected to the project (Storage → Blob). **Locally and in the tests there's no token, and photos go to `.photo-store/`** (gitignored) instead, so nobody needs a Vercel account to work on this. A Vercel deployment without the token refuses to store photos, with a message saying so.

**Routes this track owns:**

| Route | What it does |
|---|---|
| `/account` | **Built.** Your account, as above |
| `/account/edit/[category]` | **Built.** Change one category's picks (or `silhouette`). "Page not found" for an unknown category |
| `POST /api/account/photo` | **Built.** Upload or replace your own photo (form field `photo`). 401 signed out, 409 no finished profile, 400 not a JPEG/PNG/WebP up to 4 MB |
| `DELETE /api/account/photo` | **Built.** Remove your own photo |
| `GET /api/account/photo/[userId]` | **Built.** The photo, for the owner, connected people and admins only. 404 for everyone and everything else. Never cached |

**Helpers** (in `src/lib/account/`):

| Helper | File | What it does |
|---|---|---|
| `canSeePhoto(viewer, ownerId)` | `photoRules.ts` | The rule for who may see a photo: the owner, an admin, or someone connected (`areConnected`, slice 5) |
| `checkPhotoFile(bytes)` | `photoRules.ts` | Whether a file is a JPEG, PNG or WebP up to 4 MB, by its first bytes |
| `setProfilePhoto` / `removeProfilePhoto` / `readProfilePhoto` | `photos.ts` | The only code that changes `Profile.photoKey` or the files. Replacing stores the new file before deleting the old one, so a profile never points at a missing photo |
| `saveCategoryEdit(userId, categoryId, picks)` | `editAnswers.ts` | Checks and saves one category's picks, then rescores |
| `changeCourse(userId, courseId)` | `course.ts` | Saves an active course |

To show someone's photo on another page, use `<ProfilePhoto alias={...} viewer={...} />` from `src/components/ProfilePhoto.tsx`. It draws nothing for anyone not allowed to see it.

**Stand-ins for slice 2.** Slice 2 (onboarding, #9) isn't built, so editing uses temporary versions of its pieces, following slice 2's approved design. They are all in one place, marked **STAND-IN**, and join-up (#17), or whoever builds slice 2, swaps them:

| Stand-in | File | What replaces it |
|---|---|---|
| `checkEditedPicks()` (the answer rules) | `src/lib/account/standIns.ts` | slice 2's `validateOnboardingAnswers()` |
| `bioStandIn()` (the bio) | `src/lib/account/standIns.ts` | slice 2's `generateBio()` |
| `SILHOUETTE_IDS` (the 12 ids) | `src/lib/account/standIns.ts` | slice 2's `silhouettes.ts` |
| `SilhouettePlaceholder` (a numbered circle) | `src/lib/account/SilhouettePlaceholder.tsx` | slice 2's silhouette pictures |
| `PickStepStandIn` (the pick screen) | `src/app/account/edit/PickStepStandIn.tsx` | slice 2's `PickStep` |

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
    matching/          # slice 3: the score formula, top 5, glitch match (see Matching)
    conversations.ts   # openConversation(), closeConversation() (shared helpers)
    userPair.ts        # orderUserPair(): one agreed order for a pair of users
    pretendCohort.ts   # the on/off switch for pretend students and the dev switcher
    cohort/            # slice 4: who is visible, alias addresses, and the stand-ins
    account/           # slice 7: photos (storage, rules), course, editing answers, and its stand-ins
  generated/prisma/    # Prisma's generated client (not committed)
prisma/
  schema.prisma        # the database tables. Flag changes first (see CLAUDE.md)
  migrations/          # the SQL that creates and changes those tables
  seed-data.ts         # the categories, tags and courses from the brief
  seed.ts              # adds any of those rows that are missing
  pretend-cohort.ts    # works out the 32 pretend students (no database)
  seed-fake.ts         # npm run seed:fake: saves them to the dev database
scripts/
  rescore-all.ts       # npm run rescore:all: recalculates every chemistry score
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
