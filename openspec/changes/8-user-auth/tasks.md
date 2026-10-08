# Tasks: Slice 1, sign-up and sign-in (#8)

**Start only after #7 (foundation) has merged.** Then: pull `master`, `npm install`, `npx prisma migrate deploy`, `npm run seed:fake`, and add `PRETEND_COHORT=on` to `.env`.

Groups build on each other in order: prove Auth.js works with our database (1), the small decision functions (2), sign-in and sign-out (3), sign-up and the finish step (4), the legal pages (5), then email, QR code and deploy (6). Each group lands its own tests and README notes. Steps marked **(human)** need a browser login, a DNS change or a team conversation, so Tom does them.

## 1. Prove Auth.js v5 works with our Prisma 7 client

- [ ] 1.1 Install `next-auth@5.0.0-beta.32` and `@auth/prisma-adapter` at exact versions (no `^`), with a comment in the PR on why they're pinned (design 1). Verify: `npm install` finishes without peer-dependency errors and `package.json` shows both exact versions
- [ ] 1.2 Add `src/auth.ts` with the Prisma adapter given our shared `prisma` from `src/lib/db.ts`, database sessions, and the Resend provider using Auth.js's default email for now; add `src/app/api/auth/[...nextauth]/route.ts`; add `AUTH_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM` and `ADMIN_EMAILS` to `.env.example` with a comment each. Every non-obvious line gets a "why" comment, including any cast needed because the adapter expects `@prisma/client` (design 1, 2). Verify: `npx tsc --noEmit` passes
- [ ] 1.3 **(human)** Sign in once locally with a real email through Resend's test sender, and check the `User`, `Session` and `Account` rows in Neon. Record the result under an "Auth.js check" note at the top of this file (what worked, any cast or difference from the foundation's tables). Verify: the note exists; if the adapter does not work with our tables, **stop**, and raise it on #8 and #7 before going further

## 2. Small decision functions (no pages yet)

- [ ] 2.1 Add `src/lib/auth/adminEmails.ts` with `isAdminEmail(email, list)` and unit tests in `tests/unit/`: listed, not listed, spaces and capitals in the list, an empty or missing list (design 5). Verify: `npm test` passes
- [ ] 2.2 Add `src/lib/auth/signUpForm.ts` with `checkSignUpForm(answers, activeCourseIds)` returning a list of problems, and unit tests: missing email, malformed email, missing course, retired or unknown course, terms not ticked, everything fine (design 3). Verify: `npm test` passes
- [ ] 2.3 Add `src/lib/auth/accountState.ts` with `isAccountFinished(user)` and `pickCurrentUser({ sessionUser, pretendUser, pretendCohortOn })`, and unit tests for every case in design 4: finished real user; unfinished real user; suspended real user; real user while the switcher has a pretend user; no session with switcher on; no session with switcher off; suspended pretend user still returned. Verify: `npm test` passes

## 3. Sign-in, sign-out and `getCurrentUser()`

- [ ] 3.1 Change the inside of `getCurrentUser()` in `src/lib/currentUser.ts` to use `auth()` and `pickCurrentUser()`, keeping its name, `async`, and return type, and update its header comment (owner, what it does now, that join-up removes the switcher path) (design 4). Verify: `npx tsc --noEmit` passes, the foundation's existing tests still pass with `npm test`, and the switcher still works in the browser
- [ ] 3.2 Add the `signIn` callback refusing suspended users when a link is used (not when it is requested), and `events.createUser` setting `role = ADMIN` for emails in `ADMIN_EMAILS` (design 5, 6). Add an integration test that a created user with a listed email becomes ADMIN and an unlisted one stays MEMBER. Verify: `npm test` passes
- [ ] 3.3 Replace the `/signin` placeholder with the real page: an email form whose Server Action calls `signIn("resend", …)`, a "check your email" message, a "this account is suspended" message for `?error=AccessDenied`, an "expired or already used, request a new link" message for other Auth.js errors, and a redirect to `/signup/finish` when the visitor has an unfinished session (design 4, 6). Verify: `npm run dev`, each message shows at its address, and the page has no sideways scrolling at 375 pixels wide
- [ ] 3.4 Add `src/components/SignedInStatus.tsx` (own email + Sign out button, or Sign in / Sign up links) and the one line in `NavBar.tsx` that shows it, with a comment naming slice 1 as owner of that line (design 9). Verify: signed in, every page shows the email and Sign out; after Sign out, the links show
- [ ] 3.5 Add `sendMagicLinkEmail()` in `src/lib/auth/sendMagicLinkEmail.ts`: the short plain email through Resend's API with `fetch`, one retry after a second on 429, and the `.magic-links/<email>.txt` test inbox for `@collabz.test` addresses only while `isPretendCohortEnabled()`. Add `/.magic-links/` to `.gitignore`. Unit test that a `@collabz.test` address with the cohort off is never written to a file and goes to Resend instead (with `fetch` replaced by a fake) (design 8). Verify: `npm test` passes
- [ ] 3.6 Add `tests/e2e/signin.spec.ts`: a pretend user signs in with their `@collabz.test` email by reading the link from `.magic-links/`, is shown as signed in on two pages, signs out, and a private page then treats them as signed out; the same link opened a second time does not sign them in; the suspended pretend user opening a link sees the suspended message. Tests skip themselves when `BASE_URL` is set. Verify: `npm run test:e2e` passes
- [ ] 3.7 Add a "Signing in" section to `README.md`: the four new environment variables and where to get each, the `.magic-links/` test inbox, that `ADMIN_EMAILS` only applies when an account is created, and that the switcher still works when there's no real session. Verify: every variable name and path matches the code

