# Tasks: Slice 6, messaging (#13)

Work on branch `feature/13-messaging`, starting from `master`. Groups build on each other: the shared helpers (2), sending (3), reading (4), the pages (5), then deploy (6). Each group lands its own tests and its own part of the README. Steps marked **(human)** need a conversation or a click only a person can do.

Names used, so the tasks stay short:
- **The message helpers** live in `src/lib/messages/` (design decision 1).
- **Hand-made people** are made with `createPerson` from `tests/helpers/people.ts`, as slice 5's tests do, and connected by creating an `APPROVED` request, because the pretend cohort's data would get in the way of exact counts.
- **A refusal** is `{ sent: false, message, reason }`, with reasons `not-found`, `closed`, `not-connected`, `empty`, `too-long` (design decision 3).

## 1. Before building

- [x] 1.1 **(human)** Assign yourself to #13 (`gh issue edit 13 --add-assignee @me`) and comment on #13 and #16 that a closed conversation never reopens, so a block closes it for good. Verify: both comments exist and #13 shows an assignee
- [x] 1.2 Read the Next.js 16 guides in `node_modules/next/dist/docs/` for dynamic route segments in pages and route handlers (`params` is a Promise) and `router.refresh()`, and note any difference from design decision 5 in this file's "Notes" section. Verify: the notes exist, or say "nothing differs"

## 2. The shared helpers

- [x] 2.1 In `src/lib/conversations.ts`, update the header comments of `openConversation` and `closeConversation` to say the rules are now decided (closed stays closed; sending is refused by `sendMessage`), keeping both names and signatures. Add integration tests in `tests/integration/conversations.test.ts`: opening twice gives one conversation; opening for a closed pair returns it still closed; closing twice keeps the first closing time. Verify: `npm test` passes and `tests/integration/sharedHelpers.test.ts` still passes unchanged

## 3. Sending a message

