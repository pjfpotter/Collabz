# Design: Slice 7, account page (#14)

## Context

- **What exists (checked against `master`, 14 Oct 2026):**
  - Sign-in (slice 1): `getCurrentUser()`, `getActiveCourses()` (`src/lib/auth/courses.ts`), `signOut` (`src/auth.ts`).
  - `scoreUser(userId)` (slice 3, `src/lib/scoring.ts`): rescores one user in one transaction, keeps their glitch match unless it has stopped being valid (e.g. it is now in their top 5), and never touches other people's scores.
  - `areConnected(a, b)` (slice 5, `src/lib/requests/areConnected.ts`): an approved request and no block. Written for this slice.
  - `Profile.photoKey String?`, empty until now. Pretend users have profiles; real users don't yet, because slice 2 (onboarding) isn't built.
  - `/account` is the foundation's placeholder. `/people/[alias]` (slice 4) has the `viewer` and the person's `profile` and draws a silhouette, but no photo.
- **Slice 2 is planned, not built.** Its approved design (`openspec/changes/9-onboarding/design.md`) describes a `PickStep` component (decision 2), `validateOnboardingAnswers` (decision 3) and `generateBio` (decision 5), each "reusable by slice 7". None of them exist yet.
- **`getCatalogue()`** (slice 0) returns active categories and active tags only, without the pick limits. Editing needs the limits and the user's own retired tags.
- **`@vercel/blob` 2.8.1** supports private files: `put(pathname, body, { access: "private" })`, `get(pathname, { access: "private" })` (a readable stream, server-side only, needs `BLOB_READ_WRITE_TOKEN`) and `del(pathname)`.
- **Vercel limits a request to a function to about 4.5 MB**, and Next.js Server Actions accept 1 MB by default.

## Goals / Non-Goals

**Goals:**
- Every rule that protects data (who may see a photo, what file is allowed, what an edit may contain) is a small plain function with unit tests, called on the server every time.
- A photo can only ever be read through our permission check. No public link to a photo exists anywhere.
- Nothing from slice 2 is copied silently: every stand-in sits in one marked place, with what replaces it.

**Non-Goals:**
- Changing the alias, privacy settings, deleting the account, exporting data.
- Cropping, resizing or compressing photos.
- Admin screens for removing photos (slices 8 and 9; they call `removeProfilePhoto`).
- Photos in messages (slice 6).

## How the pieces fit

```
/account (Server Component)
  getCurrentUser() ── nobody ──▶ /signin
  │
  ├─ Course form ──(Server Action)──▶ changeCourse()  ── active course? ──▶ User.courseId
  ├─ Picks + bio (stand-in) ── "Edit" ──▶ /account/edit/[category]
  │                                         PickStepStandIn (client) ──(Server Action)──▶
  │                                         saveCategoryEdit(): checkEditedPicks() → one transaction
  │                                         replaces that category's ProfileTag rows → scoreUser()
  ├─ Photo form ──(POST multipart)──▶ /api/account/photo
  │                                    checkPhotoFile() (size + first bytes) → photoStore.put()
  │                                    → Profile.photoKey = new key → photoStore.delete(old key)
  │   "Remove" ──(DELETE)──▶ /api/account/photo → removeProfilePhoto()
  └─ Sign out (slice 1's signOut)

<img src="/api/account/photo/<userId>">  (own page, and ProfilePhoto on /people/[alias])
  GET /api/account/photo/[userId]
    viewer = getCurrentUser()
    canSeePhoto(viewer, ownerId): owner | admin | areConnected(viewer, owner)
    no ─▶ 404     yes ─▶ photoStore.get(photoKey) ─▶ the bytes, "Cache-Control: private, no-store"
```

## Decisions

### 1. Photos live in private Vercel Blob, behind one storage interface
`src/lib/account/photoStore.ts` exports a small interface, `put(key, bytes, contentType)`, `get(key)` and `delete(key)`, with two versions:
- **Vercel Blob** (`access: "private"`), used whenever `BLOB_READ_WRITE_TOKEN` is set (Vercel Preview and Production).
- **A folder on disk** (`.photo-store/`, gitignored), used when the token isn't set **and** we're not on the production deployment (local dev and the tests). On production without a token it throws a clear error instead of silently writing to a disk that Vercel throws away.
- *Why private:* a public Blob address works for anyone who has it, which would break "refused even with the direct link". Private files can only be read by our server, so every view goes through decision 3.
- *Why a folder for dev and tests:* nobody needs a Vercel token to work on the app, and tests never touch real storage. The folder version is tested; the Blob version is a thin wrapper over three library calls, checked on the preview (task 7.2).
- *Keys:* `photos/<userId>/<random id>.<ext>`. *Why a new random name each time:* a replaced photo gets a new key, so nothing can confuse the old file with the new one, and the old one is simply deleted.
- *Alternative:* storing the bytes in the database. Rejected: it bloats the shared database and needs a schema change.

