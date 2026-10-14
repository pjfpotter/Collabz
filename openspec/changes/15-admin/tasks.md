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

- [ ] 2.1 Add `src/lib/admin/categories.ts` with `addCategory`, `renameCategory`, `moveCategory`, `setCategoryRetired`, and integration tests: new category gets pick limits 1–4 as defaults, retiring hides it and its tags from `getCatalogue()`, un-retiring brings back the same tags (design 4). Verify: `npm test` passes
- [ ] 2.2 Add `src/lib/admin/tags.ts` with `addTag`, `renameTag`, `updateTagDescription`, `moveTag`, `setTagRetired`, and integration tests: id is `<category>-<slug>`; a duplicate name in a category is refused; rename keeps id and every stored `Edge` row; retired tag is out of `getCatalogue()` but a profile that picked it still has it (design 3, 4, 5). Verify: `npm test` passes
- [ ] 2.3 Add `src/lib/admin/pairings.ts` with `setTagPairings(tagId, otherTagIds)` and make `addTag` take the pairing list for Seeking and Quality tags, in one transaction. Tests: adding a Seeking tag with no pairing is refused and nothing is stored; with one it stores tag and pairing together; picking a tag from the wrong category is refused; replacing a tag's pairings works from either side (design 6). Verify: `npm test` passes
- [ ] 2.4 Add `src/lib/admin/rescoreEveryone.ts` that calls `scoreUser()` for each person from the eligible list and returns how many were rescored. Integration test: after adding a pairing, scores are unchanged until it runs, then they differ for a person whose picks use the new pair (design 9). Verify: `npm test` passes

## 3. Users

- [ ] 3.1 Add `src/lib/admin/users.ts`: `listUsers()`, `suspendUser(adminId, userId)`, `unsuspendUser(userId)`, `removePhoto(userId)`. Suspend refuses your own id; suspend and unsuspend call `scoreUser()` after saving; `removePhoto` clears `photoKey` with a comment pointing at #14 for deleting the stored file (design 7, 8). Integration tests: suspended user gets no `Edge` rows and is missing from `getVisiblePeople()`; unsuspended is back; self-suspend changes nothing; remove photo leaves alias and tags. Verify: `npm test` passes

## 4. Category and tag screens

- [ ] 4.1 Add `/admin/categories`: every category (retired ones greyed, with the note that their tags are hidden), its tags with rename, description, move up/down and retire/un-retire forms, and an "add tag" form. The add-tag form shows the pairing tick boxes only for Seeking and Quality tags. Server Actions call `requireAdmin()` first and revalidate `/admin/categories`, `/catalogue` (design 10). Verify: in the browser, rename a tag then open `/catalogue` and see the new name in the same place
- [ ] 4.2 Add the category add/rename/move/retire forms to the same page. Verify: retire a category and it disappears from `/catalogue`; un-retire it and its tags return
- [ ] 4.3 Add the pairing editor per Seeking/Quality tag and the "Rescore everyone" button, which shows how many people were rescored and a note that pairing changes don't change scores until it's pressed. Verify: in the browser add a pairing, press the button, and see the count

## 5. Users screen

- [ ] 5.1 Add `/admin/users`: a table of users (email, course, role, alias if any, suspended or not) with Suspend/Unsuspend and Remove photo forms per row, no suspend button on your own row, Server Actions each calling `requireAdmin()` first. Verify: suspend a pretend user, then in the switcher as a pretend member see they are gone from `/graph` and `/people`; unsuspend and see them return

## 6. End-to-end checks and docs

- [ ] 6.1 Add `tests/e2e/admin.spec.ts` for the issue's success checks: a member and a signed-out visitor can't open `/admin`, `/admin/categories`, `/admin/courses` or `/admin/users`; an admin renames a tag and `/catalogue` shows it; a retired tag isn't listed but a profile still shows it; a suspended pretend user vanishes from the graph. Verify: `npm run test:e2e` passes
- [ ] 6.2 Check that the sign-in refusal for a suspended real user still works with a user suspended from this screen (the existing `signin.spec.ts` case covers it). Verify: `npm run test:e2e` passes unchanged
- [ ] 6.3 Add an "Admin screens" section to `README.md`: what each screen does, that nothing is deleted, that "Rescore everyone" is needed after pairing changes, and that removing a photo only clears the key until #14 lands. Verify: every path and button name in the README matches the code
- [ ] 6.4 **(human)** Post on #14 (account page): `removePhoto()` in `src/lib/admin/users.ts` should also delete the stored file once photo storage exists. Post on #17: check onboarding doesn't offer retired tags and sign-up doesn't offer retired courses. Verify: both comments exist
- [ ] 6.5 Run the four success checks from #15 on the deployed preview and record the result under a "Checked" note at the top of this file. Verify: the note exists
