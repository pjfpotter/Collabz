# Tasks: Slice 8, admin screens (#15)

Before starting: merge `master` into this branch, and make sure `.env` has the three database URLs and `PRETEND_COHORT=on`, then run `npm install`, `npx prisma migrate deploy` and `npm run seed:fake`. The pretend cohort has a pretend admin (use the dev "sign in as…" switcher).

Groups build on each other in order: the small logic functions with tests (1, 2, 3), then the pages that call them (4, 5, 6), then the last checks and docs (7). Pause after each group and show what changed. Every function and page gets "why" comments (CLAUDE.md).

## 1. Courses and the admin shell

- [x] 1.1 Add `src/lib/admin/slugify.ts` (name → readable id, e.g. "Sea Captain" → `sea-captain`) with unit tests in `tests/unit/`: capitals, spaces, punctuation, accents, empty result is rejected (design 3). Verify: `npm test` passes
- [x] 1.2 Add `src/lib/admin/courses.ts`: `addCourse`, `renameCourse`, `moveCourse`, `setCourseRetired`, each returning problems in plain English (empty name, name already used, nothing to move). Add integration tests in `tests/integration/adminCourses.test.ts`: add gets the next order and a slug id; rename keeps id and users; retire hides it from `getActiveCourses()` while a user already on it keeps it; un-retire brings it back; moving swaps order with the neighbour (design 3, 4, 5). Verify: `npm test` passes
- [x] 1.3 Replace the `/admin` placeholder with a real page: a menu (Categories & tags, Courses, Users, and a link to `/admin/reports`) in `src/app/admin/AdminMenu.tsx`, keeping `await requireAdmin()` as the first line. Verify: `npm run dev`; as the pretend admin the page shows the menu, as a pretend member it shows "page not found", signed out it goes to `/signin`
- [ ] 1.4 Add `/admin/courses` with Server Actions that call `requireAdmin()` first and then the functions from 1.2, then `revalidatePath`. Verify: in the browser, add, rename, move and retire a course; the `/signup` course list follows each change
- [x] 1.5 Add `tests/integration/adminActions.test.ts` proving the guard: with the current user set to a member, then to nobody, each course action is refused and changes nothing (design 1). Verify: `npm test` passes

## 2. Categories and tags

- [x] 2.1 Add `src/lib/admin/categories.ts` with `addCategory`, `renameCategory`, `moveCategory`, `setCategoryRetired`, and integration tests: new category gets pick limits 1–4 as defaults, retiring hides it and its tags from `getCatalogue()`, un-retiring brings back the same tags (design 4). Verify: `npm test` passes
- [x] 2.2 Add `src/lib/admin/tags.ts` with `addTag`, `renameTag`, `updateTagDescription`, `moveTag`, `setTagRetired`, and integration tests: id is `<category>-<slug>`; a duplicate name in a category is refused; rename keeps id and every stored `Edge` row; retired tag is out of `getCatalogue()` but a profile that picked it still has it (design 3, 4, 5). Verify: `npm test` passes
- [x] 2.3 Add `src/lib/admin/pairings.ts` with `setTagPairings(tagId, otherTagIds)` and make `addTag` take the pairing list for Seeking and Quality tags, in one transaction. Tests: adding a Seeking tag with no pairing is refused and nothing is stored; with one it stores tag and pairing together; picking a tag from the wrong category is refused; replacing a tag's pairings works from either side (design 6). Verify: `npm test` passes
- [x] 2.4 Add `src/lib/admin/rescoreEveryone.ts` that calls slice 3's existing `rescoreEveryone()` (exported from `@/lib/matching` by adding one line there) and returns how many people were scored. Integration test: after adding a pairing, scores are unchanged until it runs, then they differ for a person whose picks use the new pair (design 9). Verify: `npm test` passes

## 3. Users

- [x] 3.1 Add `src/lib/admin/users.ts`: `listUsers()`, `suspendUser(adminId, userId)`, `unsuspendUser(userId)`. Suspend refuses your own id; suspend and unsuspend call `scoreUser()` after saving (design 8). Integration tests: suspended user gets no `Edge` rows and is missing from `getVisiblePeople()`; unsuspended is back; self-suspend changes nothing; the list shows email, course, role, alias, suspension and photo. Verify: `npm test` passes
  - Remove photo is NOT in this task: it needs slice 7's `removeProfilePhoto`, which isn't merged. It is task 7.1 (decided 14 Oct 2026).

## 4. Category and tag screens

