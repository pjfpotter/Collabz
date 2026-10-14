# Tasks: Slice 7, account page (#14)

Groups build on each other: photo storage and rules (1), the photo routes (2), the account page with course and photo (3), editing answers with slice 2 stand-ins (4), showing the photo on profile pages (5), docs (6), then deploy (7). Each group lands its own tests. Steps marked **(human)** need a browser login or the Vercel dashboard.

Before starting: `git merge origin/master` into `feature/14-account` if slice 1's archive (#37) has merged, then `npm install`.

## 1. Photo storage and photo rules (no pages yet)

- [x] 1.1 Install `@vercel/blob@2.8.1` at an exact version. Add `BLOB_READ_WRITE_TOKEN` to `.env.example` (comment: only needed on Vercel; locally photos go to `.photo-store/`), and `/.photo-store/` to `.gitignore` (design 1). Verify: `npm install` finishes without peer-dependency errors
- [x] 1.2 Add `src/lib/account/photoStore.ts`: the `put`/`get`/`delete` interface, the Vercel Blob version (`access: "private"`), the folder version, and the rule choosing between them (token set → Blob; no token and not production → folder; production without token → clear error). Unit test the folder version (put then get returns the same bytes; delete then get returns nothing; get of a missing key returns nothing) and the choosing rule. Verify: `npm test` passes
- [x] 1.3 Add `checkPhotoFile(bytes)` in `src/lib/account/photoRules.ts` and unit test it: JPEG, PNG and WebP recognised by their first bytes; a PDF renamed `.jpg` refused; exactly 4 MB allowed; 4 MB + 1 byte refused; an empty file refused (design 2). Verify: `npm test` passes
- [x] 1.4 Add `canSeePhoto(viewer, ownerId)` to `photoRules.ts` and integration test it with the pretend cohort: the owner, an admin and a connected user may; a user with only a pending request, a stranger, nobody signed in, and a connected pair after a block may not (design 3). Verify: `npm test` passes

## 2. The photo routes

- [x] 2.1 Add `src/lib/account/photos.ts` with `setProfilePhoto(userId, bytes)` (check → store new → save key → delete old) and `removeProfilePhoto(userId)` (clear key → delete file), each with a header comment, and `removeProfilePhoto` marked as the shared helper for slices 8 and 9 (design 4). Integration test: upload saves a key and the file; replacing deletes the old file; removing clears the key and deletes the file; a refused file changes nothing. Verify: `npm test` passes
- [x] 2.2 Add `POST` and `DELETE` in `src/app/api/account/photo/route.ts` for the signed-in user (no user → 401; no finished profile → 409; refused file → 400 with the reason). Verify: `npx tsc --noEmit` passes
- [x] 2.3 Add `GET` in `src/app/api/account/photo/[userId]/route.ts`: `canSeePhoto` and a stored photo → the bytes with the right content type and `Cache-Control: private, no-store`; anything else → 404 (design 3). Verify: `npx tsc --noEmit` passes (browser checks in 3.4 and 5.3)

## 3. The account page: profile, course, photo, sign out

