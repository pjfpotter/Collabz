// Tests for isAccountFinished and pickCurrentUser (slice 1, #8, task 2.3).
//
// pickCurrentUser decides who every page in the app treats as signed in, so
// every row of design decision 4's list gets its own test.

import { describe, expect, it } from "vitest";

import { isAccountFinished, pickCurrentUser } from "@/lib/auth/accountState";

// A tiny made-up user: only the fields these functions look at, plus a name
// so the tests can say which person came back.
type TestUser = {
  name: string;
  courseId: string | null;
  acceptedTermsAt: Date | null;
  suspendedAt: Date | null;
};

function makeUser(name: string, changes: Partial<TestUser> = {}): TestUser {
  return {
    name,
    courseId: "software",
    acceptedTermsAt: new Date("2026-10-13"),
    suspendedAt: null,
    ...changes,
  };
}

describe("isAccountFinished", () => {
  it("is true with a course and accepted terms", () => {
    expect(isAccountFinished(makeUser("finished"))).toBe(true);
  });

  it("is false without a course", () => {
    expect(isAccountFinished(makeUser("no course", { courseId: null }))).toBe(false);
  });

  it("is false without accepted terms", () => {
    expect(isAccountFinished(makeUser("no terms", { acceptedTermsAt: null }))).toBe(false);
  });

  // What Auth.js creates when a magic link is first opened.
  it("is false with neither", () => {
    expect(
      isAccountFinished(makeUser("brand new", { courseId: null, acceptedTermsAt: null })),
    ).toBe(false);
  });
});

describe("pickCurrentUser", () => {
  it("returns a finished real user", () => {
    const real = makeUser("real");
    expect(pickCurrentUser({ sessionUser: real, pretendUser: null })).toBe(real);
  });

  // user-auth spec: "Unfinished account opens another page".
  it("returns nobody for a real user who hasn't finished signing up", () => {
    const unfinished = makeUser("unfinished", { courseId: null });
    expect(pickCurrentUser({ sessionUser: unfinished, pretendUser: null })).toBeNull();
  });

  // user-auth spec: "Suspended while signed in".
  it("returns nobody for a suspended real user", () => {
    const suspended = makeUser("suspended", { suspendedAt: new Date("2026-10-13") });
    expect(pickCurrentUser({ sessionUser: suspended, pretendUser: null })).toBeNull();
  });

  it("prefers a real user over the switcher's pretend user", () => {
    const real = makeUser("real");
    const pretend = makeUser("pretend");
    expect(pickCurrentUser({ sessionUser: real, pretendUser: pretend })).toBe(real);
  });

  // Someone who really signed in must never be swapped for a pretend user,
  // even if their own account can't be used yet.
  it("doesn't fall back to the switcher when the real user can't be used", () => {
    const unfinished = makeUser("unfinished", { acceptedTermsAt: null });
    const pretend = makeUser("pretend");
    expect(pickCurrentUser({ sessionUser: unfinished, pretendUser: pretend })).toBeNull();
  });

  it("returns the switcher's pretend user when there's no real session", () => {
    const pretend = makeUser("pretend");
    expect(pickCurrentUser({ sessionUser: null, pretendUser: pretend })).toBe(pretend);
  });

  it("returns nobody when there's no session and no pretend user", () => {
    expect(pickCurrentUser({ sessionUser: null, pretendUser: null })).toBeNull();
  });

  // The foundation needs teammates to be able to act as the suspended
  // pretend user (to check they vanish from the graph).
  it("still returns a suspended pretend user", () => {
    const suspendedPretend = makeUser("suspended pretend", {
      suspendedAt: new Date("2026-10-13"),
    });
    expect(pickCurrentUser({ sessionUser: null, pretendUser: suspendedPretend })).toBe(
      suspendedPretend,
    );
  });
});
