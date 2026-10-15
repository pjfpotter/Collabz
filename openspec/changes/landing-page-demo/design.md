# Design

## Context

`src/app/page.tsx` is a plain Server Component with a narrow `max-w-md` column. Colours, radii, shadows and a global reduced-motion rule live in `src/app/globals.css` (slice 10). A `Silhouette` component draws the shared silhouette pictures. `getCurrentUser()` already tells pages who is signed in. The nav bar sits above every page, and `smart-nav-menu` is editing it at the same time, so this change must not touch `NavBar.tsx`. See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- A page that looks striking and explains the product in one scroll.
- The finished picture is the default state; motion is added on top, so no-motion and reduced-motion look right by construction.
- Code a beginner can read: one component per part, each with a "why" comment.

**Non-Goals:**
- Interactivity in the demo (dragging, hovering). It is a film, not a toy.
- Real data, real scores or the real graph library on the landing page.
- A signed-in dashboard. Signed-in people get a different button, not a different page.

## Decisions

1. **CSS keyframes + inline SVG, no library.** One shared 16-second timeline, each element animating its own opacity, transform and stroke at fixed percentages. No new dependency, nothing to load, nothing for the team to learn. Alternatives considered: a motion library (a new dependency for one page) and `react-force-graph-2d` (heavy, and it animates with a physics loop that can't be paused for reduced motion).
2. **The still frame is the base style; animation is the enhancement.** Each element's default CSS is its *final* state (linked, score showing, conversation open), and the keyframes start from hidden and run to that state with `animation-fill-mode: both`. The global rule in `globals.css` squashes animations to 0.001ms, so reduced-motion lands on the finished state without any extra code.
3. **Meaning is also in text.** A numbered "How it works" list carries the four steps; the SVG gets `role="img"` with one `aria-label`, and its inner shapes are `aria-hidden`. Nothing is said only by motion.
4. **The main button is the only dynamic part.** A tiny async Server Component calls `getCurrentUser()` inside a try/catch (failure counts as signed out, like the nav's count) and draws one of two button groups. The rest of the page is static and cacheable.
5. **Invented cast, fixed in the source.** Four made-up aliases, silhouettes from the existing set, a handful of tags per category and one fixed score, kept in one `demoCast.ts` file with a comment that nothing here is real. This also makes it impossible to leak a real alias by accident.
6. **Own file for keyframes.** `src/components/landing/landing.css` imported by the landing components, not `globals.css`, so slice 10's file stays untouched and the landing styles are deleted by deleting one folder.
7. **Read the Next.js docs first.** CLAUDE.md says this Next.js differs from the one we know, so the first task is reading the App Router pages and CSS import guides in `node_modules/next/dist/docs/` before writing code.

## Risks / Trade-offs

- [A long looping animation can be distracting or tiring] → Loops slowly, pauses on the finished frame for a few seconds, and the reduced-motion path shows a still. No flashing (nothing blinks faster than once a second).
- [Hand-timed percentage keyframes are fiddly to read] → One named custom property per step start and a comment table of the timeline at the top of the CSS file.
- [Contrast on top of the animated graph, in both themes] → Text never sits on the moving layer; labels are in their own pills using `surface` and `foreground`.
- [Overlap with `smart-nav-menu` or #17 editing `/`] → Neither touches `page.tsx`; flag on #17.
- [Doing a very visual piece with only lint and `tsc` mid-slice] → Check by eye in `npm run dev` at 375px and 1280px, light and dark, after each group, and Patrick runs the suites when the PR is open.
