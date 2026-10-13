// Tests for isAdminEmail (slice 1, #8, task 2.1).
//
// This decides who gets the admin role on the live site, so each way the
// ADMIN_EMAILS setting could be typed gets its own test.

import { describe, expect, it } from "vitest";

import { isAdminEmail } from "@/lib/auth/adminEmails";

describe("isAdminEmail", () => {
  it("is true for an email on the list", () => {
    expect(isAdminEmail("tom@example.com", "patrick@example.com,tom@example.com")).toBe(true);
  });

  it("is false for an email not on the list", () => {
    expect(isAdminEmail("someone@example.com", "patrick@example.com,tom@example.com")).toBe(false);
  });

  it("ignores spaces around the emails in the list", () => {
    expect(isAdminEmail("tom@example.com", "  patrick@example.com ,  tom@example.com  ")).toBe(true);
  });

  // The user-auth spec's own example: "Tom@Example.com" on the list matches
  // someone signing up as "tom@example.com".
  it("ignores capital letters in the list", () => {
    expect(isAdminEmail("tom@example.com", "Tom@Example.com")).toBe(true);
  });

  it("ignores capital letters in the email being checked", () => {
    expect(isAdminEmail("TOM@example.com", "tom@example.com")).toBe(true);
  });

  it("is false when the list is empty", () => {
    expect(isAdminEmail("tom@example.com", "")).toBe(false);
  });

  it("is false when ADMIN_EMAILS isn't set at all", () => {
    expect(isAdminEmail("tom@example.com", undefined)).toBe(false);
  });

  // A trailing comma leaves an empty piece. It must not match an empty email.
  it("doesn't treat a stray comma as an email", () => {
    expect(isAdminEmail("", "tom@example.com,")).toBe(false);
  });

  // Only whole emails match: being part of a listed address isn't enough.
  it("doesn't match part of an email", () => {
    expect(isAdminEmail("om@example.com", "tom@example.com")).toBe(false);
  });
});
