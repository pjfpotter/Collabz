# Proposal: Slice 4, cohort graph and people search (#11)

## Why

The graph is what makes Collabz different from a list of CVs: every student sees the whole cohort at once, with the strength of each fit drawn as a line. Without it, matching (slice 3) produces numbers nobody can see, and there is no way to look beyond your own top 5. This slice draws that graph and adds filters by course, skill and interest, so students can explore chemistry across both courses. It is track 4 in the slice map (#18) and depends only on the foundation (#7).

## What Changes

- **A full force-directed graph at `/graph`**: every finished profile is a dot and every stored score is a line. People with stronger scores are pulled closer together.
- **Every edge is drawn, and weak ones are faint.** A line's thickness and its faintness both follow the score, so strong fits stand out and weak ones sit in the background.
- **Glitch matches are drawn as dashed lines**, so they differ by pattern and not by thickness (thickness already means score).
- **Your own top 5 and glitch match are highlighted** on the graph, and also listed in words beside it, for phones and screen readers.
- **Course is shown as node colour**, with a legend: one colour for Software, one for Business.
- **Tapping a node** shows that person's alias, course and score with you, with a link to their profile.
- **A people list at `/people` with three filters**: course, skill and interest. Each is one pick from a list, and they combine (course *and* skill *and* interest). The filters live in the page address, so the same filter can be carried to `/graph`, where matching people are highlighted.
- **A profile page at `/people/[alias]`**: alias, silhouette, bio, course, the person's tags by category, and "why you match".
- **A Connect button only for your top 5 or glitch match.** It is checked again on the server. Until slice 5 lands it is not wired up: pressing it says requests aren't switched on yet.
- **Temporary stand-ins for what other tracks own**, kept in one file inside this track's folder and swapped for the real helpers at join-up (#17): your top 5 and the "why you match" breakdown (track 3), sending a request (track 5), and the bio, silhouette picture and "finished profile" check (track 2).
- **New dependency: `react-force-graph-2d`**, the 2D build of the `react-force-graph` library named in the project's stack.

### Decisions made for this change (asked of Patrick, 8 Oct 2026)

| Question | Decision |
|---|---|
| Is course shown on the graph? (open question on #11) | Yes, as node colour with a legend |
| The edge-rendering rule (open question on #11) | Draw every edge; weak ones are thin and faint |
| How to build before tracks 3 and 5 exist | Local stand-ins inside track 4's folder, swapped at join-up. #7 is not changed |

## Capabilities

### New Capabilities

- `collab-graph`: the shared graph of the whole cohort: who and what is drawn, how score, glitch matches, course and your own matches are shown, and what tapping a person does.

### Modified Capabilities

- `people-search`: the filter requirement gets its page (`/people`), says how filters combine and who is left out, and how a filter carries over to the graph. The contact-limit requirement now covers the Connect button for top 5 and glitch matches. A new requirement covers opening a person's profile at its own address.

## Impact

- **Depends on #7 (foundation), which is proposed but not merged** (PR #22). This plan assumes its tables (`User`, `Profile`, `ProfileTag`, `Edge`, `GlitchMatch`, `ConnectionRequest`), its pretend cohort, `getCurrentUser()`, the dev switcher and the placeholder pages for `/graph`, `/people` and `/people/[alias]`. Apply can only start once #7 has merged. If its real names differ, the tasks follow the real names.
- **Routes owned:** `/graph`, `/people`, `/people/[alias]` and `/api/people/*` only. This slice replaces #7's three placeholder pages.
- **Code (new):** `src/app/graph/`, `src/app/people/`, `src/app/api/people/`, `src/lib/cohort/` (who is visible, graph data, search, alias addresses, and the stand-ins file) and tests.
- **Schema:** no change.
- **Dependencies (new):** `react-force-graph-2d`.
- **Other tracks (names to agree, then swap at join-up #17):**
  - Track 3 (#10): `getTopFive(userId)` and `explainMatch(userAId, userBId)`.
  - Track 5 (#12): `sendConnectionRequest(fromUserId, toUserId)`.
  - Track 2 (#9): `generateBio()`, `silhouetteUrl()` and `redirectIfOnboardingIncomplete()`, names already in #9's proposal. This slice also answers #9's open point on how an alias becomes a page address.
- **Skills and Interests tags arrive with #9.** Until then those two filters have nothing to offer and are hidden.
- **Docs:** `README.md` gains a short section on the graph, the filters and the stand-ins. `ARCHITECTURE.md` is updated at archive, because this adds the graph library and the first client-side drawing code.
- **Out of scope:** favourites (MVP Later), the request flow itself (slice 5), real scoring and the real breakdown (slice 3), photos on profiles (slice 7 owns upload and the permission check), hiding blocked people from each other (slice 9 and join-up), and real-time updates of the graph.
