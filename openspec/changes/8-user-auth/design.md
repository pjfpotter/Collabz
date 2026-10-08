# Design: Slice 1, sign-up and sign-in (#8)

## Context

- **What exists when this is applied:** the foundation (#7) has added the `User` table (with `role`, `courseId?`, `acceptedTermsAt?`, `suspendedAt?`, `emailVerified?`) and Auth.js's `Account`, `Session` and `VerificationToken` tables, copied from the Auth.js Prisma adapter docs. Auth.js itself is **not** installed. `getCurrentUser()` in `src/lib/currentUser.ts` reads the dev switcher's cookie, and `isPretendCohortEnabled()` says whether the switcher is allowed at all. The nav bar is `src/components/NavBar.tsx`. Placeholder pages sit at `/signup` and `/signin`.
- **Prisma 7:** the client is generated into `src/generated/prisma` and shared from `src/lib/db.ts` as `prisma`, through Neon's adapter. It is not at `@prisma/client`, which is where Auth.js's Prisma adapter looks for its types.
- **This Next.js (16.3):** what used to be `middleware.ts` is now `proxy.ts`. The bundled auth guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) says Proxy should only do quick cookie checks and the real check belongs in a "Data Access Layer" close to the data. `getCurrentUser()` already is that layer.
- **The people signing up:** students in a room, on phones, from a QR code, mostly with personal email (Gmail, Outlook, iCloud). Email apps often open links in their own built-in browser.

## Goals / Non-Goals

**Goals:**
- One front door for real people that keeps every promise in the `user-auth` spec, without any other track changing a line of code.
- Teammates keep building against the pretend cohort, exactly as today, after this merges.
- Every piece of sign-up logic that makes a decision (is this form complete, is this email an admin, is this account finished) lives in a small plain function that Vitest can test without a browser.

