# Design: Slice 9, safety (#16)

## Context

See `proposal.md` for why. What exists already, checked on 15 Oct 2026:

- `Block` (blockerId, blockedId, one row per direction) and `Report` (reporter, reported, `reason` as plain text, `status` OPEN/RESOLVED, `resolvedById`) are in `schema.prisma`. The `reason` column is text on purpose: "slice 9 hasn't decided the list of reasons yet". **No schema change is needed.**
- `hasBlockBetween()` in `src/lib/requests/pairRules.ts` and `areConnected()` already treat a block as "not connected" and "unavailable". So requests, messages and photos *already* refuse a blocked pair, as soon as a `Block` row exists. `sendMessage` also checks `closedAt`.
- `closeConversation(id)` in `src/lib/conversations.ts` closes for good; `openConversation` never reopens a closed one (slice 6 design decision 4).
- NOT yet done: the graph, people list, matches and profile page don't hide blocked people. Only the requests lists do, with a private `findBlockedCounterpartIds` in `listRequests.ts`.
- `suspendUser(adminId, id)` and `removePhoto(id)` exist in `src/lib/admin/users.ts` (slice 8), with `redirectBack()` and `requireAdmin()` for the actions.
- `/admin/reports` is a placeholder that already calls `requireAdmin()`. The pretend cohort has a sample block and a report ("Inappropriate messages").

## Goals / Non-Goals

**Goals:**
- One small tested function per action in `src/lib/safety/`, pages and actions stay thin.
- A block is visibly final and invisible to the blocked person.

**Non-Goals:**
- No unblock, no block list screen, no report "notes" or free-text details, no email to admins, no automatic suspension, no appeal. (Anything beyond the listed actions is out, per the issue.)
- No change to scoring: scores stay stored for every pair.

## Decisions

1. **Logic in `src/lib/safety/`, one file per action:** `reasons.ts`, `blockUser.ts`, `reportUser.ts`, `hiddenPeople.ts`, `reports.ts` (the queue). Functions return a list of plain-English problems, empty meaning it worked, like slice 8. *Alternative:* queries inside the actions. Rejected: harder to test and read.

2. **Block = store the row, then close the conversation.** In that order, in `blockUser(blockerId, blockedId)`: refuse yourself, create the `Block` (a second block of the same person is a no-op), look up the pair's conversation (`orderUserPair`, read only), and if one exists call the shared `closeConversation(id)`. We never create a conversation just to close it. Save first, close after, so a failure can't leave a conversation open with no block recorded; the message check also refuses blocked pairs, so the order is safe either way.

3. **Hiding is done when reading, not by rescoring.** One shared function `getHiddenUserIds(viewerId)` returns everyone who blocked the viewer or was blocked by them (moving `findBlockedCounterpartIds` into `hiddenPeople.ts`, and `listRequests.ts` imports it so there is one copy). The graph, people list, profile page, top 5 and glitch match remove those ids. *Alternative:* delete or zero the `Edge` rows. Rejected: scores are per pair and shared with everyone's view, and an unblock tool or a mistake would need a full rescore. A per-viewer filter is reversible and cheap at 30 to 100 people.

4. **Where the buttons live.** On the person's profile page (`/people/[alias]`) a small `SafetyActions` component with "Block" and "Report". The page is slice 4's, so the change there is one line importing the component. The component is shared by both pages, so it lives in `src/components/SafetyActions.tsx` and its two Server Actions in `src/lib/safety/safetyActions.ts` (they call the other functions in that folder), rather than one page importing from the other's folder. The same component is shown in the message thread header (slice 6's page, again one line), since that's where someone is when they want to block. *Decision to confirm at approval:* this is the only place this slice touches another track's route.

5. **Report reasons are a constant list, checked on the server.** `REPORT_REASONS` in `reasons.ts`, and the form is a set of radio buttons built from it. `reportUser` refuses anything not on the list, because a Server Action is a public address and a form can be forged. The column stays text so changing the list never needs a migration, and old reports keep the words they were made with. **Proposed list (open question in #16, team to confirm):** "Inappropriate messages", "Harassment or bullying", "Inappropriate or offensive photo", "Fake or misleading profile", "Spam or unwanted contact", "Something else". The first matches the pretend cohort's sample report.

6. **Duplicate reports.** Reporting someone you already have an OPEN report against returns "You've already reported this person" and stores nothing; once an admin resolves it, a new report is allowed. *Why:* stops the queue being flooded by one person without hiding a genuine second problem.

7. **Queue actions reuse slice 8.** Suspend calls `suspendUser(admin.id, reportedId)`, remove photo calls `removePhoto(reportedId)`, and "Resolve" sets `status: RESOLVED` and `resolvedById` (idempotent, keeps the first resolver). Suspend and remove photo do *not* resolve by themselves: the spec has them as three separate choices and the "Resolve a report" scenario does both steps. Every action calls `requireAdmin()` first and refreshes `/admin/reports`, `/graph`, `/people`, `/matches`.

8. **Queue screen.** Open reports first (oldest first), then resolved (newest first). Each card shows reporter and reported person as alias and email (admins may see emails, as on `/admin/users`), the reason, when, the person's suspended/photo state, and three forms. Admins can suspend someone from here but unsuspend stays on `/admin/users`.

9. **Block and report need a finished profile.** The member actions use the same `requireFinishedProfile`-style guard as requests, and `userId` is never taken from the form for the *current* user, only the target alias, resolved on the server (the graph and links use aliases, rule B1).

## Risks / Trade-offs

- **Hiding code is spread over several pages.** Missing one would leak a blocked person. Mitigation: all of them go through `getHiddenUserIds`, and an integration test checks graph, people list, top 5 and glitch each exclude a blocked person in both directions.
- **A block is permanent for the MVP.** A mistaken click can't be undone by the user; an admin can only edit the database. Accepted: unblock is not in the issue, and the button asks for a confirmation step.
- **A blocked user can still see their old conversation.** Closed conversations stay readable (slice 6), so the blocked person sees it ended. That doesn't reveal who blocked whom, same as a declined-looking request.
- **Reason list not final.** Cheap to change (a constant), which is why it's text.
