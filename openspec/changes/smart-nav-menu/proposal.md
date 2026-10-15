# Proposal: smart navigation menu

## Why

The navigation bar shows every link to everyone. An ordinary student sees **Admin** and **Reports** links that only lead to "page not found", and someone who is already signed in still sees **Sign up** and **Sign in**. This was left on purpose while we built (see the comment at the top of `src/components/NavBar.tsx`), but the app is live now and the cohort will use it, so the menu should match who is looking at it.

## What Changes

- **Admin** and **Reports** links are shown only to a signed-in admin.
- **Sign up** and **Sign in** links are hidden once someone is signed in.
- Every other link stays exactly as it is, for everyone (including Onboarding, Matches, Graph, People, Requests, Messages, Account and Catalogue).
- The explanatory comment at the top of `NavBar.tsx` is updated, because it currently says every link is shown to everyone.

Not changing: routes, the `requireAdmin()` page guards, the database, the sign-in status and Sign out button, or what a signed-out visitor can reach.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `app-navigation`: the "Shared navigation bar on every page" requirement currently says the bar links to every page for everyone. It changes so that admin-only links appear only for admins and sign-up/sign-in links appear only when signed out. The new behaviour is added as separate requirements, and the existing one is modified to point at them.

## Impact

- Code: `src/components/NavBar.tsx` only (it needs to know who is signed in, so it becomes an async Server Component, like `WaitingRequestsCount`).
- Tests: `tests/e2e/navigation.spec.ts` (and any other e2e spec that clicks the Admin, Reports, Sign in or Sign up nav links while signed in as the wrong person) need updating.
- Docs: the "Routes" / navigation notes in `README.md` and `ARCHITECTURE.md` if they say the menu is the same for everyone.
- Slice map: this overlaps with part of join-up (#17), which the `NavBar.tsx` comment names as the place for this tidy-up. Flag it on #17 so nobody does it twice.
