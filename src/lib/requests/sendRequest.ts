// SENDING A CONNECTION REQUEST (slice 5, #12, design decisions 1 and 3).
//
// sendConnectionRequest() below is the ONE place that decides whether a
// request may be sent, and it stores the request when the answer is yes.
//
// WHY THE RULES LIVE HERE AND NOT IN A ROUTE: hiding the Connect button, or
// checking in one route, stops nobody from sending a request by hand. Anything
// that sends a request goes through this function, so the rules hold however
// it is called (#12 success check 1). Slice 4's route has its own check as
// well, as a second lock.
//
// THE ORDER OF THE CHECKS, and why it is this order:
//
//   1. the two are the same person        -> "self"
//   2. the other person isn't visible     -> "unavailable"
//   3. either has blocked the other       -> "unavailable"
//   4. a request already exists           -> "already-pending",
//                                            "already-connected" or "declined"
//   5. not in the top 5 or glitch match   -> "not-a-match"
//
//   - 2 and 3 give the SAME answer on purpose. Saying "this person blocked
//     you" would be a safety leak, so the sender can't tell the two apart.
//   - 4 comes BEFORE 5. If someone has since dropped out of your top 5 but a
//     request already exists, "a request is already waiting" is the more
//     useful thing to be told than "not a match".
//   - 5 is last because it is the most expensive: it works out a whole top 5.
//   - Each check is a plain read. The actual storing at the end is one
//     transaction that checks "none yet" again, because two presses can pass
//     check 4 at the same moment (see insertRequestUnlessPairHasOne).

import { Prisma } from "@/generated/prisma/client";
// WHY THIS IMPORT IS A CIRCLE, AND WHY THAT IS OKAY: profile.ts imports
// standIns.ts, and (from task 3.1) standIns.ts calls this file. Each only USES
// the other inside a function, never while the file loads, so the circle is
// harmless. getConnectPermission is the one "top 5 or glitch match" rule,
// shared with the profile page, which README names as the helper for slice 5.
import { getConnectPermission } from "@/lib/cohort/profile";
import { getVisiblePeople } from "@/lib/cohort/visiblePeople";
import { prisma } from "@/lib/db";

import {
  REFUSAL_MESSAGES,
  REQUEST_SENT_MESSAGE,
  type RefusalReason,
} from "./messages";

// Prisma's code for "the database stopped this transaction because another
// one running at the same time conflicted with it". It is not a bug: it is
// the database keeping its promise, and the right response is to try again.
const TRANSACTION_CONFLICT_CODE = "P2034";

// Says whether an error is that conflict.
//
// WHY TWO SHAPES: Prisma normally wraps it as a PrismaClientKnownRequestError
// with code P2034. But with Neon's driver adapter (src/lib/db.ts) the test in
// tests/integration/sendRequest.test.ts showed the conflict arriving as the
// adapter's own "DriverAdapterError", whose `cause.kind` is
// "TransactionWriteConflict" (Postgres's own code for it is 40001). So both
// are recognised. The adapter's class is checked by name and shape because it
// lives in a package we don't depend on directly.
function isTransactionConflict(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === TRANSACTION_CONFLICT_CODE
  ) {
    return true;
  }
  if (error instanceof Error && error.name === "DriverAdapterError") {
    const cause = (error as Error & { cause?: { kind?: string } }).cause;
    return cause?.kind === "TransactionWriteConflict";
  }
  return false;
}

// How many times to try in total. Two is enough: after one conflict the other
// request has finished, so the second try sees it and gives the right answer.
const MAX_ATTEMPTS = 2;

// What storing a request can come to.
//   "created" - there was no request between the two, so one was stored
//   "exists"  - there already was one (in either direction, in any status),
//               so nothing was stored
export type InsertOutcome = "created" | "exists";

