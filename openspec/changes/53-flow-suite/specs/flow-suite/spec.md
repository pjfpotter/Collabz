# Spec Delta

## Purpose
Walks every logical member and admin flow in a real browser, on desktop and on phone-sized Android and iPhone browsers, so problems with a screen are found before a person finds them.

## ADDED Requirements

### Requirement: Every listed flow has a journey
Each flow in `tests/e2e/journeys/FLOWS.md` SHALL be covered by one journey spec that follows it from the first page to the last, across pages, the way a person would.

#### Scenario: A flow is walked end to end
- **WHEN** the journeys run
- **THEN** a new student signs up, finishes onboarding, sees matches and the graph, connects with a match who approves, and sends a message, all in one test

#### Scenario: A flow with no journey
- **WHEN** a flow is added to the list and no spec covers it
- **THEN** the list shows it as not covered, so the gap is visible

### Requirement: Journeys run on phone-sized browsers
The journeys SHALL run on desktop Chrome, on Android Chrome (Pixel 7 emulation) and on iPhone (WebKit emulation), with the existing per-feature specs staying on desktop Chrome only.

#### Scenario: Same journeys on a phone
- **WHEN** the suite runs
- **THEN** each journey runs once per device project and a failure names the device

### Requirement: Every visited page is checked for health
At every page a journey visits, the suite SHALL fail if any image failed to load, the browser logged a console error or an uncaught error, a same-site request failed, or the page scrolls sideways.

#### Scenario: A missing picture
- **WHEN** a journey reaches a page with an image that did not load
- **THEN** the test fails and names the page and the image address

### Requirement: The graph must actually be drawn
On the graph page the suite SHALL check that the canvas has size and contains painted pixels, not only that a canvas element exists.

#### Scenario: Blank canvas
- **WHEN** the graph page loads and the canvas is present but nothing is painted on it
- **THEN** the test fails

### Requirement: The suite leaves the shared database as it found it
Running the suite SHALL put the catalogue and pretend cohort back, as the existing specs do, and SHALL NOT run against the production database.

#### Scenario: After a run
- **WHEN** the suite finishes, passed or failed
- **THEN** the catalogue and pretend cohort are present for the next person
