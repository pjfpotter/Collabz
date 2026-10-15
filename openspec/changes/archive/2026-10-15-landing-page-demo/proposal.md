# Proposal: animated landing page that demos the concept

## Why

The home page (`/`) is a wordmark, one sentence and a link to the tag catalogue. It was written for slice 0 to prove the app ran. It is the first thing the cohort sees when they scan the QR code, and it says nothing about what Collabz does or why it is different. Nobody can tell from it that you are matched by chemistry, not CVs. Patrick has made this the priority.

## What Changes

- Replace the body of `/` with a landing page that explains Collabz by showing it: a short, looping, animated demo of the whole idea (pick a few tags, silhouettes drift into a graph, two of them glow and link with a score and a reason, one approves and a conversation opens).
- The demo is made only with CSS and inline SVG, using the existing design tokens, so it follows light and dark by itself. No new dependency.
- The same words are always on the page as text (a numbered "how it works" list), so the meaning never depends on watching the animation.
- One main button that depends on who is looking: **Sign up** (with a smaller **Sign in**) for visitors, **Go to matches** for someone signed in.
- Keep the existing wordmark and the link to the catalogue.

Not changing: other routes, the navigation bar (a separate `smart-nav-menu` change edits it), the database, auth, or the graph page.

## Capabilities

### New Capabilities
- `landing-page`: what the home page says and shows, the animated demo and its fallbacks (reduced motion, no script), and the main button that follows the viewer's sign-in state.

### Modified Capabilities
<!-- None. app-navigation only requires that / exists, which still holds. -->

## Impact

- Code: `src/app/page.tsx`, plus new components under `src/components/landing/` (the demo scene, the how-it-works list, the main button) and a few keyframes in a landing-only CSS file. `globals.css` is not edited, so slice 10's tokens are untouched.
- Data: none read or written. All names, tags and scores in the demo are invented and fixed in the source. Nothing real, and no email, ever appears on this page.
- Tests: `tests/e2e/phoneWidth.spec.ts` already opens `/` at 375px; a new `tests/e2e/landing.spec.ts` covers the buttons and the text fallback.
- Docs: `README.md` route table row for `/`, and `ARCHITECTURE.md` only if the page adds a new pattern (it should not).
- Slice map: touches join-up (#17) territory only in that it is the page everyone lands on. Flag it there.