// Stores a PENDING request from `fromUserId` to `toUserId`, unless the pair
// already has a request in either direction. Whichever way round, and in
// whatever status (pending, approved or declined), an existing request means
// nothing is stored: "one request per pair, ever" (specs, design decision 3).
//
// WHY ONE TRANSACTION: "look for a request, then create one if there was none"
// has a gap between the look and the create. Two presses of Connect at the
// same moment can both look, both find nothing, and both create. A
// transaction at the Serializable level closes the gap: the database makes
// the two behave as if they ran one after the other, and stops one of them
// with a conflict (code P2034) if they can't.
//
// WHY NOT A DATABASE RULE: a "unique" rule on (fromUserId, toUserId) would
// not stop the reverse direction (B asking A while A's request is pending),
// and ConnectionRequest has a direction so it isn't stored lower-id-first.
// Both would need a schema change, which is flagged first (CLAUDE.md).
//
// CHECKED ON NEON (task 2.1): two presses at once, and the two directions at
// once, both leave exactly one row (tests/integration/sendRequest.test.ts).
// The fallback in the design (an advisory lock) was not needed.
export async function insertRequestUnlessPairHasOne(
  fromUserId: string,
  toUserId: string,
): Promise<InsertOutcome> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          // Any request between these two, whichever way round it was sent.
          const existing = await transaction.connectionRequest.findFirst({
            where: {
              OR: [
                { fromUserId, toUserId },
                { fromUserId: toUserId, toUserId: fromUserId },
              ],
            },
            select: { id: true },
          });
          if (existing) {
            return "exists" as const;
          }

          await transaction.connectionRequest.create({
            data: { fromUserId, toUserId },
          });
          return "created" as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      // A conflict on the last attempt, or any other error, is passed on.
      if (!isTransactionConflict(error) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      // Otherwise go round again: the other request has finished by now.
    }
  }

  // The loop always returns or throws. This line only exists because
  // TypeScript can't see that, and it needs the function to end somehow.
  throw new Error("insertRequestUnlessPairHasOne: unreachable");
}

// ---------------------------------------------------------------------------
// The helper everything else calls
// ---------------------------------------------------------------------------

// What the caller is told. `message` is a sentence the page can show as it
// is. This is a superset of what slice 4's stand-in returned
// ({ sent, message }), so the connect route and the button need no change.
export type SendConnectionRequestResult =
  | { sent: true; message: string }
  | { sent: false; message: string; reason: RefusalReason };

// Builds a refusal. It exists so every refusal is built the same way and the
// sentence always comes from messages.ts.
function refuse(reason: RefusalReason): SendConnectionRequestResult {
  return { sent: false, message: REFUSAL_MESSAGES[reason], reason };
}

// Looks at every request between the two (either direction, any status) and
// says which refusal reason it points to, or null if there is none.
//
// WHY A PRECEDENCE AND NOT JUST "THE FIRST ONE": the table allows more than
// one row per pair (the pretend cohort has some), so be clear about which
// wins: connected beats waiting, and waiting beats declined.
async function findExistingRequestReason(
  userId: string,
  otherUserId: string,
): Promise<RefusalReason | null> {
  const requests = await prisma.connectionRequest.findMany({
    where: {
      OR: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
    },
    select: { status: true },
  });

  if (requests.some((request) => request.status === "APPROVED")) {
    return "already-connected";
  }
  if (requests.some((request) => request.status === "PENDING")) {
    return "already-pending";
  }
  if (requests.some((request) => request.status === "DECLINED")) {
    return "declined";
  }
  return null;
}

// Has either of the two blocked the other? (The Block table is slice 9's.
// This only reads it.)
async function hasBlockBetween(userId: string, otherUserId: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
    select: { blockerId: true },
  });
  return block !== null;
}

// Sends a connection request from one person to another, or refuses.
//
// Stores exactly one PENDING request when it says `sent: true`, and stores
// NOTHING in every other case.
//
// Owner: slice 5 (#12). slice 4's stand-in of the same name calls this.
export async function sendConnectionRequest(
  fromUserId: string,
  toUserId: string,
): Promise<SendConnectionRequestResult> {
  // 1. Nobody connects with themselves.
  if (fromUserId === toUserId) {
    return refuse("self");
  }

  // 2. The other person must be visible: a finished profile, not suspended.
  // This is the same rule the graph and the people list use.
  const visiblePeople = await getVisiblePeople();
  const isVisible = visiblePeople.some((person) => person.userId === toUserId);
  if (!isVisible) {
    return refuse("unavailable");
  }

  // 3. A block, in either direction, ends it. Same answer as 2 (see above).
  if (await hasBlockBetween(fromUserId, toUserId)) {
    return refuse("unavailable");
  }

  // 4. Is there already a request between the two?
  const existingReason = await findExistingRequestReason(fromUserId, toUserId);
  if (existingReason !== null) {
    return refuse(existingReason);
  }

  // 5. Are they in the sender's top 5, or their glitch match?
  const permission = await getConnectPermission(fromUserId, toUserId);
  if (permission === null) {
    return refuse("not-a-match");
  }

  // All the checks passed. Store it. The transaction looks once more, because
  // another press could have got in between check 4 and now.
  const outcome = await insertRequestUnlessPairHasOne(fromUserId, toUserId);
  if (outcome === "exists") {
    // We lost a race. Find out what the winner was, so the answer is as
    // specific as it would have been a moment earlier. (`?? "already-pending"`
    // is only a safety net; the request must exist if the insert said so.)
    const reason = await findExistingRequestReason(fromUserId, toUserId);
    return refuse(reason ?? "already-pending");
  }

  return { sent: true, message: REQUEST_SENT_MESSAGE };
}
