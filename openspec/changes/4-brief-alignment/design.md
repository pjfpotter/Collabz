# Design: Align the Collabz plan with the Bootcamp Connect brief (#4)

## Context

- See `proposal.md` (Why) for the motivation. The brief is `BRIEF.pdf` in the repo root.
- This change is stacked on `2-mvp-overview` (PR #3, not yet merged). References like **D3** mean decision 3 in `openspec/changes/2-mvp-overview/design.md`. **MB:n** means line *n* of `collabz-mvp-brief.md`. **P:n** means line *n* of the `2-mvp-overview` proposal.
- Where this design and `2-mvp-overview` disagree, **this design wins**. Decisions in `2-mvp-overview` that aren't mentioned here still stand: D1 (stack), D2 (vertical slices, each deployed), D5 (generated alias), D8 (everyone matches everyone), D9 (glitch match) and D10 (legal docs before first sign-up).
- The constraints are the same as `2-mvp-overview`: two beginners, real students' data, and a live test on one day. A new one: **the brief's weekly milestone is due today (Thursday 1 October 2026).**

## Goals / Non-Goals

**Goals:**
- Every **essential** brief item is in the MVP.
- Every suggested and stretch item is recorded with a clear MVP In or Later label.
- Each clash decision is recorded with its options and reasoning, so Tom can review it without having been in the conversation.
- A Thursday deliverable small enough to be built, tested *and deployed* in one session.

**Non-Goals:**
- Detailed specs per slice. Each slice's own change still writes those, as `2-mvp-overview` planned.
- Rewriting `2-mvp-overview`. It stays as the record of the original interview.

## Brief-alignment decisions

Each decision was put to Patrick as a separate question with 2–3 options and a recommendation, and he chose. They're recorded in the order asked.

### B1. Messaging: in-app conversations replace the email reveal
- **Brief:** Essential: "Messaging: private conversations between users."
- **Was:** in-app chat parked (P:30, MB:21). "Contact happens off-platform once revealed" (MB:128). D6: approval reveals signup emails.
- **Options:**
  - **(A) messaging only, drop the email reveal**: chosen.
  - (B) messaging plus the email reveal: more personal data exposed.
  - (C) keep the email reveal and argue it counts: leaves an essential item unmet.
- **Why A:** it meets the essential item and matches the brief's own suggested pattern ("a conversation only opens if both agree"). It also shares *less* personal data than the email reveal did.
- **Consequences:**
  - **Supersedes D6.**
  - "No free text" now applies only to onboarding and profiles. Messages are free text.
  - Messages refresh on page load. Real-time is a stretch goal.
  - The `2-mvp-overview` slice 6 open question ("what happens to an already-revealed email when someone blocks?") goes away, because blocking now closes the conversation.

### B2. Admin: lists move to the database, full admin screens with guard rails
- **Brief:** Essential: "Admin screens: manage categories, skills, interests, courses and users."
- **Was:** D3, tag lists as constants in code. D8, course fixed as Software or Business. Admin meant "Patrick and Tom, directly in the database".
- **Options:**
  - **(A) everything in the database, full admin screens**: chosen.
  - (B) a hybrid where the scoring lists stay in code: "manage categories" only half met.
  - (C) users-only admin: fails four of the five nouns.
- **Why A:** "Categories" maps cleanly onto our exercises (Hero Story, Energy…), so we can meet the brief word for word.
- **Guard rails that keep scoring stable:**
  - Tags are renamed or retired, never hard-deleted.
  - Ids never change.
  - The Seeking↔Quality pairing used for complement scoring becomes explicit data, chosen by the admin when adding a tag. Until now it was only implied by the tags' wording.
- **Consequences:** **Supersedes D3.** Adds a `User.role`. The first admins are set at deploy time (see Data shape).

### B3. Photo: optional, revealed only after an approved connection
- **Brief:** Essential: profiles include a "photo".
- **Was:** MB:103 "no upload… no professional headshots". P:32 silhouette only. D5 hides identity until both agree.
- **Options:**
  - (A) silhouette counts as the photo: risks failing the literal reading.
  - **(B) optional photo, revealed on approval**: chosen.
  - (C) required photo shown publicly: breaks "chemistry first" and D5.
- **Why B:** it meets the brief literally and keeps chemistry first. You choose someone by fit and see their face only once both of you have said yes, the same consent pattern as B1.
- **Consequences:**
  - New dependency: **private file storage**.
  - The graph and search still show silhouette and alias.
  - Photos are never used in scoring.
  - An admin can remove a photo.

### B4. Bio: generated from the person's tags
- **Brief:** Essential: profiles include a "bio".
- **Was:** MB:7 and MB:27, no free text ("never give them an empty box"). P:33, no free-text profile field.
- **Options:**
  - **(A) generated bio**: chosen.
  - (B) optional typed bio, private until connected.
  - (C) public typed bio.
- **Why A:** everyone gets a readable bio at no cost to them, and the product's distinctive "no empty box" rule survives.
- **Accepted risk:** an assessor may expect a bio the user wrote. A+B was offered as the safe combination and not taken.

### B5. Skills and Interests: two new pick-from-list categories, not scored
- **Brief:** Essential: profiles include "skills, interests". Admin manages "skills, interests".
- **Was:** Qualities (MB:71–83) describe behaviour, not skills. There was nothing like interests.
- **Options:**
  - **(A) new categories, not scored**: chosen.
  - (B) new categories that also feed the score.
  - (C) relabel Qualities as skills and Energy/Vibe as interests.
- **Why A:** it meets both nouns literally and gives search something concrete to filter on (software vs business skills is the brief's two-groups theme). The chemistry formula stays the one thing that decides matches.
- **Consequences:**
  - Onboarding goes from 5 exercises to 7.
  - Shared skills and interests appear in "why you match" for information only.
  - B could be added once there's real data.

### B6. Search: filters for exploring, the top 5 contact rule stays
- **Brief:** Essential: "find people by filters, a matching algorithm, **or both**. Show why two people might be a good fit."
- **Was:** no filters. Requests only to your own top 5 + glitch (MB:122, P:26), which after B1 also limits who you can message.
- **Options:**
  - **(A) filters for exploring, contact rule unchanged**: chosen.
  - (B) filters plus N free-choice requests.
  - (C) drop the limit entirely.
- **Why A:** "or both" means the algorithm already meets the item. A adds filters cheaply and keeps the scarcity and fairness rule that makes Collabz different. B is the natural follow-up if live-test users can't reach someone they found.
- **Consequences:** the "why you match" breakdown is shown for *any* pair, not only your top 5.

### B7. Account management: editable answers, rescored on save
- **Brief:** Essential: users "manage their account".
- **Was:** D7, profiles fixed after onboarding, manual reset only. D4 had already noted "re-scoring that one user covers it" if editing was added.
- **Options:**
  - (A) account page without editing.
  - **(B) account page with editing and rescore**: chosen.
  - (C) a one-time "redo onboarding".
- **Why B:** D4 already planned for it, and the scoring function scores one user anyway, so the extra cost is mostly reusing the onboarding screens.
- **Consequences:**
  - **Supersedes D7. Amends D4:** scoring now runs on completion *and on every saved edit*, deleting and recalculating only that user's edges.
  - The alias, existing connections and conversations, and the glitch match don't change on edit.
  - The graph is no longer frozen during the live test (see Risks).

### B8. Thursday milestone: a new slice 0 walking skeleton
- **Brief:** due this week: "Specification, architecture written and first feature started and implemented, tested (we do together on Thursday)."
- **Was:** six slices over 4 weeks. Slice 1 = app + Neon + magic link + email service (not yet chosen) + legal pages + QR, which is too big for one session. `ARCHITECTURE.md` was only to be written after PR #3 merged.
- **Options:**
  - **(A) slice 0 skeleton, auth moves to slice 1**: chosen.
  - (B) start slice 1 as it is: likely "started" but not "implemented, tested".
  - (C) scoring logic as a pure function with tests: tested, but nothing deployed or visible.
- **Why A:** it's the smallest change that makes Thursday achievable, and it removes our biggest unknown early: the stack has never run on Vercel and Neon.
- **Consequences:** the slice 0 feature is the `tag-catalogue` capability (see D-new-1). `ARCHITECTURE.md` is filled in by this change.

### B9. Process: this change is stacked on PR #3, under a new ticket
- **Options:**
  - **(A) stacked on PR #3**: chosen.
  - (B) fold into PR #3 with `/opsx:update`: edits the original proposal in place.
  - (C) a standalone branch off master: references decisions that aren't on master, with merge conflicts.
- **Why A:** PR #3's original interview reasoning stays intact as evidence, and Tom gets one document saying what the brief changed and why.
- **Consequences:**
  - New issue **#4** and branch `feature/4-brief-alignment`, which is `feature/2-mvp-overview` plus a merge of `master` to bring in the PR #1 docs.
  - **Merge PR #3 first**, then open this PR against `master`.

### B10. Moderation queue: in the MVP
- **Brief:** Suggested: "Safety tools: block and report users, plus an admin moderation queue."
- **Was:** MB:133, "no moderation queue needed for MVP".
- **Decision:** in the MVP. Once the admin slice exists (B2) it's a small addition: a list of reports with suspend, remove-photo and resolve actions. MB:133 no longer applies.

### B11. Privacy settings: recorded, not in the MVP
- **Brief:** Suggested: "control who can see your profile or contact you."
- **Was:** "Every user can see the full graph" (MB:121, P:25).
- **Decision:** Suggested, MVP Later.
- **Why:** aliases, photos revealed only on approval, and the top 5 contact limit already give privacy by default. A "hide me" setting would break the full-graph design. Whichever change picks it up must reconcile it with the full graph.

### Small adjustment that isn't a clash: course chosen at sign-up
The brief says users "sign up, choose which course they're on". P:22 put course in onboarding. Course now moves to sign-up (`user-auth`). This changes nothing else, because course still isn't used in scoring (D8).

## Design decisions that follow from the above

### D-new-1. The Thursday feature is the tag catalogue
- Slice 0 is the Next.js app deployed on Vercel and connected to Neon through Prisma, plus the `tag-catalogue` capability:
  - `Category`, `Tag` and `Course` tables
  - an idempotent seed from `collabz-mvp-brief.md`
  - a public read-only page listing them
  - automated tests for the seed and the page
- **Why this feature:**
  - It goes through every layer (page → server → Prisma → Neon) on the real deploy target.
  - It holds no personal data, so it doesn't need the legal pages or auth first.
  - It's the base that B2 (admin) and B5 (onboarding) build on, so none of it is throwaway.
  - Anyone can check it by opening the URL.
- The Skills and Interests lists aren't written yet, so slice 0 seeds the 5 existing categories and the 2 courses only.

### D-new-2. Data shape (amends D3's sketch)
```
User               id, email, role (member/admin), course, suspendedAt, acceptedTermsAt
Category           id, key, name, pickMin, pickMax, order, retiredAt
Tag                id, categoryId, name, description, order, retiredAt
TagPairing         seekingTagId, qualityTagId          (explicit complement pairs, B2)
Course             id, name, order, retiredAt
Profile            userId, silhouette, alias, photoKey?, completedAt
ProfileTag         userId, tagId                        (replaces the per-category columns)
Edge, GlitchMatch  unchanged from D3
ConnectionRequest  unchanged from D3; approval creates a Conversation
Conversation       id, userAId, userBId, createdAt, closedAt?
Message            id, conversationId, senderId, body, createdAt
Block              unchanged from D3
Report             unchanged from D3, plus status (open/resolved), resolvedBy
```
- **One `ProfileTag` join table instead of a column per category.** *Why:* categories can now be added by admin (B2), so the shape can't hard-code them.
- **The first admins come from an `ADMIN_EMAILS` environment variable**, applied when those users sign up. *Why:* no admin screen can exist before the first admin does, and keeping it out of the code means no one's email is committed to the repo.
- **The generated bio is computed when displayed, not stored.** *Why:* it's derived from tags, so storing it would only risk it going stale.

### D-new-3. Photos sit in private storage and are served through a permission check
- The photo file goes into private file storage (proposed: Vercel Blob; the slice confirms it). The app serves it through a route that checks the viewer is the owner, a connected user, or an admin.
- *Why:* B3 promises that strangers can't see photos. A public storage URL would break that promise for anyone who obtained the link.
- *Alternative:* Neon's storage. Considered but not chosen, because Vercel Blob is the better-documented option with Next.js.

### D-new-4. Revised slice plan (replaces `2-mvp-overview` tasks 2.1–2.7)
| Slice | Capability | What's in it |
|---|---|---|
| **0** | `tag-catalogue` | Deployed skeleton plus the catalogue. **Thursday 1 Oct** |
| 1 | `user-auth` | Magic link, course at sign-up, T&C and data policy (covering photos and messages), QR code |
| 2 | `profile-onboarding` | 7 exercises, silhouette, alias, generated bio |
| 3 | `chemistry-matching` | Scoring with explicit pairings, top 5, glitch, rescore function, "why you match" |
| 4 | `collab-graph` + `people-search` | Full graph (as in `2-mvp-overview`), filters, profile view |
| 5 | `connection-requests` | Request, notify, approve or decline, opens a conversation |
| 6 | `messaging` | Conversations, refresh-based |
| 7 | `account-management` | Account page, edit and rescore, photo upload |
| 8 | `admin` | Role, categories, tags, pairings, courses, users |
| 9 | `safety` | Report, block, moderation queue |

- **Why this order:** each slice needs data from the ones before it, as in D2. Admin (8) comes after the user-facing core because seed data covers lists until then. Safety (9) needs admin for the moderation queue.
- **Cut line:** if time runs short, cut from the bottom of the *Suggested* items first, never an Essential one.

## Risks / Trade-offs

- **[MVP scope has roughly doubled (6 → 10 slices) in the same 4 weeks]** → Slice 0 is done today. Every slice stays small and vertical. Everything labelled MVP Later stays out unless a slice finishes early. If we fall behind, raise it with Tom and course staff rather than quietly cutting an Essential item.
- **[Editing answers mid live-test changes other people's top 5 while they're looking]** → An accepted trade-off of B7. Existing connections and conversations are never affected. A frozen-edits mode on the day can be added if needed.
- **[Admin edits to the pairings change future scores but not stored ones]** → Pairing changes apply only to scores calculated afterwards. The admin slice decides whether to offer a "rescore everyone" button. At cohort size this is cheap.
- **[Free-text messages need moderation]** → Report reasons include message abuse, B10 puts a moderation queue in the MVP, and blocking closes the conversation.
- **[A generated bio may not satisfy an assessor's reading of "bio"]** → Accepted under B4. The fallback (optional typed bio, private until connected) is small to add later.
- **[Photos are new personal data]** → Private storage (D-new-3). An admin can remove a photo. The data policy covers photos, and deletion removes the file.

## Migration Plan

Not applicable. Nothing is built yet. After this change and PR #3 merge, the slice issues are created from D-new-4 instead of `2-mvp-overview` tasks 2.1–2.7.

## Open Questions

None of these change the approach or the task list. Each is settled in the named slice.

- **Slice 0:** the exact URL path of the catalogue page.
- **Slice 2:** the actual Skills and Interests tag lists. This is content, not a design decision.
- **Slice 3:** the explicit Seeking↔Quality pairings for the existing 12 + 12 tags. They're implied by the wording today, and Patrick and Tom should agree them once so they're written down.
- **Slice 5:** whether the new-request notification is also emailed. This is carried over from `2-mvp-overview`.
- **Slice 6:** a message length limit.
- **Slice 7:** the photo size limit and file types.
- **Slice 9:** the list of report reasons.
- **Mobile-friendly** (stretch in the brief) is labelled MVP Later here because Patrick didn't decide it. But the live test runs from a QR code on phones (`2-mvp-overview` Context), so in practice every slice should at least work on a phone. **Tom and Patrick should confirm this.**
- Which other *Suggested* items, if any, enter the MVP: favourites, match and message notifications, events, the ideas board, dashboard stats, deletion and export. They're all labelled Later for now.
