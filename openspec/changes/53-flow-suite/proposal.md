# Proposal: Flow suite, journeys for every user and admin flow (#53)

## Why

We have 16 Playwright specs, one or two per feature, all run in desktop Chrome. They prove each page works, but nobody has walked the whole app the way a person does: sign up, finish onboarding, find matches, connect, talk, and as an admin keep the lists and reports in order. The gaps showed up by hand: Marvin's Android phone draws no graph, Tom sees no silhouette pictures in the picker, and there is a list of small UI problems. Today those are only found when a person hits them, on a device we don't test.

## What Changes

- **Journey specs** in `tests/e2e/journeys/`, each one a whole flow across pages (new member, connect and message, account, safety, admin), built on the pretend cohort and the dev sign-in helper that the existing specs use.
- **Phone projects** in `playwright.config.ts`: Android Chrome (Pixel 7) and iPhone (WebKit), running the journeys only, so the same flows are walked on a phone-sized touch browser.
- **A shared "page health" check** run at every page a journey visits: no broken images, no console errors or failed requests, no sideways scroll, and the graph canvas is actually painted (not blank).
- **A written list of the flows**, with the spec that covers each, so "every logical flow" is something we can read and argue about.
- **Not changed:** app code (bugs the suite finds get their own issues), the existing 16 specs, the schema.

## Capabilities

### New Capabilities
- `flow-suite`: the journeys that must pass, the devices they run on, and the checks made on every page they visit.

### Modified Capabilities
<!-- None: no product behaviour changes. -->

## Impact

- New: `tests/e2e/journeys/*.spec.ts`, `tests/helpers/pageHealth.ts`, `tests/e2e/journeys/FLOWS.md`.
- Edited: `playwright.config.ts` (two projects), `README.md` ("Running the tests").
- The suite will fail on bugs that exist today (graph, silhouette picker). Those failures are the point; each one becomes its own issue and change.
