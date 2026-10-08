// Tests for orderUserPair (foundation #7, task 2.2): the rule that a pair of
// users is always stored with the lower id first.

import { describe, expect, it } from "vitest";

import { orderUserPair } from "@/lib/userPair";

describe("orderUserPair", () => {
  it("puts the lower id in userAId", () => {
    expect(orderUserPair("user-a", "user-b")).toEqual({
      userAId: "user-a",
      userBId: "user-b",
    });
  });

  it("gives the same result whichever way round the ids are passed", () => {
    // This is the whole point: callers never have to know the order.
    expect(orderUserPair("user-b", "user-a")).toEqual(
      orderUserPair("user-a", "user-b"),
    );
  });

  it("orders the pretend cohort's ids by their number", () => {
    // The ids are zero-padded ("02", not "2") exactly so that comparing them
    // as text puts 02 before 10.
    expect(orderUserPair("pretend-user-10", "pretend-user-02")).toEqual({
      userAId: "pretend-user-02",
      userBId: "pretend-user-10",
    });
  });

  it("refuses the same user twice", () => {
    // Nobody has a score or a conversation with themselves, so this is
    // always a bug in the calling code.
    expect(() => orderUserPair("user-a", "user-a")).toThrow(/two different users/);
  });
});
