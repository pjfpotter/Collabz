# Tasks: Slice 4, cohort graph and people search (#11)

Start only once #7 (foundation) has merged into `master` and this branch has been rebased onto it. Groups build on each other: the shared "who is visible" data (2), then the graph (3 and 4), the people list (5), the profile page (6). Each group lands its own tests and its own part of the README. Steps marked **(human)** need a team conversation.

## Where we left off (9 Oct 2026)

**Groups 1 to 5 are committed and pushed. Group 6 (22 of 25 tasks) is built, tested and ticked but NOT yet committed.** `/graph`, `/people` and `/people/[alias]` all work, and so does `POST /api/people/[alias]/connect`.

**Left: group 7, which needs a human.** 7.1 needs the commit, the push, the PR, and the five preview checks (the fifth on a real phone). 7.2 needs two issue comments. Ready-to-paste drafts of the PR description and both comments were written to the session's scratchpad (`pr-body.md`, `issue-comments.md`); if they are gone, the "Things to know" and "Decisions" below are the content.

Last full run (9 Oct): `npm test` 209 passed, `npm run test:e2e` 66 passed, type-check, lint and `next build` clean.

**Decisions made in group 6 where the design was silent** (the PR description repeats these):
- An existing pending or approved request shows "A connection request is waiting between you two." or "You are connected." in place of the button. It doesn't say who asked, because accepting is slice 5's job.
- Someone who is both in your top 5 and your glitch match is described as the glitch match.
- A glitch match who has been suspended since gets no Connect.
- Connecting with yourself answers 403.
- The "top 5 or glitch match" rule is one function, `getConnectPermission()` in `src/lib/cohort/profile.ts`, used by both the page and the route so they can't disagree.
- Not added, as the note below asks to check first: "why you match" inside the graph's panel. The profile page already shows it.
- The pretend cohort already contains some `ConnectionRequest` rows, so `tests/e2e/profile.spec.ts` clears them before it starts.

Things the next session needs to know that the tasks below don't say:

