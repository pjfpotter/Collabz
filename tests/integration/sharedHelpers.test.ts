// Tests for the shared helpers other tracks call (foundation #7, task 2.4):
// openConversation, closeConversation and scoreUser.
//
// These are the "contracts" between tracks. Whoever fills in the real
// versions later (slices 3 and 6) should keep these tests passing, or change
// them on purpose and tell the tracks that call the helper.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { closeConversation, openConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { scoreUser } from "@/lib/scoring";

import { seedCatalogue } from "../../prisma/seed";
import { countRowsInEveryTable, emptyDatabase } from "../helpers/database";

// Two users are enough for every test here.
const annaId = "test-user-anna";
const benId = "test-user-ben";

describe("shared helpers", () => {
  beforeEach(async () => {
    await emptyDatabase(prisma);
    await prisma.user.create({
      data: { id: annaId, email: "anna@helpers-test.test" },
    });
    await prisma.user.create({
      data: { id: benId, email: "ben@helpers-test.test" },
    });
  });

  afterAll(async () => {
    await emptyDatabase(prisma);
    await seedCatalogue(prisma);
    await prisma.$disconnect();
  });

  describe("openConversation", () => {
    it("creates the pair's conversation, stored lower id first", async () => {
      const conversation = await openConversation(benId, annaId);

      // "test-user-anna" sorts before "test-user-ben".
      expect(conversation.userAId).toBe(annaId);
      expect(conversation.userBId).toBe(benId);
      expect(conversation.closedAt).toBeNull();
    });

    it("returns the same conversation whichever way round it is asked", async () => {
      const first = await openConversation(annaId, benId);
      const second = await openConversation(benId, annaId);

      expect(second.id).toBe(first.id);
      // And there really is only one row, not two that happen to look alike.
      expect(await prisma.conversation.count()).toBe(1);
    });

    it("returns a closed conversation as it is, still closed", async () => {
      const conversation = await openConversation(annaId, benId);
      await closeConversation(conversation.id);

      const again = await openConversation(annaId, benId);

      expect(again.id).toBe(conversation.id);
      expect(again.closedAt).not.toBeNull();
    });

    it("refuses a conversation with yourself", async () => {
      await expect(openConversation(annaId, annaId)).rejects.toThrow(
        /two different users/,
      );
    });
  });

  describe("closeConversation", () => {
    it("records when the conversation was closed", async () => {
      const conversation = await openConversation(annaId, benId);

      await closeConversation(conversation.id);

      const closed = await prisma.conversation.findUniqueOrThrow({
        where: { id: conversation.id },
      });
      expect(closed.closedAt).toBeInstanceOf(Date);
    });

    it("keeps the first closing time when called a second time", async () => {
      const conversation = await openConversation(annaId, benId);
      await closeConversation(conversation.id);
      const afterFirst = await prisma.conversation.findUniqueOrThrow({
        where: { id: conversation.id },
      });

      await closeConversation(conversation.id);

      const afterSecond = await prisma.conversation.findUniqueOrThrow({
        where: { id: conversation.id },
      });
      expect(afterSecond.closedAt).toEqual(afterFirst.closedAt);
    });

    it("does nothing, without an error, for an id that doesn't exist", async () => {
      await expect(closeConversation("no-such-conversation")).resolves.toBeUndefined();
    });
  });

  describe("scoreUser", () => {
    it("finishes without changing anything (until slice 3 fills it in)", async () => {
      const before = await countRowsInEveryTable(prisma);

      await expect(scoreUser(annaId)).resolves.toBeUndefined();

      expect(await countRowsInEveryTable(prisma)).toEqual(before);
    });
  });
});
