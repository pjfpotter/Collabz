# Tasks: Align the Collabz plan with the Bootcamp Connect brief (#4)

This change builds no code. Its tasks record the decisions where future work will see them and set up the revised slices. Steps 1 and 2 can start today. Step 3 needs this PR approved.

## 1. Docs (in this change)

- [x] 1.1 Fill in `ARCHITECTURE.md` from `2-mvp-overview` and this design. Check: a teammate can explain the slice order, the scoring trigger and the photo privacy rule from that file alone
- [x] 1.2 Tom reads `design.md` § Brief-alignment decisions and adds his line to `approval.md` in this folder. Check: `approval.md` has Tom's line with the date

## 2. Thursday milestone: slice 0

- [x] 2.1 Open the slice 0 issue ("Walking skeleton + tag catalogue") using the WORKFLOW.md ticket template, with success checks taken from `specs/tag-catalogue/spec.md`. Check: the issue exists and links to #4
- [ ] 2.2 *(moved to #6)* Run `/opsx:propose` for slice 0 on its own `feature/<n>-tag-catalogue` branch, built on the `tag-catalogue` requirements here. Check: `openspec validate <n>-tag-catalogue` passes
- [ ] 2.3 *(moved to #6)* Build, test and deploy slice 0 through the normal chain. Check: the seed and catalogue tests pass locally, and the catalogue page on the Vercel URL shows the 5 seeded categories

## 3. After PR #3 and this change are approved

- [x] 3.1 Add a `context:` block to `openspec/config.yaml` covering the stack, the no-free-text rule as narrowed by B1 (onboarding and profiles only), the reveal-on-approval pattern (B1, B3), and the "this design overrides `2-mvp-overview`" rule. Check: `openspec instructions proposal --change 4-brief-alignment --json` shows it in its `context` field
- [ ] 3.2 *(still to do, after archive)* Create GitHub issues for slices 1–9 from `design.md` D-new-4 (this replaces `2-mvp-overview` tasks 2.1–2.7). Each issue copies its slice's open questions and requirement labels. Check: 9 issues exist, each linked to #4
- [ ] 3.3 *(still to do, needs `project` scope on the gh token)* Add the slice issues to the project board in Backlog, in build order. Check: the board shows them in order
- [x] 3.4 Run `/opsx:archive-change` for `4-brief-alignment` after `2-mvp-overview` has been archived, so the brief-level specs land in `openspec/specs/`. Check: `openspec list --specs` shows the 11 capabilities and #4 is closed
