# Design

## Context

`NavBar.tsx` holds one fixed `navLinks` list and hands it to `NavLinks` (a Client Component that highlights the current page). It is a plain component, used once in `src/app/layout.tsx`. `WaitingRequestsCount` and `SignedInStatus` are already async Server Components that ask who is signed in, so the bar already reads the session on every page. The admin pages are protected separately by `requireAdmin()`.

## Goals / Non-Goals

**Goals:**
- The links shown follow who is signed in, using the same "who is this" answer the pages use.
- One short, readable rule per link group, with a comment saying why.

**Non-Goals:**
- Hiding other links (Matches, Graph, etc.) from signed-out visitors, or Onboarding from people who finished it. Not asked for, and it changes where signed-out people can click to.
- Any change to the page guards, routes or schema.

## Decisions

1. **Use `getCurrentUser()`, not `getSessionUser()`.** It is the same helper `requireAdmin()` and every page use, so the menu can't disagree with the page. It also returns the pretend user on Preview, so the dev "sign in as…" switcher shows the right menu when testing as the pretend admin. It returns `null` for a half-finished account (no course or terms yet), which is what we want: that person still needs Sign up. Alternative: `getSessionUser()`, as `SignedInStatus` uses. Rejected because it would show admin links to a suspended or pretend admin differently from the page guard.
2. **Make `NavBar` an `async` Server Component and filter the list in it**, rather than passing the user into `NavLinks`. `NavLinks` stays a simple Client Component that only draws what it is given, and no user data is sent to the browser beyond the links themselves. Alternative: a role prop on `NavLinks`. Rejected: it moves a rule into the client file for no gain.
3. **Mark each link with who sees it** in the `navLinks` list (`audience: "everyone" | "signed-out" | "admin"`), then one small `filterLinksFor(user)` function picks them. The list stays the single place to see every link, and a new link has to say who it is for.
4. **Failure shows the safe menu.** If looking up the user throws, treat it as signed out (as `WaitingRequestsCount` does with a count of 0), so a database blink never takes the nav bar, and with it the whole site, down. The admin links are then hidden, which is the safe side.

## Risks / Trade-offs

- [The nav now reads the database on every page, in addition to its existing reads] → `getCurrentUser()` is already called by `SignedInStatus` and `WaitingRequestsCount` in the same render; accepted as is, no caching added.
- [Hidden links give a false sense of security] → The spec keeps the `requireAdmin()` scenario so the guard stays covered by a test.
- [Overlap with join-up #17] → Flag on #17 that this part is done.
