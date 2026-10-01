# Tasks: Collabz MVP overview (#2)

This change doesn't build any code. Its tasks set up the slices so each one can go through the normal chain (ticket → branch → `/opsx:propose` → approve → build → PR). Do them only after this PR is approved and merged.

## 1. Record the agreed decisions where future work will see them

- [ ] 1.1 Add a `context:` block to `openspec/config.yaml` covering the stack, the "no free text" rule, and design decisions 3–9 (in short). Check: run `openspec instructions proposal --change <any> --json` and confirm the output's `context` field shows it
- [ ] 1.2 Fill in `ARCHITECTURE.md` sections "What this app does", "The pieces" and "Key decisions and why" from this design (needs the docs PR #1 merged first). Check: a teammate can explain the slice order and the scoring trigger from that file alone

## 2. Create one GitHub issue per slice

Each issue uses the ticket template in `WORKFLOW.md`. The *Open questions* section copies the ones listed for that slice in `design.md`, and the issue links back to #2.

- [ ] 2.1 Slice 1 — **Sign-up & legal** (`user-auth`): Next.js app deployed on Vercel, Neon + Prisma connected, magic-link sign-in, T&C + data policy pages accepted at sign-up, QR code pointing at the live URL. Check: issue exists and a phone that scans the QR code can sign in on the live URL (that's the issue's own success check)
- [ ] 2.2 Slice 2 — **Onboarding** (`profile-onboarding`): five pick-from-list exercises, silhouette, course, generated alias; profile fixed once complete. Check: issue exists with success checks written
- [ ] 2.3 Slice 3 — **Chemistry matching** (`chemistry-matching`): score a new user against everyone on completion, store edges, top-5 query with tie-break, glitch assignment. Check: issue exists, and its success checks include a hand-worked score example taken from the brief's formula
- [ ] 2.4 Slice 4 — **Graph view** (`collab-graph`): full force-directed graph of all users/edges, edge thickness by score, glitch edge styled differently, user's own top 5 + glitch highlighted. Check: issue exists with success checks written
- [ ] 2.5 Slice 5 — **Connections** (`connection-requests`): request (top 5 + glitch only), in-app notification, approve/decline, mutual email reveal. Check: issue exists with success checks written
- [ ] 2.6 Slice 6 — **Safety** (`safety`): report (reason picked from a list) and block, and their effect on requests and reveals. Check: issue exists with success checks written
- [ ] 2.7 Add issues for slices 1–6 to the project board in Backlog, in build order. Check: board shows six cards in order

## 3. Close out

- [ ] 3.1 Run `/opsx:archive-change` for `2-mvp-overview` and close #2. Check: the change folder is in `openspec/changes/archive/` and #2 shows as closed
