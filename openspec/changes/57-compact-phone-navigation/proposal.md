## User need
The phone header currently wraps twelve links and account details across several rows, taking much of the screen. Replace it with a compact Menu dropdown while retaining access to every page, and expose a Requests badge only when incoming requests are waiting.

## Scope
In: mobile dropdown, visible pending-request shortcut, account controls inside the dropdown, keyboard dismissal, periodic visible-page/focus refresh of request information. Desktop keeps its full navigation. Out: changing request approval rules or repairing live records.

## Success checks
Phone header is one row while closed; menu exposes all routes and account controls; selecting a route or pressing Escape closes it; waiting count is absent at zero; positive waiting count is visible while closed; desktop navigation remains accessible; TypeScript and lint pass.

## Authorization
Requested by the user on 15 October 2026, with screenshots demonstrating the oversized header. Use the existing PR review process for Patrick to review and merge.

## Decisions
Use a disclosure button and ordinary links for keyboard accessibility. Keep a single route list for desktop and mobile. Refresh server data every 30 seconds only while visible, and on focus/visibility return, so other users' requests can arrive without a manual reload. The mobile request shortcut is absent at zero and links directly to Requests when positive.

## Validation evidence
The real NavLinks component and compiled project CSS were bundled outside the repository with sample account/count data and a stub router. At 375px the closed nav measured 44px high (the header adds 16px padding); counts 0 and 2 behaved correctly, all links and account controls appeared on expansion, Escape closed it and restored button focus, and choosing People closed the dropdown. A 30-second tick invoked refresh. Desktop routes remained available at 1280px; wordmark alignment was corrected after visual inspection. TypeScript and ESLint passed. Database-backed end-to-end tests were updated but not run because their setup empties the team's shared database. Authenticated production and real-device checks remain for review.

## Signed-in navigation follow-up
The user additionally requested that authenticated people not see Sign in. Use the real session (the same source as SignedInStatus) to omit Sign in and Sign up. Keep the existing "Signed in as â€¦" account status and Sign out inside the dropdown. Signed-out people retain both entry links; this does not change authorization or the development switcher.

Signed-in follow-up validation: actual NavBar and SignedInStatus checked with isolated session/count providers for signed-in/out and counts 0/2. Correct entry-link visibility, Signed in as wording, account access and count propagation passed. TypeScript and lint passed. Real magic-link browser assertions added but not run against the shared database.
