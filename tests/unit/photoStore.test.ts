// Tests for photo storage (slice 7, #14, task 1.2).
//
// The folder version is what laptops and the tests use, so it's tested here
// in a temporary folder. The Vercel Blob version is three library calls,
// checked for real on the preview (task 7.2).

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { choosePhotoStore, folderPhotoStore } from "@/lib/account/photoStore";

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(path.join(tmpdir(), "collabz-photos-"));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe("folderPhotoStore", () => {
  const key = "photos/user-1/abc.jpg";
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);

  it("gives back exactly what was put, with its content type", async () => {
    const store = folderPhotoStore(folder);

    await store.put(key, bytes, "image/jpeg");

    expect(await store.get(key)).toEqual({ bytes, contentType: "image/jpeg" });
  });

  it("gives nothing back after a delete", async () => {
    const store = folderPhotoStore(folder);
    await store.put(key, bytes, "image/jpeg");

    await store.delete(key);

    expect(await store.get(key)).toBeNull();
  });

  it("gives nothing back for a key that was never stored", async () => {
    expect(await folderPhotoStore(folder).get("photos/nobody/none.png")).toBeNull();
  });

  it("doesn't mind deleting something that isn't there", async () => {
    await expect(folderPhotoStore(folder).delete("photos/nobody/none.png")).resolves.toBeUndefined();
  });

  it("keeps different keys apart", async () => {
    const store = folderPhotoStore(folder);
    await store.put("photos/a/1.png", new Uint8Array([1]), "image/png");
    await store.put("photos/b/2.png", new Uint8Array([2]), "image/png");

    await store.delete("photos/a/1.png");

    expect(await store.get("photos/a/1.png")).toBeNull();
    expect((await store.get("photos/b/2.png"))?.bytes).toEqual(new Uint8Array([2]));
  });
});

describe("choosePhotoStore", () => {
  it("uses Vercel Blob whenever a token is set", () => {
    expect(choosePhotoStore({ blobToken: "vercel_blob_rw_x", vercelEnv: "production" })).toBe("vercel-blob");
    expect(choosePhotoStore({ blobToken: "vercel_blob_rw_x", vercelEnv: "preview" })).toBe("vercel-blob");
  });

  it("uses the local folder on a laptop with no token", () => {
    expect(choosePhotoStore({ blobToken: undefined, vercelEnv: undefined })).toBe("folder");
    expect(choosePhotoStore({ blobToken: "", vercelEnv: undefined })).toBe("folder");
  });

  // Vercel's disk is wiped after each request: photos written there would
  // vanish, so the live site must refuse rather than pretend to work.
  it("refuses on the live site when there's no token", () => {
    expect(() => choosePhotoStore({ blobToken: undefined, vercelEnv: "production" })).toThrow(
      "BLOB_READ_WRITE_TOKEN",
    );
  });
});
