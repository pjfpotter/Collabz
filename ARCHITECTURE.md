# Architecture

A plain-English overview of how this system fits together — for us, not for the spec. Detailed, capability-by-capability specs live in `openspec/specs/`; this is the "explain it to a beginner" summary.

Update this as the last step whenever `/opsx:archive-change` lands a change that alters the shape of the system (new component, changed data flow, new dependency, new integration). Skip it if the change was purely internal with no structural effect.

## What this app does

Collabz is our version of the course brief "Bootcamp Connect". It matches software-course and business-course students by **chemistry**, not CVs. People build a profile by picking tags from fixed lists, the app scores every pair, and everyone sees the whole cohort as a live graph. Two people who both agree to connect get a private conversation.

> **Status (8 Oct 2026):** slice 0 and the foundation (#7) are built and live. The app runs on Vercel, talks to Neon through Prisma, and shows the tag catalogue at `/catalogue`. The foundation added every MVP database table, a placeholder page for every route, a cohort of pretend students and a dev-only way to act as any of them. No real feature (sign-up, onboarding, matching, graph, requests, messages) is built yet: the five tracks are building those in parallel on top of the foundation (slice map: issue #18). The per-capability specs are in `openspec/specs/`. The reasoning behind them is `openspec/changes/archive/2026-10-01-2-mvp-overview/` as amended by `openspec/changes/archive/2026-10-01-4-brief-alignment/`. Where the two disagree, #4 wins.

## The pieces

**Built (slice 0 and the foundation):**

- **Next.js app (on Vercel)**: the screens *and* the server code, in one codebase with one deploy. `master` deploys to production, and every pull request gets its own preview URL.
- **Neon Postgres, through Prisma**: all data. `schema.prisma` is the one readable file describing it. The tag lists, categories and courses live here too, not in code, so admins can manage them. It has all 17 MVP tables: the catalogue (`Category`, `Tag`, `Course`), people (`User`, `Profile`, `ProfileTag`), matching (`TagPairing`, `Edge`, `GlitchMatch`), connecting (`ConnectionRequest`, `Conversation`, `Message`), safety (`Block`, `Report`) and the three Auth.js sign-in tables. The foundation created them all in one go so that five tracks don't each change the database at once.
- **Two Neon branches**: `production` holds the live data and is only used by the production deploy. `dev` is used by everything else: our laptops, preview deploys and the tests.
- **A seed** (`prisma/seed.ts`): fills the catalogue tables from `prisma/seed-data.ts`. It runs on every deploy and only adds rows that are missing.
- **A page for every route, and one nav bar** (`src/components/NavBar.tsx`): every address in the route plan already exists as a placeholder saying which slice will build it. Each track replaces its own placeholders and leaves the rest alone.
- **The pretend cohort** (`npm run seed:fake`, built in `prisma/pretend-cohort.ts`): 32 pretend students on the `dev` database, 30 with finished profiles, scores, glitch matches, requests, conversations and messages. It lets every track build and test before real sign-up exists. It is the same on every machine, because the "random" choices are worked out from each user's id.
- **The dev switcher** (`src/components/DevUserSwitcher.tsx` and `/api/dev/sign-in-as`): a "Dev sign-in as" list in the nav bar that makes you any pretend student. It stands in for real sign-in until slice 1 lands.
- **The pretend cohort switch** (`src/lib/pretendCohort.ts`): the cohort and the switcher only exist where `PRETEND_COHORT` is set to `on`, and never on the production deploy, whatever is set there.
- **Shared helpers** (`src/lib/`): the only way one track reaches another track's feature. `getCurrentUser` and `requireAdmin` (who is using the app, and are they an admin), `scoreUser` (slice 3 fills it in), `openConversation` and `closeConversation`, and `orderUserPair`.
- **Tests**: Vitest checks the seeds, the database rules and the helpers, and Playwright checks the pages, the nav bar and the switcher in a real browser. Both run against the real `dev` database, not a fake one, and put the catalogue and the pretend cohort back when they finish.

**Planned:**

- **Auth.js with email magic links**: sign-in without passwords. Needs an email-sending service (chosen in slice 1).
- **Private file storage (proposed: Vercel Blob)**: optional profile photos. Photos are only served through the app, after a permission check.
- **`react-force-graph`**: draws the cohort graph in the browser.

## How a request flows through the system

**Viewing the catalogue (built):** browser opens `/catalogue` → Vercel runs the page on the server → the page calls `getCatalogue()` in `src/lib/catalogue.ts` → Prisma asks Neon for the categories and tags that aren't retired, in display order → the server sends back finished HTML. There is no API route in between, because the browser isn't sending anything.

**Deploying (built):** a push to GitHub starts a Vercel build → the build updates the database tables (`prisma migrate deploy`), runs the seed, then builds the app. If the database can't be reached the build fails and the previous version stays live.

**Acting as a pretend student (built, dev and previews only):** pick someone in the "Dev sign-in as" list and press Switch → the browser posts the form to `/api/dev/sign-in-as` → the server stores that user's id in a cookie the page's own scripts can't read, and sends the browser back to the page it was on → from then on `getCurrentUser()` reads the cookie and returns that user. On production the route answers "not found" and `getCurrentUser()` returns nobody.

**Opening an admin page (built):** the page calls `requireAdmin()` before anything else → nobody signed in: sent to `/signin` → signed in but not an admin: the standard "page not found" page, so a member can't even tell the page exists → an admin: the page renders.

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
- **All the tables were created up front, in one migration:** five people build at once, and separate migrations from separate tracks would collide. Schema changes after this are rare and announced first.
- **Pretend students instead of waiting for each other:** matching needs profiles and messaging needs connections, so without pretend data each slice would have to wait for the one before.
- **The pretend cohort is off unless switched on, and can't be switched on in production:** the switcher lets anyone become any user, including the admin, so forgetting a setting must leave it off, not on.
- **Pretend students live in their own seed file, behind their own command:** the catalogue seed runs on every deploy, including production, and pretend students must never get there.
- **A pair of users is stored once, lower id first** (`orderUserPair`): a score or a conversation belongs to the pair, and storing it once means there can never be two that disagree.
- **Tracks call each other only through the shared helpers:** when the real version of a helper lands, nobody else's code has to change.
- **A member who opens an admin page gets "page not found", not "access denied":** it gives nothing away, and Next.js's "forbidden" page is still experimental.

Full reasoning: `openspec/changes/archive/2026-10-01-2-mvp-overview/design.md` and `openspec/changes/archive/2026-10-01-4-brief-alignment/design.md`. For slice 0: `openspec/changes/archive/2026-10-08-6-tag-catalogue/design.md`. For the foundation: `openspec/changes/archive/2026-10-08-7-foundation/design.md`.

## Open questions / known gaps

- Only slice 0 and the foundation are built. There are no real users and no real sign-in, and every page except `/` and `/catalogue` is a placeholder.
- The pretend cohort, the dev switcher and their switch are temporary. Join-up (#17) deletes them once real sign-in and real profiles exist.
- `scoreUser` does nothing yet, and the Seeking↔Quality pairings table is empty. Slice 3 fills in both. The pretend students' scores are made-up numbers, not real calculations.
- Tests empty the tables on the shared `dev` database and refill them at the end. Two people running tests at the same moment can trip each other up, and anything changed by hand on `dev` is lost on the next test run.
- Still to be recorded on #7: Tom's check of the `User` and sign-in tables, and the team's agreement on who creates migrations.
- Email-sending service for magic links: not chosen (slice 1).
- File storage provider: proposed, confirmed in slice 7.
- Messages refresh on page load. Real-time chat is a stretch goal.
- The full list of open questions per slice is in `openspec/changes/archive/2026-10-01-4-brief-alignment/design.md` § Open Questions.
