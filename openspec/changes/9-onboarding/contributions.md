# Contributions: Slice 2, onboarding (#9)

| Group | Driven by | One decision they can explain |
|---|---|---|
| Proposal, design and specs (1 Oct) | Marvin, with Claude Code | Every multi-pick category takes 1 to 4 picks, so no profile is left with an empty category (team decision, 1 Oct). |
| 1. Starting point | Marvin, with Claude Code | No schema change was needed: the foundation (#7) had already added `Tag.aliasWord` and the unique alias, so the planned migration was dropped. |
| 2. Seed | Marvin, with Claude Code | Alias words are filled in only where empty, so a word an admin changes survives a re-seed. |
| 3. Profile logic | Marvin, with Claude Code | The answer check is a pure function, so it's tested without a database and the server can repeat the browser's limits. |
| 4. Saving | Marvin, with Claude Code | The profile and all its tags are saved in one transaction, and the database's unique rule (with a retry) is what keeps two aliases from clashing. |
| 5. Screens | Marvin, with Claude Code | One save at the end, so the database never holds a half-made profile. The silhouette pictures are Patrick's slice 10 designs, used through `silhouetteUrl(id)` as planned. |
| 6. Docs | Marvin, with Claude Code | The stand-ins in slices 4 and 7 are left for join-up (#17), because slice 2 only changes its own routes. |
