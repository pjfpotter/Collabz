# Proposal

## Why

Two students who have agreed to connect (slice 5) currently have nowhere to talk: `/messages` is a placeholder, and the two shared helpers `openConversation()` and `closeConversation()` are minimal versions that only store a row. The brief's whole point is that people can start collaborating without swapping personal contact details, so this slice gives approved connections a private place to talk. It also finishes the helpers that slice 5 (approving a request) and slice 9 (blocking) already call.

## What Changes

- `/messages` becomes a real page: a list of your conversations, and a conversation view showing the messages oldest first, each with the sender's alias and the time.
- A form to send a text message, backed by a server route. The only people who can send or read are the two in the conversation, checked on the server, not just hidden in the page.
- Sending is refused unless the two are still connected (`areConnected`, from slice 5), and refused in a closed conversation.
- Messages are limited to 1000 characters, checked on the server and shown in the form. Empty or whitespace-only messages are refused.
- Messages appear for the other person on page load or refresh. No live updates.
- `closeConversation()` now has teeth: a closed conversation refuses new messages and stays readable. A closed conversation **never reopens**, so `openConversation()` keeps returning it closed (a decision for this slice, as slice 5 left it open).
- Replace the "Messages" placeholder page. Keep the helper names and signatures the other tracks rely on.

Out of scope (MVP Later, stay in the spec but are not built here): unread indicator and real-time chat.

## Capabilities

### New Capabilities
<!-- None: messaging already exists as a capability. -->

### Modified Capabilities
- `messaging`: the first requirement (private conversations between connected users) gains the rules this slice settles: the 1000-character limit, empty messages refused, a closed conversation refuses new messages but can still be read, and a closed conversation does not reopen. The two MVP-Later requirements (unread indicator, real-time chat) are unchanged.

## Impact

- **Code:** `src/app/messages/` (page and send form), a new route under `src/app/api/` for sending, new helpers under `src/lib/` for listing and sending, and `src/lib/conversations.ts` (grown, same exported names).
- **Reads, does not change:** `areConnected` and `getCurrentUser`, `requireFinishedProfile`, the alias and silhouette stand-ins from other tracks.
- **Database:** none. `Conversation` and `Message` already exist in `schema.prisma`; no migration, nothing to flag to the team.
- **Other tracks:** slice 5 (`openConversation`) and slice 9 (`closeConversation`) keep working unchanged. Slice 9 should be told that a block closes a conversation for good.
- **Open questions from #13:** the length limit is answered (1000). Reopening is answered (never).
