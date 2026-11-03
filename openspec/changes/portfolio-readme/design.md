# Design: turn the repo into a portfolio piece

## Context

See `proposal.md` for why. What is true today:

- The repo is public (`github.com/pjfpotter/Collabz`) and its homepage setting already points at `https://collabz-ten.vercel.app`, the stable production address.
- `README.md` is 660-odd lines of developer manual. Its top is the old "Tinder for Business" blurb. Other parts of the README link into it by heading (`#pretend-cohort`, `#matching`, `#safety` and so on), so those headings must not move or be renamed.
- The finished course sits **untracked** in `docs/Collabz-course/`: `index.html` (assembled by `build.sh` from `_base.html`, `modules/*.html` and `_footer.html`), `styles.css`, `main.js`. About 230 KB, relative links only, and its one outside dependency is Google Fonts. It was checked for secrets and machine paths and is safe to publish.
- The promo video is `brag-output/brag.mp4` (2.7 MB) with `brag.jpg` as its still. `brag-output/` is untracked, and most of it (the Hyperframes project in `composition/`) is not wanted in the repo.
- The architecture diagram was made with Archify: `.archify/…/collabz-beginner.html` (762 KB, self-contained, with a built-in light and dark theme) and its `candidate.json`. `.archify/` is gitignored.
- `scripts/make-qr-code.ts` already takes a second argument for the output file, so a new QR code cannot overwrite the sign-up one by accident.
- There is no `middleware`/`proxy` file, so nothing in the app can intercept `/course` or `/architecture.html`.
- `CLAUDE.md` warns this Next.js version differs from what we know. `node_modules/next/dist/docs/…/redirects.md` was read for this design: `redirects()` in `next.config` is checked **before** the filesystem and `public/`, and `permanent: false` gives a 307.

## Goals / Non-Goals

**Goals:**
- A visitor who lands on the repo understands Collabz, sees it, can try the parts that need no account, and sees how we built it, all from the README.
- Everything the README links to is either in the repo or live on the site, so no link goes stale when someone's laptop is closed.
- The developer manual loses nothing: no section is removed or renamed.
- The README is honest about what this is: a student project.

**Non-Goals:**
- No new app pages, routes, nav links or database changes. (The course and diagram are plain files in `public/`.)
- No GitHub issue templates, `SECURITY.md` or other community files. The disclaimer points at plain GitHub issues. These are a possible follow-up.
- Not committing `brag-output/composition/`, the video's source project, or the `codebase-to-course-main` skill folder. They stay untracked and are not part of this change.
- No rewrite of the course, the video or the slides' content. The slides are only cleaned (see decision 11), never reworded.

## Decisions

**1. Host the course on Vercel, in `public/course/`, not on GitHub Pages.**
Both are free for a public repo. Vercel wins because the files already deploy with every merge, the address is the one we already print on QR codes, and there is nothing new to switch on or keep an eye on. Pages would give a second address and a second place for things to go wrong. The cost is that the files are part of the Next.js deployment, which is fine at 230 KB.

**2. Move the course; do not keep a second copy.**
`mv docs/Collabz-course public/course`. Two copies would drift, and `build.sh` still works from inside `public/course/`. The cost is that `build.sh`, `_base.html` and the module parts are served publicly too. That is harmless in a public repo, and keeping them next to `index.html` is what lets a teammate rebuild the course.

**3. One `redirects()` entry for `/course`; the file itself stays at `/course/index.html`.**
Next.js serves exactly the path of a file in `public/`, so `/course/` on its own would not find `index.html`. A redirect from `/course` to `/course/index.html` makes the short address work. `permanent: false` (a 307) so we can change our minds without browsers caching the answer. The course's relative links (`styles.css`, `main.js`) resolve against `/course/index.html`, so they keep working. **This is the only edit to existing config and needs approval.**