- [x] 3.1 Add `changeCourse(userId, courseId)` in `src/lib/account/course.ts` (active courses only; no rescore) and integration test it: an active course is saved; a retired or made-up one is refused and nothing changes (design 5). Verify: `npm test` passes
- [x] 3.2 Replace the `/account` placeholder: not signed in → `/signin`; shows email, course form (active courses, current one shown even if retired), and Sign out (slice 1's `signOut`). With a finished profile it also shows alias, silhouette placeholder, bio and picks (stand-ins from group 4 can be stubbed until then), and the photo form; without one, a line pointing to `/onboarding`. Verify: `npm run dev`, as a pretend user and as a real user without a profile, each part shows; no sideways scrolling at 375 pixels
- [x] 3.3 Add the photo form (`src/app/account/PhotoForm.tsx`): a file input limited to JPEG/PNG/WebP, a quick size check in the browser, upload, show the new photo, and Remove; server refusals shown in words. Verify: by hand, upload, replace and remove work, and a 5 MB file shows the limit
- [x] 3.4 Add `tests/e2e/account.spec.ts`: change course and see it saved; upload a photo and see it on `/account`; open its address directly as the owner (200); remove it and the address answers 404; signed out, `/account` goes to `/signin`; a pretend user without a profile is pointed to onboarding. Verify: `npm run test:e2e` passes

## 4. Editing answers, with stand-ins for slice 2

- [x] 4.1 Add `src/lib/account/standIns.ts` with a STAND-IN banner (what each follows in #9's design and what replaces it): `checkEditedPicks`, `bioStandIn`, `SILHOUETTE_IDS` and `SilhouettePlaceholder` (design 7). Unit test `checkEditedPicks` (limits, wrong category, retired tag kept, retired tag re-added refused) and `bioStandIn` (#9 decision 5's example). Verify: `npm test` passes
- [x] 4.2 Add `getEditableCategory(categoryId, userId)` in `src/lib/account/editCatalogue.ts` (limits, active tags, plus this user's retired tags) and `saveCategoryEdit(userId, categoryId, picks)` in `src/lib/account/editAnswers.ts` (check → one transaction replacing that category's rows → `scoreUser` after commit, errors logged) (design 6). Integration test: only that category changes; other categories, alias, requests and conversations unchanged; the user's edges are rewritten; a refused edit saves nothing. Verify: `npm test` passes
- [x] 4.3 Add `src/app/account/edit/PickStepStandIn.tsx` (STAND-IN banner; toggle buttons with `aria-pressed`, limits, "You can pick up to N") and the `/account/edit/[category]` page with its Server Action, including silhouette as a one-pick category. Link each category from `/account`. Verify: `npm run dev`, editing Seeking saves and returns to `/account` with the new bio; no text boxes on the page; no sideways scrolling at 375 pixels
- [x] 4.4 Add to `tests/e2e/account.spec.ts`: edit Seeking and see the bio change; a fifth Skill can't be picked; the page has no `input[type=text]` or `textarea`; the alias is unchanged after an edit. Verify: `npm run test:e2e` passes

## 5. Showing the photo on profile pages

- [x] 5.1 Add `src/components/ProfilePhoto.tsx` (runs `canSeePhoto`; draws a plain `<img>` only when allowed, with the eslint comment on why not `<Image>`) (design 8). Verify: `npx tsc --noEmit` and `npx eslint src` pass
- [x] 5.2 Add one import and one line to `src/app/people/[alias]/page.tsx` showing `ProfilePhoto` beside the silhouette, with a comment naming slice 7 as its owner. Verify: as a connected pretend user the photo shows; as a stranger only the silhouette shows
- [x] 5.3 Add to `tests/e2e/account.spec.ts`: after A uploads a photo, a pretend user connected to A sees it on A's profile page; a stranger doesn't, and gets 404 at the direct address; after a block, the connected user no longer sees it; the pretend admin can open the address. Verify: `npm run test:e2e` passes, including every other track's tests

## 6. Docs

- [ ] 6.1 Add an "Account and photos" section to `README.md` (what `/account` does, where photos are stored locally and on Vercel, `BLOB_READ_WRITE_TOKEN`, `removeProfilePhoto` for slices 8 and 9) and a "Stand-ins" note listing slice 7's stand-ins and what replaces them. Comment on #17 with the same list. Verify: every name and path matches the code, and the comment is posted

## 7. Deploy

- [ ] 7.1 **(human, Patrick)** Connect a Blob store to the Vercel project (Storage → Create → Blob, for Preview and Production). Verify: `BLOB_READ_WRITE_TOKEN` appears in the project's environment variables
- [ ] 7.2 Push and open the build PR (flagging the line in slice 4's page). On the preview, as a pretend user: upload, view and remove a photo through real Blob storage. Verify: #14's success checks 1, 3 and 4 are ticked in the PR description
- [ ] 7.3 On the preview: edit an answer as a pretend user and check their alias and conversations are unchanged on `/account` and `/messages`. Verify: #14's success check 2 is ticked

## Workflow follow-up

- Approval: the team reads this proposal on its PR before apply starts (WORKFLOW.md stage 4).
- After merge and deploy: `/opsx:archive` on its own branch (`feature/14-account-archive`), syncing `account-management` and updating `ARCHITECTURE.md` (photo storage is a new piece of the system).
- Join-up (#17) or slice 2: swap the stand-ins in `src/lib/account/standIns.ts` and `PickStepStandIn.tsx` for slice 2's real pieces.
