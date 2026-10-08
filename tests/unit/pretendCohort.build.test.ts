// Tests for buildPretendCohort (foundation #7, tasks 3.1 and 3.2): the rules
// the pretend cohort promises to every track that builds on it.
//
// No database is involved. The cohort is built from a small made-up catalogue
// and checked as plain data. One test at the end also builds it from the real
// seed catalogue, to be sure the real thing has the same shape.

import { describe, expect, it } from "vitest";

import {
  ADMIN_NUMBER,
  MAIN_CHARACTER_NUMBER,
  SUSPENDED_NUMBER,
  buildPretendCohort,
  pickTagsFor,
  pretendTopFive,
  pretendUserId,
  type CohortCatalogue,
} from "../../prisma/pretend-cohort";
import { seedCategories, seedCourses } from "../../prisma/seed-data";

// A small catalogue: one "pick exactly 1" category (Energy, which the alias
// uses) and one "pick 1 to 4" category.
const smallCatalogue: CohortCatalogue = {
  categories: [
    {
      id: "energy",
      pickMin: 1,
      pickMax: 1,
      tags: [
        { id: "energy-a", name: "Sea Captain" },
        { id: "energy-b", name: "Mad Inventor" },
        { id: "energy-c", name: "Wise Hermit" },
      ],
    },
    {
      id: "qualities",
      pickMin: 1,
      pickMax: 4,
      tags: ["q1", "q2", "q3", "q4", "q5", "q6"].map((id) => ({ id, name: id })),
    },
  ],
  courseIds: ["software", "business"],
};

const cohort = buildPretendCohort(smallCatalogue);
const finishedIds = cohort.profiles.map((profile) => profile.userId);
const mainCharacterId = pretendUserId(MAIN_CHARACTER_NUMBER);

describe("buildPretendCohort: people and profiles", () => {
  it("makes 32 users, split evenly between the two courses", () => {
    expect(cohort.users).toHaveLength(32);
    expect(cohort.users.filter((user) => user.courseId === "software")).toHaveLength(16);
    expect(cohort.users.filter((user) => user.courseId === "business")).toHaveLength(16);
  });

  it("gives 30 of them a finished profile and leaves 2 without one", () => {
    expect(cohort.profiles).toHaveLength(30);
    const withoutProfile = cohort.users.filter((user) => !finishedIds.includes(user.id));
    expect(withoutProfile.map((user) => user.id)).toEqual([
      "pretend-user-31",
      "pretend-user-32",
    ]);
    // One per course, so track 2 can onboard a student from each.
    expect(withoutProfile.map((user) => user.courseId).sort()).toEqual([
      "business",
      "software",
    ]);
  });

  it("has exactly one admin and exactly one suspended user, both with profiles", () => {
    const admins = cohort.users.filter((user) => user.role === "ADMIN");
    const suspended = cohort.users.filter((user) => user.suspendedAt !== null);

    expect(admins.map((user) => user.id)).toEqual([pretendUserId(ADMIN_NUMBER)]);
    expect(suspended.map((user) => user.id)).toEqual([pretendUserId(SUSPENDED_NUMBER)]);
    expect(finishedIds).toContain(admins[0].id);
    expect(finishedIds).toContain(suspended[0].id);
  });

  it("marks every user as pretend by id and by an email that can't receive mail", () => {
    for (const user of cohort.users) {
      expect(user.id).toMatch(/^pretend-user-\d\d$/);
      expect(user.email).toMatch(/^pretend-\d\d@collabz\.test$/);
    }
  });

  it("keeps every profile inside each category's pick limits, with no tag twice", () => {
    for (const userId of finishedIds) {
      const picked = cohort.profileTags
        .filter((profileTag) => profileTag.userId === userId)
        .map((profileTag) => profileTag.tagId);
      // No tag picked twice.
      expect(new Set(picked).size).toBe(picked.length);

      for (const category of smallCatalogue.categories) {
        const tagIdsInCategory = category.tags.map((tag) => tag.id);
        const pickedInCategory = picked.filter((tagId) => tagIdsInCategory.includes(tagId));
        expect(pickedInCategory.length).toBeGreaterThanOrEqual(category.pickMin);
        expect(pickedInCategory.length).toBeLessThanOrEqual(category.pickMax);
      }
    }
  });

  it("only picks tags the catalogue it was given contains", () => {
    // The seed passes in active tags only, so a retired tag is never offered.
    const offered = smallCatalogue.categories.flatMap((category) =>
      category.tags.map((tag) => tag.id),
    );
    for (const profileTag of cohort.profileTags) {
      expect(offered).toContain(profileTag.tagId);
    }
  });

  it("copes with a category that has fewer tags than its minimum", () => {
    const picked = pickTagsFor("pretend-user-01", {
      id: "tiny",
      pickMin: 2,
      pickMax: 4,
      tags: [{ id: "only-one", name: "Only one" }],
    });
    expect(picked).toEqual(["only-one"]);
  });

  it("gives everyone a different alias and one of the 12 silhouettes", () => {
    const aliases = cohort.profiles.map((profile) => profile.alias);
    expect(new Set(aliases).size).toBe(30);
    expect(cohort.profiles[6].alias).toMatch(/^The Pretend .+ 07$/);
    for (const profile of cohort.profiles) {
      expect(profile.silhouette).toMatch(/^silhouette-(0[1-9]|1[0-2])$/);
    }
  });

  it("builds exactly the same cohort every time", () => {
    // This is what "pretend-user-07" meaning the same person for everyone
    // rests on. toEqual compares every user, tag, score, date and message.
    expect(buildPretendCohort(smallCatalogue)).toEqual(cohort);
  });

  it("doesn't reshuffle existing picks when a category is added later", () => {
    const withExtraCategory: CohortCatalogue = {
      ...smallCatalogue,
      categories: [
        ...smallCatalogue.categories,
        { id: "skills", pickMin: 1, pickMax: 2, tags: [{ id: "s1", name: "s1" }] },
      ],
    };
    const bigger = buildPretendCohort(withExtraCategory);

    // Everything picked before is still picked, and aliases haven't changed.
    for (const profileTag of cohort.profileTags) {
      expect(bigger.profileTags).toContainEqual(profileTag);
    }
    expect(bigger.profiles.map((profile) => profile.alias)).toEqual(
      cohort.profiles.map((profile) => profile.alias),
    );
  });
});

