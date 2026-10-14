// Tests for checkSignUpForm (slice 1, #8, task 2.2).
//
// These rules are what stop an account being created without an email, a
// course, or accepted terms (user-auth spec), so each one gets its own test.

import { describe, expect, it } from "vitest";

import { checkSignUpForm, type SignUpAnswers } from "@/lib/auth/signUpForm";

// The courses on offer in these tests. "design" stands for a retired course:
// it exists, but it isn't in the active list.
const activeCourseIds = ["software", "business"];

// A complete, correct form. Each test changes one thing, so it's clear
// which rule that test is about.
const goodAnswers: SignUpAnswers = {
  email: "student@example.com",
  courseId: "business",
  acceptedTerms: true,
};

// Just the fields that have problems, e.g. ["email", "acceptedTerms"].
function problemFields(answers: SignUpAnswers): string[] {
  return checkSignUpForm(answers, activeCourseIds).map((problem) => problem.field);
}

describe("checkSignUpForm", () => {
  it("finds no problems in a complete, correct form", () => {
    expect(checkSignUpForm(goodAnswers, activeCourseIds)).toEqual([]);
  });

  it("asks for an email when it's missing", () => {
    expect(problemFields({ ...goodAnswers, email: "" })).toEqual(["email"]);
  });

  it("treats an email of only spaces as missing", () => {
    expect(problemFields({ ...goodAnswers, email: "   " })).toEqual(["email"]);
  });

  it.each(["student", "student@", "student@example", "stu dent@example.com"])(
    'refuses the malformed email "%s"',
    (email) => {
      expect(problemFields({ ...goodAnswers, email })).toEqual(["email"]);
    },
  );

  // Copying an email from a notes app often brings a space along with it.
  it("accepts an email with spaces around it", () => {
    expect(problemFields({ ...goodAnswers, email: " student@example.com " })).toEqual([]);
  });

  it("asks for a course when none is chosen (spec: Course not chosen)", () => {
    expect(problemFields({ ...goodAnswers, courseId: "" })).toEqual(["courseId"]);
  });

  it("refuses a retired course", () => {
    expect(problemFields({ ...goodAnswers, courseId: "design" })).toEqual(["courseId"]);
  });

  // Someone could edit the course in the magic link before opening it.
  it("refuses a course id that doesn't exist", () => {
    expect(problemFields({ ...goodAnswers, courseId: "made-up" })).toEqual(["courseId"]);
  });

  it("refuses the form when the terms aren't accepted (spec: Terms not accepted)", () => {
    expect(problemFields({ ...goodAnswers, acceptedTerms: false })).toEqual(["acceptedTerms"]);
  });

  it("lists every problem at once, not just the first", () => {
    expect(problemFields({ email: "", courseId: "", acceptedTerms: false })).toEqual([
      "email",
      "courseId",
      "acceptedTerms",
    ]);
  });

  it("gives every problem a message to show the person", () => {
    const problems = checkSignUpForm(
      { email: "", courseId: "", acceptedTerms: false },
      activeCourseIds,
    );
    for (const problem of problems) {
      expect(problem.message.length).toBeGreaterThan(0);
    }
  });
});
