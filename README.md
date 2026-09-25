# Collabz

Team coursework project (Wave 7 bootcamp) demonstrating a professional, human-directed agentic software development lifecycle — from feature idea through to a reviewed, deployed change.

This README covers what the project is and how to get it running locally. For the full team process — OpenSpec, GitHub Issues, branching, commit format, approvals — see [`WORKFLOW.md`](./WORKFLOW.md).

## What this is

A small web app built collaboratively, with every feature tracked through the same chain: ticket → spec → approval → build → review → merge → deploy. The point of the exercise is as much about the evidenced process as the product itself.

## Prerequisites

Check these are installed before you start:

```bash
node --version    # v20.19.0 or higher
npm --version
git --version
gh --version       # GitHub CLI, authenticated (gh auth status)
```

You'll also need:
- **Claude Code** (or your preferred coding agent), installed and signed in
- **OpenSpec CLI**, installed once per machine:
  ```bash
  npm install -g @fission-ai/openspec@latest
  openspec --version
  ```

## Getting set up

```bash
git clone <repo-url>
cd collabz
npm install
```

`openspec/` and `.claude/` are already committed to this repo, so OpenSpec and Claude Code's slash commands (`/opsx:...`) should work as soon as you clone and restart your terminal/IDE.

## Running locally

```bash
npm run dev
```

<!-- Update this section with actual run/build/test commands once the app takes shape -->

## Project structure

```
openspec/
  specs/          # permanent, current spec for each part of the system
  changes/        # in-flight and archived change proposals — the evidence trail
.claude/          # Claude Code skills/commands for the OpenSpec workflow
CLAUDE.md         # project context for the coding agent
WORKFLOW.md       # how we collaborate — process, tooling, conventions
README.md         # this file
```

## How we work

Every feature follows the same ten-stage chain (pick → interview & spec → approve → build → verify → commit → PR → review → merge → archive). Full details, commit message format, and the ticket template are in [`WORKFLOW.md`](./WORKFLOW.md).