- [x] 4.1 Add `/admin/categories`: every category (retired ones greyed, with the note that their tags are hidden), its tags with rename, description, move up/down and retire/un-retire forms, and an "add tag" form. The add-tag form shows the pairing tick boxes only for Seeking and Quality tags. Server Actions call `requireAdmin()` first and revalidate `/admin/categories`, `/catalogue` (design 10). Verify: in the browser, rename a tag then open `/catalogue` and see the new name in the same place
- [ ] 4.2 Add the category add/rename/move/retire forms to the same page. Verify: retire a category and it disappears from `/catalogue`; un-retire it and its tags return
- [ ] 4.3 Add the pairing editor per Seeking/Quality tag and the "Rescore everyone" button, which shows how many people were rescored and a note that pairing changes don't change scores until it's pressed. Verify: in the browser add a pairing, press the button, and see the count

- Group 4 status (14 Oct 2026): 4.1 is verified in a browser by `tests/e2e/admin.spec.ts` (rename a tag, `/catalogue` shows it). 4.2 and 4.3 are built; the guard test covers every category, tag, pairing and rescore action, and the page renders for an admin (200), a member (404) and a signed-out visitor (redirect). The browser click-throughs for 4.2 (retire a category, un-retire it) and 4.3 (add a pairing, press Rescore everyone) have **not** been done, so those boxes stay unticked until someone has pressed the buttons.

## 5. Users screen

- [ ] 5.1 Add `/admin/users`: a table of users (email, course, role, alias if any, suspended or not) with Suspend/Unsuspend forms per row (the Remove photo button is task 7.2), no suspend button on your own row, Server Actions each calling `requireAdmin()` first. Verify: suspend a pretend user, then in the switcher as a pretend member see they are gone from `/graph` and `/people`; unsuspend and see them return

## 6. End-to-end checks and docs

- [ ] 6.1 Add `tests/e2e/admin.spec.ts` for the issue's success checks: a member and a signed-out visitor can't open `/admin`, `/admin/categories`, `/admin/courses` or `/admin/users`; an admin renames a tag and `/catalogue` shows it; a retired tag isn't listed but a profile still shows it; a suspended pretend user vanishes from the graph. Verify: `npm run test:e2e` passes
- [ ] 6.2 Check that the sign-in refusal for a suspended real user still works with a user suspended from this screen (the existing `signin.spec.ts` case covers it). Verify: `npm run test:e2e` passes unchanged
- [x] 6.3 Add an "Admin screens" section to `README.md`: what each screen does, that nothing is deleted, that "Rescore everyone" is needed after pairing changes. (The photo-removal line is added in 7.3.) Verify: every path and button name in the README matches the code
- [ ] 6.4 **(human)** Tell #14 (account page, PR #40) that admin "remove photo" will call its `removeProfilePhoto(userId)`, so its name and signature should not change without a word. Post on #17: check onboarding doesn't offer retired tags and sign-up doesn't offer retired courses. Verify: both comments exist
- [ ] 6.5 Run the four success checks from #15 on the deployed preview and record the result under a "Checked" note at the top of this file. Verify: the note exists

- Group 6 status (14 Oct 2026): `tests/e2e/admin.spec.ts` is written and passed 7 of 7 on its own run. The WHOLE e2e suite has not passed yet: a full run was disturbed by another writer on the shared test database (foreign-key errors in unrelated specs, no process of ours running). 6.1 and 6.2 stay unticked until `npm run test:e2e` passes in full. 6.3 is done. 6.4 and 6.5 are human tasks. The e2e spec also exercises 5.1's suspend and unsuspend through `/people`; 5.1 names `/graph` too, which is not checked in a browser, so it stays unticked.

## 7. Remove photo (waits for #14 / PR #40 to merge)

Split out of groups 3 and 5 on 14 Oct 2026, so the rest of the admin area isn't held up by the account slice. Start this group only once `removeProfilePhoto` is on `master`; confirm its real import path first.

- [ ] 7.1 Add `removePhoto(userId)` to `src/lib/admin/users.ts`, a thin wrapper that calls `removeProfilePhoto(userId)` from slice 7 (design 7), refusing a user that doesn't exist. Integration test with `removeProfilePhoto` replaced by a fake: it is called once with that user's id, and the user's alias and tags are unchanged. Verify: `npm test` passes
- [ ] 7.2 Add the "Remove photo" form to `/admin/users` (shown only for users with a photo) and its Server Action, calling `requireAdmin()` first, and add it to the guard test in `tests/integration/adminActions.test.ts`. Verify: as a member or signed out the action changes nothing; as the admin, a pretend user's photo is removed
- [ ] 7.3 Add the photo-removal line to the README's "Admin screens" section (removing a photo also deletes the stored file), and extend `tests/e2e/admin.spec.ts` if a photo can be set up in the pretend cohort. Verify: `npm run test:e2e` passes and the README matches the code
