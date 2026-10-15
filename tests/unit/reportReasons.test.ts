// Tests for the list of report reasons (slice 9, #16, task 2.1).

import { describe, expect, it } from "vitest";

import { REPORT_REASONS, isReportReason } from "@/lib/safety/reasons";

describe("isReportReason", () => {
  it("accepts every listed reason", () => {
    for (const reason of REPORT_REASONS) {
      expect(isReportReason(reason)).toBe(true);
    }
  });

  it("refuses an empty string, an unlisted reason and a near miss", () => {
    expect(isReportReason("")).toBe(false);
    expect(isReportReason("I just don't like them")).toBe(false);
    // Different capital and a trailing space: the match must be exact.
    expect(isReportReason("inappropriate messages")).toBe(false);
    expect(isReportReason("Inappropriate messages ")).toBe(false);
  });

  it("refuses things that aren't text", () => {
    expect(isReportReason(undefined)).toBe(false);
    expect(isReportReason(null)).toBe(false);
    expect(isReportReason(3)).toBe(false);
  });

  it("has no duplicates", () => {
    expect(new Set(REPORT_REASONS).size).toBe(REPORT_REASONS.length);
  });
});
