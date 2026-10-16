# Tasks

Work one group at a time and pause after each. Commit and push only when Patrick says. Run no test suites while building (lint and type check only); the new e2e spec is written here and run by Patrick when the PR is open.

## 1. The course on the Vercel deployment

- [x] 1.1 Move the course: `mv docs/Collabz-course public/course`. Verify `public/course/index.html`, `styles.css`, `main.js` and `modules/` exist and `docs/Collabz-course` is gone.
- [x] 1.2 Read the redirects doc again, then add one `redirects()` entry to `next.config.ts` (source `/course`, destination `/course/index.html`, `permanent: false`) with a comment saying why (Next serves a `public/` file at its exact path only). Verify with `npm run dev`: `curl -I localhost:3000/course` answers 307 with that location, `curl -I localhost:3000/course/index.html` answers 200, and `/`, `/catalogue` and `/demo/graph` still answer as before.
- [x] 1.3 Add `tests/e2e/showcase.spec.ts` (read-only, no database, no sign-in): `/course` ends on `/course/index.html` and shows the course's first heading; `styles.css` and `main.js` answer 200. Verify it lints and type-checks (do not run it).
- [x] 1.4 Scan what is about to be published, `public/course/`, for database addresses, app passwords, `AUTH_SECRET` values, `/home/` paths and email addresses (the `@collabz.test` addresses and the repo address are fine). Verify the command and its empty result are written in the commit body.

## 2. The architecture diagram

- [x] 2.1 Copy the diagram's source to `docs/media/architecture.json` and the finished page to `public/architecture.html`. Verify `/architecture.html` opens under `npm run dev` and its light and dark themes both switch.
- [x] 2.2 Export `docs/media/architecture-light.png` and `docs/media/architecture-dark.png` with a Playwright screenshot of the page in each theme. Verify both files exist, are not blank, and the dark one has a dark background (open each).
- [x] 2.3 Add a test line to `tests/e2e/showcase.spec.ts` that `/architecture.html` loads and has the diagram's title. Verify lint and type check pass (do not run it).

## 3. The video, the slides and the new QR code

- [x] 3.1 Copy `brag-output/brag.mp4` and `brag-output/brag.jpg` to `docs/media/`. Verify the sizes match the originals (about 2.7 MB and 84 KB) and `brag-output/` is left untracked.
- [x] 3.2 Make the QR code with `npm run qr -- https://collabz-ten.vercel.app public/qr-live-site.png` (the second argument is what protects the other codes). Verify `public/qr-code.png` and `public/qr-graph-demo.png` are unchanged (`git status` shows neither) and Patrick scans the new code with a phone and it opens the live site.
- [x] 3.3 Publish Tom's slides as a cleaned copy at `public/slides/collabz.html`: slide 12 (the photo) removed and the rest renumbered, Tom's email painted out of the privacy screenshot, all images recompressed to WebP. Verify it is under 5 MB; the page and the deck's slide list both have 16 slides; no `tomhazz`, `@gmail.com` or JPEG remains in the file; the redacted screenshot is blank where the email was; and a real browser steps through all 16 slides with a "n / 16" counter and no console errors.
- [x] 3.4 Add a line to `tests/e2e/showcase.spec.ts` that `/slides/collabz.html` opens and says "1 / 16". Verify lint and type check pass (do not run it).

## 4. The README

- [ ] 4.1 Open the home page, `/demo/graph`, `/catalogue` and `/course/index.html` on `https://collabz-ten.vercel.app` once the course has deployed (or on the PR's preview address before then) and note which work. Verify the "try it" list in 4.2 contains only the ones that do.
- [x] 4.2 Replace the README's old title, blurb and "What this is" with the portfolio front door: tagline, pitch, video thumbnail, live site, QR code, "try it", the student-project disclaimer (issues only, no email), the `<picture>` architecture diagram with the interactive link, and links to the course, to `openspec/changes/archive/`, and a link to the slides. Verify every relative path in the new section points at a file that exists.
- [x] 4.3 Add the learning journey and team section as designed (decision 9), then put `## For developers` above "Prerequisites" with the old "see WORKFLOW.md" line under it. Verify with a diff that nothing from "Prerequisites" down changed apart from that heading, and that the existing in-README anchors (`#pretend-cohort`, `#matching`, `#safety`, `#shared-helpers`) still resolve.
- [ ] 4.4 Push the branch (when Patrick says) and open the README on GitHub. Verify the video thumbnail's link opens the video, the diagram shows in the reader's theme, and every link works. If the video link does not behave, switch to the fallback in design decision 5.

## 5. Finish

- [x] 5.1 Run `npm run lint` and `npx next typegen && npx tsc --noEmit`, then `npm run build`. Verify all three pass and the build output still lists the app's routes.
- [x] 5.2 Add one sentence to `ARCHITECTURE.md` (the course and the diagram are static files in `public/`, and `/course` is a redirect in `next.config.ts`). Verify it reads correctly in context.
- [ ] 5.3 Open the PR, with Patrick running the full suites. Verify the preview address serves `/course`, `/architecture.html` and the README links, and tell Tom the slides folder is waiting.
- [ ] 5.4 Tell Tom the cleaned slides are published, what was changed (design decision 11), and that his original is untouched. Verify he has looked at `/slides/collabz.html` on the preview and is happy with it.
