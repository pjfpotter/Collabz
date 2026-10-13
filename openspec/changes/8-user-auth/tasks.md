# Tasks: Slice 1, sign-up and sign-in (#8)

**#7 (foundation) merged on 8 Oct 2026.** Before starting: merge `master` into this branch, fill in `.env` from `.env.example` (all three database URLs and `PRETEND_COHORT=on`), then run `npm install`, `npx prisma migrate deploy` and `npm run seed:fake`.

Groups build on each other in order: prove Auth.js works with our database (1), the small decision functions (2), sign-in and sign-out (3), sign-up and the finish step (4), the legal pages (5), then email, QR code and deploy (6). Each group lands its own tests and README notes. Steps marked **(human)** need a browser login, a DNS change or a team conversation, so Tom does them.

## Auth.js check (task 1.3)

Checked on 13 Oct 2026 by Tom, locally against Neon `dev`, with `next-auth@5.0.0-beta.32` and `@auth/prisma-adapter@2.11.3`, sending through Resend's test sender (`onboarding@resend.dev`) to Tom's own address.

- The magic link arrived in Gmail's inbox (not spam) and signed Tom in.
- A `User` row was created with only an email: a `cuid` id from our database, role `MEMBER`, `emailVerified` set, `courseId` and `acceptedTermsAt` empty. Auth.js never sends `name` or `image` for email sign-in (read in `@auth/core`'s callback code), so the foundation's `User` table fits as it is.
- One `Session` row, expiring 30 days later (Auth.js's default).
- The `VerificationToken` was deleted once used, so the link works only once.
- **No `Account` row.** Expected: Auth.js only stores accounts for providers like Google. Magic-link users have none, so nothing in slice 1 should rely on `Account`.
- **No cast was needed:** TypeScript accepts our generated client in `PrismaAdapter(prisma)`.

## 1. Prove Auth.js v5 works with our Prisma 7 client

- [x] 1.1 Install `next-auth@5.0.0-beta.32` and `@auth/prisma-adapter` at exact versions (no `^`), with a comment in the PR on why they're pinned (design 1). Verify: `npm install` finishes without peer-dependency errors and `package.json` shows both exact versions
- [x] 1.2 Add `src/auth.ts` with the Prisma adapter given our shared `prisma` from `src/lib/db.ts`, database sessions, and the Resend provider using Auth.js's default email for now; add `src/app/api/auth/[...nextauth]/route.ts`; add `AUTH_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM` and `ADMIN_EMAILS` to `.env.example` with a comment each. Every non-obvious line gets a "why" comment, including any cast needed because the adapter expects `@prisma/client` (design 1, 2). Verify: `npx tsc --noEmit` passes
- [x] 1.3 **(human)** Sign in once locally with a real email through Resend's test sender, and check the `User`, `Session` and `Account` rows in Neon. In particular, check that creating the user doesn't fail because Auth.js passes `name` or `image`, which our `User` table leaves out on purpose (design Context). Record the result under an "Auth.js check" note at the top of this file (what worked, any cast or difference from the foundation's tables). Verify: the note exists; if the adapter does not work with our tables, **stop**, and raise it on #8 and #7 before going further

## 2. Small decision functions (no pages yet)

- [x] 2.1 Add `src/lib/auth/adminEmails.ts` with `isAdminEmail(email, list)` and unit tests in `tests/unit/`: listed, not listed, spaces and capitals in the list, an empty or missing list (design 5). Verify: `npm test` passes
- [x] 2.2 Add `src/lib/auth/signUpForm.ts` with `checkSignUpForm(answers, activeCourseIds)` returning a list of problems, and unit tests: missing email, malformed email, missing course, retired or unknown course, terms not ticked, everything fine (design 3). Verify: `npm test` passes
- [x] 2.3 Add `src/lib/auth/accountState.ts` with `isAccountFinished(user)` and `pickCurrentUser({ sessionUser, pretendUser })`, and unit tests for every case in design 4: finished real user; unfinished real user; suspended real user; real user while the switcher has a pretend user (real user wins); no session with a pretend user; no session and no pretend user; suspended pretend user still returned. Verify: `npm test` passes

## 3. Sign-in, sign-out and `getCurrentUser()`

- [x] 3.1 Change the inside of `getCurrentUser()` in `src/lib/currentUser.ts` to use `auth()` and `pickCurrentUser()`, keeping its name, `async`, and return type, and update its header comment (owner, what it does now, that join-up removes the switcher path) (design 4). Verify: `npx tsc --noEmit` passes, the foundation's existing tests still pass with `npm test`, and the switcher still works in the browser
- [x] 3.2 Add the `signIn` callback refusing suspended users when a link is used (not when it is requested), and `events.createUser` setting `role = ADMIN` for emails in `ADMIN_EMAILS` (design 5, 6). Add an integration test that a created user with a listed email becomes ADMIN and an unlisted one stays MEMBER. Verify: `npm test` passes
- [x] 3.3 Replace the `/signin` placeholder with the real page: an email form whose Server Action calls `signIn("resend", …)`, a "check your email" message, a "this account is suspended" message for `?error=AccessDenied`, an "expired or already used, request a new link" message for other Auth.js errors, and a redirect to `/signup/finish` when the visitor has an unfinished session (design 4, 6). Verify: `npm run dev`, each message shows at its address, and the page has no sideways scrolling at 375 pixels wide
- [x] 3.4 Add `src/components/SignedInStatus.tsx` (own email + Sign out button, or "Not signed in") and the one line in `NavBar.tsx` that shows it, with a comment naming slice 1 as owner of that line (design 9). Verify: signed in, every page shows the email and Sign out; after Sign out, every page shows "Not signed in"
- [x] 3.5 Add `sendMagicLinkEmail()` in `src/lib/auth/sendMagicLinkEmail.ts`: the short plain email through Resend's API with `fetch`, one retry after a second on 429, and the `.magic-links/<email>.txt` test inbox for `@collabz.test` addresses only while `isPretendCohortEnabled()`. Add `/.magic-links/` to `.gitignore`. Unit test that a `@collabz.test` address with the cohort off is never written to a file and goes to Resend instead (with `fetch` replaced by a fake) (design 8). Verify: `npm test` passes
- [x] 3.6 Add `tests/e2e/signin.spec.ts`: a pretend user signs in with their `@collabz.test` email by reading the link from `.magic-links/`, is shown as signed in on two pages, signs out, and a private page then treats them as signed out; the same link opened a second time does not sign them in; the suspended pretend user opening a link sees the suspended message. Tests skip themselves when `BASE_URL` is set. Verify: `npm run test:e2e` passes
- [x] 3.7 Add a "Signing in" section to `README.md`: the four new environment variables and where to get each, the `.magic-links/` test inbox, and that `ADMIN_EMAILS` only applies when an account is created. Update the existing "Dev sign-in" section: its opening "There is no real sign-in until slice 1" becomes "the switcher only applies when you are not really signed in", and it says the switcher shows the real user while one is signed in. Verify: every variable name and path matches the code

## 4. Sign-up and the finish step

- [x] 4.1 Replace the `/signup` placeholder with the real page: email, a course list of active courses only, one tick box with links to `/terms` and `/privacy`, and a Server Action that runs `checkSignUpForm()` and, if it passes, calls `signIn("resend", { email, redirectTo: "/signup/finish?course=…&terms=accepted" })`. Problems come back to the form with `useActionState` (design 3). Verify: `npm run dev`, submitting with each field missing shows its message and sends nothing; a full form shows "check your email"; no sideways scrolling at 375 pixels wide
- [x] 4.2 Add `/signup/finish`: if the address holds good answers, show them filled in with one "Finish sign-up" button; otherwise show the course list and an unticked box. Its Server Action runs `checkSignUpForm()` again, saves `courseId` and `acceptedTermsAt`, and redirects to `/onboarding`. A visitor with no session is sent to `/signin` (design 3). Add an integration test for the save: a retired course is refused; good answers write both columns. Verify: `npm test` passes
- [x] 4.3 Add `tests/e2e/signup.spec.ts`: a new `@collabz.test` email signs up as Business, opens the link **in a fresh browser context** (to stand in for a different browser), finishes, and lands on `/onboarding` with course Business saved; sign-up without the tick box sends no link; a new email via `/signin` lands on the finish step with an empty course list; with `ADMIN_EMAILS` set to a test address in `playwright.config.ts`, that address can open `/admin` after signing up. Verify: `npm run test:e2e` passes

## 5. Terms & Conditions and data policy

- [x] 5.1 **(human)** Settle the three values in design.md's Open Questions (course end date, sending address, policy contact) and write them into this task. Verify: all three are written here
  - **Course ends:** 26 November 2026 (the deletion date in the data policy). Tom, 13 Oct 2026.
  - **Sending address:** for now Resend's shared `onboarding@resend.dev`; no domain of our own yet. **This only delivers to the Resend account owner's address, so students can't sign up until a domain is verified** (task 6.1). Tom, 13 Oct 2026.
  - **Policy contact:** Tom, tomhazz@gmail.com. Tom, 13 Oct 2026.
- [x] 5.2 Add `/terms` and `/privacy` as static pages in plain English covering everything listed in design 10, using the values from 5.1. Verify: both open without signing in, the sign-up form links to both, and the privacy page mentions photos, messages, who can see them, and deletion at the end of the course by the admins
- [ ] 5.3 **(human)** The team reads both pages and comments on the PR (Patrick at least). Verify: a comment from a teammate on the PR approves the wording
- [x] 5.4 Add to `tests/e2e/signup.spec.ts`: signed out, `/terms` and `/privacy` open and show their headings, and both links on the sign-up form work. Verify: `npm run test:e2e` passes

## 7. Send through Gmail instead of Resend (13 Oct 2026, design 13)

Added when Tom chose Gmail because we have no domain for Resend. Do this group before group 6.

- [x] 7.1 Update `proposal.md`, `design.md` (decision 13) and this file for the switch, before changing code (CLAUDE.md). Verify: `openspec validate 8-user-auth --strict` passes
- [x] 7.2 Install `nodemailer@8.0.11` and `@types/nodemailer` at exact versions (our pinned Auth.js accepts nodemailer 7 or 8). Verify: `npm install` finishes without peer-dependency errors
- [x] 7.3 In `src/lib/auth/sendMagicLinkEmail.ts`, add `sendViaGmail()` (one retry on a temporary SMTP failure, codes 400-499) beside the existing Resend sending, now `sendViaResend()`, both sharing the wording and the test inbox. Unit test Gmail with a fake mail transport: a pretend address goes to the test inbox; a real one is sent once; a 421 is retried once; a 550 isn't retried; the error never contains the link. Keep the Resend tests passing. Verify: `npm test` passes
- [x] 7.4 In `src/auth.ts`, switch to Auth.js's Nodemailer provider with Gmail's server and the two Gmail variables, and comment out the Resend provider block with step-by-step instructions to switch back. Change `signIn("resend", …)` to the new provider id. Verify: `npx tsc --noEmit` passes and `npm run test:e2e` passes (the sign-in and sign-up tests use the test inbox, so they don't need real Gmail)
- [x] 7.5 Update `.env.example` (the Gmail variables, with how to get an app password; `AUTH_RESEND_KEY` marked as "only if switching back") and the README's "Signing in" section. Verify: every variable name matches the code

## 6. Email, QR code and deploy

- [ ] 6.1 **(human)** Create a dedicated Gmail account for Collabz, turn on 2-Step Verification, and create an app password (design 13). Put `GMAIL_USER`, `GMAIL_APP_PASSWORD` and `EMAIL_FROM` in your local `.env`, and sign in once locally with your own email. Verify: the magic link arrives from the new Gmail address and signs you in. (Was: verify a domain in Resend. Replaced on 13 Oct 2026; see 5.1 and design 13.)
- [ ] 6.2 **(human)** Add `AUTH_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM` and `ADMIN_EMAILS` to Vercel → Preview and Vercel → Production (Production's `ADMIN_EMAILS` holds Patrick's and Tom's real emails), and check `PRETEND_COHORT` is still **not** set on Production. Verify: Vercel's environment settings show all five in both, and `PRETEND_COHORT` only under Preview
- [ ] 6.3 Add `qrcode` as a dev dependency, `scripts/make-qr-code.ts`, and an `npm run qr -- <url>` script writing `public/qr-code.png`, with a README line on how to make it (design 11). Verify: running it on the production URL produces an image that a phone camera opens at that URL
- [ ] 6.4 Push and open the PR (flagging the `getCurrentUser()` and `NavBar.tsx` changes to Patrick). On the preview URL, sign up with a real email and finish onboarding's first screen. Verify: #8's success checks 2 and 3 are ticked in the PR description
- [ ] 6.5 **(human)** Send magic links to Gmail, Outlook and iCloud addresses from the preview. Verify: each arrives in the inbox (not spam) within a minute; #8's success check 5 is ticked
- [ ] 6.6 After merge, on production: Tom and Patrick sign up first and can open `/admin`; then scan the QR code with a phone and sign up as a member. Verify: #8's success checks 1 and 4 are ticked, and the production page shows no "sign in as…" control

## Workflow follow-up

- Ask Patrick to change the `pretend-cohort` spec's switcher lines from "until slice 1 (#8) replaces it" to "until join-up (#17)" in #7 before #7 is archived (proposal, Impact).
- Add `approval.md` (team sign-off) to this folder before apply starts, as WORKFLOW.md stage 4 requires.
- After merge and deploy: `/opsx:archive`, updating `ARCHITECTURE.md` (Auth.js, Gmail sending with Resend kept ready, and the sign-in flow are new pieces of the system).
- Join-up (#17): remove the switcher path from `getCurrentUser()`, and the `.magic-links/` test inbox if no test needs it any more.
