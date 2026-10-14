// /admin/categories - manage categories, tags and pairings (slice 8, #15).
//
// A Server Component: it loads everything, then shows one section per
// category with plain forms. Each button posts to a Server Action in
// actions.ts. Nothing here is ever deleted, only retired (design 4).

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/currentUser";
import { CATEGORY_IDS } from "@/lib/matching/eligiblePeople";

import { AdminMenu } from "../AdminMenu";
import {
  addCategoryAction,
  addTagAction,
  moveCategoryAction,
  renameCategoryAction,
  rescoreEveryoneAction,
  setCategoryRetiredAction,
} from "./actions";
import { TagCard, type PartnerOption } from "./TagCard";

export const metadata = {
  title: "Categories & tags · Admin · Collabz",
};

// Always read fresh, so a change shows straight away.
export const dynamic = "force-dynamic";

const BUTTON = "rounded border border-current px-3 py-1";

export default async function AdminCategoriesPage({
  searchParams,
}: PageProps<"/admin/categories">) {
  // Admins only, and the FIRST line (see src/app/admin/page.tsx).
  await requireAdmin();

  // ?problem=... comes from an action that refused a change, ?note=... from
  // one that wants to report something (the rescore count).
  const { problem, note } = await searchParams;
  const problemText = typeof problem === "string" ? problem : null;
  const noteText = typeof note === "string" ? note : null;

  // Every category and tag, retired ones included, so an admin can un-retire.
  const categories = await prisma.category.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    include: { tags: { orderBy: [{ order: "asc" }, { id: "asc" }] } },
  });

  // Who is paired with whom, as "tag id -> ids of its partners", so each tag
  // card can tick the right boxes.
  const pairingRows = await prisma.tagPairing.findMany();
  const partnersOf = new Map<string, Set<string>>();
  function addPartner(tagId: string, partnerId: string) {
    if (!partnersOf.has(tagId)) {
      partnersOf.set(tagId, new Set());
    }
    partnersOf.get(tagId)!.add(partnerId);
  }
  for (const row of pairingRows) {
    addPartner(row.seekingTagId, row.qualityTagId);
    addPartner(row.qualityTagId, row.seekingTagId);
  }

  const tagsIn = (categoryId: string) =>
    categories.find((category) => category.id === categoryId)?.tags ?? [];

  // The tags a Seeking or Quality tag could pair with: every ACTIVE tag on
  // the other side, plus retired ones it is already paired with (so saving
  // can't silently drop them, see findOtherSideTagProblems).
  function partnerOptionsFor(tagId: string, categoryId: string): PartnerOption[] | null {
    let otherCategoryId: string;
    if (categoryId === CATEGORY_IDS.seeking) {
      otherCategoryId = CATEGORY_IDS.qualities;
    } else if (categoryId === CATEGORY_IDS.qualities) {
      otherCategoryId = CATEGORY_IDS.seeking;
    } else {
      return null;
    }

    const current = partnersOf.get(tagId) ?? new Set<string>();
    return tagsIn(otherCategoryId)
      .filter((other) => other.retiredAt === null || current.has(other.id))
      .map((other) => ({
        id: other.id,
        name: other.name,
        retired: other.retiredAt !== null,
        paired: current.has(other.id),
      }));
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <AdminMenu />

      <h1 className="mt-6 text-3xl font-semibold">Categories &amp; tags</h1>
      <p className="mt-2 text-sm">
        Renaming never changes an id or a score. A retired tag is no longer offered
        in onboarding or on the catalogue, but people who already picked it keep it.
      </p>

      {problemText && (
        <p role="alert" className="mt-4 rounded border border-current p-3 text-sm">
          {problemText}
        </p>
      )}
      {noteText && (
        <p role="status" className="mt-4 rounded border border-current p-3 text-sm">
          {noteText}
        </p>
      )}

      <div className="mt-6 space-y-8">
        {categories.map((category, index) => {
          const retired = category.retiredAt !== null;
          const partnerKind =
            category.id === CATEGORY_IDS.seeking
              ? "Quality"
              : category.id === CATEGORY_IDS.qualities
                ? "Seeking"
                : null;

          return (
            <section
              key={category.id}
              aria-labelledby={`heading-${category.id}`}
              className="rounded border border-current/30 p-3"
            >
              <h2 id={`heading-${category.id}`} className="text-xl font-semibold">
                {category.name}
                {retired && <span className="text-base font-normal"> (retired)</span>}
              </h2>
              <p className="text-xs">
                id: {category.id} · picks {category.pickMin}–{category.pickMax}
              </p>
              {retired && (
                <p className="mt-1 text-sm">
                  This category is retired, so all its tags are hidden while it is.
                </p>
              )}

              <form action={renameCategoryAction} className="mt-2 flex gap-2">
                <input type="hidden" name="id" value={category.id} />
                <label className="sr-only" htmlFor={`name-${category.id}`}>
                  New name for {category.name}
                </label>
                <input
                  id={`name-${category.id}`}
                  name="name"
                  defaultValue={category.name}
                  className="min-w-0 flex-1 rounded border border-current/40 px-2 py-1"
                />
                <button type="submit" className={BUTTON}>
                  Rename
                </button>
              </form>

              <div className="mt-2 flex flex-wrap gap-2">
                <form action={moveCategoryAction}>
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    disabled={index === 0}
                    className={`${BUTTON} disabled:opacity-40`}
                  >
                    Move up
                  </button>
                </form>
                <form action={moveCategoryAction}>
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={index === categories.length - 1}
                    className={`${BUTTON} disabled:opacity-40`}
                  >
                    Move down
                  </button>
                </form>
                <form action={setCategoryRetiredAction}>
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="retired" value={retired ? "false" : "true"} />
                  <button type="submit" className={BUTTON}>
                    {retired ? "Un-retire" : "Retire"}
                  </button>
                </form>
              </div>

              <ul className="mt-4 space-y-3">
                {category.tags.map((tag, tagIndex) => (
                  <TagCard
                    key={tag.id}
                    tag={{
                      id: tag.id,
                      name: tag.name,
                      description: tag.description,
                      retired: tag.retiredAt !== null,
                    }}
                    isFirst={tagIndex === 0}
                    isLast={tagIndex === category.tags.length - 1}
                    partnerOptions={partnerOptionsFor(tag.id, category.id)}
                    partnerKind={partnerKind}
                  />
                ))}
              </ul>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm underline">Add a tag</summary>
                <form action={addTagAction} className="mt-2 space-y-2">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <label className="block text-sm" htmlFor={`new-tag-${category.id}`}>
                    Name
                  </label>
                  <input
                    id={`new-tag-${category.id}`}
                    name="name"
                    className="w-full rounded border border-current/40 px-2 py-1"
                  />
                  <label className="block text-sm" htmlFor={`new-desc-${category.id}`}>
                    Short description
                  </label>
                  <input
                    id={`new-desc-${category.id}`}
                    name="description"
                    className="w-full rounded border border-current/40 px-2 py-1"
                  />
                  {partnerKind && (
                    <fieldset className="space-y-1">
                      <legend className="text-sm">
                        Pairs with these {partnerKind} tags (pick at least one)
                      </legend>
                      {tagsIn(
                        category.id === CATEGORY_IDS.seeking
                          ? CATEGORY_IDS.qualities
                          : CATEGORY_IDS.seeking,
                      )
                        .filter((other) => other.retiredAt === null)
                        .map((other) => (
                          <label key={other.id} className="flex items-start gap-2 text-sm">
                            <input type="checkbox" name="paired" value={other.id} className="mt-1" />
                            <span>{other.name}</span>
                          </label>
                        ))}
                    </fieldset>
                  )}
                  <button type="submit" className={BUTTON}>
                    Add tag
                  </button>
                </form>
              </details>
            </section>
          );
        })}
      </div>

      <form action={addCategoryAction} className="mt-8 flex gap-2">
        <label className="sr-only" htmlFor="new-category">
          Name of the new category
        </label>
        <input
          id="new-category"
          name="name"
          placeholder="New category name"
          className="min-w-0 flex-1 rounded border border-current/40 px-2 py-1"
        />
        <button type="submit" className={BUTTON}>
          Add category
        </button>
      </form>

      <section className="mt-10 rounded border border-current/30 p-3">
        <h2 className="text-xl font-semibold">Rescore everyone</h2>
        <p className="mt-1 text-sm">
          Changing a pairing doesn&apos;t change anyone&apos;s stored score. Press this
          after changing pairings to recalculate every finished, active person.
        </p>
        <form action={rescoreEveryoneAction} className="mt-2">
          <button type="submit" className={BUTTON}>
            Rescore everyone
          </button>
        </form>
      </section>
    </main>
  );
}
