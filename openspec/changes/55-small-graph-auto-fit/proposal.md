# 55: Prevent excessive automatic zoom on small graphs

## Problem and evidence
The unchanged graph component produces a solid pale-blue canvas with a single synthetic Software person. Unbounded zoomToFit magnifies the viewer dot until it covers the canvas. This matches the reported S23 Ultra screenshot, but the production cohort size and exact browser remain unconfirmed.

## Approved scope
The user reviewed the proposed patch and requested it be pushed for Patrick to review and merge on 15 October 2026. Cap automatic fit at 2x, preserve centring and existing animation duration, skip unavailable positions/dimensions, and leave manual zoom available. No data, schema, authentication or device-specific changes.

## Decision
Compute the fitted zoom from the same library bounds, then cap it before scheduling the transition. Clamping after zoomToFit would leave the original animated zoom target active. The 2x limit keeps a single viewer dot 36 CSS pixels across and is a tuning choice.

## Validation
An isolated bundle using the installed component dependencies reproduced the original one-person failure. The proposed component rendered 1 and 29 people and empty data without console errors. TypeScript checked the proposed source with zero diagnostics. Recheck on the affected phone and authenticated application before claiming the reported session is resolved.
