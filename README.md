# Collabz

**Tinder for Business.**

Team coursework project (Wave 7 bootcamp) demonstrating a professional, human-directed agentic software development lifecycle — from feature idea through to a reviewed, deployed change.

This README covers what the project is and how to get it running locally. For the full team process — OpenSpec, GitHub Issues, branching, commit format, approvals — see [`WORKFLOW.md`](./WORKFLOW.md).

## What this is

A small web app built collaboratively, with every feature tracked through the same chain: ticket → spec → approval → build → review → merge → deploy. The point of the exercise is as much about the evidenced process as the product itself.

## Prerequisites

Check these are installed before you start:

```bash
node --version    # v20.19.0 or higher
npm --version
git --version
gh --version       # GitHub CLI, authenticated (gh auth status)
```

You'll also need:
- **Claude Code** (or your preferred coding agent), installed and signed in
- **OpenSpec CLI**, installed once per machine:
  ```bash
  npm install -g @fission-ai/openspec@latest
  openspec --version
  ```

## Getting set up

```bash
git clone https://github.com/pjfpotter/Collabz.git
cd Collabz
npm install
```

`npm install` also builds Prisma's database client into `src/generated/prisma` (the `postinstall` script runs `prisma generate`). That folder isn't committed, so if your editor complains it can't find `@/generated/prisma`, run `npm install` again.

`openspec/` and `.claude/` are already committed to this repo, so OpenSpec and Claude Code's slash commands (`/opsx:...`) should work as soon as you clone and restart your terminal/IDE.

### Connect to the database (`.env`)

The app reads its data from a Neon Postgres database, so it won't start without the connection details. These are secrets, so they live in a `.env` file on your machine that git ignores.

```bash
cp .env.example .env
```

Then fill in the three values in `.env`:

| Variable | What it is | Used by |
|---|---|---|
| `DATABASE_URL` | The **pooled** URL of the Neon `dev` branch (the host contains `-pooler`) | The running app |
| `DIRECT_URL` | The same URL with `-pooler` removed | Prisma migrations |
| `TEST_DATABASE_URL` | For now, the same value as `DATABASE_URL` | The tests |

The Neon project is on Patrick's account with no collaborators, so **ask Patrick for the `dev` branch URLs**. Pass them privately: never paste them into the repo, an issue, a PR or a group chat.

Only ever use the `dev` branch here, never `production`. The tests empty the catalogue tables, which is why they have their own variable and refuse to run without it.

You don't need to create any tables: the shared `dev` database already has them, with the catalogue seeded.

## Running locally

```bash
npm run dev
```

Then open <http://localhost:3000>. The home page links to the one feature so far, the tag catalogue at <http://localhost:3000/catalogue>: every profile category with its tags and descriptions, read from the database on each request.

## Running the tests

```bash
npm test             # Vitest: the seed and the catalogue's data logic
npm run test:e2e     # Playwright: opens /catalogue in a real browser
```

Before the first `npm run test:e2e` on a machine, download the browser Playwright drives:

```bash
npx playwright install chromium
```

Things to know:

- **Both sets of tests use the real `dev` database, not a fake one.** Proving that Prisma and Neon work together was the point of slice 0.
- **We all share that one database.** The tests empty the catalogue tables and put the seed data back when they finish. If two of us run them at the same moment they can trip each other up, and `/catalogue` can look empty for a few seconds. If a run is interrupted and the catalogue stays empty, `npx prisma db seed` refills it.
- **`npm run test:e2e` starts its own copy of the app** on port 3100, so it doesn't clash with an `npm run dev` you already have open.
- **To check a deployed site instead**, such as a Vercel preview, give it the URL. Only the read-only test runs; the tests that change data skip themselves:
  ```bash
  BASE_URL=https://<preview-url> npm run test:e2e
  ```

Other checks worth running before a PR:

```bash
npm run lint                           # ESLint
npx next typegen && npx tsc --noEmit   # type check
npm run build                          # the same Next.js build Vercel runs
```

The type check runs `next typegen` first because Next.js generates some types itself (such as `LayoutProps`). On a fresh clone they don't exist yet, and `tsc` alone fails with "Cannot find name 'LayoutProps'".

## Deployment

Vercel builds every commit pushed to GitHub. A commit on `master` becomes the live **Production** site, using the Neon `production` branch. A commit on any other branch gets its own **Preview** URL, using the Neon `dev` branch; Vercel posts that URL on the PR.

Each build runs `prisma migrate deploy && prisma db seed && next build`, so a deploy brings its own database up to date before the app is built. The seed only adds rows that are missing, so running it every time is safe.

## Project structure

```
src/
  app/                 # the screens (Next.js App Router): one folder per URL
    page.tsx           #   /            home page
    catalogue/page.tsx #   /catalogue   the tag catalogue
  lib/
    db.ts              # the one shared database client
    catalogue.ts       # getCatalogue(): reads categories and tags in order
  generated/prisma/    # Prisma's generated client (not committed)
prisma/
  schema.prisma        # the database tables. Flag changes first (see CLAUDE.md)
  migrations/          # the SQL that creates and changes those tables
  seed-data.ts         # the categories, tags and courses from the brief
  seed.ts              # adds any of those rows that are missing
tests/
  integration/         # Vitest tests (npm test)
  e2e/                 # Playwright browser tests (npm run test:e2e)
  helpers/             # shared test helpers
openspec/
  specs/               # permanent, current spec for each part of the system
  changes/             # in-flight and archived change proposals — the evidence trail
.claude/               # Claude Code skills/commands for the OpenSpec workflow
.env.example           # template for your local .env (no real values)
prisma.config.ts       # settings for the Prisma command-line tool
ARCHITECTURE.md        # plain-English overview of how the pieces fit together
CLAUDE.md              # project context for the coding agent
WORKFLOW.md            # how we collaborate — process, tooling, conventions
README.md              # this file
```

## How we work

Every feature follows the same ten-stage chain (pick → branch → spec → approve → build → verify → commit → PR → review, merge & deploy → archive), and keeps one ticket number across its branch, OpenSpec folder, PR and commits. Full details, board columns, commit message format, and the ticket template are in [`WORKFLOW.md`](./WORKFLOW.md).
