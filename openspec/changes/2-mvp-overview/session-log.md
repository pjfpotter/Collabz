# Session log — 2026-09-25

Evidence record of a Claude Code session (Patrick directing, Claude Code carrying out the work). It covers the docs PR and the MVP planning change, what was done, and why.

## 1. Project docs — PR #1

**What:** Added README.md, CLAUDE.md, ARCHITECTURE.md and WORKFLOW.md on a branch (`docs/project-docs`) and opened a pull request rather than committing to `master`.

**Why a PR:** so nothing lands on `master` until the other person has reviewed it — the collaborative process we're following.

**Catch along the way:** pulling the latest `master` brought in a longer README Patrick had written earlier on GitHub (commit `373b52e`). The new README would have silently wiped the rules in it. Work stopped before opening the PR and Patrick chose to merge. His earlier rules were moved into WORKFLOW.md, and where the two versions disagreed, his earlier rules won:
- chain of identity (one ticket number across branch, OpenSpec folder, PR and commits)
- 6 board columns
- commit format and ticket template
- the deploy step
- "Where the evidence lives"

Also changed `main` → `master` to match the repo and restored the "Tinder for Business" tagline.

## 2. MVP planning — issue #2, PR #3

**What:** Committed `collabz-mvp-brief.md` to the repo (all evidence is kept in the repo), opened ticket #2 (the workflow starts every change with a ticket), and ran OpenSpec propose using the brief as the source material.

**Why questions were asked first:** the brief itself says to ask rather than guess. Patrick decided:
- **Split the MVP into slices.** Four weeks of work is too much for one change, and our rules say to keep changes small.
- **Reveal only the signup email** when two people connect.
- **Show a generated alias on the graph,** with no typed names.
- **Everyone matches everyone.** Course is recorded but doesn't limit matching.

**What the change contains:** planning only, no code:
- **proposal:** what's in and out of the MVP, and the demo-day check
- **design:** the shared decisions and why, the risks, and open questions assigned to slices
- **tasks:** create tickets for the six slices, in the order auth → onboarding → matching → graph → connections → safety

It's a PR so Tom can approve or comment before it becomes the plan we both work from.

**A fix along the way:** the PR text was changed from "Closes #2" to "Part of #2". Otherwise GitHub would have closed the ticket when the PR merged, before the follow-up tasks were done.

## Where things stood at the end of the session

- **PR #1 (docs):** waiting for Tom's review. Merge it first, because the MVP plan's follow-up tasks fill in ARCHITECTURE.md, which only exists on that branch.
- **PR #3 (MVP plan):** waiting for Tom's review. As part of approving it, he adds his line to `approval.md`.
- **After both merge:** apply the MVP plan to open the six slice tickets and record the decisions in the project files. Slice 1 (sign-up and legal pages) is then the first piece of real building.
