# Design: Slice 5, connection requests (#12)

## Context

- See `proposal.md` (Why, and the decisions asked of Patrick on 12 Oct 2026) and `specs/connection-requests/spec.md` for the requirements.
- **Already built and merged:**
  - Foundation (#7): the `ConnectionRequest`, `Conversation` and `Block` tables, `getCurrentUser()`, `openConversation()`, `orderUserPair()`, a pretend cohort that includes 14 requests (8 pending, 4 approved, 2 declined) and a placeholder `/requests` page.
  - Slice 4 (#11): the Connect button, `POST /api/people/[alias]/connect`, `getConnectPermission()` (top 5 or glitch match) and `findRequestStatus()` in `src/lib/cohort/profile.ts`, and the stand-in `sendConnectionRequest()` in `src/lib/cohort/standIns.ts`.
- **`ConnectionRequest`:** `id`, `fromUserId`, `toUserId`, `status` (`PENDING`, `APPROVED`, `DECLINED`) and `createdAt`. It has a direction, so it is not stored lower-id-first like an `Edge`. It deliberately has no unique rule (a comment in `schema.prisma` says why), so "one per pair" has to be enforced in code.
- **Still stand-ins:** `getTopFive()` (track 3) and the silhouette picture and "finished profile" check (track 2). This slice reaches them only through `standIns.ts` and `getConnectPermission()`, as slice 4 does.
- **Next.js 16.** Route handlers use the generated `RouteContext<"/api/…">` type and `params` is a Promise, as in slice 4's connect route. Read the relevant guide in `node_modules/next/dist/docs/` before writing a route or page (CLAUDE.md).
- Five beginners will read this code, so every non-obvious line gets a comment explaining *why*.

## Goals / Non-Goals

**Goals:**
- Whatever refuses a request refuses it on the server, in one place, so the button, the route and a hand-made request can't disagree.
- A pair can never end up with two requests, or two conversations, even when two presses or two answers arrive at the same moment.
- Join-up for this slice is already done: slice 4's button talks to the real helper.
- Nothing about a person leaves the server beyond what profiles already show: alias, silhouette, link. Never an email.

**Non-Goals:**
- Withdrawing a sent request, email notifications, and live updating of the count.
- Photos: no upload, no serving, no photo on `/requests`. Only the permission rule (decision 6).
- Hiding the Connect button after a decline, or saying who asked, on slice 4's profile page (decision 8).

## Decisions

### 1. All send rules live in one helper, in this slice's own folder
`sendConnectionRequest(fromUserId, toUserId)` in `src/lib/requests/sendRequest.ts` checks, in this order, and stops at the first refusal:

| # | Check | Refusal `reason` |
|---|---|---|
| 1 | The two ids are the same | `self` |
| 2 | The other person is not visible (not finished, or suspended) | `unavailable` |
| 3 | Either has blocked the other (`Block`, either direction) | `unavailable` |
| 4 | A request already exists between them, in either direction, in any status | `already-pending`, `already-connected` or `declined` |
| 5 | They are not in the sender's top 5 or glitch match (`getConnectPermission()`) | `not-a-match` |

- **Result:** `{ sent: boolean; message: string; reason?: RefusalReason }`. `sent` and `message` are exactly what slice 4's stand-in already returned, so the route and the button need no change; `reason` is for tests and for the route to tell "refused" from "sent".
- *Why blocked and suspended people get the same vague `unavailable`:* telling someone "this person blocked you" is a safety leak. One message ("You can't send a request to this person.") covers both.
- *Why check 4 comes before 5:* if someone has since dropped out of your top 5 and a request already exists, "a request is already waiting" is the more useful answer.
- *Why `getConnectPermission()` and not a second copy of the top 5 rule:* `README.md` names it as the helper for slice 5, and one copy of the rule means the profile page and this helper can't disagree. At join-up, `getTopFive()` swaps inside it and nothing here changes.
- **Alternative rejected:** putting the rules in a new slice 5 route. Two routes could drift, and #12's success check is that refusal holds "even by calling the server directly", which means the helper itself.

### 2. Slice 4's route keeps its own check and calls the helper through the stand-in
- `standIns.ts`'s `sendConnectionRequest` keeps its name and signature, and its body becomes one call to `src/lib/requests/sendRequest.ts`.
- `POST /api/people/[alias]/connect` is not edited. It still answers 401 / 404 / 403 for who may *see* the button, then returns the helper's `{ sent, message }`.
- *Why not edit the route and the button:* they are slice 4's and already do what is needed. The stand-in file is the one documented swap point, and swapping it is an in-slice-5 job now that slice 4 is merged, not a join-up job.
- Tests that asserted "stores nothing" and the not-switched-on message (`standIns.test.ts`, `profile.test.ts`, `e2e/profile.spec.ts`) are rewritten as part of that swap (tasks group 3). `REQUESTS_NOT_SWITCHED_ON_MESSAGE` is removed once nothing uses it.

### 3. "One per pair" is a check and an insert in one serializable transaction
- The send helper does steps 4 and the insert inside `prisma.$transaction(..., { isolationLevel: "Serializable" })`. Two presses at the same moment can't both see "no request yet" and both insert; one of them fails and is retried once, then finds the first request and answers `already-pending`.
- *Why not a database rule:* a unique rule over `(fromUserId, toUserId)` wouldn't stop the reverse direction, and a pair-ordered unique rule would need a new column. Both change `schema.prisma`, which CLAUDE.md says to flag first, and the schema's own comment leaves the decision to this slice.
- *Why a transaction and not "look, then create":* that is exactly the gap two simultaneous presses fall through. The same reasoning is in `openConversation()`.
- **Verify first** (tasks 2.1): this repo has no `$transaction` yet. A concurrency test with two simultaneous sends must leave exactly one row, on Neon's pooled connection.

### 4. Answering is one function, used by two thin routes
- `answerRequest(requestId, viewerId, answer)` in `src/lib/requests/answerRequest.ts`, where `answer` is `"approve"` or `"decline"`.
- It loads the request, then refuses unless **all** are true: the viewer is `toUserId`, the status is `PENDING`, and the sender is still allowed (visible, no block either way).
- The status change is `updateMany({ where: { id, status: "PENDING" }, data: { status } })` and checks the count. *Why:* two answers arriving together can't both succeed, so there is never a second `openConversation()` for an already-answered request. (`openConversation()` is itself safe to call twice, so this is a second lock.)
- On approve it then calls `openConversation(fromUserId, toUserId)`. It does not check the pair may talk: this function has already done so (see that helper's comment).
- **Routes:** `POST /api/requests/[id]/approve` and `POST /api/requests/[id]/decline`. *Why two routes and not one with a body:* the address says what happens, there is nothing to parse, and each is a few lines a beginner can read.
- **Answers:** 401 not signed in, 404 not found *or not yours* (the same answer, so ids can't be probed), 409 already answered or no longer possible, 200 `{ ok: true, message }`.
- *Why 404 and not 403 for someone else's request:* 403 would confirm the id exists.

### 5. The waiting list and the count use the same filter
- `getWaitingRequests(userId)` in `src/lib/requests/listRequests.ts` returns pending requests to this user whose sender is still visible and not blocked either way. `countWaitingRequests(userId)` counts the same set.
- *Why one filter:* a count of 3 over a list of 2, or an Approve button that answers 409, would be confusing. A request from someone since suspended or blocked is quietly left out until that changes.
- It returns only what the page may show: request id, sender's alias address, alias, silhouette and `createdAt`. No email, no sender's user id.

### 6. `areConnected(userIdA, userIdB)` is the photo rule, with no photo code
- `src/lib/requests/areConnected.ts`: true when an `APPROVED` request exists between the two in either direction **and** neither has blocked the other.
- Slice 7 (#14) calls it before serving a photo, and slice 9 needs no code change here: a block makes it false by itself.
- *Why not look at the `Conversation`:* a conversation can be closed for reasons other than a block, and slice 6 owns what that means. The request plus the block table is the whole rule in the spec.
- **Not built:** photo upload, storage, serving, or a photo slot on `/requests`. `Profile.photoKey` stays empty until slice 7.

### 7. The nav count is a small Server Component, one line added to the nav bar
- `src/components/WaitingRequestsCount.tsx` is an async Server Component: it asks `getCurrentUser()` and `countWaitingRequests()` and renders `(2)`-style text, or nothing for signed out or zero.
- `NavBar.tsx` renders it inside the existing Requests link. That is the only edit to a shared file besides `standIns.ts`.
- *Why not a client component that polls:* live updating is out of scope and the page already reloads on navigation.
- **Check on apply:** the nav bar is in the root layout, and reading cookies there already happens for the dev switcher, so this adds no new "every page becomes dynamic" cost. Confirm against the Next.js 16 docs.
- The link text keeps its accessible name ("Requests") with the count in a visually distinct but screen-reader-friendly span.

### 8. What the slice 4 profile page still gets wrong, and why that is left
After a decline, `findRequestStatus()` ignores `DECLINED`, so the profile page still shows Connect; pressing it now answers "You can't send a request to this person." And a waiting request says "a request is waiting" without saying who asked.
- *Why leave it:* both are the profile page's wording, a slice 4 file. The server already refuses safely and says so in words, so this is polish, not a gap. Listed for join-up (#17) in the proposal and the README.

### 9. The `/requests` page
- Server Component; `requireFinishedProfile()` from `standIns.ts` first (signed out → `/signin`, unfinished → `/onboarding`), as the other pages do.
- Two sections: **Waiting for your answer** (alias, silhouette, "View profile" link, Approve and Decline) and **Sent by you** (alias, status "Waiting", "Connected" or "Declined"). Empty states say so in words.
- Approve and Decline are in one small Client Component, `RequestActions.tsx`: it posts, then `router.refresh()` so the page and the nav count update. It shows the server's `message` on a refusal, as `ConnectButton` does.
- Sender alias → page address uses `aliasToAddress()` from `src/lib/cohort/aliasAddress.ts`, and the picture uses `SilhouetteStandIn` from `standIns.ts`. Both are slice 4 / track 2 names this slice only imports.
- A "Connected" request links to `/messages`, which slice 6 fills in. Until then it shows its placeholder.

## Risks / Trade-offs

- **Serializable transactions on Neon's pooled connection may behave differently from a direct one** → the first task is the concurrency test (decision 3). Fall back to `pg_advisory_xact_lock` inside the transaction, which serialises sends for the same pair, if serialization failures aren't reported reliably.
- **"Final in both directions" is stricter than the spec's wording needed** → recorded as an assumption in the proposal. Loosening it to "the sender can't re-ask, the decliner still can" is one check in `sendRequest.ts` and two scenarios.
- **The count in the nav bar runs a database query on every page load** → one indexed `COUNT` (`toUserId` is indexed). Fine for a cohort of about 100; revisit if the nav ever caches.
- **A pending request outlives its sender** (suspended, blocked) and is hidden rather than closed → intentional: it comes back if they are reinstated or unblocked, and no slice 5 code needs to know when that happens.
- **Pretend cohort data differs from reality:** it already has requests, including a declined one and an approved one with a conversation. Tests that need a clean pair use hand-made people (`tests/helpers/people.ts`), as slice 4's do.
- **The helper depends on the `getTopFive()` stand-in**, so "top 5" is the highest stored scores until slice 3 lands → unchanged by this slice, and the swap is inside `getConnectPermission()`.

## Open Questions

- None that would change the specs or the tasks. (Whether `/requests` should also list who you are connected with, as a shortcut to messages, can wait for slice 6.)
