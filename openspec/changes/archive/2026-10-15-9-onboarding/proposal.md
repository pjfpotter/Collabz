# Proposal: Slice 2, onboarding: pick-from-list profile (#9)

## Why

Every other track (matching, graph, requests, account) needs real profiles to work on, and right now a new user has no way to make one. This slice lets a newly signed-up student build their whole profile by picking from lists, so they end up with an alias, a silhouette and a generated bio without ever typing a word. That keeps the "never give them an empty box" rule from the brief.

## What Changes

- **A `/onboarding` page** with eight steps, one per screen: the seven pick-from-list exercises (Hero Story, Energy, Vibe Diagnosis, Qualities, Seeking, Skills, Interests) followed by choosing a silhouette. The steps come from the catalogue in the database, in category order. Nothing on the page is a text box.
- **Pick limits are read from the catalogue** (`pickMin`/`pickMax`). Hero Story, Energy and Vibe Diagnosis take exactly 1 pick. Qualities, Seeking, Skills and Interests take **at least 1 and at most 4**, so no profile is left without picks in any category (team decision, 1 Oct 2026). The limits are checked in the browser *and* again on the server.
- **One save at the end.** The answers are sent once to `POST /api/onboarding`. That route writes the `Profile` and its `ProfileTag` rows in a single transaction, sets `completedAt`, and then calls `scoreUser(userId)`. The call does nothing until slice 3 lands.
- **Skills and Interests categories and their tags are seeded:** 12 Skills and 12 Interests, drafted in this change for the team to edit before approval (see `design.md`, decision 8).
- **Generated alias**, e.g. *"The Feral Sea Captain"*: a word from the user's Vibe tag plus a word from their Energy tag. If the alias is already taken, a Roman numeral is added (*"The Feral Sea Captain II"*). It is set once, when onboarding finishes.
- **New `aliasWord` column on `Tag`** (**schema change, flagged to Patrick and the #7 foundation before apply**). Each Energy and Vibe Diagnosis tag gets a short seeded word, so the alias words live with the data rather than in code, and an admin can edit them later (slice 8).
- **12 silhouettes**: simple single-colour SVG files in `public/silhouettes/`. The profile stores the silhouette's id.
- **Generated bio**: a few plain sentences built from the user's Hero Story, Energy, Qualities, Seeking, Skills and Interests. It is computed each time it is shown and never stored.
- **A "your profile" page at `/onboarding/done`** shows the finished profile (alias, silhouette, bio). It's the success screen, and a working example of the profile card other tracks will show.
- **Small shared helpers** that other tracks can call: `generateBio()`, `generateAlias()`, a `ProfileCard` component, and `redirectIfOnboardingIncomplete()` for pages that need a finished profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `profile-onboarding`: pick limits become 1–4 for the four multi-pick categories, and onboarding gets its route and redirect, a one-time save, alias generation with numbering, and a fixed silhouette set.
- `tag-catalogue`: the seed adds the Skills and Interests categories (7 categories in total), Energy and Vibe Diagnosis tags get an alias word, and the seed fills an alias word that is still empty without overwriting anything else.

## Impact

- **Depends on #6 and #7, neither of which is built yet.** This plan assumes #6's `Category`/`Tag`/`Course` tables and readable ids, and #7's `User`, `Profile` and `ProfileTag` tables plus the `getCurrentUser()` and `scoreUser()` helpers. Apply can only start once both have merged. If their real names differ, the tasks follow the real names.
- **Schema (to be flagged first):** add `Tag.aliasWord String?`, make sure `Profile.alias` is unique, and add a data migration that sets `pickMin = 1` on Qualities and Seeking for databases #6 has already seeded.
- **Code (new):** `src/app/onboarding/` (page, steps, done page), `src/app/api/onboarding/route.ts`, `src/lib/profile/` (alias, bio, silhouettes, answer validation, onboarding redirect), `src/components/ProfileCard.tsx`, `public/silhouettes/*.svg`, and additions to `prisma/seed-data.ts` and `prisma/seed.ts`.
- **Routes owned:** `/onboarding`, `/onboarding/done` and `/api/onboarding` only.
- **Join-up (#17):** other tracks' pages call `redirectIfOnboardingIncomplete()`. Slice 7 reuses the step components to edit answers. Slice 4 decides how an alias with spaces becomes a `/people/[alias]` URL.
- **Out of scope:** scoring (slice 3), editing answers after onboarding (slice 7), admin editing of tags and alias words (slice 8), the photo (slice 7), and saving half-finished onboarding between visits.
