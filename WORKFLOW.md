# Workflow — How We Collaborate

This is the process every feature goes through, and the conventions we've agreed as a team. Evidence lives natively in this repo (issues, PRs, commits, `openspec/changes/`) rather than in a separate write-up.

## The feature chain

| Stage | What happens | Where the evidence lives |
|---|---|---|
| 1. Pick feature | Choose the highest-priority unfinished ticket from the board | GitHub Issue |
| 2. Branch | `git checkout -b feature/<issue-number>-<slug>` | Git branch |
| 3. Interview & spec | `/opsx:propose` in Claude Code — drafts the proposal | `openspec/changes/<slug>/` |
| 4. Approve | Team reviews the proposal, signs off before any code is written | PR description / `approval.md` (see below) |
| 5. Build | `/opsx:apply-change` implements the approved tasks | Commits on the branch |
| 6. Verify | `/opsx:verify-change` checks the implementation against the spec | Commit / PR comment |
| 7. Commit | Reviewed change committed with the agreed message format (below) | Git log |
| 8. Push & PR | Push branch, open PR against `main` | GitHub PR |
| 9. Review & merge | Named reviewer approves the PR, then merges | GitHub PR approval |
| 10. Archive | `/opsx:archive-change` moves the change to `changes/archive/` | Permanent record in `openspec/changes/archive/` |

## Tooling decisions

- **Issue tracking:** GitHub Issues
- **Board:** GitHub Projects (Kanban) — columns: Backlog → In Progress → In Review → Done
- **Spec workflow:** OpenSpec CLI (`openspec init` already run; config committed)
- **Coding agent:** Claude Code, using OpenSpec's `/opsx:` slash commands
- **Branching:** feature branches off `main`, not forks (we're collaborators on one repo, not external contributors)

## Ticket template

```
**User need:** who needs what, and why
**Scope:** what will change; what's explicitly out of scope
**Architecture:** which existing parts of the app this touches
**Success checks:** what we'll do, and what should happen
**Open questions:** anything that must be resolved before coding starts
```

## Commit message format

```
What: <one line, what changed>
Why: <one line, why it was needed>
Checked: <how it was verified — command run, case tested>
Reviewed-by: <name>
```

## PR review & approval

We use GitHub's native PR approval as the primary sign-off mechanism — a named reviewer clicks **Approve** before merge. That merge is the evidence trail.

To cover the bit PR approval alone doesn't prove — that each person can actually explain their contribution — we add two small files into the same `openspec/changes/<slug>/` folder OpenSpec already creates:

- **`approval.md`** — one line per person: "Reviewed, can explain what's in/out, where it lives, how it's checked. Approved <date>."
- **`contributions.md`** — one line per person: which task(s) they drove, plus one decision they can explain.

Keep the raw interview/proposal exchange (or a flagged summary of open questions) in the proposal doc itself before it's finalised, rather than letting it collapse into only the polished spec.

## Principles

- **One task, one clear result, one reviewable change** — keep features small.
- Every learner must be able to explain their own contribution and one key decision.
- If we can't check something against the spec, the spec isn't clear enough yet.
- No parallel documentation system — if it's evidence, it goes in the repo (issue, PR, commit, or `openspec/changes/`), not a separate doc.
