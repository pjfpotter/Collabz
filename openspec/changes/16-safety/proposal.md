# Proposal: Slice 9, safety (#16)

## Why

Messages between connected students are free text, the only free text in Collabz. Before the live test, a student must be able to shut out someone who makes them uncomfortable, tell an admin about it, and admins must have one place to act on those reports. The `Block` and `Report` tables, the pretend cohort's sample blocks and reports, and the `/admin/reports` placeholder already exist from the foundation (#7); nothing lets anyone create or act on them yet.

## What Changes

- **Block:** a signed-in member can block another person from that person's profile. The pair can no longer request or message each other, their conversation closes for good (via `closeConversation()`), and each vanishes from the other's graph, list, matches and requests.
- **Report:** a member can report another person, choosing one reason from a fixed list. It lands in the admin queue as OPEN.
- **Moderation queue at `/admin/reports`:** admins see open and resolved reports (reporter, reported person, reason, date). From a report they can suspend the reported user, remove their photo, or mark it resolved.
- **Not changed:** `schema.prisma` (the tables already fit), matching and scoring, the account and photo code, other tracks' pages beyond one small component each (see design 4).

## Capabilities

### New Capabilities
<!-- None: the safety capability already exists in openspec/specs/safety. -->

### Modified Capabilities
- `safety`: the three existing requirements get sharper scenarios (blocked people disappear from each other's lists; a report needs a reason from the list; only admins reach the queue). No requirement is added, and MVP-Later items stay out.

## Impact

- New: `src/lib/safety/` (block, report, reasons list, hiding rule), `/admin/reports` page and actions, two small Server Actions for members.
- Touched lightly: the profile page (`src/app/people/[alias]/`) gains a block/report component; the graph, people list and matches read one extra "hidden people" list.
- Tests: integration tests for each rule, plus an end-to-end spec for the issue's four success checks.
