// Works out which two rows swap places when an admin presses "Move up" or
// "Move down" (slice 8, #15, design 5).
//
// It is a plain function on a plain list, so it needs no database and is easy
// to test. The caller does the actual swap of the two `order` values in one
// transaction.
//
// Owner: slice 8 (#15).

export type MoveDirection = "up" | "down";

type Orderable = { id: string; order: number };

// `items` must already be sorted by position (what the admin sees on screen).
// Returns the two rows to swap, or a plain-English problem.
export function findSwapPartner<T extends Orderable>(
  items: T[],
  id: string,
  direction: MoveDirection,
): { item: T; neighbour: T } | { problem: string } {
  const index = items.findIndex((candidate) => candidate.id === id);
  if (index === -1) {
    return { problem: "That item doesn't exist." };
  }

  const neighbour = items[direction === "up" ? index - 1 : index + 1];
  if (!neighbour) {
    return { problem: direction === "up" ? "It is already first." : "It is already last." };
  }

  return { item: items[index], neighbour };
}
