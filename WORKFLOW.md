# Workflow — How We Collaborate

This is the process every feature goes through, and the conventions we've agreed as a team. Evidence lives natively in this repo (issues, PRs, commits, `openspec/changes/`) rather than in a separate write-up.

## Chain of identity

One feature keeps the same name and number everywhere:

```
Ticket:    #12 — Add "mark task done"
Branch:    feature/12-mark-task-done
OpenSpec:  openspec/changes/12-mark-task-done/
PR title:  #12 Add mark task done
Commits:   reference #12 in the message
```

If a piece of work can't be given one clean name, it's not one ticket yet — split it.

## The feature chain

| Stage | What happens | Board column | Where the evidence lives |
|---|---|---|---|
| 1. Pick feature | Choose the highest-priority unfinished ticket from the board | Backlog | GitHub Issue |
| 2. Branch | `git checkout -b feature/<issue-number>-<slug>` | | Git branch |
| 3. Interview & spec | `/opsx:propose` in Claude Code — drafts the proposal | Spec | `openspec/changes/<issue-number>-<slug>/` |
| 4. Approve | Team reads the proposal and signs off before any code is written. Before approving, everyone can state: what's in/out, where it fits in the app, how it'll be checked | Approved | PR description / `approval.md` (see below) |
| 5. Build | `/opsx:apply-change` implements the approved tasks | In Progress | Commits on the branch |
| 6. Verify | `/opsx:verify-change` checks the implementation against the spec | | Commit / PR comment |
| 7. Commit | Reviewed change committed with the agreed message format (below) | | Git log |
| 8. Push & PR | Push branch, `gh pr create` against `master` | In Review | GitHub PR |
| 9. Review, merge & deploy | Named reviewer reads the diff, runs the checks, approves, then merges. Deploy, open the deployed URL and repeat the success checks | | GitHub PR approval, deployed URL |
| 10. Archive | `/opsx:archive-change` moves the change to `changes/archive/`. Ticket closes | Done | Permanent record in `openspec/changes/archive/` |

## Tooling decisions

- **Issue tracking:** GitHub Issues
- **Board:** GitHub Projects (Kanban) — columns: Backlog → Spec → Approved → In Progress → In Review → Done. Backlog and Done are automated (item added / PR merged); the rest are manual drags — deliberately, since those are the points where a human is meant to be deciding something.
- **Spec workflow:** OpenSpec CLI (`openspec init` already run; config committed)
- **Coding agent:** Claude Code, using OpenSpec's `/opsx:` slash commands
- **Branching:** feature branches off `master`, not forks (we're collaborators on one repo, not external contributors) — this keeps issues, PRs, and the board in one place

## Ticket template

```
## User need
For ___, we will make it possible to ___, so they can ___.

## Scope
In: ...
Out: ...

## Architecture
Which existing parts of the app this touches.

## Success checks
- [ ] ...
- [ ] ...

## Open questions
Anything that must be resolved before coding starts.

## OpenSpec change
openspec/changes/<issue-number>-<slug>/
```

## Commit message format

```
<what changed, one line>

<why it was needed, one line>

Checked: <what you ran / tried to verify it>
Reviewed-by: <name>
```

Example:

```
Add "mark task done" button to task list (#12)

Users had no way to close out a task without deleting it.

Checked: clicked button on 3 existing tasks, confirmed it
persists after refresh. Tried it on an empty list — no crash.
Reviewed-by: Priya
```

Write commits with `git commit` (no `-m`) so the editor opens for the full message. Add a review after the fact with:

```bash
git commit --amend --trailer "Reviewed-by: <name>"
```

`Reviewed-by` only goes in once someone has actually looked at the diff — never your own name.

## PR review & approval

We use GitHub's native PR approval as the primary sign-off mechanism — a named reviewer clicks **Approve** before merge. That merge is the evidence trail.

To cover the bit PR approval alone doesn't prove — that each person can actually explain their contribution — we add two small files into the same `openspec/changes/<issue-number>-<slug>/` folder OpenSpec already creates:

- **`approval.md`** — one line per person: "Reviewed, can explain what's in/out, where it lives, how it's checked. Approved <date>."
- **`contributions.md`** — one line per person: which task(s) they drove, plus one decision they can explain.

Keep the raw interview/proposal exchange (or a flagged summary of open questions) in the proposal doc itself before it's finalised, rather than letting it collapse into only the polished spec.

## Where the evidence lives

Nothing here is written up separately after the fact — it's all native to the repo:

- **What was decided and why** → the OpenSpec proposal/spec in `openspec/changes/` (and `archive/` once closed)
- **What was approved, by whom** → the PR description and named GitHub approval
- **What was checked** → the `Checked:` line in each commit, plus `/opsx:verify-change` output
- **Who did what** → commit authorship and PR history, referenced against ticket numbers
- **That it actually works** → the deployed URL, checked against each ticket's success checks

## Principles

- **One task, one clear result, one reviewable change** — keep features small.
- Every learner must be able to explain their own contribution and one key decision.
- If we can't check something against the spec, the spec isn't clear enough yet.
- No parallel documentation system — if it's evidence, it goes in the repo (issue, PR, commit, or `openspec/changes/`), not a separate doc.