**4. The diagram is one standalone file at `public/architecture.html`, plus two PNGs for the README.**
The interactive HTML is what a curious visitor wants; GitHub will not run it, so the README embeds PNGs. Both themes are exported (a Playwright screenshot with the diagram's `data-theme` set to `light` and to `dark`), and the README uses a `<picture>` element with `prefers-color-scheme` so a reader gets the one that matches their GitHub theme. The diagram's `candidate.json` is kept in `docs/media/` so anyone can regenerate it. The picture is a snapshot of `ARCHITECTURE.md` as of this change; the README says so.

**5. The video is a thumbnail linking to a copy served from the live site, not an inline player.** *(Revised after the first version: GitHub's own file viewer refused to show the 2.7 MB `.mp4` ("we can't show files that are this big"), so the video moved from `docs/media/` to `public/promo-video.mp4` and the thumbnail now links to `https://collabz-ten.vercel.app/promo-video.mp4`, where the browser plays it natively.)*
GitHub does not play a video inside a README, and (found after merging) its file viewer will not show a file this size either. A clickable `docs/media/brag.jpg` that opens the video served by the live site is the dependable version, and it works on a phone.

**6. README layout: showcase first, manual second, existing headings untouched.**
The old title, blurb and "What this is" are replaced by the new top section. Everything from "Prerequisites" down stays word for word, with one new `## For developers` heading above it (and the old "see WORKFLOW.md" pointer moved under it). Not demoting the old `##` headings keeps every in-README anchor working and keeps the diff small enough to review.

**7. The "try it" section only offers what works without an account.**
The sign-in on production depends on Vercel variables (see `ARCHITECTURE.md`, open questions) that this change cannot see, so the README's "try it" list is the home page, `/demo/graph` (a playable graph with 40 invented people, no sign-in), `/catalogue` and the course. Task 4.1 opens each of them on production before they go in the README. Sign-up is mentioned, but not promised, until it has been checked.

**8. The disclaimer, in words.**
Collabz is a student project from a bootcamp. It has no active admins, so nobody is watching `/admin/reports` day to day. Bugs and questions go in a GitHub issue. If something dodgy is going on, say so in a GitHub issue too. No email address is published, on purpose: the repo is public and the address would be scraped.

**9. The learning journey is built from facts we were given or can point at.**
Sources: the pasted project notes (brief, interviews, 25 Sept MVP decisions), `ARCHITECTURE.md`, the issue slice map (#18) and the board's assignees, and the archived changes. In particular:
  - **Messaging:** the first MVP plan was "request, approve, reveal contact details, no in-app chat". We built in-app messaging because the course brief required messaging, and it also shares less personal data.
  - **Look:** shipped in light and dark modes. The earlier "Mycelium" direction is not named, because what shipped is a different palette (paper and loam, see `ARCHITECTURE.md`).
  - **What we learned about OpenSpec:** it worked so well that by the end every commit ran a large test suite, which slowed us down.
  - **Project management:** GitHub Projects as a kanban board.
  - **Who built what:** Patrick (`pjfpotter`): foundation, graph and search, requests, messaging, admin, safety, matching. Tom (`t-j-harrington`): sign-up and sign-in, account page. Marvin (`Entr0zy`): onboarding. Walied and Koulla were early members of the group who left. The README thanks them for that time and does not credit them with slices.
  The section is written as "we", in plain English, and does not invent dates beyond the two we have (24 and 25 Sept 2026) and the first commit.

**10. One small read-only end-to-end spec.**
`tests/e2e/showcase.spec.ts` opens `/course/index.html`, `/course` and `/architecture.html` and checks they load. It touches no data, so it is safe against a preview URL. It is written in this change but not run by the agent: Patrick runs the full suites when the PR is open.

**11. Tom's slides: a lighter, cleaned HTML copy served from the site, not a PDF and not the original.**
Tom's deck (`Collabz.html`, 16-17 MB, one self-contained file) was read in full before publishing: the script is only the deck's own navigation, the three "web embed" slides are local animated SVGs, and no picture shows secrets. Three things were fixed in a **copy**, by a script (`build-slides.py`, run once, kept in the scratchpad, not in the repo):
  - **Slide 12 is removed** (a photograph of a teammate's face): from the page and from the deck's own slide list, with the later slides renumbered, so the "n / total" counter and the key and swipe navigation stay correct. Patrick's call: a face in a public repo stays in git history for good.
  - **Tom's personal email is painted out of one screenshot** (the privacy page, where it appears as pixels, not text). The same address is on our live `/privacy` page, so this is about not spreading it further, not about hiding it.
  - **Every embedded image is recompressed to WebP** and capped at 1920 px wide (the slide stage is 1920 wide, so more pixels are never seen). 17 MB becomes about 2.8 MB, with no visible loss.
It stays HTML because people read slides on their phones, not PDFs (Patrick's call). It is served from `public/slides/collabz.html` for the same reasons as the course (decision 1). Tom's original file is untouched, and he should look the copy over. One catch found while building it: the deck's JSON must write `<` as `\u003c`, because the embeds contain `</script>` and a raw one would end the data block early and break the whole page.

## Risks / Trade-offs

- **[The README's picture goes out of date as the system changes]** → The README says it is a snapshot and links `ARCHITECTURE.md` as the live description. The diagram's JSON is kept so it can be regenerated.
- **[The video link does not play on GitHub]** → Checked on the pushed branch (task 4.4), with the release-asset fallback above.
- **[The course goes stale next to the code]** → It is the team's explainer for the project as presented. The README names the date it reflects.
- **[`redirects()` could affect other routes]** → The source is the exact path `/course` only. Task 1.2 checks `/`, `/catalogue` and `/graph` still behave.
- **[A public file could leak something]** → The course was checked; the diagram contains only what is in `ARCHITECTURE.md`; task 1.4 runs a search for database addresses, passwords, secrets, `/home/` paths and emails over every file this change publishes, and `.env` is not touched.
- **[Production sign-in may not be set up]** → The README does not promise it (decision 7).
- **[Large binary files in git]** → About 3 MB of video and images, plus the 2.8 MB slides, plus the diagram. Under 10 MB in total, a one-off, and fine for a portfolio repo. The original 17 MB deck is deliberately not committed.
- **[The cleaned slides differ from what Tom presented]** → Only the photo slide, one email in one screenshot and the image encoding changed. Tom is asked to look over the copy before the PR merges.
- **[The privacy-page screenshot now has a blank line where the email was]** → Accepted: it is a screenshot of an app page, and the sentence still reads as a pointer to the admins.

## Open Questions

- Whether to open a GitHub issue for this work so the change, branch and PR share a number, as `WORKFLOW.md` asks. If so, rename the change and branch to match.
