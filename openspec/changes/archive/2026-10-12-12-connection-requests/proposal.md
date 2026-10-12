# Proposal: Slice 5, connection requests (#12)

## Why

Matching and the graph (slices 3 and 4) show students who they fit with, but nothing lets two people actually agree to talk. The Connect button on a profile currently answers "Connection requests aren't switched on yet." This slice makes it real: a student can ask someone from their top 5 or their glitch match to connect, and the other person approves or declines. Nothing private (a conversation, a photo) opens until both say yes, which is the "reveal on approval" rule the whole product rests on. It is track 5 in the slice map (#18), depends only on the foundation (#7), and is followed by messaging (#13), which uses the conversation this slice opens.

## What Changes

- **A real `sendConnectionRequest(fromUserId, toUserId)`** that stores a pending request, and refuses (storing nothing) when the sender is not allowed to ask. The rules live inside this helper, so they hold even if something calls it directly (#12 success check 1).
- **A requests page at `/requests`** replacing the placeholder: requests waiting for your answer (with Approve and Decline), and the requests you have sent with where each stands.
- **Approve and decline**, through `POST /api/requests/[id]/approve` and `POST /api/requests/[id]/decline`. Only the person who was asked can answer. Approving calls `openConversation()`; declining opens nothing.
- **In-app notification**: the "Requests" link in the nav bar shows how many requests are waiting for you, so a new one is seen on any page.
- **One request per pair, ever, and a decline is final.** After a decline neither person can ask the other again.
- **`areConnected(userIdA, userIdB)`**, a shared helper that answers "has this pair agreed to connect, and is the connection still live?". Slice 7 (#14) uses it to decide who may be shown a photo. This slice builds the rule, not photo upload or serving.
- **Swap the stand-in.** Slice 4 is merged, so the body of `sendConnectionRequest` in `src/lib/cohort/standIns.ts` now calls the real helper, instead of waiting for join-up.

### Decisions made for this change (asked of Patrick, 12 Oct 2026)

| Question | Decision |
|---|---|
| Can a declined request be sent again? (open question on #12) | No. A decline is final for that pair |
| How is a new request announced? (open question on #12) | In-app only: a count on the Requests nav link and the `/requests` page. No email |
| What does approval do about photos, when slice 7 owns upload and serving? | Provide the rule (`areConnected`), not the photo |
| Where do the send rules live? | Inside the real send helper. Slice 4's route keeps its own check as a second lock |

### Assumptions to confirm at review

- **"Final" applies in both directions.** If B declines A, B cannot later ask A either. This makes the rule "at most one request per pair, ever", which is simpler to state, check and test.
- **The sender sees "Declined" on `/requests`, not who ignored them.** There is no withdraw or cancel in this slice.
- **A suspended person or a blocked pair cannot be asked, and a pending request to them cannot be approved.** Blocks are slice 9's, but the `Block` table exists, so this slice only reads it.
- **Two quick presses of Connect make one request, not two.** The write checks and inserts as one step (design decision 3).

## Capabilities

### New Capabilities

None. Everything belongs to the existing `connection-requests` capability.

### Modified Capabilities

- `connection-requests`:
  - Sending is refused unless the person is in the sender's top 5 or glitch match, even when called directly, and also refuses yourself, suspended people, blocked pairs and any pair that already has a request.
  - Approval's reveal rule is stated as "approved and not blocked".
  - New requirements: one request per pair with a final decline, only the person asked can answer, and the `/requests` page.

## Impact

- **Depends on #7 (foundation), merged**, and builds on slice 4 (#11), merged: `getConnectPermission()` in `src/lib/cohort/profile.ts`, which `README.md` already names as the helper slice 5 should use, and the connect route and button.
- **Routes owned:** `/requests` and `/api/requests/*`. This slice replaces #7's placeholder `/requests` page.
- **Code (new):** `src/lib/requests/` (send, answer, list, count, `areConnected`), `src/app/requests/`, `src/app/api/requests/`, and tests.
- **Code in files this slice does not own (small, additive, listed so review can check them):**
  - `src/lib/cohort/standIns.ts`: the inside of `sendConnectionRequest` calls the real helper. This is the swap that file was written for.
  - `src/components/NavBar.tsx`: the Requests link shows the waiting count (foundation's file, one added line).
  - `README.md`: the routes, the shared helpers table and the stand-ins table.
- **Schema:** no change. `ConnectionRequest` already has everything needed and deliberately has no unique rule (see `schema.prisma`'s comment), so "one per pair" is enforced in code, inside a transaction.
- **Dependencies:** none new.
- **Other tracks:**
  - Slice 6 (#13) owns `openConversation()`'s real behaviour and the conversation screens. This slice only calls it.
  - Slice 7 (#14) calls `areConnected()` for photos.
  - Slice 9 (#16) creates blocks. This slice only reads them.
  - Join-up (#17): the profile page (slice 4's) still shows the Connect button after a decline and says "a request is waiting" without saying who asked. The server answers the press with a clear message, so nothing breaks, but the page can be tidied there.
- **Out of scope:** the conversation screens (slice 6), photo upload and serving (slice 7), blocking and reporting (slice 9), withdrawing a request, email notifications, and real-time updates of the count.
