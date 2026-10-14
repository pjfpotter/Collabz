// /account/edit/[category] - change your answers in one category (slice 7,
// #14, design decision 6), e.g. /account/edit/seeking.
//
// One category per screen, like one step of slice 2's onboarding: the
// choices fill a phone screen. "silhouette" is treated as a category too.
//
// Not signed in -> /signin. Unknown or retired category, or no finished
// profile -> "page not found".

import { notFound, redirect } from "next/navigation";

import { getEditableCategory } from "@/lib/account/editCatalogue";
import { getCurrentUser } from "@/lib/currentUser";

import { PickStepStandIn } from "../PickStepStandIn";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Edit your answers · Collabz",
};

// PageProps is a helper type Next.js generates for each route. In this
// version of Next.js `params` is a Promise, so it has to be awaited.
export default async function EditCategoryPage({ params }: PageProps<"/account/edit/[category]">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const { category: categoryId } = await params;
  const toEdit = await getEditableCategory(categoryId, user.id);
  if (!toEdit) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-semibold">{toEdit.category.name}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Change your picks, then save. Your alias, connections and conversations stay as they are.
      </p>

      {/* key: a fresh form if the person moves to another category. */}
      <PickStepStandIn
        key={toEdit.category.id}
        category={toEdit.category}
        alreadyPicked={toEdit.alreadyPicked}
      />
    </main>
  );
}
