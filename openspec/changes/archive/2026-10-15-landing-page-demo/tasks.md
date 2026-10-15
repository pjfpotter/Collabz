# Tasks: animated landing page (landing-page-demo)

Before starting: `npm install`, `npx prisma generate`, and **read the relevant guides in `node_modules/next/dist/docs/` (App Router pages, Server Components, CSS imports)**, as CLAUDE.md requires. One group, then pause and show what changed. Per the team's mid-slice rule, run lint and `tsc` only; Patrick runs the test suites once the PR is open. Check each group by eye at 375px and 1280px, light and dark.

## 1. The page without the animation

- [x] 1.1 Add `src/components/landing/demoCast.ts` with four invented people (alias, silhouette id, tags), one pair, one score and three reasons, with a comment that nothing here is real. Verify: `npx tsc --noEmit` passes and no import of `prisma` appears in the folder (`grep -rn prisma src/components/landing` is empty)
- [x] 1.2 Add `HowItWorks.tsx`: the four steps (pick, match, request, talk) as a numbered list in plain words. Verify: at 375px the list reads in order with no sideways scroll
- [x] 1.3 Add `LandingActions.tsx`: async Server Component using `getCurrentUser()` in a try/catch, drawing Sign up + Sign in, or Go to matches. Verify: in `npm run dev`, signed out shows Sign up and Sign in; switch to a pretend student and it shows Go to matches only
- [x] 1.4 Rewrite `src/app/page.tsx` to the wordmark, a one-line promise, the actions, the list and the catalogue link, in the existing tokens (no hard-coded colours). Verify: `npm run lint` and `npx tsc --noEmit` pass and both themes look right
- [x] 1.5 Update the `/` row in `README.md`'s route table. Verify: the row describes the new page

## 2. The animated demo

- [x] 2.1 Add `DemoScene.tsx`: one inline SVG, `role="img"` with a single `aria-label`, drawn in its FINISHED state (people, link, score pill, "why" pills, Approve and chat bubble) using theme tokens. Verify: with `prefers-reduced-motion` emulated in the browser dev tools, the still frame shows everything and reads in light and dark
- [x] 2.2 Add `landing.css` with the 16-second timeline (a comment table of the steps at the top) and keyframes for each element: tags light up, silhouettes drift in, link draws, score counts up by fading, Approve pulses, bubble opens. `animation-fill-mode: both`, loops with a pause on the finished frame. Verify: it plays and loops in `npm run dev`, nothing flashes more than once a second, and with reduced motion on nothing moves
- [x] 2.3 Add a step caption under the demo that matches the current step, as text that is also present in the how-it-works list. Verify: with CSS animations disabled the page still makes complete sense in reading order
- [x] 2.4 Check 375px and 1280px, light and dark, and keyboard focus on every button and link. Verify: no sideways scroll, focus ring visible, text never sits on the moving layer

## 3. Tests and finish

- [x] 3.1 Add `tests/e2e/landing.spec.ts`: visitor sees Sign up and Sign in; a pretend student sees Go to matches only; the catalogue link and the four steps are present; no sideways scroll at 375px. Verify: `npx tsc --noEmit` passes now; Patrick runs the spec when the PR is open
- [x] 3.2 Confirm `tests/e2e/navigation.spec.ts` and `phoneWidth.spec.ts` still describe `/` correctly, and fix any text they match on. Verify: `grep -n "Find people to work with" tests` shows nothing out of date
- [x] 3.3 Comment on #17 that the home page changed, and open the PR with a screenshot of each theme. Verify: comment posted and linked in the PR description
