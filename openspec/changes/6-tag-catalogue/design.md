# Design: Slice 0, walking skeleton + tag catalogue (#6)

## Context

- The repo has no app code yet, only docs, `openspec/` and `.claude/`. See `proposal.md` (Why) for the motivation.
- The stack was fixed in `2-mvp-overview` D1: Next.js App Router, Neon Postgres through Prisma, Vercel. The data shape for these three tables comes from `4-brief-alignment` D-new-2, adjusted below.
- The requirements are in `specs/tag-catalogue/spec.md` (this change's delta on `openspec/specs/tag-catalogue/spec.md`).
- Versions checked on 1 Oct 2026: Next.js 16.3, Tailwind 4.3, Vitest 5.0, Playwright 1.63, Prisma 7.10 (stable) / 8.0 (release candidate only).
- Two beginners will read this code, so every non-obvious line gets a comment explaining *why*.

## Goals / Non-Goals

**Goals:**
- One request travels the whole stack on the real deploy target: browser → Vercel → Next.js server → Prisma → Neon.
- A repeatable setup: either of us can clone, add a `.env`, and run the app and all tests.
- Tables that later slices extend, not replace.

**Non-Goals:**
- Any visual design beyond tidy, readable, phone-friendly lists.
- API routes. Nothing in this slice needs the browser to send data to the server.
- Neon's per-preview database branches (the Vercel integration). One shared `dev` branch is enough for two people.

## Decisions

### 1. Scaffold with `create-next-app` in a temporary folder, then move it in
Options: TypeScript, ESLint, Tailwind, App Router, `src/` folder, `@/*` import alias.
- *Why a temporary folder:* `create-next-app` refuses to run in a folder that already has files like `README.md`, `CLAUDE.md` and `openspec/`. Generating elsewhere and moving the files in keeps our docs untouched.
- *Why `src/`:* it keeps app code apart from the docs and `openspec/` at the root, so the folder list stays readable.

### 2. The page reads the database directly in a Server Component, through one function
`src/app/catalogue/page.tsx` calls `getCatalogue()` from `src/lib/catalogue.ts`, which asks Prisma for the categories and tags that aren't retired, in display order.
- *Why no API route:* a Server Component already runs on the server, so it can query the database and send finished HTML. An API route would add a second hop and some browser JavaScript for no gain. API routes arrive in slice 1, when the browser first needs to *send* something.
- *Why one named function:* the page stays simple, and Vitest can test the query (ordering, hiding retired rows) without a browser.

### 3. The page is rendered on every request
`page.tsx` sets `export const dynamic = "force-dynamic"`.
- *Why:* by default Next.js builds a page with no request-specific input **once, at build time**, and serves that copy forever. A tag renamed in the database would then never show up, which breaks the "Catalogue reflects the database" scenario. At this size, querying on each visit costs a few milliseconds.
- *Alternative:* time-based revalidation (`revalidate = 60`). Cheaper, but the page would be up to a minute stale and tests would have to wait. We can add caching later if it's ever needed.

### 4. Data model: readable string ids, `retiredAt` instead of deleting
```
Category  id (e.g. "energy"), name, pickMin, pickMax, order, retiredAt?
Tag       id (e.g. "energy-sea-captain"), categoryId → Category, name, description, order, retiredAt?
Course    id (e.g. "software"), name, order, retiredAt?
```
- *Why string ids set by the seed (Patrick's choice):* the same ids exist on dev and production, and anyone reading the database or a test can tell what `energy-sea-captain` is. An id never changes, even if an admin later renames the tag.
- *Change from #4's sketch:* `Category.key` is dropped, because a readable id does the same job and two columns would only be a chance to disagree.
- *Why `pickMin`/`pickMax` now:* the brief already says "pick 1" or "pick up to 4" for each category, and onboarding (slice 2) needs it. The page doesn't show these values yet.
- *Why `retiredAt` now:* B2 says tags are retired, never deleted, so stored scores keep pointing at real rows. Adding the column now saves a migration later.

### 5. Seed: the data lives in a seed file, and only missing rows are added
- **`prisma/seed-data.ts`** holds the lists copied from `collabz-mvp-brief.md`. **`prisma/seed.ts`** exports `seedCatalogue(prisma)` and inserts with `createMany({ skipDuplicates: true })`. That inserts rows whose id isn't in the table yet and quietly skips the rest.
- *Why this isn't "hard-coding in application code":* the app never imports `seed-data.ts`. It's only the starting input for the database, which stays the single place the app reads from.
- *Why only add missing rows (Patrick's choice):* renames made in the database (and later by admins, slice 8) survive every re-seed. That makes it safe to seed on every deploy (decision 7).
- *Why an exported function:* tests call `seedCatalogue()` directly against the test database, rather than running a command.

### 6. Prisma 7.10 with Neon's driver adapter
- **Version:** pin `prisma` and `@prisma/client` to `7.10.x`. *Why:* npm's `latest` tag for Prisma currently points at `8.0.0-rc.19`, which is a release candidate. We don't want to debug pre-release software as beginners.
- **Driver:** use the `@prisma/adapter-neon` driver adapter. Configuration goes in `prisma.config.ts`, as Prisma 7 expects.
- **Two connection strings:**
  - `DATABASE_URL` (Neon's *pooled* connection) is what the app uses.
  - `DIRECT_URL` (unpooled) is for migrations. *Why:* Vercel can start many short-lived server instances, and the pooler stops them running out of database connections. Migrations need a direct connection.
- **One shared client:** `src/lib/db.ts` exports a single Prisma client. *Why:* in development Next.js reloads code often, and a new client per reload would open connections until Neon refuses more.
- **Generated client is not committed:** it goes to `src/generated/prisma`, which is gitignored and rebuilt by `prisma generate` on install and build.

### 7. Environments: Neon `production` for production, `dev` for everything else
| Where | Database URL points at |
|---|---|
| Vercel Production (deploys from `master`) | Neon `production` branch |
| Vercel Preview (one per PR) | Neon `dev` branch |
| Local `npm run dev` | Neon `dev` branch (`.env`) |
| Tests | Neon `dev` branch (`TEST_DATABASE_URL`) |

- **Region:** the Neon project goes in AWS `eu-west-2` (London), and Vercel functions run in `lhr1` (London). *Why:* the server and database sit next to each other and near the users.
- **Build command:** `prisma migrate deploy && prisma db seed && next build`. *Why:* every deploy brings its own database up to date. Nobody has to remember a manual step, and seeding is safe to repeat (decision 5). If the database is unreachable, the build fails and the previous deploy stays live, which is better than deploying a broken page.
- **Secrets:** they live only in `.env` (gitignored) and in Vercel's environment settings. A committed `.env.example` lists the variable names with no values.

### 8. Tests run against a real database, never a mock
- **Vitest** (`tests/unit/`, `tests/integration/`):
  - Seed tests: a fresh seed gives 5 categories × 12 tags in the brief's order with descriptions plus 2 courses; a second run duplicates nothing and changes no ids; a rename survives a re-seed.
  - `getCatalogue()` tests: display order, and retired rows are hidden.
- **Playwright** (`tests/e2e/`):
  - Starts `next dev` against the test database, opens `/catalogue`, and checks the headings and tags appear in order.
  - Renames a tag in the database, reloads, sees the new name, then puts it back.
  - Retires a tag, reloads, checks it's gone, then un-retires it.
  - If `BASE_URL` is set, the read-only check runs against that URL instead (e.g. the Vercel deploy), and the tests that change data are skipped.
- *Why a real database:* proving that Prisma and Neon work together is the point of this slice. A mock would hide exactly the problems we want to find.
- *Why a separate `TEST_DATABASE_URL`, and fail if it's missing:* tests empty the tables. Reading a variable used only by tests means they can never pick up the production URL by accident.
- *Why tests run one file at a time:* they share one database, so two files resetting it at once would interfere with each other.

### 9. Vercel deploys from GitHub
Import the repo in Vercel's dashboard. `master` deploys to production, and each PR gets a preview URL.
- *Why:* no deploy tokens on our laptops. Tom can review a working preview from the PR link without a Vercel account (proposal: no collaborators).

### 10. Styling: Tailwind, single column, phone-first
- *Why:* Tailwind is the default and needs no setup (Patrick's choice). The live test runs on phones from a QR code, so the layout is designed for a narrow screen first.

## Risks / Trade-offs

- **[Prisma 7 and Next.js 16 are newer than most tutorials online]** → Comments link the official docs for anything version-specific (adapter setup, `prisma.config.ts`). If an online example doesn't match, trust the official docs.
- **[Tests empty the `dev` branch's tables]** → Fine: `dev` only holds seed data, and the tests re-seed when they finish. If we later want dev data to survive, we can add a third Neon branch just for tests (a one-line change to `TEST_DATABASE_URL`).
- **[Preview deploys run migrations against `dev`]** → That's where we want migrations tried first. Two PRs with conflicting migrations could clash on `dev`, but with one slice building at a time this is unlikely. Neon can reset `dev` from `production` if it happens.
- **[Neon free tier suspends after inactivity]** → The first request after a quiet spell takes roughly a second longer. That's acceptable for now. Check before the live test.
- **[Seed-on-build means a seed bug blocks deploys]** → Vitest seed tests run before any PR is merged.

## Migration Plan

1. Create the Neon project (London) with a `dev` branch alongside `production`, and copy the pooled and direct URLs.
2. Create the first Prisma migration locally against `dev`.
3. Import the repo into Vercel, set Production and Preview environment variables, and set the build command and region.
4. Merging the PR deploys production. The build migrates and seeds `production`.

**Rollback:** use Vercel's "Instant Rollback" to the previous deploy. The migration only *adds* tables, so leaving them in place harms nothing.
