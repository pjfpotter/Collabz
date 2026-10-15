# Tasks: Slice 9, safety (#16)

Before starting: merge `master` into this branch, make sure `.env` has the three database URLs and `PRETEND_COHORT=on`, then `npm install`, `npx prisma migrate deploy` and `npm run seed:fake`. The pretend cohort has a pretend admin and one sample block and report (use the dev "sign in as…" switcher).

Groups build on each other: logic with tests first (1, 2), then the admin queue (3), the member buttons (4), then the checks and docs (5). Pause after each group and show what changed. Every function and page gets "why" comments (CLAUDE.md). Run only the touched specs mid-slice; the full suites once at the end (5.1).

## 1. Blocking

- [ ] 1.1 Add `src/lib/safety/hiddenPeople.ts` with `getHiddenUserIds(viewerId)` (moved from `findBlockedCounterpartIds` in `listRequests.ts`, which now imports it). Integration test in `tests/integration/hiddenPeople.test.ts`: both directions, nobody blocked gives an empty set. Verify: `npx vitest run tests/integration/hiddenPeople.test.ts tests/integration/listRequests.test.ts` passes
- [ ] 1.2 Add `src/lib/safety/blockUser.ts`: `blockUser(blockerId, blockedId)` per design 2. Tests in `tests/integration/blockUser.test.ts`: stores the row; refuses yourself; blocking twice is fine; an existing conversation is closed and `sendMessage` then refuses; no conversation is created when there was none; a photo is no longer visible (`canSeePhoto`); a request can't be sent either way. Verify: that file passes
- [ ] 1.3 Make the graph data, people list, profile lookup, top 5 and glitch match leave out `getHiddenUserIds(viewer)`. Tests: a blocked person is absent from each, for both the blocker and the blocked, and a third person still sees them. Verify: `npx vitest run` on the touched cohort/matching test files passes

## 2. Reporting

- [ ] 2.1 Add `src/lib/safety/reasons.ts` with `REPORT_REASONS` and `isReportReason()` (list from design 5, confirmed at approval). Unit test: each listed reason accepted, empty and unknown refused. Verify: `npx vitest run tests/unit/reportReasons.test.ts` passes
- [ ] 2.2 Add `src/lib/safety/reportUser.ts`: `reportUser(reporterId, reportedId, reason)` refusing yourself, an unlisted reason, and a second report while one is open (design 6). Tests in `tests/integration/reportUser.test.ts`, including that a new report is allowed after the first is resolved. Verify: that file passes

## 3. Moderation queue

- [ ] 3.1 Add `src/lib/safety/reports.ts`: `listReports()` (open first, with alias, email, reason, date, suspended and photo state) and `resolveReport(adminId, reportId)` (keeps the first resolver). Tests: ordering, resolve sets status and `resolvedById`, resolving twice changes nothing. Verify: `npx vitest run tests/integration/reports.test.ts` passes
- [ ] 3.2 Add `src/app/admin/reports/actions.ts` (suspend, remove photo, resolve; each starts with `requireAdmin()` and calls slice 8's `suspendUser` / `removePhoto`) and extend `tests/integration/adminActions.test.ts` so a member and nobody are refused and nothing changes (design 7). Verify: that file passes
- [ ] 3.3 Replace the `/admin/reports` placeholder: open and resolved sections with the three forms per report, keeping `await requireAdmin()` as the first line. Verify: `npm run dev`; as the pretend admin the sample report shows with the three buttons, as a pretend member "page not found", signed out goes to `/signin`

## 4. Member buttons

- [ ] 4.1 Add `SafetyActions` and `src/app/people/[alias]/safetyActions.ts` (Server Actions: resolve the alias on the server, then call `blockUser` / `reportUser`): a "Block" button with a confirmation step, and a "Report" form with the reasons as radio buttons, plain-English problems shown. Add the one line to the profile page (design 4). Verify: in the browser, report a pretend person and see it in `/admin/reports`; block them and they are gone from `/graph`, `/people`, `/matches`
- [ ] 4.2 Show the same component in the message thread header (one line in slice 6's page). Verify: block from a thread, then the thread shows as closed and sending fails
- [ ] 4.3 **(human)** Tell the owners of #11 and #13 that one line was added to their pages (4.1, 4.2), and post on #17 that blocked people are hidden through `getHiddenUserIds` so join-up should use it for any new list. Verify: both comments exist

## 5. End-to-end checks and docs

- [ ] 5.1 Add `tests/e2e/safety.spec.ts` for the four success checks of #16 (block closes and hides; report needs a reason; admin sees and acts; member can't see the queue). Then run the full `npm test` and `npm run test:e2e` once, when Patrick says. Verify: both pass
- [ ] 5.2 Add a "Safety" section to `README.md` (what block and report do, that a block can't be undone, where the queue is, how to change the reasons list) and update `ARCHITECTURE.md` at archive time. Verify: every path and button name matches the code
- [ ] 5.3 Run the four success checks from #16 on the deployed preview and record the result under a "Checked" note at the top of this file. Verify: the note exists
