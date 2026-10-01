# Proposal: Slice 0, walking skeleton + tag catalogue (#6)

## Why

The brief's milestone for this week is "first feature started and implemented, tested", and our stack (Next.js, Prisma, Neon, Vercel) has never run together on real infrastructure. Slice 0 removes that unknown before any personal data is involved, and it builds the category/tag/course tables that onboarding (slice 2) and admin (slice 8) will rely on. See `openspec/changes/archive/2026-10-01-4-brief-alignment/design.md` B8 and D-new-1 for why this is the first slice.

## What Changes

- **New Next.js app** in the repo root, deployed on Vercel (Patrick's account) from `master`.
- **Neon Postgres connected through Prisma**: a `main` branch for production and a separate `dev` branch for local development, tests and Vercel previews.
- **`Category`, `Tag` and `Course` tables** with readable, seed-assigned ids (e.g. `energy-sea-captain`) and a `retiredAt` column, so later slices can retire rows instead of deleting them.
- **An idempotent seed** with the 5 categories × 12 tags from `collabz-mvp-brief.md` and the courses "Software" and "Business". It only adds rows that are missing and never overwrites an existing one, so it's safe to run on every deploy.
- **A public read-only page at `/catalogue`** listing each category with its tags and descriptions, read from the database on every request.
- **Automated tests**: Vitest for the seed and the catalogue data, plus Playwright for the page in a real browser.
- **Tailwind** for styling (the `create-next-app` default).

### Decisions made for this change (asked of Patrick, 1 Oct 2026)

| Question | Decision |
|---|---|
| Test framework | Vitest + Playwright |
| Database for dev and tests | A separate Neon `dev` branch |
| Catalogue URL | `/catalogue` |
| Styling | Tailwind |
| Hosting accounts | Neon and Vercel on Patrick's accounts, no collaborators. Tom reviews through PRs and preview links |
| Id format | Readable string ids set by the seed (e.g. `energy`, `energy-sea-captain`, `software`) |
| Re-seeding | Only add missing rows, never overwrite existing ones |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tag-catalogue`: the catalogue page gets its URL (`/catalogue`) and hides retired categories and tags. The seed requirement now says it never overwrites existing rows, so database edits survive a re-seed.

## Impact

- **Code:** everything is new. Next.js app (`src/app/`), Prisma schema, migrations and seed (`prisma/`), tests (`tests/`).
- **Dependencies (new):** Next.js 16, React, TypeScript, Tailwind 4, Prisma 7 (pinned to the last stable 7.10.x, because npm's `latest` tag currently points at an 8.0 release candidate), Prisma's Neon adapter, Vitest, Playwright.
- **Infrastructure (new):** a Neon project with `main` and `dev` branches, and a Vercel project linked to the GitHub repo. Environment variables hold the database URLs. Nothing secret is committed.
- **Data:** no personal data. The tables hold only the public tag lists.
- **Docs:** `README.md` gets real run/test commands. `ARCHITECTURE.md` is updated at archive, because this adds the test tools and the dev/prod database split.
- **Out of scope:** auth, legal pages and QR code (slice 1), Skills and Interests lists (slice 2), Seeking↔Quality pairings (slice 3), any admin editing (slice 8).
