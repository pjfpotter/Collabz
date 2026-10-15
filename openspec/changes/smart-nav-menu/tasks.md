# Tasks: smart navigation menu

Before starting: `npm install`, `npx prisma generate`, and make sure `.env` has `PRETEND_COHORT=on` so the dev "sign in as…" switcher can be used. One group, one commit; pause after it and show what changed. Per the team's mid-slice rule, run lint and `tsc` only; Patrick runs the test suites when the PR is open.

## 1. The menu follows the user

- [ ] 1.1 In `src/components/NavBar.tsx`, add an `audience` to each entry in `navLinks` (`everyone`, `signed-out` for Sign up and Sign in, `admin` for Admin and Reports) and a small `filterLinksFor(user)` function with a "why" comment. Verify: `npx tsc --noEmit` and `npm run lint` pass
- [ ] 1.2 Make `NavBar` an async Server Component that calls `getCurrentUser()` inside a try/catch (failure counts as signed out) and passes the filtered list to `NavLinks`. Update the comment at the top of the file, which currently says every link is shown to everyone. Verify: `npm run dev`, then as a signed-out visitor, a pretend student and the pretend admin (switcher) the bar shows exactly what the spec scenarios say, and `/admin` still shows "page not found" to the student
- [ ] 1.3 Update `tests/e2e/navigation.spec.ts` (and `admin.spec.ts`, `phoneWidth.spec.ts`, `requests.spec.ts`, `profile.spec.ts` where they click Admin, Reports, Sign in or Sign up while signed in as the wrong person) to match the new behaviour, and add a case for each scenario in the spec delta. Verify: `npx tsc --noEmit` passes now; Patrick runs the e2e suite once the PR is open (suite run is his, per the mid-slice rule)
- [ ] 1.4 Update `README.md` and `ARCHITECTURE.md` wherever they say the menu is the same for everyone. Verify: `grep -n "every link" README.md ARCHITECTURE.md` shows nothing out of date
- [ ] 1.5 Comment on issue #17 that the "hide links by who is signed in" part of join-up is done in this change. Verify: the comment is posted and linked in the PR description
