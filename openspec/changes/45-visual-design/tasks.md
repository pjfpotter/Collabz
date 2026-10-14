# Tasks: Slice 10, visual design (#45)

Before starting: `git checkout feature/45-visual-design`, merge `master`, `npm install`, `.env` with the three database URLs and `PRETEND_COHORT=on`, then `npx prisma migrate deploy` and `npm run seed:fake`. The reference for every look is the export at `design-export/Collabz.html` (read-only, outside the repo). No task changes a route, a Server Action, the schema or what any screen does.

Groups build on each other in order: tokens and brand (1), shared pieces (2, 3, 4), screens (5 to 9), then the desktop pass and wrap-up (10). **Pause after each group and show what changed.** Every new file gets "why" comments (CLAUDE.md). `/onboarding` is not touched.

Verify at 375px and 1280px, in light and dark, for every group that changes what is seen. In Chrome devtools, dark mode is under Rendering, "Emulate CSS prefers-color-scheme".

## 1. Tokens, fonts and brand files

- [x] 1.1 Replace `src/app/globals.css` colour variables with the full light and dark token set (bg, surface, surface-2, line, line-strong, text, muted, primary, on-primary, primary-text, software, business, business-text, glitch, danger), radii (10, 18, 26/22/26/22, pill) and shadows, mapped with `@theme inline` (design 1). Verify: `npm run dev`; the home page is paper-coloured in light and loam in dark, and `npm run build` passes
  - Checked 14 Oct 2026: `npm run lint` and `npm run build` pass; the compiled CSS holds the light values, the dark block and the token classes. The old names `bg-background` and `text-foreground` still work. Not yet looked at in a browser: Chrome can't open the local server, so the light and dark look is for Patrick to see on the preview.
- [x] 1.2 Load Instrument Serif and Figtree with `next/font/google` in `src/app/layout.tsx` (replacing Geist) and set body to Figtree and headings to the display font (design 2). Verify: in devtools Computed, body is Figtree and `h1` is Instrument Serif; no request goes to Google in the Network tab
  - Checked 14 Oct 2026: the production build serves Figtree and Instrument Serif from our own site (`font-family: Figtree`, `Instrument Serif` in the compiled CSS, font variables on `<html>`). No Google request is made by the browser; not yet looked at in devtools.
