// Proves the admin guard (slice 8, #15, task 1.5, design 1): calling a Server
// Action directly, as a member or as nobody, is refused and changes nothing.
//
// This is the "even by calling the server directly" success check from #15.
// The guard is requireAdmin(), which is the REAL one here: we only replace
// the two things it reads from the request (the Auth.js session and the
// cookies), so the whole chain from "who is this?" to "refused" is tested.

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { removeProfilePhoto } from "@/lib/account/photos";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";

// Who the pretend request comes from. getSessionUser() is what a real
// magic-link session would give.
const signedInAs: { userId: string | null } = { userId: null };
vi.mock("@/lib/auth/session", () => ({
  getSessionUser: async () =>
    signedInAs.userId
      ? prisma.user.findUnique({ where: { id: signedInAs.userId } })
      : null,
}));

// getCurrentUser() only reads the dev switcher's cookie when nobody has
// signed in. There are no cookies outside a real request, so give it an empty
// jar.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

// Slice 7's photo helper is replaced with a fake: we only care WHETHER the
// action reaches it, and that no real photo storage is touched.
vi.mock("@/lib/account/photos", () => ({ removeProfilePhoto: vi.fn(async () => {}) }));

// revalidatePath needs a running Next.js server; here it can do nothing.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import {
  addCategoryAction,
  addTagAction,
  moveCategoryAction,
  moveTagAction,
  renameCategoryAction,
  renameTagAction,
  rescoreEveryoneAction,
  setCategoryRetiredAction,
  setTagPairingsAction,
  setTagRetiredAction,
  updateTagDescriptionAction,
} from "@/app/admin/categories/actions";
import {
  removePhotoAction,
  suspendUserAction,
  unsuspendUserAction,
} from "@/app/admin/users/actions";
import {
  removeReportedPhotoAction,
  resolveReportAction,
  suspendReportedUserAction,
} from "@/app/admin/reports/actions";
import {
  addCourseAction,
  moveCourseAction,
  renameCourseAction,
  setCourseRetiredAction,
} from "@/app/admin/courses/actions";

// An action always ends by throwing (a redirect, or "not found"/"sign in" for
// a refusal). Swallow that so each test can look at the database afterwards.
async function callAction(
  action: (formData: FormData) => Promise<void>,
  fields: Record<string, string>,
): Promise<void> {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value);
  }
  try {
    await action(formData);
  } catch {
    // Expected: redirect() and notFound() work by throwing.
  }
}

// Everything the actions below could change, in one comparable value.
async function snapshot() {
  return {
    courses: await prisma.course.findMany({ orderBy: { id: "asc" } }),
    categories: await prisma.category.findMany({ orderBy: { id: "asc" } }),
    tags: await prisma.tag.findMany({ orderBy: { id: "asc" } }),
    pairings: await prisma.tagPairing.findMany({
      orderBy: [{ seekingTagId: "asc" }, { qualityTagId: "asc" }],
    }),
    edges: await prisma.edge.findMany(),
    users: await prisma.user.findMany({ orderBy: { id: "asc" } }),
    reports: await prisma.report.findMany({ orderBy: { id: "asc" } }),
  };
}

