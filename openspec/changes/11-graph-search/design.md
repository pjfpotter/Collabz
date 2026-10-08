# Design: Slice 4, cohort graph and people search (#11)

## Context

- See `proposal.md` (Why) for the motivation and `specs/` for the requirements.
- **Built today (slice 0):** the app, the catalogue tables and `/catalogue`. **Not merged yet:** the foundation (#7, PR #22), which this slice stands on. This design uses what #7's proposal plans:
  - Tables: `User` (`courseId`, `suspendedAt`), `Profile` (`alias` unique, `silhouette`, `completedAt`), `ProfileTag`, `Edge` (`score`, `complement`, `overlap`, `tension`, lower user id in `userAId`), `GlitchMatch`, `ConnectionRequest`.
  - `getCurrentUser()`, `orderUserPair()`, the dev "sign in as…" switcher, and a pretend cohort of 30 finished profiles (one suspended) with 435 edges and a glitch match each.
  - Placeholder pages at `/graph`, `/people` and `/people/[alias]`, which this slice replaces.
- If #7 lands with different names, the tasks follow the real names. Nothing here depends on a particular spelling.
- **Tracks 2, 3 and 5 are also unbuilt.** They own things this slice needs to show (decision 9).
- **Next.js 16**, checked in `node_modules/next/dist/docs/`: a component that needs the browser (the graph draws on a `<canvas>`) must be loaded with `next/dynamic` and `ssr: false`, and that call is only allowed inside a Client Component.
- `react-force-graph-2d` is at 1.29 on npm and accepts any React version.
- Five beginners will read this code, so every non-obvious line gets a comment explaining *why*.

## Goals / Non-Goals

**Goals:**
- A student on a phone can open the graph, find their own matches at a glance and get to anyone's profile in two taps.
- The graph stays readable with every edge drawn, at the pretend cohort's size and at a realistic cohort of about 100.
- Everything track 4 borrows from another track sits in one clearly marked file, so join-up is a short, mechanical swap.
- No email ever reaches the browser.

**Non-Goals:**
- Live updating. The graph shows the database as it was when the page loaded. Refresh to see changes.
- Silhouette pictures drawn on the graph itself (decision 4).
- Photos, favourites, and hiding blocked people (see the proposal's out-of-scope list).

## Decisions

### 1. One rule for "who is visible", written once
`src/lib/cohort/visiblePeople.ts` exports `getVisiblePeople()`: every user whose profile has `completedAt` set and whose `suspendedAt` is empty, with their alias, silhouette, course and tags. The graph, the list and the profile page all start from it.
- *Why one function:* "suspended users don't appear" is a safety rule (`admin` spec). Written three times it would be forgotten once.
- *Why it loads everyone:* the cohort is about 30 to 100 people. Loading them all and filtering in plain code is easier to read and test than three different database queries, and takes milliseconds.

### 2. The server builds the graph data; the browser only draws it
`/graph` is a Server Component. It calls `buildGraphData(viewerId, filters)` in `src/lib/cohort/graphData.ts` and passes the result to the drawing component as props:
```
nodes: { id, alias, silhouette, courseId, isViewer, isTopFive, isGlitch, matchesFilter }
links: { source, target, score, isGlitch, isViewersMatch }
```
- **A node's `id` is its alias address (decision 7), never the database user id or email.** *Why:* whatever the server passes to a browser component can be read by anyone with dev tools. The alias is already public.
- *Why no API route:* the page needs the data once, when it loads. A Server Component can fetch it and hand it over, as `/catalogue` does. An API route would add a second request and a loading state for no gain.
- *Why the server decides `isTopFive`, `isGlitch` and `isViewersMatch`:* the drawing code then has no rules in it, only "if this flag, draw it this way", which keeps the hard-to-test part simple.
- `buildGraphData` is split so the part that turns people and edges into nodes and links is a plain function with no database, tested in Vitest.

### 3. `react-force-graph-2d`, loaded only in the browser
- `src/app/graph/CohortGraph.tsx` is a Client Component that draws with `ForceGraph2D`.
- `src/app/graph/CohortGraphLoader.tsx` is a tiny Client Component that loads it with `dynamic(() => import("./CohortGraph"), { ssr: false })` and shows "Loading the graph…" meanwhile.
- *Why the 2D package and not `react-force-graph`:* the full package also bundles the 3D, VR and AR versions and the 3D engine behind them. We only draw in 2D, and students load this on phones. It is the same library by the same author.
- *Why `ssr: false`:* the library draws on a canvas and reads the window size, neither of which exists on the server.
- *Why a separate loader file:* Next.js 16 only allows `ssr: false` inside a Client Component, and keeping the loader apart keeps the page itself a Server Component.
- *Alternative:* draw it ourselves with D3. Far more code to explain, for the same picture.

### 4. How things are drawn
| What | How | Why |
|---|---|---|
| Node | A filled circle, coloured by course | Patrick's decision. Shows whether chemistry crosses the two courses |
| Viewer's own node | Larger, with a ring | "You are here" |
| Top 5 nodes | A ring in the highlight colour, alias always shown | Success check 2 |
| Glitch node | A ring in the glitch colour, alias always shown | Different from top 5 at a glance |
| Other nodes' aliases | Shown when zoomed in, and for the chosen node | 30 or more labels at once would cover the graph |
| Edge thickness | Grows with score, from thin to about 4 pixels | Brief: thickness means score |
| Edge faintness | Opacity grows with score, from about 8% to about 60% | Patrick's decision: every edge drawn, weak ones faint |
| Glitch edge | Dashed, thickness still by score | Brief: glitch differs by style, not thickness |
| Viewer's top 5 and glitch edges | Highlight colour, full opacity, drawn last so they sit on top | Success check 2 |
| Pull between two people | Stronger for higher scores | Brief: "edge strength affects pull" |

- **Scores are scaled against the highest score in the cohort**, not a fixed number. *Why:* real scores (slice 3) will have a different range from the pretend ones. Scaling keeps the picture balanced either way.
- **The exact numbers live in one small function, `edgeStyle(score, maxScore)`,** with unit tests. *Why:* "is it readable" will be tuned by eye, and one function is one place to tune.
- **No silhouette pictures on the canvas.** The silhouette appears in the panel when you choose a node, in the people list and on the profile. *Why:* drawing 30 to 100 small images on a canvas adds loading and sizing code for something unreadable at that size. The spec only requires that people are *identified* by alias and silhouette, which the panel does.
- **Not colour alone:** course has a legend and is written in the panel, glitch edges differ by pattern, and the viewer's matches are also listed in words (decision 5). *Why:* colour-blind students, and anyone using a screen reader, get the same information.
- The colours are chosen for both light and dark mode and defined once as named constants.

### 5. A list in words beside the graph
Under the graph, the page lists "Your top 5" in score order and "Your glitch match", each a link to that person's profile.
- *Why:* a canvas is one opaque picture to a screen reader, and on a small phone a list is quicker than hunting for a highlighted dot. It also lets Playwright check the highlights, since a test can't see inside a canvas.
- For the same reason the graph's container carries the node and edge counts as `data-` attributes.

### 6. Choosing a node opens a small panel, not the profile
Tapping a node shows a panel with the alias, silhouette, course, score with you and a "View profile" link.
- *Why not go straight to the profile:* on a touch screen, people tap while trying to drag. A panel is cheap to dismiss, whereas a page change loses your place in the graph.
- Dragging the background moves the view and pinching zooms, which the library provides. The canvas is sized to its container's width, about 70% of the screen height, and re-measured when the screen rotates. The graph zooms to fit once after it settles.
- The layout stops moving after a set number of steps. *Why:* a graph that never settles drains a phone battery and is hard to tap.

### 7. An alias becomes a readable address
`src/lib/cohort/aliasAddress.ts` exports `aliasToAddress(alias)`: lower case, anything that isn't a letter or number becomes a dash, and dashes at the ends are trimmed. *"The Feral Sea Captain II"* becomes `the-feral-sea-captain-ii`.
- The profile page finds the person by comparing the address with `aliasToAddress()` of each visible person's alias.
- *Why not put the alias itself in the address:* spaces turn into `%20`, which is ugly to share and easy to break.
- *Why not store the address in the database:* it is worked out from the alias, so a stored copy could only go stale, and it would be a schema change.
- This answers the point #9 left for track 4 ("how an alias with spaces becomes a `/people/[alias]` URL").

### 8. Filters live in the page address
`/people?course=software&skill=skills-data&interest=interests-climate`
- `src/app/people/PeopleFilters.tsx` is a plain `<form method="get">` with three `<select>` lists (course, skill, interest), each with an "Any" choice, plus "Apply" and "Clear". It is a Server Component and needs no browser JavaScript.
- `parseFilters(searchParams, catalogue)` checks each value against the courses and active tags, and ignores anything it doesn't recognise. `filterPeople(people, filters)` keeps the people who match every chosen filter. Both are plain functions with unit tests.
- **One pick per filter, combined with "and"** (course *and* skill *and* interest). *Why:* three dropdowns are easy on a phone and leave no question about whether two skills mean "both" or "either".
- *Why the address and not React state:* the filter survives a refresh and the back button, can be shared as a link, and can be handed to `/graph` unchanged. A "Show on the graph" link goes to `/graph` with the same query, where `matchesFilter` highlights those people and dims the rest. The graph page has a "Back to the list" link the other way.
- **The skill and interest lists come from the catalogue categories with ids `skills` and `interests`** (the ids #9 plans). If a category doesn't exist or has no active tags, that dropdown is not shown. *Why:* those tags arrive with #9, and the page must work before then.
- The list shows each person's alias, silhouette, course, skills and interests, their score with you, and a "Top 5" or "Glitch match" badge. It is ordered by score with you, highest first, then by alias.

### 9. Stand-ins for what other tracks own, in one file
`src/lib/cohort/standIns.ts` holds every temporary version. Each has a header comment naming the real owner, the agreed name and what join-up must do.

| Stand-in | Does for now | Real owner | Swapped for |
|---|---|---|---|
| `getTopFive(userId)` | Reads the user's stored edges to visible people, highest score first. Ties go to whoever finished their profile first, then by user id | Track 3 (#10) | Track 3's top 5 query |
| `explainMatch(userAId, userBId)` | Short sentences from the stored edge's parts ("Complement: 2", "You share an Energy or Vibe", "Your Hero Stories differ"), plus the skills and interests both people picked, marked "for information" | Track 3 (#10) | Track 3's real breakdown |
| `sendConnectionRequest(fromUserId, toUserId)` | Stores nothing and answers "not switched on yet" | Track 5 (#12) | Track 5's request helper |
| `profileBio(tagsByCategory)` | One plain sentence from the Hero Story and Energy tag names | Track 2 (#9) | `generateBio()` |
| `SilhouetteStandIn` | One neutral head-and-shoulders shape for everyone | Track 2 (#9) | `silhouetteUrl()` and the 12 pictures |
| `requireFinishedProfile()` | Not signed in → `/signin`; no finished profile → `/onboarding`; otherwise the user | Track 2 (#9) | `redirectIfOnboardingIncomplete()` |

- *Why stand-ins and not waiting (Patrick's decision):* the slice map's whole point is that no track waits. #7 stays unchanged.
- *Why one file:* join-up (#17) is then "open this file, replace each function's inside with a call to the real one, delete what's left". Nobody has to hunt.
- *Why they aren't imports of the other tracks' code:* that code doesn't exist yet, and CLAUDE.md says tracks reach each other only through agreed helpers.
- The glitch match is read straight from the `GlitchMatch` table, which is shared schema, not another track's code.
- **`getTopFive` leaves out suspended people.** *Why:* they aren't on the graph, so a highlighted match nobody can see or contact would be confusing. This needs agreeing with track 3 so the two versions give the same five (Open Questions).

### 10. The profile page and the Connect button
`/people/[alias]` is a Server Component: `requireFinishedProfile()`, find the person by address (decision 7), `notFound()` if nobody matches.
- It shows the alias, silhouette, bio, course and tags grouped by category in catalogue order. Retired tags are still shown, as the `admin` spec requires.
- **For someone else's profile** it adds the score, `explainMatch()`, and one of: a "Connect" button (they are in your top 5 or are your glitch match), the status of an existing pending or approved request between you, or nothing.
- **For your own profile** it shows no breakdown and no button, with a link to `/account`.
- **The button posts to `POST /api/people/[alias]/connect`.** That route gets the viewer from `getCurrentUser()`, finds the person, checks again that they are in the viewer's top 5 or are their glitch match (otherwise 403), then calls `sendConnectionRequest()`. *Why check again on the server:* hiding a button stops nobody from sending the request by hand. Track 5 will also enforce the rule inside its helper, and two locks are fine.
- *Why a route and not calling the helper from the page:* the button sends something from the browser, and this project uses API routes for that (as #9 does).
- Until slice 5 lands, the page shows "Connection requests aren't switched on yet" after pressing the button.

### 11. Tests
- **Vitest, no database:** `edgeStyle` (thicker and less faint as score rises, sensible when every score is equal or zero), `aliasToAddress`, `parseFilters`, `filterPeople`, and the node-and-link builder (flags for viewer, top 5, glitch and filter; node ids are addresses; no email or user id in the output; 100 made-up people give 4,950 links).
- **Vitest against the test database,** with a few hand-made users so the expected answers are obvious: `getVisiblePeople` (suspended and unfinished left out), `getTopFive` (order, tie-break, suspended left out, fewer than five), finding a person by address, and the connect route (not signed in → 401; outside top 5 → 403 and nothing stored; in top 5 → the stand-in's answer).
- **Playwright,** signed in through the dev switcher against the pretend cohort:
  - `/graph` shows a canvas, the legend, 29 nodes and 406 edges in the `data-` attributes, a "Your top 5" list of five links and a glitch match link.
  - At 375 pixels wide nothing scrolls sideways.
  - `/people` narrows by course. Narrowing by skill and interest uses two tags the test adds for itself, since #9's tags may not exist yet.
  - A profile outside the top 5 shows the breakdown and no Connect button; one inside shows the button; your own shows neither; an unknown address shows "page not found".
  - Signed out, all three pages go to `/signin`.
- **By eye:** whether the graph is readable. No test can judge that, so it is a task with a named check.

## Risks / Trade-offs

- **[#7 isn't merged, so names may differ]** → The first task checks the real schema and helper names and notes any difference. Apply doesn't start before #7 merges.
- **[The library is older than React 19 and Next.js 16]** → The first build task is a tiny proof that it draws three dots inside our app. If it doesn't, we stop and choose again before building on it.
- **["Readable" at 100 people is unproven]** 4,950 edges is over ten times the pretend cohort. → Faint weak edges are the main defence. A task draws a made-up 100-person cohort locally and looks at it. If it's a hairball, the fallback (offered and not chosen) is to draw only strong edges by default.
- **[Pretend scores don't line up with the tags]** `explainMatch`'s sentences come from made-up numbers. → Expected until slice 3. The stand-in says "Complement: 2" and doesn't claim which tags.
- **[Two aliases could give the same address]** e.g. "Main-Character" and "Main Character". → #9's alias words are a fixed list, so a unit test checks every seeded combination gives a distinct address. If admins later add clashing words, the first match wins, and that is noted for slice 8.
- **[Stand-ins get left in]** → They live in one file, each names its owner, and a task lists them on #17.
- **[The Connect button looks broken until slice 5]** → It says plainly that requests aren't switched on yet, and the PR description says so too.
- **[Blocked people still see each other here]** → Out of scope by the proposal. #17 already lists "blocking… hides both people from each other" as a join-up point owned by #16.
- **[A canvas can't be tested or read like a page]** → The words list, the `data-` counts and the people list carry the same information (decision 5).

## Migration Plan

No database change. Deploying is the normal flow: PR, preview, merge. The preview uses the pretend cohort on Neon `dev`.

**Rollback:** Vercel Instant Rollback. Nothing is stored by this slice, so there is nothing to undo.

## Open Questions

None of these changes the approach or the task list. Each is a name or a detail to agree with another track.

- **Track 3 (#10):** are `getTopFive(userId)` and `explainMatch(userAId, userBId)` the names you'll use, and does your top 5 leave out suspended people?
- **Track 5 (#12):** is `sendConnectionRequest(fromUserId, toUserId)` the name you'll use, and what does it return when it refuses?
- **Slice 7 (#14) and join-up:** where a connected person's photo appears on this profile page.
