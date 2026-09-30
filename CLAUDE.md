# CLAUDE.md

Project context for Claude Code (and any other agent working in this repo). Read this before starting work.

## Who's working on this

Two beginners (Patrick and Tom) building this as coursework, learning agentic development as we go. Optimise for **us understanding the code**, not for cleverness or brevity.

## How to work — chunk everything down

- Never take on more than the single approved task in the current `openspec/changes/<slug>/` proposal. If a task looks like it needs more than one focused change, say so and propose splitting it — don't quietly expand scope.
- Work in visible steps. Before writing code, restate the plan in a few short steps. After each meaningful step, pause rather than ploughing on to the next unrelated thing.
- If you hit a decision that isn't already settled in the spec (a library choice, a data shape, an edge case), stop and ask — don't invent an answer and move on.

## Explain every decision

- Every non-trivial choice (why this structure, why this library, why this approach over an obvious alternative) gets a one-line reason, either as a code comment at the point of the decision or in the commit body. We should never have to ask "why did we do it this way?" without the answer being nearby.
- Follow the commit format in `WORKFLOW.md` (what line, why line, `Checked:`, `Reviewed-by:`) — the "why" line matters as much as the "what". Never add a `Reviewed-by` trailer yourself; only a human reviewer's name goes there.

## Code style — write for beginners reading it later

- Comment generously. Assume the reader knows basic syntax but not this codebase, this framework's conventions, or why a particular pattern was chosen.
- Prefer clear, slightly verbose code over clever one-liners. If a shorter version exists but is harder to follow, use the longer one and say why in a comment.
- Explain *why*, not just *what* — `// counts unique users` is less useful than `// dedupe by email so a user isn't counted twice across sessions`.
- Keep functions small and named for what they do, so the architecture is readable from function/file names alone before you even open them.

## Architecture — keep the big picture current

- `openspec/specs/` holds the detailed, per-capability spec — treat it as the source of truth.
- `ARCHITECTURE.md` (repo root) is the plain-English overview — how the pieces fit together, key decisions and why. Update it as the last step of `/opsx:archive-change` whenever a change alters the shape of the system (new component, changed data flow, new dependency). If nothing structural changed, no update needed.

## Common commands

```bash
npm install
npm run dev
openspec --version
gh auth status
```
<!-- Add test/build/lint commands here once they exist -->

## Important files

```
openspec/specs/       # current spec per capability — source of truth
openspec/changes/     # in-flight and archived change proposals
.claude/               # OpenSpec slash commands for this agent
ARCHITECTURE.md        # plain-English system overview — keep current
WORKFLOW.md            # team process, commit format, ticket template
```

## MCP tools / integrations in use

<!-- List any connected tools (e.g. GitHub, Slack) here as they're added -->