- [x] 3.1 Add `src/lib/messages/messages.ts` with `MESSAGE_MAX_LENGTH = 1000`, the refusal reasons and one plain sentence for each. Verify: `npx tsc --noEmit` passes
- [x] 3.2 Add `src/lib/messages/sendMessage.ts` with `sendMessage(userId, conversationId, body)` doing the checks of design decision 3 in order and inserting the row only if all pass. Integration test each outcome: sent between two connected people; refused for a stranger's conversation (same `not-found` as a made-up id), a closed conversation, two people with no approved request, an approved-then-blocked pair, a suspended other person, an empty body, a spaces-only body, and a 1001-character body; exactly 1000 characters is accepted. Every refusal test also checks that no row was added. Verify: `npm test` passes
- [x] 3.3 Add `src/app/api/messages/[conversationId]/route.ts` (POST) with the answers in design decision 5 (401, 404, 409, 422, 200 `{ ok, message }`) and a header comment saying why 404 and not 403. Integration test each answer, signed in through the same `getCurrentUser` stand-in the slice 5 route tests use, including a body that isn't valid JSON. Verify: `npm test` passes
- [x] 3.4 README: add `POST /api/messages/[conversationId]` to the routes table and `sendMessage` to the helpers table, owner slice 6 (#13). Verify: both appear

## 4. Reading conversations

- [x] 4.1 Add `src/lib/messages/listConversations.ts` with `listConversations(userId)`: the viewer's conversations, newest activity first, each with the other person's alias, address and silhouette, the start of the latest message with its time, and whether it is closed. Integration test: only the viewer's conversations appear; ordering; a conversation with no messages still appears; nothing in the result is an email or a user id other than the conversation's own id. Verify: `npm test` passes
- [x] 4.2 Add `src/lib/messages/getConversation.ts` with `getConversation(userId, conversationId)`: returns the other person and the messages oldest first with "mine" marked, or `null` when it isn't the viewer's or doesn't exist. Integration test: both participants can read it; a third person gets `null`; a made-up id gets `null`; a closed conversation can still be read. Verify: `npm test` passes
- [x] 4.3 README: add `listConversations` and `getConversation` to the helpers table. Verify: both appear

## 5. The pages

- [x] 5.1 Replace `src/app/messages/page.tsx` with the real list (design decision 5): `requireFinishedProfile()` first, a plain empty state that points to `/graph`, one row per conversation linking to `/messages/[conversationId]`, closed ones marked. Verify: as `pretend-user-02` in the dev switcher the list shows its conversations and no email appears in the page's text
- [x] 5.2 Add `src/app/messages/[conversationId]/page.tsx` showing the messages oldest first with alias and time ("You" for the viewer's own), the standard not-found page when `getConversation` returns `null`, and a closed notice in place of the form when closed. Verify: as `pretend-user-02` a conversation shows its messages, and a conversation id belonging to others shows the not-found page
- [x] 5.3 Add `src/app/messages/[conversationId]/SendMessageForm.tsx`, a Client Component with a textarea (`maxLength` from `MESSAGE_MAX_LENGTH`, with a remaining-characters line), a Send button that posts to the route, shows the server's sentence on a refusal, clears on success and calls `router.refresh()`. Include the one line saying new messages appear when the page is refreshed. Verify: sending as `pretend-user-02` shows the new message without a manual reload
- [x] 5.4 Add `tests/e2e/messages.spec.ts`: signed out goes to `/signin`; the list shows the viewer's conversation; sending a message shows it; switching to the other person in the dev switcher and reloading shows it from the sender's alias; a third person gets the not-found page; a closed conversation shows no form. Set up its own people and clear its own data as `requests.spec.ts` does. Verify: `npm run test:e2e` passes
- [x] 5.5 Update `tests/e2e/navigation.spec.ts` where it still expects `/messages` to be a placeholder. Verify: `npm run test:e2e` passes
- [x] 5.6 README: replace the `/messages` placeholder wording and add a short "Messaging" section (what the pages show, the 1000 limit, closed means closed, refresh to see new messages, and that real-time and unread markers are out). Verify: the section exists and the routes table no longer calls `/messages` a placeholder

## 6. Deploy and hand over

- [ ] 6.1 **(human)** Push, open the PR, and on the preview URL as `pretend-user-02` repeat #13's three success checks (only the two people can read it, even by calling the server directly; sent messages appear on refresh; a closed conversation can't receive new messages), one on a real phone. Verify: all three are ticked in the PR description, with the design's assumptions listed for the reviewer to confirm
- [ ] 6.2 **(human)** Comment on #16 (use `closeConversation()`, a closed conversation is read-only and never reopens) and #17 (what join-up needs to know: nothing changes for slice 5's call). Verify: both comments exist
- [ ] 6.3 After the PR merges, archive with `/opsx:archive`, sync the specs, and update `ARCHITECTURE.md` for the messaging flow. Verify: `openspec/specs/messaging/spec.md` holds the new requirement text and `ARCHITECTURE.md` mentions messaging

## Notes

Checked on 14 Oct 2026 against `node_modules/next/dist/docs/01-app/03-api-reference/` (Next.js 16.3.8). Nothing differs from what design decision 5 assumes, with three details worth knowing:

- **`params` is a Promise** in both pages and route handlers, so `const { conversationId } = await params` (pages: `params: Promise<{ conversationId: string }>`). In route handlers, `ctx: RouteContext<"/api/messages/[conversationId]">` is a global type; slice 5's answer routes already do exactly this, so copy them.
- **`notFound()` works by throwing**, so call it directly in the page's render path (not inside an un-awaited promise). That is what task 5.2 needs when `getConversation` returns `null`.
- **`router.refresh()`** re-renders the Server Components for the current route and keeps client state (such as the textarea), but does not clear server-side caches. Our pages read Prisma directly, so that is fine; task 5.3 still checks by hand that a sent message appears.
