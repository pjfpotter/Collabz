## User need
The Requests page can appear empty to the recipient after an incoming request is accepted, while the sender still sees Connected. Show accepted connections to both participants without suggesting that a pending request has been approved.

## Scope
In: a Connected section based only on APPROVED request rows in either direction, retaining existing visibility/block rules; regression checks for both directions and pending/declined exclusions. Out: changing approvals, live data repair, automatically accepting requests, or claiming the reported production request is diagnosed.

## Remaining investigation
The user is unsure whether Patrick is on the same deployment and targeting the same account alias. The reported never-answered request still requires confirmation of site/account and live status.

## Authorization
The user requested investigation and correction of the asymmetric request display on 15 October 2026. Submit separately from the compact navigation change for review.

## Decision
Keep pending incoming and sent lists unchanged. Add a separate Connected section using only APPROVED request pairs, whichever person sent the request. Apply the same counterpart visibility and bidirectional block rules and return only public profile details. This closes a verified presentation gap; it is not an explanation for a request the recipient says they never accepted.

## Validation evidence
TypeScript and ESLint passed. The actual request-listing helper was bundled with a synthetic database boundary and checked for sender/recipient symmetry, incoming acceptance visibility, unchanged pending counts, non-approved exclusion, duplicate pairs, suspended/unfinished counterparts, blocks both ways and public-only output. The actual Requests page rendered a sample accepted incoming connection at 375px with no sideways overflow or console errors. These checks do not substitute for PostgreSQL integration tests. The integration/e2e regression cases were added but not run because their setup clears shared database tables. Live request records were not inspected or altered.