### 2. A photo is checked by its contents, not its name
`checkPhotoFile(bytes)` in `src/lib/account/photoRules.ts`: at most **4 MB**, and the first bytes must match JPEG (`FF D8 FF`), PNG (`89 50 4E 47`) or WebP (`RIFF....WEBP`). It returns the type it found, or the problem.
- *Why look at the bytes:* a file's name and its reported type are whatever the browser (or an attacker) says. The first bytes are what the file actually is, so a renamed PDF is refused.
- *Why 4 MB:* Vercel refuses requests over about 4.5 MB before our code even runs, and the form needs some room. Tom's decision (14 Oct 2026).
- The browser also checks size and type before sending, so people get a quick message, but the server's check is the one that counts.

### 3. One rule decides who may see a photo
`canSeePhoto(viewer, ownerId)`: true if the viewer is the owner, an admin, or `areConnected(viewer.id, ownerId)`. Nobody signed in, or anyone else: false.
- `GET /api/account/photo/[userId]` answers **404 for both "not allowed" and "no photo"**. *Why not 403:* "forbidden" would confirm a photo exists. The spec says a stranger can't even tell.
- The answer carries `Cache-Control: private, no-store`, so no shared cache keeps a copy that a later, unconnected viewer could get. (A block must hide a photo straight away.)
- *Why reuse `areConnected`:* slice 5 wrote it for this, and it already includes blocks, so slice 9 needs no photo code.
- Suspended viewers: `getCurrentUser()` already returns nobody for a suspended real user (slice 1).

### 4. Uploading goes through a Route Handler, not a Server Action
`POST /api/account/photo` (form upload) and `DELETE /api/account/photo` (remove) for the signed-in user's own photo.
- *Why not a Server Action:* Server Actions accept 1 MB by default. Raising it would change the shared `next.config.ts` for every track. A Route Handler takes the full 4 MB as it is, and it is an `/api/...` route, which matches the project's usual backend.
- **Order when replacing:** store the new file → save its key on the profile → delete the old file. *Why this order:* if anything fails halfway, the worst case is an unused file left in storage, never a profile pointing at a missing photo.
- `removeProfilePhoto(userId)` (also exported for slices 8 and 9): clear `photoKey`, then delete the file.

### 5. Course and edits use Server Actions, like slice 1
The course form and the edit screens are small forms with no files, so they use Server Actions with `useActionState`, as slice 1 does (same track, same pattern).
- `changeCourse(userId, courseId)` refuses a course that isn't active. **It doesn't call `scoreUser`**, because course isn't scored (`chemistry-matching`), so a rescore would only cost time.
- The account page shows the current course even if it was retired later, and only offers active ones (spec).

