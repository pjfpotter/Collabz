# Proposal: Slice 8, admin screens (#15)

## Why

Categories, tags and courses are database rows (rule B2), but today the only way to change one is to edit the database by hand, and the only way to suspend a user is to run SQL. Before the live test, Patrick and Tom need screens to keep the lists up to date, rename a tag that confuses people, retire a course, and suspend someone who shouldn't be there. This is track 2's second slice in the slice map (#18) and depends only on the foundation (#7) and the catalogue (#6).

## What Changes

- **An admin area at `/admin`**, replacing the foundation's placeholder, with a small section menu: Categories & tags, Courses, Users. `/admin/reports` stays slice 9's (#16) and is only linked to.
- **The admin check is done on the server, in every page and every action.** Each page calls the shared `requireAdmin()` first, and every Server Action calls it again before touching the database, so a member who posts to an action directly is refused too.
- **Categories:** add, rename, reorder, retire and un-retire. Retiring a category hides it and all its tags from onboarding and `/catalogue`.
- **Tags:** add, rename, edit description, reorder within a category, retire and un-retire. When a Seeking or Quality tag is added, the admin picks which tag(s) in the other category it pairs with (`TagPairing` rows). Pairings of an existing tag can also be edited afterwards.
- **Courses:** add, rename, reorder, retire and un-retire. A retired course disappears from the sign-up form; people already on it keep it.
- **Users:** a list (email, course, role, alias, suspended or not), with suspend and unsuspend, and remove photo. An admin cannot suspend themselves, so the last admin can't lock everyone out.
- **Suspending rescored:** after a suspend or unsuspend the person is rescored with `scoreUser()`, so they drop out of (or come back into) everyone's top 5. The graph and search already hide suspended users through `visiblePeople`, and `getCurrentUser()` already refuses suspended real users, so those need no change.
- **A "Rescore everyone" button** on the pairings screen (team decision, 14 Oct 2026, answering the open question on #15). Changing a pairing doesn't change any stored score by itself; the button runs `scoreUser()` for every eligible person.
- **Ids never change.** A new category, tag or course gets a readable id made from its name (like the seed's `energy-sea-captain`), and renaming never touches the id or any score.
- **Nav bar:** no change; it already links to `/admin`.

### Decisions made for this change

| Question | Decision |
|---|---|
| Rescore everyone button? (open question on #15) | Yes, included (asked of Patrick, 14 Oct 2026) |
| Which user actions? | The issue's scope plus unsuspend: list, suspend, unsuspend, remove photo. **Viewing a profile and resetting onboarding stay out** (asked of Patrick, 14 Oct 2026), even though the admin spec lists them; the spec delta below narrows that requirement to match |
| Hard delete? | Never. Retire only, as the spec says |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `admin`: the "Manage categories, tags and courses" requirement gains concrete scenarios for adding, reordering, pairings, courses and rescoring; the "Manage users" requirement is narrowed to list, suspend, unsuspend and remove photo (view profile and reset onboarding move to MVP Later), and gains the can't-suspend-yourself rule.

## Impact

- **Depends on #6 and #7, both merged.** Checked against what was built: `requireAdmin()` in `src/lib/currentUser.ts`, the `/admin` placeholder, `Category`, `Tag`, `Course`, `TagPairing`, `User.role`, `User.suspendedAt` and `Profile.photoKey`, `scoreUser()` in `src/lib/matching`, and `eligiblePeople` / `visiblePeople` already excluding suspended users.
- **Schema:** no change planned. Everything admin needs already has a column.
- **Code (new):** `src/app/admin/` (page, `categories/`, `courses/`, `users/`, each with its Server Actions), `src/lib/admin/` (the small, tested functions that do the changes).
- **Shared code changed:** none planned. `requireAdmin()` is used as it is. The `/admin` page replaces the placeholder.
- **Routes owned:** `/admin` and everything under it **except** `/admin/reports`.
- **Photos:** photo storage is built by the account slice (#14, PR #40), which is not merged yet. "Remove photo" here calls its `removeProfilePhoto(userId)`, which clears `Profile.photoKey` and deletes the stored file. That one task waits until #14 has merged (design decision 7).
- **Join-up (#17):** onboarding (#9) must not offer retired tags or categories, and sign-up already skips retired courses. Both are checked with the live test rehearsal.
- **Out of scope:** dashboard stats (MVP Later), the moderation queue (slice 9), viewing profiles, resetting onboarding, editing a tag's alias word, deleting anything.
