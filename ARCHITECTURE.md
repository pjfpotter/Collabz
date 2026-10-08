# Architecture

A plain-English overview of how this system fits together — for us, not for the spec. Detailed, capability-by-capability specs live in `openspec/specs/`; this is the "explain it to a beginner" summary.

Update this as the last step whenever `/opsx:archive-change` lands a change that alters the shape of the system (new component, changed data flow, new dependency, new integration). Skip it if the change was purely internal with no structural effect.

## What this app does

Collabz is our version of the course brief "Bootcamp Connect". It matches software-course and business-course students by **chemistry**, not CVs. People build a profile by picking tags from fixed lists, the app scores every pair, and everyone sees the whole cohort as a live graph. Two people who both agree to connect get a private conversation.

> **Status (8 Oct 2026):** slice 0 is built and live: the app runs on Vercel, talks to Neon through Prisma, and shows the tag catalogue at `/catalogue`. Everything else below is still planned. The next piece is the foundation slice (#7), which every other track builds on (slice map: issue #18). The per-capability specs are in `openspec/specs/`. The reasoning behind them is `openspec/changes/archive/2026-10-01-2-mvp-overview/` as amended by `openspec/changes/archive/2026-10-01-4-brief-alignment/`. Where the two disagree, #4 wins.

## The pieces

**Built (slice 0):**

- **Next.js app (on Vercel)**: the screens *and* the server code, in one codebase with one deploy. `master` deploys to production, and every pull request gets its own preview URL.
- **Neon Postgres, through Prisma**: all data. `schema.prisma` is the one readable file describing it. The tag lists, categories and courses live here too, not in code, so admins can manage them. So far it has three tables: `Category`, `Tag` and `Course`.
- **Two Neon branches**: `production` holds the live data and is only used by the production deploy. `dev` is used by everything else: our laptops, preview deploys and the tests.
- **A seed** (`prisma/seed.ts`): fills the catalogue tables from `prisma/seed-data.ts`. It runs on every deploy and only adds rows that are missing.
- **Tests**: Vitest checks the seed and the catalogue query, and Playwright checks the page in a real browser. Both run against the real `dev` database, not a fake one.

**Planned:**

- **Auth.js with email magic links**: sign-in without passwords. Needs an email-sending service (chosen in slice 1).
- **Private file storage (proposed: Vercel Blob)**: optional profile photos. Photos are only served through the app, after a permission check.
- **`react-force-graph`**: draws the cohort graph in the browser.

## How a request flows through the system

**Viewing the catalogue (built):** browser opens `/catalogue` → Vercel runs the page on the server → the page calls `getCatalogue()` in `src/lib/catalogue.ts` → Prisma asks Neon for the categories and tags that aren't retired, in display order → the server sends back finished HTML. There is no API route in between, because the browser isn't sending anything.

**Deploying (built):** a push to GitHub starts a Vercel build → the build updates the database tables (`prisma migrate deploy`), runs the seed, then builds the app. If the database can't be reached the build fails and the previous version stays live.

The flows below are planned, not built yet.

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
- **Catalogue rows have readable ids set by the seed** (e.g. `energy-sea-captain`): the same ids exist on dev and production, and you can tell what a row is by reading its id.
- **The seed only adds missing rows and never overwrites:** a name changed in the database survives every re-seed, which is what makes it safe to seed on every deploy.
- **Rows are retired, never deleted** (`retiredAt`): anything pointing at a tag, like a stored score later on, keeps pointing at a real row.
- **The catalogue page is rendered on every request:** otherwise Next.js would build it once and a renamed tag would never show up.
- **Tests use a real database, not a mock:** proving Prisma and Neon work together was the point of slice 0, and a mock would hide exactly those problems.
- **Prisma is pinned to 7.10:** npm's "latest" was an 8.0 release candidate, and we don't want to debug pre-release software.

Full reasoning: `openspec/changes/archive/2026-10-01-2-mvp-overview/design.md` and `openspec/changes/archive/2026-10-01-4-brief-alignment/design.md`. For slice 0: `openspec/changes/archive/2026-10-08-6-tag-catalogue/design.md`.

## Open questions / known gaps

- Only slice 0 is built. There are no users, no sign-in and no pages other than `/` and `/catalogue` yet.
- Tests empty the tables on the shared `dev` database, so two people running tests at the same moment can trip each other up.
- Email-sending service for magic links: not chosen (slice 1).
- File storage provider: proposed, confirmed in slice 7.
- Messages refresh on page load. Real-time chat is a stretch goal.
- The full list of open questions per slice is in `openspec/changes/archive/2026-10-01-4-brief-alignment/design.md` § Open Questions.
