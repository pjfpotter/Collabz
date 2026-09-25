# Proposal: Collabz MVP overview (#2)

## Why

Collabz is a chemistry-based collaboration-matching app: students build a profile purely by picking evocative tags from fixed lists, get scored against everyone else, and see the whole cohort as a live force-directed graph. We have four weeks to run a live test with real software-course and business-course students, and the full MVP is too big to approve and build as one change. This overview agrees the scope, the cross-cutting decisions and the order of work once, so each slice after it can be specced, approved and built on its own.

Source material: [`collabz-mvp-brief.md`](../../../collabz-mvp-brief.md) (discovery interview output, committed alongside this change).

## What Changes

This change adds **no code and no specs**. It adds:

- The MVP brief to the repo as evidence of the discovery interview.
- This proposal, fixing MVP scope (in / out) and the demo-day success check.
- `design.md` — the decisions every slice depends on (stack, data shape, scoring, identity on the graph, what "contact details" means) plus the open questions to settle in review.
- `tasks.md` — the six slices, in build order, each of which becomes its own ticket → branch → OpenSpec change → PR.

### MVP scope

**In:**
- Magic-link sign-up reached via a QR code, with Terms & Conditions and a data policy accepted at sign-up
- Onboarding: 5 pick-from-list exercises (Hero Story, Energy, Vibe Diagnosis, up to 4 Qualities, up to 4 Seeking), a picked silhouette avatar, and a course picked from a list — no free text anywhere
- Pairwise chemistry scoring between all profiles, computed server-side and stored
- One random "glitch" match per user, shown differently on the graph
- A full, visible, force-directed graph of every user and every edge
- Connection flow: request → in-app notification → approve → both signup emails revealed
- Report and block (minimum viable, no moderation queue)

**Out (parked):**
- In-app chat
- Project nodes (phase-two idea)
- Any avatar builder beyond picking a silhouette
- Any free-text profile field, including names

### Decisions made during proposal (interview record)

These were asked of Patrick while drafting, because the brief left them open:

| Question | Answer |
|---|---|
| One big change, or split into slices? | Split: this overview, then one change per slice |
| What "contact details" are revealed on approval? | The signup email only — nothing extra is collected |
| How are people identified on the public graph? | A generated alias built from their tags — no typed name |
| Does course (software / business) restrict matching? | No — everyone is scored against everyone. Course is still recorded |

## Capabilities

### New Capabilities

None in this change (`skip_specs: true`). Each slice introduces its own capability spec:

- `user-auth` — magic-link sign-up/sign-in, T&C + data-policy acceptance *(slice 1)*
- `profile-onboarding` — the five exercises, silhouette, course, generated alias *(slice 2)*
- `chemistry-matching` — edge scoring, storage, top-5 ranking, glitch match *(slice 3)*
- `collab-graph` — the shared force-directed graph view *(slice 4)*
- `connection-requests` — request, notify, approve, contact reveal *(slice 5)*
- `safety` — report and block *(slice 6)*

### Modified Capabilities

None — `openspec/specs/` is empty; this is a greenfield project.

## Impact

- **Code:** none in this change. Slice 1 creates the Next.js app.
- **New dependencies (proposed, confirmed per slice):** Next.js, Prisma, Neon Postgres, Auth.js (email provider), `react-force-graph`, an email-sending service for magic links, Vercel hosting.
- **Data / legal:** real students' emails and profile data will be stored, so the T&C and data policy must exist before the first real sign-up (slice 1), not at the end.
- **Process:** once approved, this change's tasks create five more GitHub issues. Each slice is approved separately; approving this overview is not approval of any slice's detailed spec.

## Success check (demo day)

Students from both courses scan a QR code, sign up via magic link and complete onboarding. Each can view the full weighted graph, see their own top-5 contactable matches plus one glitch match, and successfully send at least one connection request.