### 6. Editing one category at a time, with slice 2's rules as stand-ins
`/account/edit/[category]` shows one category, like one step of slice 2's onboarding. Saving:
1. checks the picks with `checkEditedPicks(picks, category, alreadyPicked)` (decision 7),
2. in **one transaction**, deletes that category's `ProfileTag` rows for this user and inserts the new ones,
3. **after** it commits, calls `scoreUser(userId)`. If scoring fails, the edit still counts and the error is logged. *Why:* the same reason as slice 2 (#9 decision 3): a scoring bug mustn't throw away the person's own work.
- **Nothing else changes:** not the alias, which is set once at onboarding even if the Vibe or Energy tag changes; not requests, connections or conversations.
- **The glitch match** is kept by `scoreUser` unless it is now in the user's top 5, and then it is replaced, as `chemistry-matching` requires. The spec says this explicitly, so it isn't a surprise (proposal).
- **Silhouette** is edited the same way, as a "category" with exactly one pick from the stand-in list of 12 ids.
- Editing is only offered to someone with a finished profile. Without one (every real user, until slice 2 lands), the page points to `/onboarding`.
- The limits and the tags come from `getEditableCategory(categoryId, userId)` in `src/lib/account/editCatalogue.ts`: the category's `pickMin`/`pickMax`, its active tags, **plus** any retired tags this user already has (shown as picked, removable, not re-addable). *Why not `getCatalogue()`:* it has no limits and hides retired tags, and it's slice 0's file.

### 7. Stand-ins for slice 2, all in one marked place
`src/lib/account/standIns.ts` and `src/app/account/edit/PickStepStandIn.tsx`, each starting with a **STAND-IN** banner naming what replaces it:

| Stand-in | Follows | Replaced by |
|---|---|---|
| `checkEditedPicks()` | #9 decision 3, `validateOnboardingAnswers`, for one category | slice 2's `validateOnboardingAnswers` |
| `bioStandIn()` | #9 decision 5, `generateBio` | slice 2's `generateBio` |
| `SILHOUETTE_IDS`, `SilhouettePlaceholder` | #9 decision 7 (12 ids, `silhouette-01`…`12`) | slice 2's `silhouettes.ts` and SVG files |
| `PickStepStandIn` | #9 decision 2, `PickStep` (toggle buttons, `aria-pressed`, limits) | slice 2's `PickStep` |

- *Why a stand-in file, not importing slice 4's stand-ins:* the track rule says no reaching into another track's files. Slice 4 has its own bio stand-in; both are swapped at join-up (#17) for slice 2's single `generateBio`.
- *Why follow slice 2's design closely:* when slice 2 lands, swapping should be a matter of changing imports, not behaviour.
- The README's "Stand-ins" note and #17 get the list.

### 8. Showing the photo to others: `ProfilePhoto`, one line in slice 4's page
`src/components/ProfilePhoto.tsx` (Server Component) takes `{ ownerId, viewer, hasPhoto }`, runs `canSeePhoto`, and draws an `<img src="/api/account/photo/<ownerId>">` only if allowed. Otherwise it draws nothing, so strangers see the silhouette as before.
- *Why check in the component as well as the route:* so the page never shows a broken image to someone the route would refuse. The route's check is still the one that protects the photo.
- **One import and one line in `src/app/people/[alias]/page.tsx`**, next to the silhouette, flagged to Patrick in the PR (Tom's decision, 14 Oct 2026). Same pattern as slice 1's line in `NavBar.tsx`.
- A plain `<img>`, not Next.js's `<Image>`. *Why:* `<Image>` copies the picture into a shared optimisation cache, which would defeat "private, no-store". An eslint comment on that line says so.

### 9. Tests
- **Unit:** `checkPhotoFile` (each type by its bytes, a renamed PDF, 4 MB exactly, 4 MB + 1 byte, empty), `checkEditedPicks` (limits, wrong category, retired tag kept, retired tag re-added), `bioStandIn`, and the folder photo store (put, get, delete, missing key).
- **Integration (test database):** `canSeePhoto` (owner, admin, connected, connected-then-blocked, pending request, stranger, nobody signed in); `changeCourse` (active saved, retired refused); `saveCategoryEdit` (replaces only that category, other categories and the alias untouched, refused edit saves nothing, edges rewritten for that user only); upload, replace and remove (old file deleted).
- **Playwright** (the dev switcher as a pretend user with a profile): change course; edit Seeking and see the bio change; upload a photo and see it; a connected pretend user sees it on the profile page; a stranger doesn't, and gets 404 at the direct address; remove it and the address answers 404 for the owner too; a real user without a profile is pointed to onboarding.

## Risks / Trade-offs

- **[Stand-ins drift from slice 2]** → They follow slice 2's approved design, sit in one marked place, and swapping is listed for join-up. If slice 2 lands first, its builder can swap them directly.
- **[Every photo view runs through a function]** → A few views per page, at cohort size. Fine. The bytes are streamed through, never kept in memory twice.
- **[Large photos from phones are refused]** → 4 MB covers almost all phone photos sent from a browser. The message says the limit, so people can pick a smaller one or a screenshot.
- **[Unused files if an upload fails halfway]** → The order in decision 4 means the worst case is a stray file, never a broken profile. Acceptable at this size.
- **[Glitch match can change on an edit]** → Only when the edit moves it into the top 5, which the spec now says outright.
- **[Editing answers is only usable by pretend users until slice 2 lands]** → Real users have no profile yet. They can still change course and sign out.

## Migration Plan

1. Patrick connects a Blob store to the Vercel project (Storage → Create → Blob). Vercel then adds `BLOB_READ_WRITE_TOKEN` to the project's environments.
2. Open the PR. On the preview, a pretend user uploads, views and removes a photo through real Blob storage.
3. Merge. No schema change and no migration.

**Rollback:** Vercel Instant Rollback. Photos already in Blob stay there; `photoKey` values are ignored by older code.

## Open Questions

- None that change the plan. The Blob store is created by Patrick (task 7.1).