**Non-Goals:**
- Passwords, social logins (Google etc.), or "remember this device" settings.
- Changing course after sign-up (slice 7), suspending people (slice 8), deleting your own account (slice 7).
- Removing the switcher or the pretend data (join-up, #17).
- Hiding nav links by role (join-up, #17, as #7 decided).

## How the pieces fit

```
 Phone scans QR ──▶ /signup form (email, course, terms tick box)
                        │  Server Action: checkSignUpForm() ─ fails ─▶ form again, with messages
                        ▼  passes
                    Auth.js signIn("resend", redirectTo = /signup/finish?course=…&terms=accepted)
                        │  sendMagicLinkEmail() ─▶ Resend ─▶ student's inbox
                        ▼
 Student taps link ──▶ /api/auth/callback/resend   (Auth.js: token checked, used up)
                        │  signIn callback: suspended? ─ yes ─▶ /signin?error=AccessDenied
                        │  new email? events.createUser ─▶ role = ADMIN if in ADMIN_EMAILS
                        ▼  session row + cookie
                    /signup/finish (course + terms pre-filled from the link, one tap to confirm)
                        │  Server Action saves courseId + acceptedTermsAt
                        ▼
                    /onboarding (track 2)

 Every page ──▶ getCurrentUser()
                   1. real Auth.js session? ─▶ finished and not suspended? ─▶ that User
                                               otherwise ─▶ null
                   2. no session, pretend cohort on? ─▶ the switcher's pretend user
                   3. otherwise ─▶ null
```

## Decisions

### 1. Auth.js v5 with the Prisma adapter and database sessions
`next-auth@5` (published under the `beta` tag; `5.0.0-beta.32` at the time of writing) with `@auth/prisma-adapter`, given our shared `prisma` client. Sessions are stored in the `Session` table (the adapter's default), not in a signed cookie.
- *Why Auth.js v5:* the project's stack names Auth.js, and the foundation's tables were copied from the Auth.js adapter docs, which describe v5. v4 (`next-auth@4`, "NextAuth.js") was built for the older Pages Router.
- *Why database sessions and not cookie-only (JWT) sessions:* a session row can be checked against the user on every request, so a suspension takes effect on the very next page. With a JWT the user stays signed in until the token expires. The `Session` table already exists.
- *Alternatives considered:* **Better Auth** (stable, supports Prisma 7 officially) would need different tables, so the foundation would change before it is built. **Writing our own magic links** would mean beginner-written token and cookie code guarding real students' data. Tom chose to stay with Auth.js (8 Oct 2026).
- **The risk is checked first.** v5 is labelled beta, and the adapter imports its types from `@prisma/client`, not from our `src/generated/prisma`. Task 1.1 wires the adapter to our client, signs one person in, and records the result. If the types don't line up, a single commented cast in `src/auth.ts` is acceptable; if it doesn't *work*, we stop and come back to this decision.
- Pin the exact version (`next-auth@5.0.0-beta.32`, no `^`). *Why:* beta versions can change behaviour between releases. We upgrade on purpose, not by accident.

### 2. Where the code lives
| File | What it does |
|---|---|
| `src/auth.ts` | The Auth.js set-up: provider, adapter, callbacks, events, pages. Exports `auth`, `signIn`, `signOut`, `handlers`. Auth.js's documented location |
| `src/app/api/auth/[...nextauth]/route.ts` | Two lines handing `GET`/`POST` to Auth.js. The magic link points here |
| `src/lib/auth/signUpForm.ts` | `checkSignUpForm()`: is the email well-formed, the course active, the terms ticked. Returns the problems found |
| `src/lib/auth/adminEmails.ts` | `isAdminEmail(email, list)`: reads `ADMIN_EMAILS` (comma-separated), ignoring spaces and letter case |
| `src/lib/auth/accountState.ts` | `isAccountFinished(user)` and `pickCurrentUser(...)` (decision 4) |
| `src/lib/auth/sendMagicLinkEmail.ts` | Builds the email and sends it through Resend (decision 8) |
| `src/app/signup/`, `src/app/signin/`, `src/app/terms/`, `src/app/privacy/` | The pages |
| `src/components/SignedInStatus.tsx` | "Signed in as … / Sign out" or "Sign in / Sign up", in the nav bar |

*Why `src/lib/auth/` and not more files in `src/lib/`:* `src/lib/` holds the shared helpers every track reads. Keeping slice 1's own pieces in one folder makes clear which files are ours and which are shared.

### 3. Course and terms travel inside the magic link
The sign-up form's Server Action checks the form, then calls `signIn("resend", { email, redirectTo })` with `redirectTo = /signup/finish?course=<courseId>&terms=accepted`. Auth.js puts that address inside the magic link, so wherever the link is opened, the student lands on the finish step with their answers.
- The finish page shows the course and the ticked box already filled in, and one **"Finish sign-up"** button. Its Server Action checks the answers again (`checkSignUpForm()`), saves `courseId` and `acceptedTermsAt = now`, and redirects to `/onboarding`.
- *Why the extra tap instead of saving on page load:* a page load is a `GET`, and `GET` requests shouldn't change data: browsers prefetch pages, and saving on load would also record "accepted the terms" without the person doing anything on that page. One tap keeps acceptance a deliberate act.
- *Why the address can be trusted:* it only ever sets the signed-in person's **own** course and terms, and the server checks the course is real and active. Editing it gains nothing.
- *Why not a cookie:* a cookie set in the phone's browser doesn't exist in the Gmail app's built-in browser. Tom's decision (8 Oct 2026).
- *Alternative:* store the pending sign-up in the database before sending the link. That would need a new table (a schema change) for no gain over the link.
- If someone arrives at `/signup/finish` without (or with broken) answers in the address, e.g. after using `/signin` with a new email, the same page shows the course list and an unticked box instead. One page handles both.
- **Server Actions, not an `/api/signup` route:** Auth.js v5's `signIn()` and `signOut()` are made to be called from Server Actions (they set cookies and redirect), the forms work without browser JavaScript, and errors come back to the form with React's `useActionState`. *Alternative:* a Route Handler like #9's `/api/onboarding`, which would need us to rebuild Auth.js's redirect handling by hand.

### 4. `getCurrentUser()` keeps its name and return value
Inside `src/lib/currentUser.ts`, `getCurrentUser()` changes to:
1. Ask Auth.js for the session (`auth()`). If there is a real session, load that `User`. Return it only if `isAccountFinished(user)` and `suspendedAt` is empty; otherwise return `null`.
2. If there is no real session and `isPretendCohortEnabled()`, return the switcher's pretend user, exactly as the foundation does today.
3. Otherwise return `null`.

The choice between those three is a plain function, `pickCurrentUser({ sessionUser, pretendUser, pretendCohortOn })`, so every case is unit-tested without cookies or a browser.
- *Why a real session wins over the switcher:* a person who really signed in should never be silently swapped for a pretend user.
- *Why the switcher path still doesn't hide suspended users:* the foundation needs a teammate to be able to *be* the suspended pretend user to test that they vanish from the graph. Only real sign-ins are refused (decision 6).
- `requireAdmin()` needs no change: it already calls `getCurrentUser()`.
- *Why the unfinished account counts as "not signed in" and isn't sent to the finish step from here:* `getCurrentUser()` can't redirect, because it is called from every track's pages and helpers. Instead the `/signin` page notices the unfinished session and sends the person to `/signup/finish` (`user-auth`: "An unfinished account can't use the app").

### 5. First admins: `ADMIN_EMAILS`, applied once by `events.createUser`
Auth.js fires `events.createUser` exactly once, when it creates a new `User` row. There we call `isAdminEmail(user.email, process.env.ADMIN_EMAILS)` and, if it matches, set `role = ADMIN`.
- *Why when the account is created, and not at every sign-in:* the `admin` spec says the first admins are set at deploy time. Checking at every sign-in would also *re-promote* someone an admin had deliberately demoted in slice 8.
- *Consequence:* adding an email to `ADMIN_EMAILS` after that person has signed up does nothing. They're promoted by an existing admin (slice 8) or by hand in Neon. The README says so.
- Emails are compared trimmed and lower-cased. Auth.js already lower-cases the email it stores.

### 6. Suspended users are refused in Auth.js's `signIn` callback
When the magic link is opened, Auth.js calls our `signIn` callback with the user it found. If `suspendedAt` is set, the callback returns `false`, Auth.js sends them to `/signin?error=AccessDenied`, and `/signin` shows "This account is suspended."
- *Why also in `getCurrentUser()` (decision 4):* someone suspended while already signed in still has a session cookie. Checking the row on each request covers them without slice 1 having to delete sessions, which is slice 8's business.
- *Why the request step is not refused:* the callback also runs when the link is *requested*, and refusing there would tell anyone typing an email whether it belongs to a suspended account. We only refuse when the link is used.

### 7. No `proxy.ts`
Every page that needs a signed-in user asks `getCurrentUser()`. We don't add a `proxy.ts`.
- *Why:* the Next.js guide says Proxy should only read cookies, never the database. With database sessions, the cookie alone can't say whether the person is suspended or unfinished, so a Proxy check would be a second, weaker copy of the real one.

### 8. Sending the email: Resend, with a test inbox for `@collabz.test`
`sendMagicLinkEmail({ to, url })` is passed to Auth.js as the Resend provider's `sendVerificationRequest`.
- It sends a short plain email ("Tap to sign in to Collabz. This link works once and expires in 24 hours.") from `EMAIL_FROM` through Resend's HTTP API with `fetch`. *Why `fetch` and not Resend's own package:* it is one request, and Auth.js's Resend provider works the same way. One fewer dependency.
- **If Resend answers "too many requests" (429), it waits a second and tries once more.** *Why:* Resend limits how many emails we can send per second, and a whole room tapping "Sign up" in the same minute is exactly that pattern.
- **Test inbox:** when the address ends `@collabz.test` **and** `isPretendCohortEnabled()`, nothing is sent; the link is written to `.magic-links/<email>.txt` (gitignored) instead. *Why:* Playwright can't open a real inbox, and `.test` addresses can never receive mail. The pretend-cohort check means production never writes these files.
- Links expire after **24 hours**, Auth.js's default. *Why keep it:* a student who signs up and checks email later in the day should still get in. The spec fixes this number.

### 9. The nav bar gets one line
`SignedInStatus` is a Server Component. Signed in: "Signed in as <your email>" and a **Sign out** button (a tiny form whose Server Action calls `signOut()`). Signed out: **Sign in** and **Sign up** links. The foundation's `NavBar.tsx` gets one added line rendering it, next to the switcher.
- *Why show the email:* it is the person's *own* email, shown only to them. The rule is that other users never see it.
- *Why touch a foundation file:* the spec says sign-out is available from every page, and the nav bar is on every page. One line in someone else's file, flagged in the PR, is smaller than any alternative.

### 10. The legal pages are plain pages written in plain English
`/terms` and `/privacy` are static pages (no database, no sign-in). The data policy covers: what we hold (email, course, profile picks, photo, messages, reports), why, who can see what (others see only alias, silhouette, course and picks; photos and messages only after both people connect; admins can see everything for moderation), where it is stored (Neon, Vercel, Resend for email), that it is deleted by the admins (Patrick and Tom) **at the end of the course**, and how to ask for earlier deletion.
- *Why static:* nothing on them depends on who you are, and they must load for people who aren't signed in.
- The terms record acceptance as a date (`acceptedTermsAt`), not a version. *Why:* there will be one version during the live test. A version column would be a schema change for a problem we don't have.
- These are drafted by us for a course project and read by the team before approval. They are not legal advice.

### 11. The QR code is a file, made by a script
`npm run qr -- <url>` runs `scripts/make-qr-code.ts`, which uses the `qrcode` package (dev dependency) to write `public/qr-code.png`.
- *Why a script and not an online generator:* anyone can recreate it for a new URL, and the repo shows how it was made.
- *Why in `public/`:* it can then be opened at `/qr-code.png` and printed from any laptop.

### 12. Tests
- **Vitest, unit:** `checkSignUpForm` (missing email, bad email, missing course, retired course, terms not ticked, all good), `isAdminEmail` (listed, not listed, spaces and capitals in the list, empty list), `isAccountFinished`, `pickCurrentUser` (every row of decision 4's list).
- **Vitest, integration:** `events.createUser` sets ADMIN for a listed email and leaves MEMBER otherwise; the finish step's save refuses a retired course and writes both columns when given good answers.
- **Playwright:** full sign-up with a `@collabz.test` address, reading the link from `.magic-links/`; sign-up without ticking the terms sends nothing; sign out and back in; a suspended pretend user opening a magic link is refused with the message; an address on a test `ADMIN_EMAILS` can open `/admin`; a used link doesn't work twice.
- The foundation's `emptyDatabase()` already empties Auth.js's tables between runs.

## Risks / Trade-offs

- **[Auth.js v5 is a beta, and the adapter wasn't written for Prisma 7's generated client]** → Pinned version; task 1.1 proves sign-in works with our client before anything else is built, and we stop to re-decide if it doesn't.
- **[Magic links land in spam]** → Send from our own domain with the DNS records Resend asks for (SPF, DKIM). Success check 5 tests Gmail, Outlook and iCloud before the live test.
- **[Resend's rate limit when a whole room signs up at once]** → One retry on 429 (decision 8). Resend's free tier allows 100 emails a day, enough for a room. Check the current limits on Resend's pricing page when setting up (task 6.1).
- **[Some work or school email systems open links to scan them, which uses up a single-use link]** → Most students will use personal email. If it happens, the link is refused and the student asks for a new one from `/signin`. Noted for the live-test rehearsal (#17).
- **[An unfinished account holds an email address before the terms are accepted]** → Only through `/signin` with a new email; via `/signup` the box is ticked before anything is sent. The data policy covers it, and the row is deleted with everyone else's at the end of the course.
- **[Preview deploys share the `dev` database]** → Real sign-ups on a preview sit next to the pretend cohort, and `npm test` wipes them. Accepted: previews are for us, not for students.
- **[The switcher stays on previews after this merges]** → It is still opt-in, hard-off on production, and only reaches `pretend-` users (foundation decision 4). Join-up (#17) removes it.

## Migration Plan

1. Wait for #7 to merge. Pull `master`, run `npm install`, `npx prisma migrate deploy`, `npm run seed:fake`.
2. Create the Resend account, add our domain, and add Resend's DNS records with whoever controls the domain. Wait for Resend to show it as verified.
3. Add `AUTH_SECRET` (made with `npx auth secret`), `AUTH_RESEND_KEY`, `EMAIL_FROM` and `ADMIN_EMAILS` to local `.env`, Vercel → Preview and Vercel → Production. `ADMIN_EMAILS` on Production holds Patrick's and Tom's real emails.
4. Open the PR; check sign-up on the preview URL.
5. Merge. Production deploys with no database migration (the tables already exist).
6. Sign up on production with our own emails first, so the first admins exist. Then print the QR code.

**Rollback:** Vercel Instant Rollback to the previous deploy. There is no schema change, so the old code runs against the same tables; anyone who signed up keeps their row.

## Open Questions

These don't change the specs, the approach or the tasks. Each is a value to fill in before approval or before the live test.

- **The exact date the course ends**, which the data policy states as the deletion date (Tom's decision: "at the end of the course").
- **The sending address and domain** for `EMAIL_FROM` (e.g. `Collabz <login@ourdomain>`), and who controls that domain's DNS.
- **Who the data policy names as the contact** for questions and earlier deletion (proposed: Patrick and Tom, through a shared address).
