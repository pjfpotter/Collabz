// THE MATCHING HELPERS OTHER TRACKS CALL (slice 3, #10, task 5.3).
//
// Import from "@/lib/matching" and nothing deeper. Everything not exported
// here is internal to this slice and may change without warning.
//
//   scoreUser(userId)             recalculate one user's scores and glitch match
//   getTopFive(userId)            their five best matches, best first
//   explainMatch(you, them)       why two people match, in plain sentences
//   ensureGlitchMatch(userId)     their glitch match, choosing one if missing
//   rescoreEveryone()             recalculate everyone's scores in one go (admin
//                                 screens, slice 8 #15, after pairings change)
//
// Join-up (#17): slice 4's src/lib/cohort/standIns.ts swaps its getTopFive
// and explainMatch stand-ins for these. The names and the shared parts of the
// result are the same, so that is a swap and not a rewrite.

export { scoreUser } from "@/lib/scoring";
export { getTopFive, type TopMatch } from "./topFive";
export { explainMatch } from "./explainMatch";
export type { MatchExplanation, MatchReason } from "./explain";
export { ensureGlitchMatch } from "./glitch";
export { rescoreEveryone } from "./rescoreUser";
