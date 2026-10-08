// /people/[alias] - PLACEHOLDER (foundation #7).
// Owner: slice 4, issue #11 (track 4). Replace this file with the real page.
//
// The square brackets in the folder name make this a "dynamic" route: it
// answers for /people/ followed by anything, and that "anything" arrives here
// as `params.alias`. Slice 4 decides exactly what goes in that part of the
// address (a readable form of the person's alias).

import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata = {
  title: "Profile · Collabz",
};

// PageProps is a helper type Next.js generates for each route. In this
// version of Next.js `params` is a Promise, so it has to be awaited.
export default async function PersonProfilePage({
  params,
}: PageProps<"/people/[alias]">) {
  const { alias } = await params;

  return (
    <PlaceholderPage
      title="Profile"
      slice={4}
      issue={11}
      willShow={`One person's profile, with their alias, bio, tags and why you match. (You asked for: ${alias})`}
    />
  );
}