describe("buildPretendCohort: scores and glitch matches", () => {
  it("has one score for each of the 435 pairs, lower id first", () => {
    expect(cohort.edges).toHaveLength(435); // 30 x 29 / 2

    const pairs = cohort.edges.map((edge) => `${edge.userAId}|${edge.userBId}`);
    expect(new Set(pairs).size).toBe(435);
    for (const edge of cohort.edges) {
      expect(edge.userAId < edge.userBId).toBe(true);
    }
  });

  it("makes every score add up by the brief's formula", () => {
    for (const edge of cohort.edges) {
      expect(edge.score).toBe(edge.complement * 3 + edge.overlap + edge.tension);
    }
  });

  it("gives each finished user one glitch match: not themselves, not in their top 5", () => {
    expect(cohort.glitchMatches).toHaveLength(30);
    expect(cohort.glitchMatches.map((glitch) => glitch.userId).sort()).toEqual(
      [...finishedIds].sort(),
    );

    for (const glitch of cohort.glitchMatches) {
      expect(glitch.matchedUserId).not.toBe(glitch.userId);
      expect(finishedIds).toContain(glitch.matchedUserId);
      expect(pretendTopFive(cohort, glitch.userId)).not.toContain(glitch.matchedUserId);
    }
  });
});

describe("buildPretendCohort: requests, conversations, a block and a report", () => {
  const requestsWithStatus = (status: string) =>
    cohort.connectionRequests.filter((request) => request.status === status);

  it("has 8 pending, 4 approved and 2 declined requests", () => {
    expect(requestsWithStatus("PENDING")).toHaveLength(8);
    expect(requestsWithStatus("APPROVED")).toHaveLength(4);
    expect(requestsWithStatus("DECLINED")).toHaveLength(2);
  });

  it("only sends requests the real rule would allow: to a top 5 or glitch match", () => {
    for (const request of cohort.connectionRequests) {
      const glitchMatch = cohort.glitchMatches.find(
        (glitch) => glitch.userId === request.fromUserId,
      )?.matchedUserId;
      const allowed = [...pretendTopFive(cohort, request.fromUserId), glitchMatch];
      expect(allowed).toContain(request.toUserId);
    }
  });

  it("never has two requests between the same two people", () => {
    const pairs = cohort.connectionRequests.map((request) =>
      [request.fromUserId, request.toUserId].sort().join("|"),
    );
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("has a conversation for every approved request, and for nothing else", () => {
    const approvedPairs = requestsWithStatus("APPROVED")
      .map((request) => [request.fromUserId, request.toUserId].sort().join("|"))
      .sort();
    const conversationPairs = cohort.conversations
      .map((conversation) => `${conversation.userAId}|${conversation.userBId}`)
      .sort();

    expect(conversationPairs).toEqual(approvedPairs);
  });

  it("has three open conversations with messages and one closed one", () => {
    const open = cohort.conversations.filter((conversation) => conversation.closedAt === null);
    const closed = cohort.conversations.filter((conversation) => conversation.closedAt !== null);
    expect(open).toHaveLength(3);
    expect(closed).toHaveLength(1);

    for (const conversation of open) {
      const itsMessages = cohort.messages.filter(
        (message) => message.conversationId === conversation.id,
      );
      expect(itsMessages.length).toBeGreaterThanOrEqual(3);
      // Only the two people in a conversation ever send messages in it.
      for (const message of itsMessages) {
        expect([conversation.userAId, conversation.userBId]).toContain(message.senderId);
      }
    }
  });

  it("has one block and one open report, between the pair whose conversation closed", () => {
    const closed = cohort.conversations.find((conversation) => conversation.closedAt !== null)!;
    const closedPair = [closed.userAId, closed.userBId].sort();

    expect(cohort.blocks).toHaveLength(1);
    expect([cohort.blocks[0].blockerId, cohort.blocks[0].blockedId].sort()).toEqual(closedPair);

    expect(cohort.reports).toHaveLength(1);
    expect(cohort.reports[0].status).toBe("OPEN");
    expect([cohort.reports[0].reporterId, cohort.reports[0].reportedId].sort()).toEqual(
      closedPair,
    );
  });

  it("gives the main character something to see in every feature", () => {
    const incoming = cohort.connectionRequests.filter(
      (request) => request.toUserId === mainCharacterId && request.status === "PENDING",
    );
    const outgoing = cohort.connectionRequests.filter(
      (request) => request.fromUserId === mainCharacterId && request.status === "PENDING",
    );
    const openConversations = cohort.conversations.filter(
      (conversation) =>
        conversation.closedAt === null &&
        [conversation.userAId, conversation.userBId].includes(mainCharacterId),
    );

    expect(incoming).toHaveLength(1);
    expect(outgoing).toHaveLength(1);
    expect(openConversations).toHaveLength(1);
    expect(
      cohort.messages.filter(
        (message) => message.conversationId === openConversations[0].id,
      ).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("keeps the suspended user out of every request", () => {
    const suspendedId = pretendUserId(SUSPENDED_NUMBER);
    for (const request of cohort.connectionRequests) {
      expect(request.fromUserId).not.toBe(suspendedId);
      expect(request.toUserId).not.toBe(suspendedId);
    }
  });
});

describe("buildPretendCohort: with the real seed catalogue", () => {
  // The catalogue exactly as prisma/seed-data.ts defines it.
  const realCatalogue: CohortCatalogue = {
    categories: seedCategories.map((category) => ({
      id: category.id,
      pickMin: category.pickMin,
      pickMax: category.pickMax,
      tags: category.tags.map((tag) => ({ id: tag.id, name: tag.name })),
    })),
    courseIds: seedCourses.map((course) => course.id),
  };
  const realCohort = buildPretendCohort(realCatalogue);

  it("has the same shape as with the small catalogue", () => {
    expect(realCohort.users).toHaveLength(32);
    expect(realCohort.profiles).toHaveLength(30);
    expect(realCohort.edges).toHaveLength(435);
    expect(realCohort.glitchMatches).toHaveLength(30);
    expect(realCohort.connectionRequests).toHaveLength(14);
    expect(realCohort.conversations).toHaveLength(4);
    expect(realCohort.blocks).toHaveLength(1);
    expect(realCohort.reports).toHaveLength(1);
  });

  it("names each alias after the profile's real Energy tag", () => {
    const energyNames = seedCategories
      .find((category) => category.id === "energy")!
      .tags.map((tag) => tag.name);
    for (const profile of realCohort.profiles) {
      const middle = profile.alias.replace(/^The Pretend /, "").replace(/ \d\d$/, "");
      expect(energyNames).toContain(middle);
    }
  });
});