## 4. Sign-up and the finish step

- [ ] 4.1 Replace the `/signup` placeholder with the real page: email, a course list of active courses only, one tick box with links to `/terms` and `/privacy`, and a Server Action that runs `checkSignUpForm()` and, if it passes, calls `signIn("resend", { email, redirectTo: "/signup/finish?course=…&terms=accepted" })`. Problems come back to the form with `useActionState` (design 3). Verify: `npm run dev`, submitting with each field missing shows its message and sends nothing; a full form shows "check your email"; no sideways scrolling at 375 pixels wide
- [ ] 4.2 Add `/signup/finish`: if the address holds good answers, show them filled in with one "Finish sign-up" button; otherwise show the course list and an unticked box. Its Server Action runs `checkSignUpForm()` again, saves `courseId` and `acceptedTermsAt`, and redirects to `/onboarding`. A visitor with no session is sent to `/signin` (design 3). Add an integration test for the save: a retired course is refused; good answers write both columns. Verify: `npm test` passes
- [ ] 4.3 Add `tests/e2e/signup.spec.ts`: a new `@collabz.test` email signs up as Business, opens the link **in a fresh browser context** (to stand in for a different browser), finishes, and lands on `/onboarding` with course Business saved; sign-up without the tick box sends no link; a new email via `/signin` lands on the finish step with an empty course list; with `ADMIN_EMAILS` set to a test address in `playwright.config.ts`, that address can open `/admin` after signing up. Verify: `npm run test:e2e` passes

## 5. Terms & Conditions and data policy

- [ ] 5.1 **(human)** Settle the three values in design.md's Open Questions (course end date, sending address, policy contact) and write them into this task. Verify: all three are written here
- [ ] 5.2 Add `/terms` and `/privacy` as static pages in plain English covering everything listed in design 10, using the values from 5.1. Verify: both open without signing in, the sign-up form links to both, and the privacy page mentions photos, messages, who can see them, and deletion at the end of the course by the admins
- [ ] 5.3 **(human)** The team reads both pages and comments on the PR (Patrick at least). Verify: a comment from a teammate on the PR approves the wording
- [ ] 5.4 Add to `tests/e2e/signup.spec.ts`: signed out, `/terms` and `/privacy` open and show their headings, and both links on the sign-up form work. Verify: `npm run test:e2e` passes

## 6. Email, QR code and deploy

- [ ] 6.1 **(human)** Create the Resend account, add our domain, add Resend's DNS records (SPF, DKIM) with whoever controls the domain, and wait until Resend shows it as verified. Note Resend's current free-tier daily and per-second limits in this task. Verify: Resend's dashboard shows the domain verified, and the limits are written here
- [ ] 6.2 **(human)** Add `AUTH_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM` and `ADMIN_EMAILS` to Vercel → Preview and Vercel → Production (Production's `ADMIN_EMAILS` holds Patrick's and Tom's real emails), and check `PRETEND_COHORT` is still **not** set on Production. Verify: Vercel's environment settings show all four in both, and `PRETEND_COHORT` only under Preview
- [ ] 6.3 Add `qrcode` as a dev dependency, `scripts/make-qr-code.ts`, and an `npm run qr -- <url>` script writing `public/qr-code.png`, with a README line on how to make it (design 11). Verify: running it on the production URL produces an image that a phone camera opens at that URL
- [ ] 6.4 Push and open the PR (flagging the `getCurrentUser()` and `NavBar.tsx` changes to Patrick). On the preview URL, sign up with a real email and finish onboarding's first screen. Verify: #8's success checks 2 and 3 are ticked in the PR description
- [ ] 6.5 **(human)** Send magic links to Gmail, Outlook and iCloud addresses from the preview. Verify: each arrives in the inbox (not spam) within a minute; #8's success check 5 is ticked
- [ ] 6.6 After merge, on production: Tom and Patrick sign up first and can open `/admin`; then scan the QR code with a phone and sign up as a member. Verify: #8's success checks 1 and 4 are ticked, and the production page shows no "sign in as…" control

## Workflow follow-up

- Ask Patrick to change the `pretend-cohort` spec's switcher lines from "until slice 1 (#8) replaces it" to "until join-up (#17)" in #7 before #7 is archived (proposal, Impact).
- Add `approval.md` (team sign-off) to this folder before apply starts, as WORKFLOW.md stage 4 requires.
- After merge and deploy: `/opsx:archive`, updating `ARCHITECTURE.md` (Auth.js, Resend and the sign-in flow are new pieces of the system).
- Join-up (#17): remove the switcher path from `getCurrentUser()`, and the `.magic-links/` test inbox if no test needs it any more.
