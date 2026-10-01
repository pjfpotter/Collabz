# Proposal: Align the Collabz plan with the Bootcamp Connect brief (#4)

## Why

The official course brief arrived on Thursday 1 October 2026 (`BRIEF.pdf`, "Bootcamp Connect", TechNative Digital). Our MVP plan (`2-mvp-overview`, PR #3) was written before it, from our own discovery interview (`collabz-mvp-brief.md`). A gap analysis found that the plan leaves out or contradicts several **essential** brief items: messaging, admin screens, profile photo, bio, skills and interests, and account management. The plan also has no deliverable for this week's milestone ("specification, architecture written and first feature started and implemented, tested"). The brief allows flexibility "provided the essential items are covered", so the plan has to change before any slice is built.

This change is **stacked on PR #3**. It doesn't edit `2-mvp-overview`. Instead it records which of that change's decisions it supersedes and why (see `design.md`).

## What Changes

- **In-app messaging replaces the email reveal.** An approved connection opens a private conversation. Signup emails are never shown to other users. **BREAKING** (to the plan): supersedes `2-mvp-overview` D6.
- **Tag lists, categories and courses move from code into the database**, managed through new **admin screens** (categories, tags, courses, users) with a **moderation queue** for reports. **BREAKING**: supersedes D3. Removes the MB:133 "no moderation queue" line.
- **Optional real photo**, visible only to people you have an approved connection with. The graph still shows the picked silhouette. This adds file storage as a dependency.
- **Generated bio**: a readable paragraph built from the person's own tags. Still no free text in onboarding or on profiles.
- **Two new pick-from-list categories, Skills and Interests** (up to 4 each). They're shown on profiles and used as search filters, but they're **not used in scoring**.
- **Search filters** (course, skill, interest) and a **"why you match" breakdown** for any pair. The top 5 + glitch contact rule is unchanged.
- **Account page** with sign-out, change course, photo, and **editing onboarding answers**, which rescores that user. **BREAKING**: supersedes D7. Amends D4.
- **Course is chosen at sign-up**, as the brief words it, rather than during onboarding.
- **New slice 0 "walking skeleton"** for this week's milestone: the app deployed with one small feature built and tested. Auth and the legal pages move to slice 1.
- **`ARCHITECTURE.md` filled in** now, instead of after PR #3 merges.
- Every other brief item (suggested and stretch) is recorded as a labelled requirement so nothing is silently dropped.

### Decisions made during this proposal (interview record)

Each was asked of Patrick one at a time, with options. The full reasoning is in `design.md` § Brief-alignment decisions.

| # | Clash | Decision |
|---|---|---|
| B1 | Messaging (essential) vs "no in-app chat" | In-app messaging after an approved connection. Drop the email reveal |
| B2 | Admin screens (essential) vs tag lists in code | Lists in the database. Full admin screens with guard rails (rename and retire only, explicit Seeking↔Quality pairing) |
| B3 | Photo (essential) vs silhouette only | Optional photo, revealed only after an approved connection |
| B4 | Bio (essential) vs no free text | Generated bio from tags. No typed text |
| B5 | Skills and interests (essential) vs personality-only tags | New Skills and Interests categories, not in scoring |
| B6 | Search filters vs top 5 contact rule | Filters for exploring. The top 5 + glitch contact rule stays |
| B7 | Manage account (essential) vs fixed profiles | Account page with editable answers. Rescore on edit |
| B8 | Thursday milestone vs 4-week slice plan | Slice 0 walking skeleton today. Auth moves to slice 1 |
| B9 | Where this change lives | Stacked on PR #3, new ticket #4 |
| B10 | Moderation queue (suggested) | In the MVP |
| B11 | Privacy settings (suggested) | Suggested, not in the MVP |

## Capabilities

Every requirement carries a label line: **Brief** (Essential / Suggested / Stretch / Supporting), **MVP** (In / Later), and **Thursday** (In / Out). "Supporting" means the brief doesn't name it, but an essential item depends on it.

These specs set the **brief-level contract** for each capability. Each slice's own change adds detail to its capability as MODIFIED or ADDED requirements, as `2-mvp-overview` planned.

### New Capabilities

- `tag-catalogue`: categories, tags and courses stored as data, seeded, and listed on a public read-only page *(slice 0, the Thursday feature)*
- `user-auth`: sign-up with course choice, sign-in and sign-out *(slice 1)*
- `profile-onboarding`: the seven pick-from-list exercises, silhouette, alias and generated bio *(slice 2)*
- `chemistry-matching`: scoring, top 5, glitch, rescoring on edit, and "why you match" *(slice 3)*
- `people-search`: filters, viewing any profile, and favourites (later) *(slice 4, with the graph)*
- `connection-requests`: request, approve, which opens a conversation and reveals the photo *(slice 5)*
- `messaging`: private conversations between connected users *(slice 6)*
- `account-management`: account page, editing answers, photo, and privacy and GDPR items (later) *(slice 7)*
- `admin`: admin role, managing categories, tags, courses and users, and dashboard stats (later) *(slice 8)*
- `safety`: report, block, moderation queue *(slice 9)*
- `community-boards`: events and the project ideas board, both recorded as Suggested / MVP Later *(no slice yet)*

### Modified Capabilities

None. `openspec/specs/` is empty.

`collab-graph` (slice 4) isn't affected by the brief and keeps the scope set in `2-mvp-overview`.

## Impact

- **Code:** none in this change.
- **Plan:** supersedes `2-mvp-overview` decisions D3, D6 and D7, amends D4, and replaces its slice list (tasks 2.1–2.7) with the 10-slice plan in `design.md`. Roughly doubles MVP scope; see Risks.
- **New dependency (proposed, confirmed in its slice):** file storage for photos (e.g. Vercel Blob). It's private, so photos are served only through a check that the viewer is connected to the owner.
- **Data / legal:** we hold photos and message text, but no longer show emails to other users. The data policy (slice 1) must cover photos and messages.
- **Docs:** `ARCHITECTURE.md` filled in from both changes.

## Success check (this change)

Tom can read this change and explain, for every brief item, whether it's in the MVP and why. `openspec validate 4-brief-alignment` passes.
