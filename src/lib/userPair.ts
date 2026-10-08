// Puts two user ids into the one agreed order for storing a pair.
//
// Some things belong to a PAIR of people with no "first" and "second": a
// chemistry score (Edge) and a conversation. We store each pair in ONE row,
// with the alphabetically lower user id in `userAId` and the other in
// `userBId` (see the shared rules in prisma/schema.prisma). One row per pair
// means it can never disagree with a second copy of itself.
//
// Always go through this function when reading or writing those tables, so
// nobody has to remember which way round the ids go:
//
//   const { userAId, userBId } = orderUserPair(me.id, them.id);
//   const edge = await prisma.edge.findUnique({
//     where: { userAId_userBId: { userAId, userBId } },
//   });
//
// Owner: foundation (#7).

export type UserPair = {
  userAId: string; // the lower of the two ids
  userBId: string; // the higher of the two ids
};

export function orderUserPair(firstUserId: string, secondUserId: string): UserPair {
  // A pair needs two different people. Being handed the same id twice is
  // always a bug in the calling code (nobody has a score or a conversation
  // with themselves), so we stop loudly instead of storing a nonsense row.
  if (firstUserId === secondUserId) {
    throw new Error(
      `orderUserPair needs two different users, but got "${firstUserId}" twice.`,
    );
  }

  // Plain < on strings compares them character by character. We use it,
  // rather than localeCompare, because it gives the same answer on every
  // machine regardless of language settings.
  if (firstUserId < secondUserId) {
    return { userAId: firstUserId, userBId: secondUserId };
  }
  return { userAId: secondUserId, userBId: firstUserId };
}