- **Changes made after Patrick saw the graph** (he asked for movement and interaction): the layout now drifts into place for about two seconds and then stops, and dots can be pulled around. A click or tap without pulling opens the panel. These go a little beyond `design.md` decision 6.
- **Asked for, not built, and probably another slice:** richer animation (for example lighting up a dot's lines on hover or tap), and "why you match" inside the graph's panel. The second could be a small extra in group 6, since `explainMatch()` already exists. Ask before adding either.
- **`standIns.ts` holds five of the six stand-ins.** `SilhouetteStandIn` is in its own file, `SilhouetteStandIn.tsx`, because the browser needs it and can't import a file that talks to the database. `design.md` doesn't mention this.
- **A pair can have more than one `ConnectionRequest`** (see "Names used" below). Task 6.2 must look at the newest pending or approved one, in either direction.
- **Four foundation tests were changed** in `tests/e2e/navigation.spec.ts`, because `/graph`, `/people` and `/people/[alias]` are no longer placeholders. (The fourth, for the profile address, now expects a signed-out visitor to be sent to `/signin`.)
- **`next.config.ts` now sets `turbopack.root`** (commit `c875012`). It is a shared file, so mention it in the PR.
- **The three screenshots in `screenshots/`** were taken before the movement was added. Retake them for the PR (task 7.1) if they should match exactly.
- **Not yet tried on a real phone.** The one thing to check there: with pulling switched on, a tap that wobbles slightly might count as a pull and not open the panel.
- **Task 1.2 is still open:** nobody is assigned to #10 or #12, so the stand-in names (`getTopFive`, `explainMatch`, `sendConnectionRequest`) are our proposal, not agreed.
- **Running the tests:** `npm run test:e2e` can't start while `npm run dev` is running in the same folder. Stop the dev server first. Both test commands reset the shared dev data and put the pretend cohort back.

Last full run: `npm test` 185 passed, `npm run test:e2e` 55 passed, type-check, lint and `next build` clean.

## Names used (task 1.1)

Checked on 8 Oct 2026 against the merged `prisma/schema.prisma`, `src/lib/` and the README. **Every table, column and helper name in `design.md` matches what #7 built**, so no task changes. The details below are things the design left open or got slightly different.

- **Tables and columns, as built:** `User` (`courseId`, `suspendedAt`), `Profile` (`userId`, `alias` unique, `silhouette`, `completedAt`, `tags`), `ProfileTag` (`userId`, `tagId`), `Edge` (`userAId`, `userBId`, `score`, `complement`, `overlap`, `tension`), `GlitchMatch` (`userId`, `matchedUserId`), `ConnectionRequest` (`fromUserId`, `toUserId`, `status` of `PENDING`, `APPROVED` or `DECLINED`).
- **`ConnectionRequest` allows more than one request per pair.** The profile page (task 6.2) must look at the newest pending or approved one, in either direction.
- **Helpers, as built:** `getCurrentUser()` in `src/lib/currentUser.ts` (returns the user or `null`, and does *not* hide suspended users), `orderUserPair(a, b)` in `src/lib/userPair.ts` (returns `{ userAId, userBId }`), `getCatalogue()` in `src/lib/catalogue.ts`.
- **The pretend cohort has 32 users, not 30:** 30 finished profiles (`pretend-user-01` to `-30`), plus `-31` and `-32` with no profile. `-01` is the admin, `-02` is the "main character" the tests sign in as, `-30` is suspended. So there are 29 visible people and 406 edges between them, as the design says. The 435 stored edges include the 29 to the suspended user, which must be left out.
- **Category ids:** `hero-story`, `energy`, `vibe-diagnosis`, `qualities`, `seeking`. **`skills` and `interests` don't exist yet** (they arrive with #9), so the skill and interest dropdowns stay hidden for now, as design 8 expects.
- **Course ids:** `software` and `business`.
- **Silhouettes** are stored as ids like `silhouette-07`. No picture files exist yet (#9), which is what `SilhouetteStandIn` is for.
- **Pretend aliases** look like "The Pretend Mad Inventor 07", so their addresses are like `the-pretend-mad-inventor-07`.
- **Task 2.2's "every combination of #9's alias words" test** can't use real alias words yet: `Tag.aliasWord` exists but is empty until #9 fills it. The test will use the alias word lists written in #9's `design.md`.

## 1. Check the starting point and agree names

- [x] 1.1 Read the merged `prisma/schema.prisma`, `src/lib/` and #7's README sections, and note any name that differs from `design.md` (`Edge` columns, `GlitchMatch`, `getCurrentUser`, `orderUserPair`, the pretend cohort's counts) in a short "Names used" note at the top of this file. Verify: the note exists, and `npm test` passes on the untouched branch
- [ ] 1.2 **(human)** Agree the helper names with track 3 (`getTopFive`, `explainMatch`, and whether the top 5 leaves out suspended people) and track 5 (`sendConnectionRequest` and what it returns when it refuses) (design 9, Open Questions). Verify: the agreed names are recorded as comments on #10 and #12, and this file's note is updated if any changed
- [x] 1.3 Install `react-force-graph-2d` and prove it works in our app: a temporary Client Component loaded with `dynamic(..., { ssr: false })` that draws three dots and two lines on the `/graph` page (design 3). Verify: `npm run dev` shows the dots with no error in the browser console, and `npm run build` succeeds. If it fails, stop and raise it before going on

## 2. Who is visible, and the stand-ins

- [x] 2.1 Add `src/lib/cohort/visiblePeople.ts` with `getVisiblePeople()`: finished, unsuspended users with alias, silhouette, course and tags, with a comment on why one function owns this rule (design 1). Integration test with a few hand-made users: a suspended user and an unfinished one are left out, and no email is in the result. Verify: `npm test` passes
- [x] 2.2 Add `src/lib/cohort/aliasAddress.ts` with `aliasToAddress(alias)` and `findPersonByAddress(people, address)` (design 7). Unit test: spaces, capitals, hyphens, Roman numerals and punctuation; and every combination of #9's 12 Vibe and 12 Energy alias words gives a distinct address. Verify: `npm test` passes
- [x] 2.3 Add `src/lib/cohort/standIns.ts` (with `SilhouetteStandIn` in its own file beside it, `SilhouetteStandIn.tsx`, so the browser can import it) with `getTopFive`, `explainMatch`, `sendConnectionRequest`, `profileBio`, `SilhouetteStandIn` and `requireFinishedProfile`, each with a header comment naming the real owner, the agreed name and what join-up must do (design 9). Integration tests: `getTopFive` returns the highest scores first, breaks a tie by who finished first, leaves out suspended people, and returns three when only three exist; `explainMatch` returns sentences that match the stored edge's parts; `sendConnectionRequest` stores nothing. Verify: `npm test` passes
- [x] 2.4 Add a "Graph and people search" section to `README.md` listing the routes this track owns and a table of the stand-ins (name, real owner, what replaces it). Verify: every name in the table matches the code

## 3. Graph data

- [x] 3.1 Add `edgeStyle(score, maxScore)` in `src/lib/cohort/graphData.ts`, returning thickness and opacity, with the numbers as named constants and a comment that they are tuned by eye (design 4). Unit test: both rise with score, stay inside their limits, and behave when every score is equal or zero. Verify: `npm test` passes
- [x] 3.2 Add the plain node-and-link builder and `buildGraphData(viewerId, filters)` that feeds it from `getVisiblePeople()`, the edges, `getTopFive` and `GlitchMatch` (design 2). Unit test the builder: flags for viewer, top 5, glitch and filter are right; node ids are alias addresses; the output contains no email and no database user id; 100 made-up people give 4,950 links. Verify: `npm test` passes
- [x] 3.3 Integration test `buildGraphData` with hand-made users: an edge to a suspended user is left out, and a glitch match sets `isGlitch` on that link in either direction. Verify: `npm test` passes

## 4. The graph page

- [x] 4.1 Build `src/app/graph/CohortGraph.tsx` (Client Component, `ForceGraph2D`) drawing nodes and edges by the table in design 4: course colours as named constants for light and dark mode, rings for the viewer, top 5 and glitch, dashed glitch edges, highlighted edges drawn last, pull that follows score, and a layout that stops moving. Replace the temporary component from 1.3 with `CohortGraphLoader.tsx`. Verify: `npm run dev` as `pretend-user-02` shows the cohort with their matches standing out
- [x] 4.2 Replace #7's placeholder with `src/app/graph/page.tsx`: `requireFinishedProfile()`, `buildGraphData`, the loader, a course legend, the "Your top 5" and "Your glitch match" lists as links, and `data-node-count` and `data-edge-count` on the container (design 5). Verify: the lists match the highlighted nodes, and the counts read 29 and 406 with the pretend cohort
- [x] 4.3 Add the panel shown when a node is chosen (alias, silhouette, course, score with you, "View profile" link, a close button), size the canvas to its container and re-measure on rotate, and zoom to fit once the layout settles (design 6). Verify: in devtools at 375 pixels wide with touch emulation, dragging moves the view, a tap opens the panel, and nothing scrolls sideways
- [x] 4.4 Check readability by eye, at both sizes: the pretend cohort, and a made-up 100-person cohort passed straight to `CohortGraph` on a temporary local page. Tune the constants in `edgeStyle` if needed, then delete the temporary page. Verify: a screenshot of each is attached to the PR, and nodes and the strongest edges can be told apart in both
- [x] 4.5 Add `tests/e2e/graph.spec.ts`: as `pretend-user-02`, the page has a canvas, a legend naming both courses, 29 and 406 in the `data-` attributes, five top 5 links and one glitch link, and each link opens a profile; at 375 pixels wide the page doesn't scroll sideways; the page's HTML contains no `@collabz.test`; signed out goes to `/signin`; a pretend user with no profile goes to `/onboarding`. Verify: `npm run test:e2e` passes

## 5. The people list and filters

- [x] 5.1 Add `src/lib/cohort/search.ts` with `parseFilters(searchParams, catalogue)` and `filterPeople(people, filters)` (design 8). Unit test: each filter alone, all three together, an unknown or retired value is ignored, and no filter returns everyone. Verify: `npm test` passes
- [x] 5.2 Replace #7's placeholder with `src/app/people/page.tsx` and `PeopleFilters.tsx`: the GET form with up to three dropdowns (a dropdown is hidden when its category has no active tags), "Apply" and "Clear", the result list ordered by score with you (alias, silhouette, course, skills, interests, score, "Top 5" or "Glitch match" badge), a "nobody matches" message, and a "Show on the graph" link carrying the same query (design 8). Verify: `npm run dev`, then filtering by course changes the list and the address, and Clear restores it
- [x] 5.3 Make `/graph` read the same query: pass the filters to `buildGraphData`, dim nodes that don't match, show which filters are on, and add a "Back to the list" link (design 8). Verify: following "Show on the graph" from a filtered list highlights the same people
- [x] 5.4 Add `tests/e2e/people.spec.ts`: no filter lists 28 people for `pretend-user-02` and not themselves; course "Business" lists only Business students; with two test-added tags, skill and interest filters each narrow the list and combine with course; a filter nobody matches shows the message and Clear; "Show on the graph" keeps the query. Verify: `npm run test:e2e` passes

## 6. The profile page and Connect

- [x] 6.1 Replace #7's placeholder with `src/app/people/[alias]/page.tsx`: `requireFinishedProfile()`, `findPersonByAddress`, `notFound()` for no match, then alias, silhouette, `profileBio`, course and tags grouped by category in catalogue order, including retired tags (design 10). Verify: `npm run dev`, a profile opened from the list shows all of these and no email
- [x] 6.2 Add the match section for someone else's profile: the score, `explainMatch()`, and one of a "Connect" button, the status of an existing pending or approved request, or nothing; and for your own profile neither, with a link to `/account` (design 10). Verify: as `pretend-user-02`, a top 5 profile shows the button, their glitch match shows the button and says so, and a profile outside both shows neither
- [x] 6.3 Add `src/app/api/people/[alias]/connect/route.ts`: 401 if not signed in, 404 if nobody matches, 403 if the person isn't in the viewer's top 5 or their glitch match, otherwise call `sendConnectionRequest()` and return its answer; and make the button post to it and show "Connection requests aren't switched on yet" (design 10). Integration test the route for each of those cases, and that 403 stores nothing. Verify: `npm test` passes
- [x] 6.4 Add `tests/e2e/profile.spec.ts`: a profile outside the top 5 shows the breakdown and no Connect button; one in the top 5 shows the button and pressing it shows the message; your own shows neither; an unknown address and a suspended person's address show "page not found"; signed out goes to `/signin`. Verify: `npm run test:e2e` passes

## 7. Deploy and hand over

- [ ] 7.1 Push, open the PR with the two screenshots from 4.4, and on the preview URL as `pretend-user-02` repeat #11's five success checks, the last one on a real phone. Verify: all five are ticked in the PR description, with a note that Connect is a stand-in until slice 5
- [ ] 7.2 **(human)** Comment on #17 with the swap list from `src/lib/cohort/standIns.ts` (six stand-ins, their owners and real names), and that hiding blocked people and showing photos on the profile page are still to do. Comment on #9 that alias addresses are settled by `aliasToAddress()`. Verify: both comments are posted
