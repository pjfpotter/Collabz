// The admin "Rescore everyone" button's logic (slice 8, #15, design 9).
//
// WHY THIS EXISTS: changing a tag pairing doesn't change any stored score by
// itself (admin spec). Scores only change when someone is rescored, which
// normally happens when that person edits their answers. After an admin
// changes pairings, everyone's scores are out of date, so this recalculates
// them all.
//
// WHY rescoreEveryone() AND NOT A LOOP OF scoreUser(): slice 3 already has a
// bulk version that does everyone in ONE database transaction. A loop would
// make a round trip per person, which the matching code notes was too slow
// even for 30 people, and could run past a Vercel function's time limit.
// It is imported from "@/lib/matching", the shared door (we added the export
// there for this slice).
//
// Returns how many people were scored, so the page can say so.
//
// Callers (the Server Action) check the person is an admin first.
//
// Owner: slice 8 (#15).

import { rescoreEveryone } from "@/lib/matching";

export async function rescoreEveryoneNow(): Promise<number> {
  return rescoreEveryone();
}
