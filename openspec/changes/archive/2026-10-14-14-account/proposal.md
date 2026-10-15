# Proposal: Slice 7, account page (#14)

## Why

Once students can sign up (slice 1, #8), their profile has to stay theirs to control: the brief's "manage their account" and "photo" are Essential items. Today `/account` is a placeholder, nobody can change their course after sign-up, nobody can change an answer after onboarding, and there is no photo at all, although the `Profile.photoKey` column, the "who may see a photo" rule (`areConnected`, slice 5) and the rescoring helper (`scoreUser`, slice 3) are all waiting for it. This is track 1's second slice in the slice map (#18).

## What Changes

- **A real `/account` page** for a signed-in user: their alias, silhouette, generated bio and picks; their course, with a way to change it; their photo; and Sign out.
- **Change course.** Picked from the active courses, saved straight away. Course isn't scored, so nobody is rescored.
- **Edit onboarding answers, one category at a time** (`/account/edit/[category]`), with the same pick-from-list limits as onboarding, then save and call `scoreUser()`. The alias, connections, conversations and requests don't change. The glitch match doesn't change either, **unless the edit moves it into the user's new top 5**, where `chemistry-matching` already says it must be replaced (see Capabilities).
- **Stand-ins for slice 2's onboarding pieces.** Slice 2 (#9) isn't built, so the pick screen, the answer rules and the bio are built here following slice 2's approved design (#9 decisions 2, 3 and 5), kept together in one clearly marked stand-in file and folder, and swapped for slice 2's real ones when it lands (Tom's decision, 14 Oct 2026).
- **An optional photo**: upload, replace or remove one photo (**JPEG, PNG or WebP, up to 4 MB**). It is stored **privately in Vercel Blob** and only ever served through `/api/account/photo/[userId]`, which checks that the viewer is the owner, someone connected to them (`areConnected`) or an admin. Anyone else, including someone with the direct link, gets "not found". Removing a photo deletes the file.
- **Connected people see the photo on the profile page** (`/people/[alias]`, slice 4's page) through a new `ProfilePhoto` component: **one import and one line in slice 4's file, flagged to Patrick** (Tom's decision, 14 Oct 2026). It draws nothing for anyone not allowed to see it.
- **`removeProfilePhoto(userId)`**, a shared helper for the admin "remove photo" actions in slices 8 and 9.
- **New dependency:** `@vercel/blob` (pinned). Local development and the tests keep photos in a gitignored folder instead, so they need no Vercel token.

### Decisions made for this change (asked of Tom, 14 Oct 2026)

| Question | Decision |
|---|---|
| Editing answers needs slice 2's screens, which aren't built. Split it off, wait, or build? | Build it now with stand-ins that follow slice 2's proposal, clearly marked to be replaced once slice 2 is done |
| Photo size limit and file types (open question on #14) | Up to 4 MB; JPEG, PNG or WebP |
| Photo storage (open question on #14) | Vercel Blob, private files |
| Where do connected people see the photo? | On the profile page, `/people/[alias]`, with one flagged line in slice 4's file |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `account-management`: the account page's requirement gains changing course, editing one category at a time, and a clarified glitch-match rule. Today it says an edit never changes the glitch match, which contradicts `chemistry-matching`'s "never in your top 5" when an edit moves the glitch match into the top 5, so `chemistry-matching` wins. The photo requirement gains its limits, removal deleting the file, "not found" for anyone not allowed, and being shown to connected people on the profile page. The two MVP-Later requirements (privacy settings, deleting the account) are unchanged and stay out.

## Impact

- **Depends on:** slice 1 (sign-in, `getCurrentUser()`, `getActiveCourses()`, `signOut`), slice 3 (`scoreUser()`), slice 5 (`areConnected()`), the foundation's `requireAdmin` rules and `Profile.photoKey`. All merged.
- **Slice 2 (#9), not built:** the edit screens use stand-ins until it lands. Join-up (#17), or slice 2 itself, swaps them: the list is in `src/lib/account/standIns.ts`.
- **Code (new):** `src/app/account/` (page, course form, photo form, `edit/[category]/`), `src/app/api/account/photo/` (upload and remove) and `src/app/api/account/photo/[userId]/` (serve), `src/lib/account/` (photo storage, photo rules, saving edits, stand-ins), `src/components/ProfilePhoto.tsx`.
- **Other tracks' files touched:** one import and one line in `src/app/people/[alias]/page.tsx` (slice 4), flagged in the PR.
- **Routes owned:** `/account` and everything under it, and `/api/account/*`.
- **Schema:** no change. `Profile.photoKey` already exists.
- **Environment variables (new):** `BLOB_READ_WRITE_TOKEN`, created when a Blob store is connected to the Vercel project (Patrick owns it). Only needed on Vercel; locally photos go to a folder.
- **Out of scope:** privacy settings, account deletion and data export (MVP Later); changing the alias; admin photo removal screens (slices 8 and 9, which call `removeProfilePhoto`); showing photos in messages (slice 6).
