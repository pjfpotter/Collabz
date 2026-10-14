# Design

## Context

See `proposal.md` for why. What exists today:

- `Conversation` (one row per pair, lower user id in `userAId`, `closedAt` empty while open) and `Message` (`body`, `senderId`, `createdAt`) are already in `schema.prisma`. No schema change is needed.
- `src/lib/conversations.ts` holds minimal `openConversation()` and `closeConversation()`. Slice 5 calls the first on approval; slice 9 will call the second on a block. Their names and signatures must not change.
- `areConnected(a, b)` (slice 5) is the rule for "may these two talk": an approved request and no block.
- `/messages` is a placeholder. The pretend cohort already has open conversations with messages for `pretend-user-02`, and the dev switcher lets us view both sides.
- Page conventions to follow, as `/requests` does: `requireFinishedProfile()` first, Server Component for the page, a small Client Component for the form, route handlers that answer JSON `{ ok, message }` with 401 / 404 / 409 / 200, and `aliasToAddress()` plus `SilhouetteStandIn` for how a person is shown. Never an email, never a user id, in what the page shows.

## Goals / Non-Goals

**Goals:**
- Only the two people in a conversation can read or write in it, enforced in the server code every time, not only by what the page shows.
- Simple enough that a beginner can follow it: pages read with Prisma, a form posts to a route, the page refreshes.

**Non-Goals:**
- Real-time updates, unread markers, read receipts, editing or deleting a message, attachments, or paging through very long conversations.

## Decisions

### 1. Where the rules live: one helper file per job, in `src/lib/messages/`

`listConversations(userId)`, `getConversation(userId, conversationId)` and `sendMessage(userId, conversationId, body)` live in `src/lib/messages/`, with the sentences they return in `messages.ts` next to them (the same pattern as slice 5's `src/lib/requests/messages.ts`). The page and the route both call these and never query `Message` themselves, so the access rule is written once. `openConversation` and `closeConversation` stay in `src/lib/conversations.ts` because other tracks import them from there.

**Alternative:** put the queries straight in the page and route. Rejected: two places to get the "only the two people" rule right.

### 2. Access: refuse as "not found", not "forbidden"

`getConversation` and `sendMessage` look the conversation up by id **and** require the viewer to be `userAId` or `userBId`. If it isn't theirs, the answer is the same as for an id that doesn't exist (404). A 403 would confirm that someone else's conversation id is real. This matches slice 5's answer routes.

### 3. Sending: the check order

`sendMessage` refuses, in this order, with one sentence each:
1. the conversation isn't the viewer's, or doesn't exist (`not-found`)
2. the conversation is closed (`closed`)
3. the two are no longer connected, `areConnected` false (`not-connected`). This is one reason on purpose, so it can't be used to learn who blocked whom
4. the body is empty or only spaces after trimming (`empty`)
5. the body is over 1000 characters (`too-long`)

Only then is the row inserted. The 1000 limit is one named constant (`MESSAGE_MAX_LENGTH`) that the helper, the form's `maxLength` and the tests all import.

**Why check "closed" before "connected":** a block both closes the conversation and makes `areConnected` false. Saying "this conversation is closed" is the clearer message and doesn't reveal the block.

### 4. Closed means closed for good

`closeConversation` stays as it is (it only sets `closedAt`, once). The refusal lives in `sendMessage`. `openConversation` already returns a closed conversation as it is, still closed, so the only change there is a clearer comment that this is now the decided rule, not a placeholder. Reading a closed conversation still works so people can see what was said.

**Alternative:** let a later approval reopen it. Rejected for now: the safety slice (#16) needs a block to be final, and reopening can be added later without breaking anything.

### 5. Routes

- `/messages` lists your conversations (the other person's alias and silhouette, the latest message's start and time, newest first; closed ones are marked). Nothing selected means the list only.
- `/messages/[conversationId]` shows one conversation, oldest message first, with the send form underneath. A conversation that isn't yours is the standard not-found page.
- `POST /api/messages/[conversationId]` sends. Answers: 401 nobody signed in, 404 not yours or doesn't exist, 409 closed or no longer connected, 422 empty or too long, 200 `{ ok: true, message }`.

The form is a Client Component that posts, shows the server's sentence on a refusal, and calls `router.refresh()` on success, as the Approve and Decline buttons do. Refresh on page load is the only "live" behaviour.

### 6. What a message shows

Each message shows the sender's alias and the time. The page works out which side is the viewer from `senderId` and shows "You" for their own. The helper returns only the alias, the silhouette id, the body, and the time: never an email or a user id.

### 7. Message text is plain text

The body is rendered as plain text by React (it escapes it), never as HTML, so a message can't inject markup. Line breaks are kept with CSS (`whitespace-pre-wrap`). No link detection.

## Risks / Trade-offs

- **Someone is suspended after connecting** → the conversation stays readable but we treat a suspended other person like `areConnected` false for sending. [If the team wants suspended people hidden in the list too, that's a follow-up with slice 8.]
- **Messages appear only on refresh** → accepted for MVP; the page says so in a short line under the form so nobody thinks the message was lost.
- **Slice 5's `/requests` links connected requests to `/messages`** → that lands on the list, so a person has to pick the conversation. Acceptable; the list is short.
- **Long conversations** → everything is loaded at once. Fine for a cohort-sized app; a "load earlier" button is a later change if it's ever needed.
