# Design: Flow suite (#53)

## Context

See `proposal.md` for why. Observed on 15 Oct 2026:

- `tests/e2e/` has 16 specs (about 150 tests, 3,100 lines), one per feature. `phoneWidth.spec.ts` checks sideways scroll at 375px for every page, but in desktop Chrome with a narrowed window, not a touch phone browser.
- `playwright.config.ts` has one project (`chromium`, Desktop Chrome), one worker, the app started on port 3100 against `TEST_DATABASE_URL` with `PRETEND_COHORT=on`, and a global teardown that restores the database.
- Helpers exist: `signInAs()` (the dev switcher), `requestMagicLink()` (real sign-in through `.magic-links/`), `loadPretendCohortForTests()`, `emptyDatabase()`.
- `TEST_DATABASE_URL` is the same shared Neon database everyone uses, and runs collide when two people run tests (known; see the README).
- `graph.spec.ts` checks "draws the graph on a canvas" and that the canvas fits at phone width. It does not check pixels.

## Goals / Non-Goals

**Goals:**
- One readable list of flows, and one journey per flow.
- The same journeys on Android and iPhone emulation.
- Four cross-cutting checks (images, console and requests, sideways scroll, painted canvas) made in one place.

**Non-Goals:**
- No app code changes and no fixes: failures become issues. (Test hooks such as a `data-testid` are allowed only if a journey can't be written without one, and are listed in the PR.)
- No real-device testing. Emulation catches layout, touch and WebKit differences. It will NOT reproduce a graphics bug that only happens on one phone's GPU or browser build, so Marvin's case may still need his device details.
- No visual-diff screenshots, no accessibility audit, no load tests.

## Decisions

1. **Journeys live in `tests/e2e/journeys/`, separate from the feature specs.** The phone projects use `testMatch: "journeys/**"`, so the 150 existing tests don't run three times. Desktop `chromium` runs everything as today. *Alternative:* run every spec on every device. Rejected: three times the runtime on a shared database for little extra information.

2. **Android is Pixel 7 on Chromium; iPhone is iPhone 14 on WebKit.** Both from Playwright's built-in `devices`. WebKit needs `npx playwright install webkit` once per machine. *Alternative:* iPhone viewport on Chromium. Rejected: it wouldn't exercise WebKit, which is where iPhones differ.

3. **One helper, `tests/helpers/pageHealth.ts`, owns the cross-cutting checks.** `watchPageHealth(page)` records console errors, page errors and failed same-site requests from the start of a test; `expectPageHealthy(page, label)` runs the image, overflow and error checks and fails with the page's `label` and the offending address. A journey calls it after each navigation. *Why:* the checks are written once, so a new check is added in one place. *Alternative:* a Playwright fixture that auto-checks every navigation. Rejected for now: harder for beginners to read; can be revisited.

4. **The graph check reads the canvas pixels.** `expectGraphPainted(page)` finds the graph's `<canvas>`, checks its width and height are above zero, and reads its pixels with `getImageData` to count how many are not fully transparent. A canvas with none is a blank graph. It also waits for the library to settle first (the graph animates for a short time). *Why:* the library draws on a canvas, so DOM checks can't see an empty one.

5. **Flows are planned as a list, then built from it.** Proposed list (to agree at approval):
   - **M1 New student:** sign up by magic link, onboarding (all steps, silhouette), done page, matches, graph, a profile.
   - **M2 Connect and talk:** open a top-5 profile, Connect, the other person approves on `/requests`, the conversation opens, messages both ways.
   - **M3 Decline:** a request is declined and the sender sees it as declined.
   - **M4 Account:** change course, add and remove a photo, edit a Seeking answer.
   - **M5 Safety:** report a person (reason required), block from a thread, the pair vanish from each other's lists.
   - **M6 Signed out:** every member and admin page sends a visitor to sign in, and a member sees "page not found" on admin pages.
   - **A1 Lists:** admin renames a tag and adds a course, and `/catalogue`, onboarding and `/signup` follow.
   - **A2 People:** admin suspends a person and they vanish from the graph, then unsuspends.
   - **A3 Reports:** admin sees a report, suspends, resolves.
   - **P1 Public:** `/`, `/catalogue`, `/privacy`, `/terms` and the 404 page.
   The list is a file (`FLOWS.md`) with a column for the covering spec.

6. **Data: pretend cohort, one reset per file.** Each journey file seeds the catalogue and pretend cohort in `beforeAll` like the existing specs, and builds the extra rows it needs directly. *Why:* same pattern as today, so a teammate reading one reads them all. The single worker stays, because tests share one database.

7. **Phone taps, not clicks where it matters.** On the phone projects journeys use `locator.tap()` where the control is a button the person taps, via a small `press(page, locator)` helper that clicks on desktop and taps on touch projects. *Why:* touch browsers can behave differently (hover-only menus, overlapping targets) and a click would hide that.

## Risks / Trade-offs

- **The suite will fail on day one** for the graph and silhouette problems. That's wanted, but a red suite blocks nothing if the failing journeys are listed in the PR as known issues with their issue numbers (tests marked `test.fail()` with the issue number until fixed, so they flip to red the moment a fix lands).
- **Shared database:** running the suite empties tables other people are using. It must be run when nobody else is, and one spec at a time while developing. This was a real problem on 15 Oct 2026.
- **Run time:** the existing e2e suite is about 4.5 minutes. Three device projects over about 10 journeys adds a few more minutes.
- **Emulation isn't a device.** It may still pass while Marvin's phone fails. Mitigation: record his browser, Android version and what he sees in a bug issue, then add that device's details to the suite.
- **WebKit install:** someone who hasn't installed it gets an error on the iPhone project. The README says how, and the config can skip the project with `SKIP_WEBKIT=1`.
- **Flaky waits on the animated graph:** the canvas check waits for the library to report it has settled, with a time limit and a clear failure message.

## Open Questions

- Is the flow list in decision 5 the right one? Anything missing or not worth it?
- Should a read-only subset also run against a preview (`BASE_URL`)? Proposed: yes for the public and signed-out flows (P1, M6), nothing that writes.