- [x] 1.3 Move the brand files into the Next.js conventions (design 3): `icon.svg`, `apple-icon.png`, `manifest.webmanifest`, `opengraph-image.png` in `src/app/`; `favicon.ico`, the 192, 512 and maskable PNGs and `mask-icon.svg` in `public/` (Next refuses the export's ico inside `src/app/`); add the `viewport` theme colours (page titles already end "· Collabz", so no title template is added); delete `public/collabz-brand-assets/`. Verify: view source shows the icon, apple-touch-icon, manifest and theme-color tags, `/manifest.webmanifest` opens and its icon URLs return 200
  - Checked 14 Oct 2026 on a production build (`next start`): the page head has the manifest, both theme-colour tags, the share image tags, `icon.svg`, `favicon.ico`, `apple-touch-icon` and `mask-icon` links, and `/manifest.webmanifest`, the three PNG icons, `/favicon.ico`, `/icon.svg`, `/apple-icon.png`, `/opengraph-image.png` and `/mask-icon.svg` all return 200. `public/collabz-brand-assets/` is gone.
- [x] 1.4 Add `reduced-motion` handling in `globals.css` (no transitions or animation under `prefers-reduced-motion: reduce`). Verify: with the emulation on, chips and panels don't animate
  - The rule is in `globals.css` and compiled into the CSS. There are no chips or panels yet to see it work, so it gets looked at for real in groups 4 and 7.
- [ ] 1.5 Run `npm test`, `npm run lint` and `npm run test:e2e`. Verify: all pass (nothing in this group should change behaviour)
  - Result 14 Oct 2026: `npm run lint` and `npm run build` pass; `npm run test:e2e` passes (127 of 127). `npm test` had **43 failures in 6 files, all foreign-key errors in `Edge` and `TagPairing`** (e.g. `TagPairing_qualityTagId_fkey` during `emptyDatabase`), which is the pattern of two runs sharing the one test database. This group changes only CSS, fonts and icons, so it is not the cause. Left unticked until `npm test` is run again on a quiet database.

## 2. Silhouettes and course mark

- [x] 2.1 Check the seed's silhouette ids (`prisma/seed-data.ts` and the pretend cohort) against `silhouette-01` to `silhouette-12`. Verify: a short list of the ids found is shown to the team; stop and ask if they differ (design 5)
  - Checked 14 Oct 2026: the pretend cohort (`prisma/pretend-cohort.ts`) stores `silhouette-01` to `silhouette-12`, spread evenly, and `SILHOUETTE_IDS` in the account stand-ins has the same twelve. The ids match.
- [x] 2.2 Add the twelve silhouettes as SVG files in `public/silhouettes/silhouette-01.svg` … `-12.svg` (where slice 2's design 7 puts them, colours for light and dark inside each file), and make `SilhouetteStandIn` show them at its existing `size`, with the same props (team decision, 14 Oct 2026). Verify: `/matches` and `/graph` show the new pictures; they read at 24px and at 96px in both themes
  - Checked 14 Oct 2026: a contact sheet of all 12 at 24, 48 and 96px in Chrome shows each reading clearly, in the light colours and (with the dark values forced, since headless Chrome would not switch scheme) the dark colours. `SilhouettePlaceholder` on the account page now shows the real picture too. Unknown ids fall back to `silhouette-01`. The three e2e selectors `svg[data-silhouette]` became `img[data-silhouette]`; the requests, profile, messages, account, matches and graph specs pass (59). Slice 2 only needs to add `silhouettes.ts` and its picker: the files are done.
- [ ] 2.3 Add `CourseMark` (shape + colour + name) and the course badge, and the grey circle fallback for other courses (design 4). Add a unit test for which shape and colour each course id gets. Verify: `npm test` passes, and a greyscale screenshot of the badge pair still tells the two apart
  - Built 14 Oct 2026: `src/lib/course/courseLook.ts` (shape and colour per course), `src/components/CourseMark.tsx` (badge and plain variants) and `tests/unit/courseLook.test.ts` (4 passing). Left unticked: it isn't used on any screen yet, so the greyscale check waits for group 6.

## 3. Navigation and the always-there strip

- [ ] 3.1 Restyle `NavBar` on the tokens, keeping every link it has now (design 7): display wordmark, 44px tap targets, visible focus ring, Requests count badge hidden at zero, wrapping so nothing scrolls sideways. Verify: at 375px every link is reachable and tappable and the page doesn't scroll sideways; the links are the same set as before
- [ ] 3.2 Restyle `SignedInStatus` ("Signed in as … Sign out") and the `DevUserSwitcher` as the dashed orange dev strip, still dev-only. Verify: signed in as a pretend user the status shows on every page; the strip is absent when `PRETEND_COHORT` is off
- [ ] 3.3 Update any e2e test that relied on the old nav (`tests/e2e/navigation.spec.ts`, `switcher.spec.ts`) and add the 375px no-sideways-scroll check to `navigation.spec.ts`. Verify: `npm run test:e2e` passes

## 4. Cards, chips, pills and states

- [ ] 4.1 Add the shared pieces: status pills (Waiting, Connected, Declined), tag chip and option card (default, selected, limit reached, focus), person row and person card, and the "why you match" list layout. Each takes its text as props (design 8). Verify: a throwaway `/dev/ui` page is NOT added; instead check each in place when used in groups 5 to 9, and run `npm run lint` and `npm run build`
- [ ] 4.2 Add the empty, error, loading (shapes only), 404 and placeholder states; restyle `PlaceholderPage` and `LegalPage` on them, and the app's `not-found` and `error` pages if present. Verify: opening `/does-not-exist` shows the new 404, and `/admin` as a member shows the same page (it must still look identical to a missing page)

## 5. Home, sign up and sign in

- [ ] 5.1 Restyle `/` (home) with the wordmark, keeping its existing text. Verify: at 375px and 1280px, both themes
- [ ] 5.2 Restyle `/signup` (form, course choice, terms), `/signup/finish` and `/signin`, including their error and "check your email" states. Verify: `tests/e2e/signup.spec.ts` and `signin.spec.ts` pass; the forms work by keyboard with a visible focus ring
- [ ] 5.3 Update any selectors those tests need. Verify: `npm run test:e2e` passes

## 6. Matches, people and profile

- [ ] 6.1 Restyle `/matches` (`MatchCard`, top five, glitch match, existing wording unchanged). Verify: `tests/e2e/matches.spec.ts` passes; a 60-character alias wraps at 375px
- [ ] 6.2 Restyle `/people` and its filters, with the new empty state when filters match nobody. Verify: `tests/e2e/people.spec.ts` passes; filters usable at 375px
- [ ] 6.3 Restyle `/people/[alias]`: header, "Why you match", the connect box in each state (can connect, waiting, connected, cannot). Verify: `tests/e2e/profile.spec.ts` passes; the Connect button still shows only for the six allowed people

## 7. Graph (look only)

- [ ] 7.1 Repoint `graphColours.module.css` at the global tokens, keeping every existing colour name and role (design 6). Verify: legend and canvas agree in both themes, and `git diff` shows no change to any number in `CohortGraph.tsx`'s layout or line-weight constants
- [ ] 7.2 Draw nodes as circles (Software) or rounded squares (Business) in the canvas drawing code and the tap area, and show the same shapes in the legend with `CourseMark`. Verify: in greyscale the two courses differ by shape; tapping a node still opens its panel
- [ ] 7.3 Restyle the node panel and the text list under the graph (the full alternative) with the shared components. Verify: `tests/e2e/graph.spec.ts` passes; at 375px the graph, legend and list are all reachable with no sideways scroll; pulling a node still stops at the limit and tapping still doesn't move it

## 8. Requests and messages

- [ ] 8.1 Restyle `/requests` (waiting and decided lists, status pills, `RequestActions`). Verify: `tests/e2e/requests.spec.ts` passes
- [ ] 8.2 Restyle `/messages` and `/messages/[conversationId]` (thread, message bubbles, closed-conversation state, 1000-character limit hint). Verify: `tests/e2e/messages.spec.ts` passes; the message box stays visible above the phone keyboard

## 9. Account, admin and the plain pages

- [ ] 9.1 Restyle `/account` and `/account/edit/[category]` (course, photo, edit lists, `PhotoForm`, `CourseForm`). Verify: `tests/e2e/account.spec.ts` passes
- [ ] 9.2 Restyle `/admin` and its sections (menu, categories and tags, courses, users) on the same tokens; tables scroll inside their own box on a phone, never the page. Verify: `tests/e2e/admin.spec.ts` passes
- [ ] 9.3 Restyle `/catalogue`, `/privacy` and `/terms`. Verify: `tests/e2e/catalogue.spec.ts` passes; the legal text is readable at 375px

## 10. Desktop pass and wrap-up

- [ ] 10.1 Compare each restyled screen at 1280px against the Desktop layouts board (matches, graph with side panel, profile, messages, sign up) and fix gaps. Verify: a side-by-side check per screen is shown to the team
- [ ] 10.2 Run a no-sideways-scroll check at 375px across every restyled route in both themes (extend the e2e test from 3.3). Verify: `npm run test:e2e` passes
- [ ] 10.3 Update `ARCHITECTURE.md` (tokens, fonts, nav, silhouette set, graph encoding, brand files) and the README's file map if it lists components. Verify: a reader can find where colours and components live from the overview alone
- [ ] 10.4 Final `npm test`, `npm run lint`, `npm run build` and `npm run test:e2e`; open the preview deployment on a real phone through the QR code. Verify: every restyled page loads, both themes, with the nav usable by thumb
