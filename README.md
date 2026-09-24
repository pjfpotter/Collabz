# Collabz
Tinder for Business

Workflow

This repo uses a lightweight, agentic-development workflow built around tickets, OpenSpec, and reviewed commits. Every feature follows the same chain, so the evidence of how it was built lives in the repo itself — not in a separate write-up.

Chain of identity

One feature keeps the same name and number everywhere:

Ticket:    #12 — Add "mark task done"
Branch:    feature/12-mark-task-done
OpenSpec:  openspec/changes/12-mark-task-done/
PR title:  #12 Add mark task done
Commits:   reference #12 in the message

If a piece of work can't be given one clean name, it's not one ticket yet — split it.

Prerequisites (once per machine)
Node.js ≥ 20.19.0 (node --version)
OpenSpec CLI: npm install -g @fission-ai/openspec@latest
GitHub CLI, authenticated: gh auth status
Claude Code, signed in: claude /login
Repo setup (once per project — already done here)
openspec init          # creates openspec/ and .claude/ workflow files

openspec/, .claude/, and CLAUDE.md are committed to the repo. CLAUDE.md holds the whole-project context (architecture, conventions, commands) that Claude Code reads automatically every session. OpenSpec's openspec/changes/<ticket>/ folders hold the per-feature context — the spec for the specific piece of work in hand.

Workflow
#	Stage	What happens
1	Ticket	Write up the feature as a GitHub Issue: user need, scope, success checks. Auto-added to the board in Backlog.
2	Branch	git checkout -b feature/<number>-<slug>
3	Spec	In Claude Code: /opsx:propose for the ticket → drafts openspec/changes/<number>-<slug>/. Move card to Spec.
4	Approve	Team reads the spec. Before approving, everyone can state: what's in/out, where it fits in the app, how it'll be checked. Sign-off goes in the PR description. Move card to Approved.
5	Build	/opsx:apply-change implements the approved tasks. Move card to In Progress.
6	Verify	/opsx:verify-change checks the implementation against the spec.
7	Commit	Every commit uses the format below.
8	PR & review	Push branch, gh pr create, reviewer reads the diff, runs the checks, approves. Move card to In Review.
9	Merge & deploy	Merge to main, deploy, open the deployed URL and repeat the success checks.
10	Close	/opsx:archive-change moves the change to openspec/changes/archive/. Ticket closes, card auto-moves to Done.

Board columns: Backlog → Spec → Approved → In Progress → In Review → Done. Backlog and Done are automated (item added / PR merged); the rest are manual drags — deliberately, since those are the points where a human is meant to be deciding something.

Commit message format
<what changed, one line>

<why it was needed, one line>

Checked: <what you ran / tried to verify it>
Reviewed-by: <name>

Example:

Add "mark task done" button to task list

Users had no way to close out a task without deleting it.

Checked: clicked button on 3 existing tasks, confirmed it
persists after refresh. Tried it on an empty list — no crash.
Reviewed-by: Priya

Write commits with git commit (no -m) so the editor opens for the full message. Add a review after the fact with:

git commit --amend --trailer "Reviewed-by: <name>"

Reviewed-by only goes in once someone has actually looked at the diff — never your own name.

Ticket template
## User need
For ___, we will make it possible to ___, so they can ___.

## Scope
In: ...
Out: ...

## Success checks
- [ ] ...
- [ ] ...

## OpenSpec change
openspec/changes/<number>-<slug>/
Branching

Branches off this repo, not forks — everyone on the team has write access, so branching keeps issues, PRs, and the board in one place.

Where the evidence lives

Nothing here is written up separately after the fact — it's all native to the repo:

What was decided and why → the OpenSpec proposal/spec in openspec/changes/ (and archive/ once closed)
What was approved, by whom → the PR description and named GitHub approval
What was checked → the Checked: line in each commit, plus /opsx:verify-change output
Who did what → commit authorship and PR history, referenced against ticket numbers
That it actually works → the deployed URL, checked against each ticket's success checks
