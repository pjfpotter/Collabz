// Where profile photos are kept (slice 7, #14, design decision 1).
//
// The rest of the app only ever calls three things: put a photo, get it back,
// delete it. Behind them are two ways of storing it:
//
//   - Vercel Blob, as PRIVATE files: used on Vercel (Preview and Production),
//     where BLOB_READ_WRITE_TOKEN is set. A private file has no public
//     address: only our server can read it, so every view of a photo has to
//     go through our permission check (/api/account/photo/[userId]).
//   - A folder on disk (.photo-store/, gitignored): used on laptops and in
//     the tests, where there's no token. Nobody needs a Vercel account to
//     work on the app, and the tests never touch real storage.
//
// Owner: slice 7 (#14).

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { del, get, put } from "@vercel/blob";

// A stored photo, as read back: its bytes and what kind of image it is.
export type StoredPhoto = {
  bytes: Uint8Array;
  contentType: string;
};

// The three things every kind of storage can do. `key` is where the photo
// sits, e.g. "photos/<userId>/<random id>.jpg" (Profile.photoKey).
export type PhotoStore = {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  // Nothing stored under that key gives null.
  get(key: string): Promise<StoredPhoto | null>;
  // Deleting a key that isn't there is fine (it just does nothing).
  delete(key: string): Promise<void>;
};

// ---------------------------------------------------------------------------
// Vercel Blob (on Vercel)
// ---------------------------------------------------------------------------

export function vercelBlobPhotoStore(): PhotoStore {
  return {
    async put(key, bytes, contentType) {
      // access "private": the file gets no public address (see the header).
      // We make every key unique ourselves, so Vercel needn't add a suffix.
      await put(key, Buffer.from(bytes), {
        access: "private",
        contentType,
        addRandomSuffix: false,
      });
    },

    async get(key) {
      const result = await get(key, { access: "private" });
      // null: nothing stored there. Anything but a full 200 answer (e.g. a
      // "not modified" reply) we treat the same, since we never send
      // "only if changed" requests.
      if (!result || result.statusCode !== 200) {
        return null;
      }
      // The file arrives as a stream; read it into one block of bytes.
      // At most 4 MB (design decision 2), so that's fine to hold in memory.
      const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
      return { bytes, contentType: result.blob.contentType };
    },

    async delete(key) {
      await del(key);
    },
  };
}

// ---------------------------------------------------------------------------
// A folder on disk (laptops and tests)
// ---------------------------------------------------------------------------

// The project's .photo-store/ folder (gitignored).
export const LOCAL_PHOTO_FOLDER = path.join(process.cwd(), ".photo-store");

// The content type is saved in a small file next to the photo, so `get`
// can give it back exactly as Vercel Blob does.
export function folderPhotoStore(folder: string = LOCAL_PHOTO_FOLDER): PhotoStore {
  // Keys contain "/" (photos/<userId>/...), which become sub-folders.
  // path.join also refuses to step outside `folder` for keys we make
  // ourselves; we never build a key from anything a visitor typed.
  const fileFor = (key: string) => path.join(folder, key);
  const typeFileFor = (key: string) => `${fileFor(key)}.type`;

  return {
    async put(key, bytes, contentType) {
      await mkdir(path.dirname(fileFor(key)), { recursive: true });
      await writeFile(fileFor(key), bytes);
      await writeFile(typeFileFor(key), contentType, "utf8");
    },

    async get(key) {
      try {
        const bytes = new Uint8Array(await readFile(fileFor(key)));
        const contentType = await readFile(typeFileFor(key), "utf8");
        return { bytes, contentType };
      } catch {
        // No such file: nothing stored under that key.
        return null;
      }
    },

    async delete(key) {
      // force: true means "fine if it's already gone".
      await rm(fileFor(key), { force: true });
      await rm(typeFileFor(key), { force: true });
    },
  };
}

// ---------------------------------------------------------------------------
// Choosing between them
// ---------------------------------------------------------------------------

// Which storage to use here. Kept as a plain function of the settings, so
// the tests can check every case without changing the real environment.
//   - A Blob token is set                -> Vercel Blob.
//   - No token, not the live site        -> the local folder.
//   - No token, ON the live site          -> refuse, loudly. Vercel's disk is
//     wiped after every request, so writing photos there would "work" and
//     then lose them. Better to fail with a message that says what to fix.
export function choosePhotoStore(settings: {
  blobToken: string | undefined;
  vercelEnv: string | undefined;
}): "vercel-blob" | "folder" {
  if (settings.blobToken) {
    return "vercel-blob";
  }
  if (settings.vercelEnv === "production") {
    throw new Error(
      "Photos can't be stored: BLOB_READ_WRITE_TOKEN isn't set on the live site. " +
        "Connect a Blob store to the Vercel project (Storage -> Blob).",
    );
  }
  return "folder";
}

// The storage the app uses, picked from the real environment.
export function getPhotoStore(): PhotoStore {
  const kind = choosePhotoStore({
    blobToken: process.env.BLOB_READ_WRITE_TOKEN,
    vercelEnv: process.env.VERCEL_ENV,
  });
  return kind === "vercel-blob" ? vercelBlobPhotoStore() : folderPhotoStore();
}
