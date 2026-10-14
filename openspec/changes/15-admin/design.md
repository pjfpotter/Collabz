# Design: Slice 8, admin screens (#15)

## Context

See `proposal.md` for why. What exists already, checked on 14 Oct 2026:

- `requireAdmin()` in `src/lib/currentUser.ts` (signed-out → `/signin`, member → "page not found"). `/admin` is a placeholder that already calls it.
- `Category`, `Tag`, `Course` have `order` and `retiredAt`; `TagPairing` stores Seeking↔Quality pairs; `User.suspendedAt` and `Profile.photoKey` exist. No schema change is needed.
- `visiblePeople` and `eligiblePeople` already exclude suspended users, and `getCurrentUser()` already returns `null` for suspended real users. So "suspended users vanish and can't sign in" is mostly done; this slice only has to *set* `suspendedAt` and rescore.
- `scoreUser()` (`src/lib/matching`) is the shared way to recalculate scores. It must be called after a suspend or unsuspend (its own header comment says so).
- Slices 1, 3, 4 use Server Actions in `actions.ts` files beside the page; this slice does the same.
- `/admin/reports` belongs to slice 9. Slice 9's page sits under the same `/admin` area, so the menu links to it but doesn't build it.

## Goals / Non-Goals

**Goals:**
- Every change goes through one small, tested function per action, so the rules (retire not delete, ids stable, no self-suspend) live in one place each.
- Pages stay thin: check admin, load rows, show forms.

**Non-Goals:**
- No new tables or columns, no dashboard, no profile view, no reset onboarding.
- No editing of a tag's `aliasWord`, `pickMin` or `pickMax` (not in the issue; raise it if wanted).

## Decisions

1. **Server Actions, each starting with `requireAdmin()`.** The pages check too, but a Server Action is a public endpoint, so it can't rely on the page having checked. *Alternative:* API routes under `/api/admin/*`. Rejected: more files, and our other slices use Server Actions for forms.

2. **Logic in `src/lib/admin/`, actions stay thin.** One file per area: `categories.ts`, `tags.ts`, `courses.ts`, `users.ts`, `slugify.ts`. Each function takes plain values and returns either success or a list of plain-English problems (the pattern from `checkSignUpForm`), so integration tests can call them without a browser. *Alternative:* queries inside the actions. Rejected: harder to test and to read.

3. **Ids come from the name, made once.** A new tag gets `<category-id>-<slugified-name>` (e.g. `energy-sea-captain`), a category or course just the slug. If that id is taken, the add is refused with "that name is already used" instead of adding a number, so the id is always readable. Rename only changes `name`. *Alternative:* random cuid. Rejected: seeded ids are readable and the same on every database (rule B2 and the tag-catalogue spec).

4. **Retire = set `retiredAt`; un-retire = clear it.** Never delete, so scores and profiles keep pointing at a real row. Retiring a category does not touch its tags' own `retiredAt`; the category is hidden, which hides its tags with it. *Why:* un-retiring the category then brings back exactly what was there before.

5. **Reorder by swapping with the neighbour.** "Move up/down" buttons swap the `order` values of two adjacent rows in one transaction. *Alternative:* drag and drop. Rejected: more JavaScript for beginners to read, and buttons work on a phone and without scripting.

6. **Pairings are rows in `TagPairing`, edited from the tag's own screen.** The add-tag form shows, for a Seeking tag, the list of active Quality tags (and the reverse), as tick boxes; at least one must be ticked. Existing pairings are edited the same way. Which categories are "Seeking" and "Qualities" is read from `CATEGORY_IDS` in `src/lib/matching/eligiblePeople.ts`, not re-hardcoded. Adding Seeking/Quality tags and their pairing happens in **one transaction**, so a tag is never stored unpaired.

7. **Remove photo calls slice 7's `removeProfilePhoto(userId)`.** The account slice (#14, PR #40) exports it "for slices 8 and 9": it clears `Profile.photoKey` and then deletes the stored file (private Vercel Blob). Calling it means there is one place that knows how photos are stored, and an admin removal really deletes the file. `removePhoto()` in `src/lib/admin/users.ts` is a thin wrapper that calls it. *Depends on #14 being merged:* if it isn't when group 3 starts, stop and ask rather than writing a stand-in (see Risks). *Alternative:* clear `photoKey` here and leave the file. Rejected: it would leave a private photo in storage that nobody can reach or delete. *Alternative:* build our own storage delete. Rejected: it's another track's design.

8. **Suspend/unsuspend sets `suspendedAt` then calls `scoreUser()`.** Order matters: save first, rescore after, so a scoring problem can't undo the suspension (same rule as `scoreUser`'s header comment). The refusal to suspend yourself is checked in the function, not just by hiding the button.

9. **"Rescore everyone" calls slice 3's existing `rescoreEveryone()`**, which we export from `@/lib/matching` (one added line, agreed 14 Oct 2026). It recalculates everyone in ONE transaction and returns how many people were scored, so the button can say so. *Changed from the first plan,* which was to loop `scoreUser()` per person: that makes a database round trip per person, which slice 3's own notes call too slow even for 30 people, and could pass Vercel's function time limit. `src/lib/admin/rescoreEveryone.ts` is a thin wrapper so the admin code has one named place for it.

10. **Plain forms, no client-side state.** Each row has its own small `<form>` posting to a Server Action, and the page refreshes with `revalidatePath`. After a catalogue change we revalidate `/catalogue` too, so a rename shows straight away (success check 2).

11. **Layout:** `/admin` (menu + short instructions), `/admin/categories` (categories with their tags, pairings per tag, rescore button), `/admin/courses`, `/admin/users`. A shared `src/app/admin/AdminMenu.tsx` is the section menu.

## Risks / Trade-offs

- **A typo in a rename is visible to every student at once** → rename is a single field with the old name shown; un-doing it is another rename. No confirmation dialogs (they'd need client JavaScript).
- **Last admin suspends someone's way into an empty admin list** → can't suspend yourself; admins are also set from `ADMIN_EMAILS` at deploy time.
- **Retired category with active tags confuses the list** → the screen shows "retired" on the category and greys its tags, and says tags are hidden while it is retired.
- **Rescoring everyone is slow on a big cohort** → fine for a bootcamp (tens of people); the button is a human action, never automatic.
- **Remove photo can't be built until #14 (PR #40) merges** → it is the last task in group 3 and group 5's photo button; if #14 isn't merged by then, the rest of users ships first and the photo action waits. The exact import path of `removeProfilePhoto` is confirmed against #14's merged code, not assumed.

## Open Questions

- Should the users list be searchable/filterable? Not needed for ~100 people; add only if the list is unwieldy at the live test.
