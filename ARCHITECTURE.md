# Architecture

A plain-English overview of how this system fits together — for us, not for the spec. Detailed, capability-by-capability specs live in `openspec/specs/`; this is the "explain it to a beginner" summary.

Update this as the last step whenever `/opsx:archive-change` lands a change that alters the shape of the system (new component, changed data flow, new dependency, new integration). Skip it if the change was purely internal with no structural effect.

## What this app does

Collabz is our version of the course brief "Bootcamp Connect". It matches software-course and business-course students by **chemistry**, not CVs. People build a profile by picking tags from fixed lists, the app scores every pair, and everyone sees the whole cohort as a live graph. Two people who both agree to connect get a private conversation.

> **Status (1 Oct 2026):** planned, nothing built yet. The plan is `openspec/changes/2-mvp-overview/` as amended by `openspec/changes/4-brief-alignment/`. Where the two disagree, #4 wins.

## The pieces

- **Next.js app (on Vercel)**: the screens *and* the server code (API routes), in one codebase with one deploy.
- **Neon Postgres, through Prisma**: all data. `schema.prisma` is the one readable file describing it. The tag lists, categories and courses live here too, not in code, so admins can manage them.
- **Auth.js with email magic links**: sign-in without passwords. Needs an email-sending service (chosen in slice 1).
- **Private file storage (proposed: Vercel Blob)**: optional profile photos. Photos are only served through the app, after a permission check.
- **`react-force-graph`**: draws the cohort graph in the browser.

## How a request flows through the system

**Joining:** scan QR → sign up (email, course, accept terms) → magic link → onboarding (7 pick-from-list exercises) → the server scores the new user against everyone and stores the edges → graph.

**Editing answers:** account page → save → the server deletes and recalculates *only that user's* edges. Nobody else's scores change.

**Connecting:** a user picks someone from their top 5 (or their glitch match) → sends a request → the other person approves → a conversation opens and each can see the other's photo (if any). Emails are never shown to other users.

**Seeing a photo:** browser asks the app for a photo → the app checks the viewer is the owner, a connected user or an admin → only then fetches it from private storage.

## Key decisions and why

- **Next.js with API routes, not a separate backend:** one codebase and one deploy for two beginners.
- **Magic links, no passwords:** we never store passwords, and it fits the QR-code sign-up.
- **Tags, categories and courses are database rows with fixed ids:** admins must manage them (brief), and fixed ids mean renaming a tag never changes a score.
- **Scores are stored, and recalculated only for the user who changed:** a pair's score depends only on those two profiles, so nothing else needs recalculating.
- **Seeking↔Quality pairings are stored data:** complement scoring depends on them, and admins can add tags.
- **Public identity is a generated alias plus a silhouette:** the graph is public, so real identity is shared only after both people agree.
- **In-app messaging instead of revealing emails:** it meets the brief's messaging requirement and hands out less personal data.
- **Photos in private storage behind a permission check:** a public file URL would let strangers see photos.
- **Everyone is scored against everyone; course is recorded but not used in scoring:** a team decision. Course drives filters and stats.
- **Build in deployed vertical slices, starting with a walking skeleton (slice 0):** proves the stack on real infrastructure first and meets the weekly milestone.

Full reasoning: `openspec/changes/2-mvp-overview/design.md` and `openspec/changes/4-brief-alignment/design.md`.

## Open questions / known gaps

- Nothing is built. Slice 0 (deployed skeleton + tag catalogue) is first.
- Email-sending service for magic links: not chosen (slice 1).
- File storage provider: proposed, confirmed in slice 7.
- Messages refresh on page load. Real-time chat is a stretch goal.
- The full list of open questions per slice is in `openspec/changes/4-brief-alignment/design.md` § Open Questions.
