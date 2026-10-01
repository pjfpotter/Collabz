# Tasks: Slice 0, walking skeleton + tag catalogue (#6)

Groups follow the layers in `design.md`, so they can be split between us: groups 1–2 and 6 are infrastructure, groups 3–4 are data, and group 5 joins the two. Record who drove which group in `contributions.md`. Steps marked **(human)** need a browser login, so Patrick does them.

## 1. App skeleton

- [x] 1.1 Generate a Next.js 16 app with `create-next-app` in a temporary folder (TypeScript, ESLint, Tailwind, App Router, `src/`, `@/*` alias), then move its files into the repo root without overwriting `README.md`, `CLAUDE.md` or `openspec/` (design 1). Verify: `npm install` succeeds and `git status` shows our docs unchanged
- [ ] 1.2 Replace the starter home page with a short page that links to `/catalogue`, and remove the starter assets. Verify: `npm run dev`, then `/` shows the link and nothing from the template
- [ ] 1.3 Add `.env.example` listing `DATABASE_URL`, `DIRECT_URL` and `TEST_DATABASE_URL` with no values, and check `.gitignore` covers `.env*` (except `.env.example`) and `src/generated/`. Verify: `git check-ignore .env` prints `.env`

## 2. Database connection

- [x] 2.1 **(human)** Create the Neon project `collabz` in AWS `eu-west-2` with a `dev` branch off `production`, and put the `dev` pooled and direct URLs into a local `.env` (design 7). Verify: the Neon console shows both branches
- [ ] 2.2 Install Prisma pinned to `7.10.x` plus `@prisma/adapter-neon`, and add `prisma.config.ts` and a `schema.prisma` with the generator output at `src/generated/prisma` (design 6). Verify: `npx prisma --version` shows 7.10 and `npx prisma generate` succeeds
- [ ] 2.3 Add `src/lib/db.ts` exporting one shared Prisma client that uses the Neon adapter, with a comment explaining why it's shared. Verify: `npx tsc --noEmit` passes

## 3. Catalogue tables and seed

- [ ] 3.1 Add the `Category`, `Tag` and `Course` models to `schema.prisma` (design 4: string ids, `order`, `retiredAt`, `pickMin`/`pickMax`, Tag → Category relation), and create the first migration against `dev`. Verify: `npx prisma migrate dev` creates the migration and the three tables show in Neon's table view
- [ ] 3.2 Write `prisma/seed-data.ts` with the 5 categories (with their pick limits), the 60 tags (names and descriptions copied word for word from `collabz-mvp-brief.md`, in order, with readable ids) and the 2 courses. Verify: by eye against the brief, and a type check
- [ ] 3.3 Write `prisma/seed.ts` exporting `seedCatalogue(prisma)` using `createMany({ skipDuplicates: true })`, and register it as Prisma's seed command (design 5). Verify: `npx prisma db seed` run twice against `dev` leaves 5 categories, 60 tags and 2 courses

## 4. Unit and integration tests (Vitest)

- [ ] 4.1 Install Vitest, add a config that loads `TEST_DATABASE_URL` (failing with a clear message if it's missing) and runs test files one at a time, add a helper that empties the three tables, and add an `npm test` script (design 8). Verify: `npm test` runs and reports no tests found yet
- [ ] 4.2 Seed tests: a fresh seed gives 5 categories with 12 tags each in the brief's order with descriptions plus 2 courses; a second run duplicates nothing and changes no ids; a renamed tag keeps its new name after re-seeding. Verify: `npm test` passes and fails if a `skipDuplicates` line is removed
- [ ] 4.3 Add `src/lib/catalogue.ts` with `getCatalogue()` returning categories that aren't retired, in `order`, each with its tags that aren't retired, in `order` (design 2). Test it: order is correct, and retiring a tag or a category hides it. Verify: `npm test` passes

## 5. Catalogue page

- [ ] 5.1 Build `src/app/catalogue/page.tsx` as a Server Component with `dynamic = "force-dynamic"`. It calls `getCatalogue()` and renders each category as a heading with its tags (name and description) underneath, styled with Tailwind for a narrow screen first (design 2, 3, 10). Verify: `npm run dev`, then `/catalogue` shows all 5 categories with 12 tags each, readable at phone width in devtools
- [ ] 5.2 Install Playwright (`npx playwright install chromium`) and add a config that starts `next dev` with `DATABASE_URL` set to `TEST_DATABASE_URL`, or uses `BASE_URL` when it's set, plus an `npm run test:e2e` script. Verify: `npm run test:e2e` starts the server and reports no tests found yet
- [ ] 5.3 Playwright tests: headings and tags appear in order; a tag renamed in the database shows its new name after reload, then is put back; a retired tag disappears after reload, then is restored. The two tests that change data are skipped when `BASE_URL` is set. Verify: `npm run test:e2e` passes

## 6. Deploy

- [ ] 6.1 **(human)** Import the GitHub repo into Vercel. Set Production env vars to Neon `production` and Preview env vars to Neon `dev`, the build command to `prisma migrate deploy && prisma db seed && next build`, and the function region to `lhr1` (design 7, 9). Verify: the PR's preview deploy builds and its `/catalogue` shows the catalogue
- [ ] 6.2 Run the read-only Playwright test against the preview URL with `BASE_URL=<preview url> npm run test:e2e`. Verify: it passes

## 7. Docs and wrap-up

- [ ] 7.1 Update `README.md`: the `.env` setup, `npm run dev`, `npm test`, `npm run test:e2e`, the project structure, and that the catalogue lives at `/catalogue`. Verify: Tom follows the README from a fresh clone and gets the page and tests running
- [ ] 7.2 Add `contributions.md` to this change folder: one line per person with the groups they drove and one decision they can explain. Verify: both lines present
- [ ] 7.3 After merge, open `/catalogue` on the production URL and repeat the success checks from #6. Verify: all ticked in the issue
