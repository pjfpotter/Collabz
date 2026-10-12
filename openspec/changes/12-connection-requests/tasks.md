# Tasks: Slice 5, connection requests (#12)

Work on branch `feature/12-connection-requests`, which starts from `master` after slices 4 (#11) and the foundation (#7) merged. Groups build on each other: the send rules (2), swapping slice 4's stand-in (3), answering (4), the list, count and `areConnected` (5), the page and nav count (6), then deploy (7). Each group lands its own tests and its own part of the README. Steps marked **(human)** need a conversation or a click only a person can do.

Names used, so the tasks stay short:
- **The helpers** live in `src/lib/requests/`.
- **Hand-made people** are made with `createPerson` and `createScore` from `tests/helpers/people.ts`, as slice 4's tests do, because the pretend cohort's scores are "random" and its requests would get in the way.
- **A pair's refusal** is `{ sent: false, message, reason }`, with reasons `self`, `unavailable`, `already-pending`, `already-connected`, `declined`, `not-a-match` (design decision 1).

## 1. Before building

- [ ] 1.1 **(human)** Assign yourself to #12 (`gh issue edit 12 --add-assignee @me`) and post the agreed names on #12 and #11: `sendConnectionRequest(fromUserId, toUserId)` returning `{ sent, message, reason? }`, and `areConnected(userIdA, userIdB)` for #14. This closes task 1.2 of the archived #11 change. Verify: both comments exist and #12 shows an assignee
- [x] 1.2 Read the Next.js 16 guides in `node_modules/next/dist/docs/` for route handlers, Server Components that read cookies, and `router.refresh()`, and note any difference from what design decisions 4, 7 and 9 assume in this file's "Notes" section. Verify: the notes exist, or say "nothing differs"

## 2. The send rules

- [x] 2.1 Spike first: add `src/lib/requests/sendRequest.ts` with only the insert-inside-a-serializable-transaction part (check for any request between the pair, insert if none) and `tests/integration/sendRequest.test.ts` with one test that fires two sends for the same pair at once with `Promise.all`. Verify: `npm test` passes and the table holds exactly one row. If Neon's pooled connection doesn't report the conflict, switch to `pg_advisory_xact_lock` as the design's Risks says, and say which in a comment
- [x] 2.2 Add `src/lib/requests/messages.ts` with the refusal reasons, their sentences (one sentence each; `unavailable` covers suspended and blocked without saying which) and the "request sent" sentence, so the helper, the tests and the page use the same words. Verify: `npx tsc --noEmit` passes
- [x] 2.3 Finish `sendConnectionRequest` with every check in design decision 1, in that order, and integration test each outcome: sent to a top 5 person; sent to the glitch match; refused for self, a suspended person, an unfinished profile, a block in either direction, an existing pending request in either direction, an existing approved one, an existing declined one in either direction, and someone outside the top 5 and glitch match. Each refusal test also checks that no row was added. Verify: `npm test` passes
- [x] 2.4 Add the shared types and a header comment explaining the order of the checks and why blocked and suspended give the same answer (design decision 1). Verify: a reader can find, from the file's top comment alone, why check 4 comes before check 5

## 3. Swap slice 4's stand-in

- [x] 3.1 In `src/lib/cohort/standIns.ts`, make `sendConnectionRequest` call the real helper (keep its name and signature), update its header comment and the stand-ins table at the top so it no longer lists it as a stand-in, and remove `REQUESTS_NOT_SWITCHED_ON_MESSAGE` once nothing imports it. Verify: `npx tsc --noEmit` and `npm run lint` pass, and a search for `REQUESTS_NOT_SWITCHED_ON_MESSAGE` finds nothing
- [x] 3.2 Update `tests/integration/standIns.test.ts` and `tests/integration/profile.test.ts`, which assert "stores nothing" and the not-switched-on message: the connect route now stores one pending request for a top 5 person and answers `sent: true`, still stores nothing and answers 403 outside the top 5, and answers `sent: false` with the right reason for an existing request. Verify: `npm test` passes
- [x] 3.3 Update `tests/e2e/profile.spec.ts`: pressing Connect on a top 5 profile now shows the "request sent" sentence, and reloading the page shows "A connection request is waiting between you two." in place of the button; the cleared-requests set-up stays. Verify: `npm run test:e2e` passes
- [x] 3.4 README: in the slice 4 section, change the Connect description and the stand-ins table row for `sendConnectionRequest` (it is real now, owned by `src/lib/requests/`). Verify: nothing in `README.md` still says requests "aren't switched on yet"

## 4. Answering a request

- [x] 4.1 Add `src/lib/requests/answerRequest.ts` with `answerRequest(requestId, viewerId, answer)` as in design decision 4: refuses unless the viewer is the recipient, the request is pending, and the sender is visible and not blocked; changes status with `updateMany` on `PENDING` and checks the count; calls `openConversation()` only on approve. Integration test: approve opens one conversation and sets `APPROVED`; decline sets `DECLINED` and opens none; the sender and a third person are refused and the request stays pending; answering twice (approve then decline, and two approves at once) leaves the first answer and one conversation; a suspended or blocked sender is refused. Verify: `npm test` passes
- [x] 4.2 Add `src/app/api/requests/[id]/approve/route.ts` and `.../decline/route.ts` with the answers in design decision 4 (401, 404 for not found or not yours, 409, 200 `{ ok, message }`) and a header comment saying why 404 and not 403. Integration test each answer for both routes, signed in through the same `getCurrentUser` stand-in slice 4's route tests use. Verify: `npm test` passes
- [x] 4.3 README: add `/api/requests/[id]/approve` and `/decline` to the routes and the helpers tables. Verify: both routes appear with their owner (slice 5, #12)

## 5. The list, the count and `areConnected`

- [x] 5.1 Add `src/lib/requests/listRequests.ts` with `getRequestsPage(userId)` returning the waiting requests (alias address, alias, silhouette, request id, sent date) and the sent requests (same, plus a status of `waiting`, `connected` or `declined`), and `countWaitingRequests(userId)` using the same waiting filter (design decision 5). Integration test: a suspended sender's and a blocked sender's pending requests are in neither the list nor the count; the count equals the list's length; nothing in the result is an email or a user id. Verify: `npm test` passes
- [x] 5.2 Add `src/lib/requests/areConnected.ts` as in design decision 6. Integration test: approved either way round is true; pending, declined and none are false; approved then blocked in either direction is false. Verify: `npm test` passes
- [x] 5.3 README: list `areConnected`, `countWaitingRequests` and `getRequestsPage` in the shared helpers table, with "Slice 7 uses `areConnected` before serving a photo" as the note. Verify: all three appear

## 6. The page and the nav count

- [x] 6.1 Replace `src/app/requests/page.tsx` with the real page (design decision 9): `requireFinishedProfile()` first, then the two sections, each with a plain empty state, using `getRequestsPage()`, `aliasToAddress()` and `SilhouetteStandIn`. Verify: as `pretend-user-02` in the dev switcher, the page shows its waiting and sent requests with no email anywhere in the page's text
- [x] 6.2 Add `src/app/requests/RequestActions.tsx`, a Client Component with Approve and Decline that posts to the two routes, shows the server's message on a refusal, and calls `router.refresh()` on success. Verify: approving as `pretend-user-02` moves the request out of "Waiting" and the page and nav count update without a manual reload
- [x] 6.3 Add `src/components/WaitingRequestsCount.tsx` (design decision 7) and render it inside the Requests link in `src/components/NavBar.tsx`. Update the comment at the top of `NavBar.tsx` to say the link now carries a count. Verify: signed out shows no count; as `pretend-user-02` it shows the number of waiting requests; after answering them all it shows none
- [x] 6.4 Add `tests/e2e/requests.spec.ts`: signed out goes to `/signin`; a viewer with a waiting request sees the alias and Approve/Decline; approving removes it and drops the nav count; declining does the same and the sender then sees "Declined"; the sender sees "Waiting" for what they sent; the page text contains no `@`. Clear or build the requests the test needs first, as `profile.spec.ts` does. Verify: `npm run test:e2e` passes
- [x] 6.5 Update `tests/e2e/navigation.spec.ts` where it still expects `/requests` to be a placeholder. Verify: `npm run test:e2e` passes
- [x] 6.6 README: replace the `/requests` row in the routes table's "placeholder" wording and add a short "Connection requests" section (what the page shows, the one-per-pair and final-decline rules, what `areConnected` is for, and the profile page's two known gaps for join-up). Verify: the section exists and the routes table no longer calls `/requests` a placeholder

## 7. Deploy and hand over

- [ ] 7.1 **(human)** Push, open the PR, and on the preview URL as `pretend-user-02` repeat #12's four success checks, the second on a real phone. Verify: all four are ticked in the PR description, with the proposal's assumptions listed for the reviewer to confirm
- [ ] 7.2 **(human)** Comment on #14 (use `areConnected` for photos), #13 (approval opens the conversation through `openConversation()`; closed conversations are slice 6's call) and #17 (the two profile page gaps in design decision 8). Verify: three comments exist
- [ ] 7.3 After the PR merges, archive with `/opsx:archive`, sync the specs, and update `ARCHITECTURE.md` for the new request flow and the nav count. Verify: `openspec/specs/connection-requests/spec.md` holds the new requirements and `ARCHITECTURE.md` mentions the request flow

## Notes

Checked on 12 Oct 2026 against `node_modules/next/dist/docs/01-app/03-api-reference/` (Next.js 16.3.8). Nothing differs from what the design assumes, with three details worth knowing:

- **Route handlers:** `context.params` is a Promise, so `await ctx.params`, and `RouteContext<"/api/requests/[id]/approve">` is a global type generated by `next dev`, `next build` or `next typegen`. Slice 4's connect route already does exactly this, so copy it.
- **`cookies()` is async** and using it in a layout or page makes the route dynamic. The nav count calls `getCurrentUser()`, which calls `cookies()`. That adds no new cost: `DevUserSwitcher` already does the same in the same layout, and `getCurrentUser()` returns before touching the cookie wherever the pretend cohort is off (including production). `cacheComponents` is not switched on in `next.config.ts`, so there is no `<Suspense>` rule to follow.
- **`router.refresh()`** re-fetches and re-renders Server Components for the current route without losing client state, but it does not clear server-side caches. That is fine here: our pages read Prisma directly and don't use `fetch` caching. Task 6.2 still checks by hand that the nav count updates, because the count lives in the layout.