beforeEach(async () => {
  vi.mocked(removeProfilePhoto).mockClear();
  signedInAs.userId = null;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
  // Someone the suspend actions could act on.
  await prisma.user.create({ data: { id: "test-victim", email: "victim@example.com" } });
  // A report about them, for the moderation queue actions (slice 9, #16).
  const reporter = await prisma.user.create({
    data: { id: "test-reporter", email: "reporter@example.com" },
  });
  await prisma.report.create({
    data: {
      id: "test-report",
      reporterId: reporter.id,
      reportedId: "test-victim",
      reason: "Inappropriate messages",
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Each call below would change something if it were allowed through.
const allAdminActions: [string, (f: FormData) => Promise<void>, Record<string, string>][] = [
  ["add", addCourseAction, { name: "Data Science" }],
  ["rename", renameCourseAction, { id: "software", name: "Hacked" }],
  ["move", moveCourseAction, { id: "business", direction: "up" }],
  ["retire", setCourseRetiredAction, { id: "software", retired: "true" }],
  ["add category", addCategoryAction, { name: "Hobbies" }],
  ["rename category", renameCategoryAction, { id: "energy", name: "Hacked" }],
  ["move category", moveCategoryAction, { id: "energy", direction: "up" }],
  ["retire category", setCategoryRetiredAction, { id: "energy", retired: "true" }],
  [
    "add tag",
    addTagAction,
    { categoryId: "energy", name: "Night Owl", description: "After midnight." },
  ],
  ["rename tag", renameTagAction, { id: "energy-sea-captain", name: "Hacked" }],
  [
    "describe tag",
    updateTagDescriptionAction,
    { id: "energy-sea-captain", description: "Hacked." },
  ],
  ["move tag", moveTagAction, { id: "energy-sea-captain", direction: "up" }],
  ["retire tag", setTagRetiredAction, { id: "energy-sea-captain", retired: "true" }],
  [
    "set pairings",
    setTagPairingsAction,
    { id: "seeking-makes-it-real", paired: "qualities-knows-someone" },
  ],
  ["rescore everyone", rescoreEveryoneAction, {}],
  ["suspend user", suspendUserAction, { id: "test-victim" }],
  ["unsuspend user", unsuspendUserAction, { id: "test-victim" }],
  ["remove photo", removePhotoAction, { id: "test-victim" }],
  ["suspend reported user", suspendReportedUserAction, { reportId: "test-report" }],
  ["remove reported photo", removeReportedPhotoAction, { reportId: "test-report" }],
  ["resolve report", resolveReportAction, { reportId: "test-report" }],
];

describe("admin actions refuse anyone who isn't an admin", () => {
  it.each(allAdminActions)("%s: refused for a signed-out visitor", async (_name, action, fields) => {
    const before = await snapshot();
    await callAction(action, fields);
    expect(await snapshot()).toEqual(before);
    expect(removeProfilePhoto).not.toHaveBeenCalled();
  });

  it.each(allAdminActions)("%s: refused for a member", async (_name, action, fields) => {
    const member = await prisma.user.create({
      data: { email: "member@example.com", role: "MEMBER" },
    });
    signedInAs.userId = member.id;

    const before = await snapshot();
    await callAction(action, fields);
    expect(await snapshot()).toEqual(before);
    expect(removeProfilePhoto).not.toHaveBeenCalled();
  });

  it("does the change for an admin (so the refusals above mean something)", async () => {
    const admin = await prisma.user.create({
      data: {
        email: "admin@example.com",
        role: "ADMIN",
        courseId: "software",
        acceptedTermsAt: new Date(),
      },
    });
    signedInAs.userId = admin.id;

    await callAction(renameCourseAction, { id: "software", name: "Software Engineering" });

    const course = await prisma.course.findUniqueOrThrow({ where: { id: "software" } });
    expect(course.name).toBe("Software Engineering");
  });

  it("lets an admin remove someone's photo, by calling slice 7's helper", async () => {
    const admin = await prisma.user.create({
      data: {
        email: "admin3@example.com",
        role: "ADMIN",
        courseId: "software",
        acceptedTermsAt: new Date(),
      },
    });
    signedInAs.userId = admin.id;

    await callAction(removePhotoAction, { id: "test-victim" });

    expect(removeProfilePhoto).toHaveBeenCalledTimes(1);
    expect(removeProfilePhoto).toHaveBeenCalledWith("test-victim");
  });

  it("lets an admin suspend someone else but never themselves", async () => {
    const admin = await prisma.user.create({
      data: {
        email: "admin2@example.com",
        role: "ADMIN",
        courseId: "software",
        acceptedTermsAt: new Date(),
      },
    });
    signedInAs.userId = admin.id;

    await callAction(suspendUserAction, { id: "test-victim" });
    await callAction(suspendUserAction, { id: admin.id });

    const victim = await prisma.user.findUniqueOrThrow({ where: { id: "test-victim" } });
    const self = await prisma.user.findUniqueOrThrow({ where: { id: admin.id } });
    expect(victim.suspendedAt).not.toBeNull();
    expect(self.suspendedAt).toBeNull();
  });

  it("lets an admin act on a report: suspend, remove the photo, resolve", async () => {
    const admin = await prisma.user.create({
      data: {
        email: "admin4@example.com",
        role: "ADMIN",
        courseId: "software",
        acceptedTermsAt: new Date(),
      },
    });
    signedInAs.userId = admin.id;

    await callAction(suspendReportedUserAction, { reportId: "test-report" });
    await callAction(removeReportedPhotoAction, { reportId: "test-report" });
    await callAction(resolveReportAction, { reportId: "test-report" });

    const victim = await prisma.user.findUniqueOrThrow({ where: { id: "test-victim" } });
    const report = await prisma.report.findUniqueOrThrow({ where: { id: "test-report" } });
    expect(victim.suspendedAt).not.toBeNull();
    expect(removeProfilePhoto).toHaveBeenCalledWith("test-victim");
    expect(report.status).toBe("RESOLVED");
    expect(report.resolvedById).toBe(admin.id);
  });
});
