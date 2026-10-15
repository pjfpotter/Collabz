# Architecture

A plain-English overview of how this system fits together — for us, not for the spec. Detailed, capability-by-capability specs live in `openspec/specs/`; this is the "explain it to a beginner" summary.

Update this as the last step whenever `/opsx:archive-change` lands a change that alters the shape of the system (new component, changed data flow, new dependency, new integration). Skip it if the change was purely internal with no structural effect.

## What this app does

Collabz is our version of the course brief "Bootcamp Connect". It matches software-course and business-course students by **chemistry**, not CVs. People build a profile by picking tags from fixed lists, the app scores every pair, and everyone sees the whole cohort as a live graph. Two people who both agree to connect get a private conversation.

> **Status (15 Oct 2026):** slice 0, the foundation (#7), slice 1 (#8, sign-up and sign-in), slice 2 (#9, onboarding), slice 3 (#10, chemistry matching), slice 4 (#11, the graph, the people list and profile pages), slice 5 (#12, connection requests), slice 6 (#13, messaging) and slice 8 (#15, the admin screens) are built and live, and slice 10 (#45, the visual design) has restyled every screen. The app runs on Vercel, talks to Neon through Prisma, and shows the tag catalogue at `/catalogue`. The foundation added every MVP database table, a placeholder page for every route, a cohort of pretend students and a dev-only way to act as any of them. Slice 4 then added the cohort graph, the people list with its filters and the profile pages. They run on the pretend cohort and on stand-ins for other tracks' work (see below). Slice 5 then made the Connect button real and added the requests page, and slice 3 replaced the pretend scores with the real chemistry formula and added `/matches`. Slice 1 then added real sign-up and sign-in by emailed magic link, with the course and terms accepted at sign-up. Slice 6 then made `/messages` real, so two connected people can talk. Slice 8 then made `/admin` real, so admins can manage the tag lists, courses and users without touching the database. Slice 2 then made `/onboarding` real, so a new user builds their profile by picking from lists and gets an alias, a silhouette and a bio. What's left is safety (slice 9) and join-up (#17) (slice map: issue #18). The per-capability specs are in `openspec/specs/`. The reasoning behind them is `openspec/changes/archive/2026-10-01-2-mvp-overview/` as amended by `openspec/changes/archive/2026-10-01-4-brief-alignment/`. Where the two disagree, #4 wins.

## The pieces

**Built (slice 0 and the foundation):**

- **Next.js app (on Vercel)**: the screens *and* the server code, in one codebase with one deploy. `master` deploys to production, and every pull request gets its own preview URL.
- **Neon Postgres, through Prisma**: all data. `schema.prisma` is the one readable file describing it. The tag lists, categories and courses live here too, not in code, so admins can manage them. It has all 17 MVP tables: the catalogue (`Category`, `Tag`, `Course`), people (`User`, `Profile`, `ProfileTag`), matching (`TagPairing`, `Edge`, `GlitchMatch`), connecting (`ConnectionRequest`, `Conversation`, `Message`), safety (`Block`, `Report`) and the three Auth.js sign-in tables. The foundation created them all in one go so that five tracks don't each change the database at once.
- **Two Neon branches**: `production` holds the live data and is only used by the production deploy. `dev` is used by everything else: our laptops, preview deploys and the tests.
- **A seed** (`prisma/seed.ts`): fills the catalogue tables from `prisma/seed-data.ts`. It runs on every deploy and only adds rows that are missing.
- **A page for every route, and one nav bar** (`src/components/NavBar.tsx`): every address in the route plan already exists as a placeholder saying which slice will build it. Each track replaces its own placeholders and leaves the rest alone.
- **The pretend cohort** (`npm run seed:fake`, built in `prisma/pretend-cohort.ts`): 32 pretend students on the `dev` database, 30 with finished profiles, scores, glitch matches, requests, conversations and messages. Since slice 3 the seed scores them with the real formula, so the scores are calculated, not made up. It lets every track build and test before real sign-up exists. It is the same on every machine, because the "random" choices are worked out from each user's id.
- **The dev switcher** (`src/components/DevUserSwitcher.tsx` and `/api/dev/sign-in-as`): a "Dev sign-in as" list in the nav bar that makes you any pretend student. Since slice 1 it only applies when nobody is really signed in: a real magic-link session always wins. Join-up (#17) removes it.
- **The pretend cohort switch** (`src/lib/pretendCohort.ts`): the cohort and the switcher only exist where `PRETEND_COHORT` is set to `on`, and never on the production deploy, whatever is set there.
- **Shared helpers** (`src/lib/`): the only way one track reaches another track's feature. `getCurrentUser` and `requireAdmin` (who is using the app, and are they an admin), `scoreUser`, `getTopFive`, `explainMatch` and `ensureGlitchMatch` (slice 3, from `src/lib/matching/`), `openConversation` and `closeConversation`, and `orderUserPair`. Slice 5 added `sendConnectionRequest` and `areConnected` in `src/lib/requests/`. Slice 6 added `sendMessage`, `listConversations` and `getConversation` in `src/lib/messages/`. Slice 8 added `rescoreEveryone` to the `@/lib/matching` exports so the admin screens can recalculate everyone in one go.
- **Tests**: Vitest checks the seeds, the database rules and the helpers, and Playwright checks the pages, the nav bar and the switcher in a real browser. Both run against the real `dev` database, not a fake one, and put the catalogue and the pretend cohort back when they finish.

**Built (slice 4, #11):**

- **The cohort graph** (`/graph`, `src/app/graph/`): every visible person is a dot and every score a line, drawn on a canvas by `react-force-graph`. A good match pulls two dots closer. Your top 5 and glitch match are highlighted, and the same people are listed in words below it. Tapping a dot opens a small panel, not the profile.
- **The people list and profile pages** (`/people` and `/people/[alias]`): the list filters by course (skill and interest dropdowns appear once onboarding adds those categories), and each profile shows the bio, tags and "why you match". A "Connect" button appears only for your top 5 and glitch match.
- **The server decides, the canvas only draws** (`src/lib/cohort/`): who is visible, who is in the top 5, how thick a line is and who may be connected with are all worked out in tested server code (`visiblePeople.ts`, `graphData.ts`, `profile.ts`). The browser code is told "draw this one dashed" and holds no rules, because nothing can test inside a canvas.
- **Stand-ins for other tracks' work** (`src/lib/cohort/standIns.ts`): five temporary versions of things tracks 2 and 3 will own (top 5, "why you match", the generated bio, the silhouette picture, the onboarding check). They sit in one file so that join-up (#17) is one mechanical job. (A sixth, sending a request, was a stand-in until slice 5 built the real one.)

**Built (slice 3, #10):**

- **The score formula** (`src/lib/matching/score.ts`): `(complement x 3) + overlap + tension`, as a plain function with no database. Complement counts each Seeking tag that the other person's Qualities satisfy, once, in both directions. Skills, Interests and course never change a score.
- **Pairings are data** (`TagPairing`, seeded from `prisma/seed-data.ts`): which Quality satisfies which Seeking tag. Editing them and running `npm run rescore:all` changes every score without touching code.
- **`scoreUser` is real** (`rescoreUser.ts`): in one transaction it deletes and rewrites only that user's scores and repairs any glitch match that has become invalid. `rescoreEveryone` does the whole cohort in one transaction and is behind `npm run rescore:all` and the pretend-cohort seed.
- **Top 5 and glitch match** (`topFive.ts`, `glitch.ts`): the top 5 is ordered by score, then earliest finisher, then lower user id, so it is the same on every load. The glitch match is random, stored, never yourself or in your top 5, and kept until it stops being valid.
- **`/matches`** (`src/app/matches/`): top 5 cards with plain-sentence reasons, and the glitch match drawn differently as a surprise. Aliases and silhouettes only.

**Built (slice 5, #12):**

- **Connection requests** (`src/lib/requests/`): someone in your top 5 or your glitch match can be sent a request, and they approve or decline it on `/requests`. Approving opens the conversation (through `openConversation`) and nothing else: no email is ever shown. The Connect button from slice 4 now stores a real pending request.
- **One helper holds every send rule** (`sendRequest.ts`): not yourself, not someone suspended or unfinished, not a blocked pair, not a pair that already has a request, and only top 5 or glitch match. Because the rules live inside the helper and not in a route or the button, they hold even when something calls it directly.
- **Answering** (`answerRequest.ts`, behind `POST /api/requests/[id]/approve` and `/decline`): only the person asked, only once, and only while the sender is still allowed.
- **The requests page and the nav count** (`/requests`, `src/components/WaitingRequestsCount.tsx`): waiting and sent lists, built from one filter that also drives the number beside the Requests link, so they can't disagree.
- **`areConnected(a, b)`** (`areConnected.ts`): the rule for who may see a photo. An approved request and no block. Slice 7's photo code calls it.

**Built (slice 6, #13):**

- **Messaging** (`src/lib/messages/`): two connected people read and send plain-text messages at `/messages` and `/messages/[conversationId]`. Every message is at most 1000 characters, and the page only draws what the helpers return.
- **One helper holds every sending rule** (`sendMessage.ts`): the conversation must be the sender's, open, between two people who are still connected, and the text not empty and not over 1000 characters. Because the rules live in the helper and not in the route or the form, they hold even when something calls it directly.
- **Someone else's conversation is "not found", not "forbidden"** (`getConversation.ts`, `POST /api/messages/[conversationId]`): a 403 would confirm that the id is real. Reading uses the same rule as sending, so only the two people can ever read a conversation.
- **Closed means closed for good**: `closeConversation` only records the time, `sendMessage` refuses to send in a closed conversation, and `openConversation` returns a closed one still closed. A block (slice 9) is therefore final. A closed conversation can still be read.
- **`openConversation` survives two calls at the same moment**: the database's one-conversation-per-pair rule lets one insert win, and the loser reads the winner's row back instead of failing.

**Built (slice 7, #14):**

- **The account page** (`/account`, `src/app/account/`): your alias, silhouette, bio and picks, your course, your photo and Sign out. The course can be changed straight away; it isn't scored, so nobody is rescored.
- **Editing answers, one category at a time** (`/account/edit/[category]`, `src/lib/account/editAnswers.ts`): the same pick-from-list limits as onboarding, then the server rescores only that person with `scoreUser`. Alias, requests and conversations don't change. Slice 2's real pick screen isn't built, so the pieces it will own sit in clearly marked stand-ins (`src/lib/account/standIns.ts`) to be swapped when it lands.
- **An optional photo** (`src/lib/account/photos.ts`, `photoStore.ts`, `photoRules.ts`): JPEG, PNG or WebP up to 4 MB, kept privately in Vercel Blob (or the gitignored `.photo-store/` folder locally and in tests) and only ever served through `/api/account/photo/[userId]`, which checks the viewer on every request.
- **`ProfilePhoto`** (`src/components/ProfilePhoto.tsx`): the one component slice 4's profile page uses to show a photo. It draws nothing for anyone not allowed to see it, so a stranger can't tell whether a photo exists.
- **`removeProfilePhoto(userId)`** (`@/lib/account/photos`): the shared helper that deletes the stored file and clears the key, used by the account page and by admin remove-photo.

**Built (slice 8, #15):**

- **The admin area** (`/admin`, `/admin/categories`, `/admin/courses`, `/admin/users`, in `src/app/admin/`): admins add, rename, reorder and retire categories, tags and courses, and suspend and unsuspend users. Nothing is ever deleted, and a rename never changes an id or a score.
- **The rules live in small tested functions** (`src/lib/admin/`): one file per area (`categories.ts`, `tags.ts`, `pairings.ts`, `courses.ts`, `users.ts`), each returning plain-English problems the page can show. The pages and Server Actions only call them.
- **Every admin action checks for an admin itself** (`requireAdmin()` as the first line of each Server Action in `actions.ts`): a Server Action is a public address anyone can post to, so the page having checked is not enough. One guard test (`tests/integration/adminActions.test.ts`) calls every action as a member and as nobody.
- **Pairings are edited next to the tag** (`pairings.ts`): a new Seeking or Quality tag is stored together with its pairing in one transaction, so it can never exist unpaired. Changing a pairing does not change any score by itself.
- **"Rescore everyone"** (`rescoreEveryone.ts`, calling slice 3's bulk version): the button after a pairing change. It reports how many people were rescored.
- **Suspending is reversible and rescores the person** (`users.ts`): the person can't sign in, vanishes from the graph and search, and has no scores or glitch match; unsuspending brings them back. An admin can't suspend themselves.
- **Remove photo calls slice 7's `removeProfilePhoto`** (`@/lib/account/photos`): so the file really leaves private storage, and slice 7 can change how photos are stored without this changing.

**Built (slice 1, #8):**

- **Auth.js v5 with email magic links** (`src/auth.ts`, `/api/auth/*`): sign-in without passwords. Sessions are rows in the `Session` table, so a suspension takes effect on the very next page. No `Account` rows are made: magic-link users don't need them.
- **Emails sent through a dedicated Gmail account** (`src/lib/auth/sendMagicLinkEmail.ts`), with an app password: free, and no domain of our own needed. Our own short wording, one retry if Gmail says "try again later", and a test inbox (`.magic-links/`) for the pretend students' `@collabz.test` addresses while the pretend cohort is on. Sending through Resend is kept in the code, switched off, ready for when we have a domain.
- **`/signup` and `/signup/finish`**: one form (email, course, accept the terms). The course and terms travel inside the magic link, so sign-up finishes in whichever browser opens it. An account with no course or no accepted terms counts as not created.
- **`/signin`**, with plain messages for a suspended account and for a used or expired link, and **"Signed in as … / Sign out"** in the nav bar (`src/components/SignedInStatus.tsx`).
- **`getCurrentUser()` now returns the real user** (`src/lib/currentUser.ts`, deciding through `pickCurrentUser()` in `src/lib/auth/accountState.ts`): a finished, unsuspended magic-link user first; otherwise the dev switcher's pretend user where the cohort is on; otherwise nobody. Its name and return value didn't change, so no other track changed any code.
- **First admins from `ADMIN_EMAILS`** (`src/lib/auth/signInRules.ts`): applied once, when an account is created.
- **`/terms` and `/privacy`** in plain English, and **`npm run qr`** for the printable QR code (`public/qr-code.png`).

**Built (slice 2, #9):**

- **Onboarding** (`/onboarding`, `src/app/onboarding/`): one screen per step, one step per catalogue category in catalogue order, then a silhouette, then a summary. The picks stay in the browser until **Finish**. No text boxes. A finished user is sent to `/onboarding/done`, which shows their `ProfileCard`.
- **One save, all or nothing** (`POST /api/onboarding`, `src/lib/profile/saveOnboarding.ts`): the server checks every answer again (`validateOnboardingAnswers`), writes the `Profile` and all its `ProfileTag` rows in one transaction, then calls `scoreUser`. So there's never a half-made profile.
- **The alias** (`src/lib/profile/alias.ts`): "The" + the Vibe tag's alias word + the Energy tag's alias word (`Tag.aliasWord`), with II, III… when taken. The database's unique rule on `Profile.alias`, plus a retry, is what keeps it unique when two people finish at the same moment.
- **The bio** (`src/lib/profile/bio.ts`): plain sentences built from the picked tag names each time it's shown. Never stored.
- **Shared pieces for join-up**: `redirectIfOnboardingIncomplete()`, `generateBio()`, `ProfileCard` (it can't show an email or photo) and `Silhouette`, which shows slice 10's designed pictures (`public/silhouettes/`).
- **The seed adds Skills and Interests** (12 tags each, 1 to 4 picks) and fills in empty alias words, never overwriting one that's set.

**Planned:**


Nothing is left in the planned list except safety (slice 9) and join-up (#17).

## How it looks (slice 10, #45)

The look is changed in one place and reaches every screen. Nothing here changes what a screen does: no route, Server Action or table was touched, apart from two public fields added to the matches data (below).

- **Colours, sizes and shadows are design tokens** in `src/app/globals.css`: a light and a dark set (paper and loam), each named for its job (`bg`, `surface`, `line`, `text`, `muted`, `primary`, `primary-text`, `danger`, and so on). Components use the names (`bg-surface`, `text-muted`), never a raw colour, so dark mode is the same CSS with different values. `prefers-reduced-motion` switches animation off in the same file.
- **Two fonts, loaded from our own site:** Instrument Serif for headings and the wordmark, Figtree for everything else. They are set up with `next/font/google` in `src/app/layout.tsx`, which downloads them at build time, so a visitor's browser never contacts Google.
- **Brand files follow the Next.js conventions:** `icon.svg`, `apple-icon.png`, `manifest.webmanifest` and `opengraph-image.png` live in `src/app/`; the favicon and the PWA icons live in `public/`.
- **Shared pieces in `src/components/`** so no page invents its own: `PersonRow` and `PersonCard` (a person in a list or a card), `StatusPill`, `ScoreBadge`, `TagChip`, `OptionCard`, `ReasonsList`, `StateMessage` and `LoadingState` (empty, error and loading states), `CourseMark` (a course's shape, colour and name), `LegalPage` and `PlaceholderPage`. Form controls are class strings in `src/components/formStyles.ts`; admin has its own in `src/app/admin/adminStyles.ts`.
- **The nav bar is `NavBar` (server) plus `NavLinks` (client).** `NavLinks` is a client component only because marking the current page needs the browser's address. Every link is still shown to everyone; on a phone the row wraps, and from 1024px it fits on one line.
- **Silhouettes are 12 SVG files** in `public/silhouettes/`, with their light and dark colours inside each file. `SilhouetteStandIn` shows them.
- **A course is told apart by shape and name as well as colour:** Software is a blue circle, Business an orange rounded square (`src/lib/course/courseLook.ts`). The graph draws its dots the same way, so the graph still reads in greyscale. The graph's own colour names (`graphColours.module.css`) now point at the global tokens.
- **Desktop layout is added at one breakpoint (`lg`, 1024px) and only there:** the profile is two columns, the graph's tapped person is a side column, the conversation page shows the conversation list beside the thread, and the nav fits on one row. Below 1024px every page is the single phone column it was. The phone layout is the one that is tested first (`tests/e2e/phoneWidth.spec.ts` checks every restyled page at 375px in both themes).
- **`/matches` now carries each person's course** (`courseId` and `courseName` in `MatchCardData`), so its cards can show the course badge like the people list. Both are public (the people list and graph already show them).

## How a request flows through the system

**Viewing the catalogue (built):** browser opens `/catalogue` → Vercel runs the page on the server → the page calls `getCatalogue()` in `src/lib/catalogue.ts` → Prisma asks Neon for the categories and tags that aren't retired, in display order → the server sends back finished HTML. There is no API route in between, because the browser isn't sending anything.

**Deploying (built):** a push to GitHub starts a Vercel build → the build updates the database tables (`prisma migrate deploy`), runs the seed, then builds the app. If the database can't be reached the build fails and the previous version stays live.

**Acting as a pretend student (built, dev and previews only):** pick someone in the "Dev sign-in as" list and press Switch → the browser posts the form to `/api/dev/sign-in-as` → the server stores that user's id in a cookie the page's own scripts can't read, and sends the browser back to the page it was on → from then on `getCurrentUser()` reads the cookie and returns that user. On production the route answers "not found", so `getCurrentUser()` only ever returns someone who really signed in. Anyone really signed in is never swapped for a pretend user.

**Signing up (built):** scan the QR code → `/signup` → email, course and the terms tick box → a Server Action checks them (`checkSignUpForm`) and asks Auth.js to email a magic link whose return address carries the course and terms (`/signup/finish?course=…&terms=accepted`) → Gmail delivers it → the student taps it → `/api/auth/callback/nodemailer`: Auth.js checks and uses up the token, refuses a suspended account, creates the `User` (made an admin if on `ADMIN_EMAILS`) and a `Session` → `/signup/finish` shows the answers filled in → one tap saves the course and terms (`completeSignUp`, which checks them again) → `/onboarding`.

**Signing in (built):** `/signin` → email → magic link → `/signin` again, which sends a finished account home and an unfinished one to `/signup/finish`. Sign out deletes the session row.

**Opening an admin page (built):** the page calls `requireAdmin()` before anything else → nobody signed in: sent to `/signin` → signed in but not an admin: the standard "page not found" page, so a member can't even tell the page exists → an admin: the page renders.

**Changing the catalogue or a user from an admin screen (built):** the admin presses a button on `/admin/categories`, `/admin/courses` or `/admin/users` → the browser posts the form to that page's Server Action → the action calls `requireAdmin()` first (a member or nobody is refused here, even if they posted directly) → the action calls one function in `src/lib/admin/`, which checks its own rules and writes → the action sends the admin back to the screen, with the first problem in the address if the change was refused, and refreshes `/catalogue` and the people pages so the change shows straight away. Pairing changes then wait for **Rescore everyone**.

**Connecting (built):** a user presses Connect on a top 5 or glitch match profile → the browser posts to `/api/people/[alias]/connect` → the route checks again who may be contacted, then calls `sendConnectionRequest`, which checks every rule and stores one pending request inside a transaction → the other person sees it on `/requests` and in the nav count → they press Approve → `POST /api/requests/[id]/approve` → `answerRequest` changes the status only if it is still pending, then calls `openConversation`. Decline stores the answer and opens nothing. Emails are never shown to other users.

**Messaging (built):** a person opens `/messages` → the page calls `listConversations`, which returns only their conversations with the other person's alias and silhouette → they open one → `getConversation` returns the messages, or nothing when it isn't theirs, which shows the standard "page not found" page → they type and press Send → the browser posts to `POST /api/messages/[conversationId]` → the route answers 401 (nobody signed in), then calls `sendMessage`, which checks every rule and stores the message only if all pass (404 not theirs, 409 closed or no longer connected, 422 empty or too long) → the form refreshes the page and the new message appears. The other person sees it the next time they open or refresh the page.

The flows below are planned, not built yet.

**Joining (built):** scan QR → sign up (email, course, accept terms) → magic link → `/onboarding`: 7 pick-from-list steps and a silhouette, kept in the browser → **Finish** → `POST /api/onboarding` checks the answers again, saves the profile and tags in one transaction with a unique alias → `scoreUser` scores the new user against everyone and stores the edges → `/onboarding/done` → graph.

**Editing answers (built):** `/account` → pick a category → `/account/edit/[category]` → save → a Server Action checks the pick limits, stores the picks, and the server deletes and recalculates *only that user's* edges with `scoreUser`. Nobody else's scores change. If the edit moves the glitch match into the user's new top 5, the glitch match is replaced.

**Seeing a photo (built):** the profile page asks `ProfilePhoto`, which draws an image only if the person has one and the viewer is the owner, someone connected to them or an admin → the browser asks `/api/account/photo/[userId]` → the route checks the viewer again and only then fetches the file from private storage. Anyone else, even with the direct link, gets "not found".

## Key decisions and why

- **Next.js with API routes, not a separate backend:** one codebase and one deploy for two beginners.
- **Magic links, no passwords:** we never store passwords, and it fits the QR-code sign-up.
- **Course and terms travel inside the magic link:** on a phone, Gmail often opens links in its own browser, which doesn't share cookies with the one that scanned the QR code. Carrying the answers in the link means sign-up works whichever browser opens it.
- **Gmail for now, Resend kept ready:** Resend needs a verified domain to email anyone but its owner, and we have none. Gmail is free and needs no domain; switching back is documented in `src/auth.ts`.
- **`getCurrentUser()` decides with a plain, tested function:** every track's pages depend on it, so the choice between a real user, a pretend user and nobody lives in `pickCurrentUser()`, where each case has a unit test.
- **Tags, categories and courses are database rows with fixed ids:** admins must manage them (brief), and fixed ids mean renaming a tag never changes a score.
- **Scores are stored, and recalculated only for the user who changed:** a pair's score depends only on those two profiles, so nothing else needs recalculating.
- **Seeking↔Quality pairings are stored data:** complement scoring depends on them, and admins can add tags.
- **Public identity is a generated alias plus a silhouette:** the graph is public, so real identity is shared only after both people agree.
- **Tokens, not raw colours:** one set of named colours that flips for dark mode means a re-skin or a contrast fix is one file, and no page can drift off-palette.
- **Mobile first, one desktop breakpoint:** most of the cohort will open the app from the QR code on a phone, so the phone layout is the default and desktop only adds columns from 1024px. One breakpoint keeps the number of layouts we have to check small.
- **In-app messaging instead of revealing emails:** it meets the brief's messaging requirement and hands out less personal data.
- **Photos in private storage behind a permission check:** a public file URL would let strangers see photos.
- **Everyone is scored against everyone; course is recorded but not used in scoring:** a team decision. Course drives filters and stats.
- **Build in deployed vertical slices, starting with a walking skeleton (slice 0):** proves the stack on real infrastructure first and meets the weekly milestone.
- **Catalogue rows have readable ids set by the seed** (e.g. `energy-sea-captain`): the same ids exist on dev and production, and you can tell what a row is by reading its id.
- **The seed only adds missing rows and never overwrites:** a name changed in the database survives every re-seed, which is what makes it safe to seed on every deploy.
- **Rows are retired, never deleted** (`retiredAt`): anything pointing at a tag, like a stored score later on, keeps pointing at a real row.
- **The catalogue page is rendered on every request:** otherwise Next.js would build it once and a renamed tag would never show up.
- **Tests use a real database, not a mock:** proving Prisma and Neon work together was the point of slice 0, and a mock would hide exactly those problems.
- **Prisma is pinned to 7.10:** npm's "latest" was an 8.0 release candidate, and we don't want to debug pre-release software.
- **All the tables were created up front, in one migration:** five people build at once, and separate migrations from separate tracks would collide. Schema changes after this are rare and announced first.
- **Pretend students instead of waiting for each other:** matching needs profiles and messaging needs connections, so without pretend data each slice would have to wait for the one before.
- **The pretend cohort is off unless switched on, and can't be switched on in production:** the switcher lets anyone become any user, including the admin, so forgetting a setting must leave it off, not on.
- **Pretend students live in their own seed file, behind their own command:** the catalogue seed runs on every deploy, including production, and pretend students must never get there.
- **A pair of users is stored once, lower id first** (`orderUserPair`): a score or a conversation belongs to the pair, and storing it once means there can never be two that disagree.
- **Tracks call each other only through the shared helpers:** when the real version of a helper lands, nobody else's code has to change.
- **The graph shows every edge, and readability comes from thickness, fading and distance:** hiding weak lines would hide the shape of the cohort, which is the point of the graph. Stronger scores draw thicker, darker and closer.
- **The same function decides who can be contacted on the page and in the server route** (`getConnectPermission`): if the button and the route each had their own copy, they could one day disagree, and the route is the one that matters.
- **The graph layout settles and stops:** a graph that never stops drains a phone's battery and is hard to tap. Pulling a dot restarts it for a short settle.
- **A pulled dot stays where it is let go, up to twice the settled graph's radius** (`dragLimit.ts`): the point of pulling is to tease apart a tangle and look, so snapping back defeats it. The limit stops one flick leaving a dot out of reach. Pins last until a reload, because nothing is saved.
- **The send rules live in one helper, not in a route** (`sendConnectionRequest`): hiding a button or checking in one route stops nobody sending by hand, and a helper is what every caller, including a future one, has to go through.
- **"One request per pair" is enforced in code, in a serializable transaction, with no schema change:** a unique rule on (from, to) would miss the reverse direction, and the schema was settled up front. Two presses at once make one request, and Neon reports a conflict as a `DriverAdapterError` rather than Prisma's `P2034`, so the retry recognises both.
- **A decline is final for the pair, in both directions:** it protects the person who said no and makes the rule easy to state, check and test. Loosening it is one check.
- **Blocked and suspended look the same to the sender:** "this person blocked you" would be a safety leak, so both answer "You can't send a request to this person."
- **The waiting count and the page's list come from one filter:** a count of 3 over a list of 2, or an Approve button that answers 409, would look broken.
- **The photo rule is a function** (`areConnected`, used by `canSeePhoto`): upload and serving are slice 7's, and a block makes the rule false by itself, so slice 9 needs no extra code here.
- **Photos are checked twice, and never go through Next.js's image cache:** the page checks so it never shows a broken image, and the photo address checks on every request. `<Image>` would copy a private photo into a shared cache, so a plain `<img>` is used.
- **A member who opens an admin page gets "page not found", not "access denied":** it gives nothing away, and Next.js's "forbidden" page is still experimental.
- **Admin actions check for an admin themselves, not just the page:** a Server Action can be posted to directly, so the page's check protects nothing. Each action calls `requireAdmin()` first, and one test calls every action as a member.
- **A new tag's id is `<category>-<name>`, made once:** it matches the seeded ids and is readable. A name that would make an existing id is refused rather than numbered, and a rename never touches the id.
- **A new Seeking or Quality tag is stored with its pairing, in one transaction:** an unpaired tag could never score, so it must not exist for even a moment.
- **A pairing editor keeps an existing pair with a retired tag:** people who already picked the retired tag still count it in their scores, so saving the editor must not silently drop it.
- **"Rescore everyone" reuses slice 3's one-transaction bulk function, not a loop of `scoreUser`:** a loop makes a database round trip per person, which is too slow even for 30 and could pass a Vercel function's time limit.
- **Suspending rescores the person after saving:** a scoring problem must never undo the suspension, and rescoring is what removes them from everyone's top 5 and glitch match.
- **Admin "remove photo" calls slice 7's helper rather than clearing the key:** clearing the key alone would leave a private photo in storage that nobody can reach or delete.
- **Onboarding saves once, at the end:** the database never holds a half-made profile that matching or the graph would have to work around. The cost, accepted: refreshing mid-way loses the picks.
- **Alias words live on the tags, not in code:** they stay with the data they describe and an admin can edit them. The seed fills only empty ones.
- **The answer check is a pure function the server always runs:** the browser's limits only guide, and the same check can be tested without a database.

Full reasoning: `openspec/changes/archive/2026-10-01-2-mvp-overview/design.md` and `openspec/changes/archive/2026-10-01-4-brief-alignment/design.md`. For slice 0: `openspec/changes/archive/2026-10-08-6-tag-catalogue/design.md`. For the foundation: `openspec/changes/archive/2026-10-08-7-foundation/design.md`. For the graph, people list and profile pages: `openspec/changes/archive/2026-10-12-11-graph-search/design.md`. For connection requests: `openspec/changes/archive/2026-10-12-12-connection-requests/design.md`. For chemistry matching: `openspec/changes/archive/2026-10-13-10-matching/design.md`. For sign-up and sign-in: `openspec/changes/archive/2026-10-14-8-user-auth/design.md`. For onboarding: `openspec/changes/archive/2026-10-15-9-onboarding/design.md`.

## Open questions / known gaps

- Slice 0, the foundation and slices 1 to 8 are built. Real people can now sign up and onboard, alongside the pretend cohort. The only placeholder left is `/admin/reports` (slice 9).
- The five stand-ins in `src/lib/cohort/standIns.ts` are temporary, and the real `getTopFive` and `explainMatch` now exist in `src/lib/matching/` under the same names, so join-up (#17) swaps them and the two "finished and not suspended" rules (written twice on purpose) get merged. `sendConnectionRequest` was agreed and is real.
- The profile page (slice 4's) is still rough in two places: after a decline it still shows Connect, though pressing it is refused with a clear sentence, and a waiting request doesn't say who asked. Join-up (#17) tidies both. The graph and list don't yet hide people who have blocked you, The profile page now shows a photo to connected people (slice 7).
- Requests can't be withdrawn, and there is no email when one arrives. Both were left out on purpose.
- Sign-in on production needs `AUTH_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM` and `ADMIN_EMAILS` in Vercel; until they are set it fails with a server configuration error. Magic-link delivery was only checked into Gmail, not Outlook or iCloud.
- The pretend cohort, the dev switcher and their switch are temporary. Join-up (#17) deletes them once real sign-in and real profiles exist.
- The 23 Seeking↔Quality pairings are a draft that was assumed approved so slice 3 could be built. If the team changes them, edit `prisma/seed-data.ts` and run `npm run rescore:all`. Skills and Interests are not scored (B5); slice 2 seeds them, and the pretend cohort gives every pretend person some at random.
- The pretend requests and conversations were built from the old invented ranking, so a few may sit between people who are no longer in each other's top 5.
- Tests empty the tables on the shared `dev` database and refill them at the end. Two people running tests at the same moment can trip each other up, and anything changed by hand on `dev` is lost on the next test run.
- Still to be recorded on #7: Tom's check of the `User` and sign-in tables, and the team's agreement on who creates migrations.
- Email-sending service for magic links: not chosen (slice 1).
- File storage provider: Vercel Blob, private. Production needs `BLOB_READ_WRITE_TOKEN`, which Vercel adds when a Blob store is connected to the project.
- The account page's answer editing, and slice 4's pages, still run on stand-ins for slice 2's pick screen, bio, rules, silhouette and onboarding check. Slice 2 has landed, so join-up (#17) can now swap each one for the real piece it names.
- Onboarding isn't saved part-way: leaving or refreshing mid-way starts again. It takes about two minutes, so this was accepted.
- Messages refresh on page load, and there are no unread markers. Real-time chat is a stretch goal. A conversation loads all its messages at once, which is fine at cohort size.
- A suspended person is treated as no longer connected for sending, but the conversation stays readable and listed. Slice 8 did not change this, so hiding them from the list is still a follow-up.
- The admin screens (slice 8) have no dashboard stats, and cannot view a profile or reset someone's onboarding: all three are MVP Later. A users list has no search, which is fine at cohort size. Whether a first real admin account exists on production depends on `ADMIN_EMAILS` being set before that person signs up.
- The full list of open questions per slice is in `openspec/changes/archive/2026-10-01-4-brief-alignment/design.md` § Open Questions.
