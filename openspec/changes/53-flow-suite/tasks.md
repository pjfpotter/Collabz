# Tasks: Flow suite (#53)

Before starting: merge `master` into this branch, make sure `.env` has `TEST_DATABASE_URL` (the Neon dev branch, never production), run `npm install`, `npx playwright install chromium webkit`, `npx prisma migrate deploy` and `npm run seed:fake`.

**Running tests is the point of this change**, unlike a feature slice. Still: the test database is shared, so run ONE spec at a time, only when Patrick confirms nobody else is running tests, and never the full suite until he says. Groups build in order: the helper and config (1), the flow list (2), the journeys (3, 4, 5), then docs and the first full run (6). Pause after each group and show what changed. Every helper and spec gets "why" comments (CLAUDE.md).

## 1. Shared checks and device projects

- [ ] 1.1 Add `tests/helpers/pageHealth.ts` with `watchPageHealth(page)`, `expectPageHealthy(page, label)` and `expectGraphPainted(page)` (design 3 and 4): broken images, console and page errors, failed same-site requests, sideways scroll, painted canvas. Verify: a throwaway spec that loads `/`, `/catalogue` and `/graph` as a pretend member passes, and one with a deliberately broken `<img>` injected through `page.setContent` fails naming the image
- [ ] 1.2 Add a `press(page, locator)` helper in `tests/helpers/` that taps on touch projects and clicks otherwise (design 7). Verify: used by the throwaway spec on both desktop and the Pixel project
- [ ] 1.3 Add the `android` (Pixel 7, Chromium) and `iphone` (iPhone 14, WebKit, skipped when `SKIP_WEBKIT=1`) projects to `playwright.config.ts`, with `testMatch: "journeys/**"` on the two phone projects (design 1 and 2). Verify: `npx playwright test --list --project=android` lists only journey files, and `--project=chromium` still lists all the specs

## 2. The flow list

- [ ] 2.1 Write `tests/e2e/journeys/FLOWS.md` from design 5 with one row per flow: id, what the person does, the covering spec, status (covered or not). Verify: Patrick reads it and agrees the list (this is the approval point for scope)

## 3. Member journeys

- [ ] 3.1 `tests/e2e/journeys/newStudent.spec.ts` (M1): sign up through the real magic link, onboard by clicking only, done page, `/matches`, `/graph` (painted), a profile; health check at each page. Verify: passes on `chromium`, then on `android`; note anything that fails with its issue number
- [ ] 3.2 `tests/e2e/journeys/connect.spec.ts` (M2 and M3): connect, approve, message both ways; and a decline. Verify: passes on `chromium`, then `android`
- [ ] 3.3 `tests/e2e/journeys/account.spec.ts` (M4): course, photo add and remove, edit an answer. Verify: passes on `chromium`, then `android`
- [ ] 3.4 `tests/e2e/journeys/safety.spec.ts` (M5): report with and without a reason, block from a thread, both vanish. Verify: passes on `chromium`, then `android`

## 4. Admin and signed-out journeys

- [ ] 4.1 `tests/e2e/journeys/adminLists.spec.ts` (A1): rename a tag and add a course, see them on `/catalogue`, onboarding and `/signup`; restores what it changed. Verify: passes on `chromium`
- [ ] 4.2 `tests/e2e/journeys/adminPeople.spec.ts` (A2 and A3): suspend and unsuspend from `/admin/users`, and act on a report. Verify: passes on `chromium`
- [ ] 4.3 `tests/e2e/journeys/guards.spec.ts` (M6 and P1): every page for a visitor, a member and an admin, and the public pages with the health check. Verify: passes on `chromium`, `android`, and read-only against a preview with `BASE_URL`

## 5. Phones

- [ ] 5.1 Run every journey on `android` and `iphone`, one project at a time. For each failure, decide with Patrick: fix the test, or file a bug issue and mark the journey `test.fail()` with the issue number (design Risks). Verify: every journey is green or has an issue number against it
- [ ] 5.2 **(human)** File the bug issues found (graph blank, silhouette picker, any others) with the device and the failing check. Verify: each `test.fail()` names a real issue

## 6. Docs and first full run

- [ ] 6.1 Update `README.md` "Running the tests": the journeys folder, the three projects, `npx playwright install webkit`, `SKIP_WEBKIT`, and how to run one journey on one device. Verify: every command in the README works as written
- [ ] 6.2 **(human)** Run the whole suite once (`AUTH_SECRET=local-test-secret npm run test:e2e`) when nobody else is on the test database, and record the result and time under a "Checked" note at the top of this file. Verify: the note exists
