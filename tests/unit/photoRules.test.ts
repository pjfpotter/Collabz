// Tests for checkPhotoFile (slice 7, #14, task 1.3).
//
// It decides which files may be stored as someone's photo, so each kind of
// file, and each side of the 4 MB limit, gets its own test.

import { describe, expect, it } from "vitest";

import { MAX_PHOTO_BYTES, checkPhotoFile } from "@/lib/account/photoRules";

// A pretend file: the given first bytes, padded with zeros to `size` bytes.
function fileStarting(firstBytes: number[], size = 64): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes.set(firstBytes);
  return bytes;
}

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// "RIFF", four size bytes, "WEBP"
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
// "%PDF-"
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d];

describe("checkPhotoFile", () => {
  it("accepts a JPEG", () => {
    expect(checkPhotoFile(fileStarting(JPEG))).toEqual({
      ok: true,
      type: { contentType: "image/jpeg", extension: "jpg" },
    });
  });

  it("accepts a PNG", () => {
    expect(checkPhotoFile(fileStarting(PNG))).toEqual({
      ok: true,
      type: { contentType: "image/png", extension: "png" },
    });
  });

  it("accepts a WebP", () => {
    expect(checkPhotoFile(fileStarting(WEBP))).toEqual({
      ok: true,
      type: { contentType: "image/webp", extension: "webp" },
    });
  });

  // Spec: "a PDF renamed to end in .jpg". The name never reaches this
  // function: only the bytes do, and they say PDF.
  it("refuses a PDF, whatever it is called", () => {
    const result = checkPhotoFile(fileStarting(PDF));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problem).toContain("JPEG, PNG or WebP");
  });

  // "RIFF" alone isn't enough: WAV audio files start with RIFF too.
  it("refuses a RIFF file that isn't WebP (e.g. a WAV sound)", () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45];
    expect(checkPhotoFile(fileStarting(wav)).ok).toBe(false);
  });

  it("accepts a photo of exactly 4 MB", () => {
    expect(checkPhotoFile(fileStarting(JPEG, MAX_PHOTO_BYTES)).ok).toBe(true);
  });

  it("refuses a photo one byte over 4 MB, saying the limit", () => {
    const result = checkPhotoFile(fileStarting(JPEG, MAX_PHOTO_BYTES + 1));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.problem).toContain("4 MB");
  });

  it("refuses an empty file", () => {
    expect(checkPhotoFile(new Uint8Array(0)).ok).toBe(false);
  });

  // Shorter than the signature it's being compared with: must not crash.
  it("refuses a file of only two bytes", () => {
    expect(checkPhotoFile(new Uint8Array([0xff, 0xd8])).ok).toBe(false);
  });
});
