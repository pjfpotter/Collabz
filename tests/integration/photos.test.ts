// Tests for setting, replacing and removing a photo (slice 7, #14, task 2.1).
//
// Photos go to a temporary folder (never the project's .photo-store/), and
// each test checks both the database (Profile.photoKey) and the files.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { readProfilePhoto, removeProfilePhoto, setProfilePhoto } from "@/lib/account/photos";
import { folderPhotoStore, type PhotoStore } from "@/lib/account/photoStore";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson } from "../helpers/people";

// Small pretend photos: the right first bytes, padded with a marker byte so
// two photos can be told apart.
const jpeg = (marker: number) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, marker]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

let folder: string;
let store: PhotoStore;
let owner: string;

async function photoKey(userId: string) {
  return (await prisma.profile.findUniqueOrThrow({ where: { userId } })).photoKey;
}

beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  owner = await createPerson(prisma, "owner");
  folder = await mkdtemp(path.join(tmpdir(), "collabz-photos-"));
  store = folderPhotoStore(folder);
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("setProfilePhoto", () => {
  it("stores the file and saves its key on the profile", async () => {
    expect(await setProfilePhoto(owner, jpeg(1), store)).toEqual({ ok: true });

    const key = await photoKey(owner);
    expect(key).toMatch(new RegExp(`^photos/${owner}/.+\\.jpg$`));
    expect(await store.get(key!)).toEqual({ bytes: jpeg(1), contentType: "image/jpeg" });
  });

  // Spec: "Replace a photo".
  it("replaces an old photo and deletes the old file", async () => {
    await setProfilePhoto(owner, jpeg(1), store);
    const oldKey = await photoKey(owner);

    await setProfilePhoto(owner, png, store);
    const newKey = await photoKey(owner);

    expect(newKey).not.toBe(oldKey);
    expect(newKey).toMatch(/\.png$/);
    expect(await store.get(oldKey!)).toBeNull();
    expect((await readProfilePhoto(owner, store))?.contentType).toBe("image/png");
  });

  // Spec: "File too big or wrong type" ... "their existing photo is kept".
  it("refuses a file that isn't a photo, keeping the existing one", async () => {
    await setProfilePhoto(owner, jpeg(1), store);
    const keyBefore = await photoKey(owner);

    const result = await setProfilePhoto(owner, pdf, store);

    expect(result.ok).toBe(false);
    expect(await photoKey(owner)).toBe(keyBefore);
    expect(await store.get(keyBefore!)).not.toBeNull();
  });

  it("refuses someone whose profile isn't finished", async () => {
    const unfinished = await createPerson(prisma, "unfinished", { finishedAt: null });

    const result = await setProfilePhoto(unfinished, jpeg(1), store);

    expect(result.ok).toBe(false);
    expect(await photoKey(unfinished)).toBeNull();
  });
});

describe("removeProfilePhoto", () => {
  // Spec: "Remove a photo": the file is deleted from storage.
  it("clears the key and deletes the file", async () => {
    await setProfilePhoto(owner, jpeg(1), store);
    const key = await photoKey(owner);

    await removeProfilePhoto(owner, store);

    expect(await photoKey(owner)).toBeNull();
    expect(await store.get(key!)).toBeNull();
    expect(await readProfilePhoto(owner, store)).toBeNull();
  });

  it("does nothing when there's no photo", async () => {
    await expect(removeProfilePhoto(owner, store)).resolves.toBeUndefined();
    expect(await photoKey(owner)).toBeNull();
  });
});
