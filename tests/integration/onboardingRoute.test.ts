// Tests for POST /api/onboarding (slice 2, #9, task 4.2), against the test
// database. One test per scenario in the spec's "Answers are checked and
// saved all at once" and "Generated alias is unique" requirements.

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/onboarding/route";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";

// The route asks getCurrentUser() who is signed in. The real one reads a
// browser cookie, which doesn't exist in a plain test, so the tests replace it
// with a stand-in that returns whoever `signedInAs.user` is set to.
const signedInAs: { user: { id: string } | null } = { user: null };
vi.mock("@/lib/currentUser", () => ({
  getCurrentUser: async () => signedInAs.user,
}));

// scoreUser is slice 3's, with its own tests. Here we only check onboarding
// CALLS it, once, after saving, so it's replaced with a counter.
// The type says it takes a user id, so the test can check which one it got.
const scoreUser = vi.fn<(userId: string) => Promise<void>>(async () => {});
vi.mock("@/lib/scoring", () => ({
  scoreUser: (userId: string) => scoreUser(userId),
}));

beforeEach(async () => {
  signedInAs.user = null;
  scoreUser.mockClear();
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// A signed-up user with no profile yet, signed in.
async function signInNewUser(name: string): Promise<string> {
  const user = await prisma.user.create({
    data: { id: `test-user-${name}`, email: `${name}@onboarding-test.test`, courseId: "software" },
  });
  signedInAs.user = { id: user.id };
  return user.id;
}

// A full valid set of answers: Rising Sign: Feral + Sea Captain, so the alias
// is "The Feral Sea Captain".
function validAnswers() {
  return {
    picks: {
      "hero-story": ["hero-story-corporate-escapee"],
      energy: ["energy-sea-captain"],
      "vibe-diagnosis": ["vibe-diagnosis-rising-feral"],
      qualities: ["qualities-finishes-the-thing", "qualities-says-hard-thing-kindly"],
      seeking: ["seeking-finishes-what-i-start"],
      skills: ["skills-back-end", "skills-data"],
      interests: ["interests-climate"],
    } as Record<string, string[]>,
    silhouetteId: "silhouette-03",
  };
}

async function send(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/onboarding", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/onboarding", () => {
  it("answers 401 when nobody is signed in, and saves nothing", async () => {
    const response = await send(validAnswers());

    expect(response.status).toBe(401);
    expect(await prisma.profile.count()).toBe(0);
  });

  // Spec scenarios: "Valid answers are saved", "Skills and interests
  // captured", "Silhouette chosen", "Alias from the user's own tags",
  // "Scores are refreshed on completion"
  it("saves the profile and every tag in one go, then rescores once", async () => {
    const userId = await signInNewUser("anna");

    const response = await send(validAnswers());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ alias: "The Feral Sea Captain" });

    const profile = await prisma.profile.findUniqueOrThrow({
      where: { userId },
      include: { tags: true },
    });
    expect(profile.alias).toBe("The Feral Sea Captain");
    expect(profile.silhouette).toBe("silhouette-03");
    expect(profile.completedAt).not.toBeNull();
    expect(profile.tags.map((row) => row.tagId).sort()).toEqual(
      Object.values(validAnswers().picks).flat().sort(),
    );

    expect(scoreUser).toHaveBeenCalledTimes(1);
    expect(scoreUser).toHaveBeenCalledWith(userId);
  });

  // Spec scenario: "Invalid answers are rejected by the server"
  it("saves nothing for 5 Seeking tags, a wrong-category tag or a retired tag", async () => {
    await signInNewUser("ben");
    await prisma.tag.update({
      where: { id: "interests-music" },
      data: { retiredAt: new Date() },
    });

    const fiveSeeking = validAnswers();
    fiveSeeking.picks.seeking = [
      "seeking-makes-money-happen",
      "seeking-finishes-what-i-start",
      "seeking-tells-me-idea-is-bad",
      "seeking-makes-it-real",
      "seeking-boring-bits",
    ];
    const wrongCategory = validAnswers();
    wrongCategory.picks.qualities = ["seeking-boring-bits"];
    const retired = validAnswers();
    retired.picks.interests = ["interests-music"];

    for (const [answers, step] of [
      [fiveSeeking, "seeking"],
      [wrongCategory, "qualities"],
      [retired, "interests"],
    ] as const) {
      const response = await send(answers);
      expect(response.status).toBe(400);
      // Says which step to fix.
      const body = await response.json();
      expect(body.problems[0].step).toBe(step);
    }

    expect(await prisma.profile.count()).toBe(0);
    expect(await prisma.profileTag.count()).toBe(0);
    expect(scoreUser).not.toHaveBeenCalled();
  });

  // Spec scenario: "No silhouette chosen"
  it("saves nothing without a valid silhouette", async () => {
    await signInNewUser("cara");
    const answers = { ...validAnswers(), silhouetteId: "" };

    const response = await send(answers);

    expect(response.status).toBe(400);
    expect((await response.json()).problems[0].step).toBe("silhouette");
    expect(await prisma.profile.count()).toBe(0);
  });

  it("answers 400 to a body that isn't the right shape", async () => {
    await signInNewUser("dev");

    expect((await send("not json")).status).toBe(400);
    expect((await send({ picks: { energy: "energy-sea-captain" }, silhouetteId: "silhouette-01" })).status).toBe(400);
    expect((await send({ picks: [], silhouetteId: "silhouette-01" })).status).toBe(400);
    expect(await prisma.profile.count()).toBe(0);
  });

  // Spec scenario: "Finished user is not onboarded twice"
  it("answers 409 to a second save and leaves the first answers alone", async () => {
    const userId = await signInNewUser("eve");
    await send(validAnswers());

    const second = validAnswers();
    second.picks.energy = ["energy-feral-gremlin"];
    const response = await send(second);

    expect(response.status).toBe(409);
    const profile = await prisma.profile.findUniqueOrThrow({
      where: { userId },
      include: { tags: true },
    });
    expect(profile.alias).toBe("The Feral Sea Captain");
    expect(profile.tags.map((row) => row.tagId)).toContain("energy-sea-captain");
    expect(profile.tags.map((row) => row.tagId)).not.toContain("energy-feral-gremlin");
  });

  // Spec scenario: "Two users would get the same alias"
  it('gives the second and third people with the same Vibe and Energy "II" and "III"', async () => {
    await signInNewUser("finn");
    const first = await (await send(validAnswers())).json();
    await signInNewUser("gina");
    const second = await (await send(validAnswers())).json();
    await signInNewUser("hal");
    const third = await (await send(validAnswers())).json();

    expect([first.alias, second.alias, third.alias]).toEqual([
      "The Feral Sea Captain",
      "The Feral Sea Captain II",
      "The Feral Sea Captain III",
    ]);
  });

  it("gives two people finishing at the same moment different aliases", async () => {
    // Both read "nobody has The Feral Sea Captain" before either writes, so
    // the second write hits the database's unique rule and must retry.
    await signInNewUser("ivy");
    const ivy = send(validAnswers());
    await signInNewUser("jon");
    const jon = send(validAnswers());

    const [ivyResponse, jonResponse] = await Promise.all([ivy, jon]);

    expect(ivyResponse.status).toBe(200);
    expect(jonResponse.status).toBe(200);
    const aliases = (await prisma.profile.findMany({ select: { alias: true } })).map(
      (row) => row.alias,
    );
    expect(aliases.sort()).toEqual(["The Feral Sea Captain", "The Feral Sea Captain II"]);
  });

  // Spec scenario: "A tag has no alias word"
  it("uses the fallback word for a tag with no alias word", async () => {
    await signInNewUser("kit");
    await prisma.tag.update({ where: { id: "energy-sea-captain" }, data: { aliasWord: null } });

    const body = await (await send(validAnswers())).json();

    expect(body.alias).toBe("The Feral Collaborator");
  });

  it("finishes a profile an admin reset, keeping its alias", async () => {
    const userId = await signInNewUser("lou");
    // A profile left unfinished: an alias, an old pick, no completedAt.
    await prisma.profile.create({
      data: {
        userId,
        alias: "The Planner Hermit",
        silhouette: "silhouette-01",
        completedAt: null,
        tags: { create: [{ tagId: "energy-wise-hermit" }] },
      },
    });

    const response = await send(validAnswers());

    expect(response.status).toBe(200);
    const profile = await prisma.profile.findUniqueOrThrow({
      where: { userId },
      include: { tags: true },
    });
    expect(profile.alias).toBe("The Planner Hermit");
    expect(profile.completedAt).not.toBeNull();
    expect(profile.tags.map((row) => row.tagId)).not.toContain("energy-wise-hermit");
    expect(profile.tags).toHaveLength(Object.values(validAnswers().picks).flat().length);
  });
});
