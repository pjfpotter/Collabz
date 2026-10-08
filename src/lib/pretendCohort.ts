// The ONE switch that turns the pretend cohort on or off.
//
// "The pretend cohort" is two development aids from the foundation slice (#7):
// - the pretend students (`npm run seed:fake`), and
// - the "sign in as…" switcher in the nav bar, which lets you become any of
//   them without a password.
// Both are dangerous on a site with real students: the switcher would let
// anyone become anyone, including an admin. So every piece of code that
// belongs to either one asks this file first, and nothing else decides.
//
// Join-up (#17) deletes this file together with the seed and the switcher.

// Every pretend user's id starts with this, e.g. "pretend-user-07". That lets
// us tell pretend users from real ones by their id alone, with no extra
// "is pretend" column in the database, and lets join-up find and remove all
// of them in one query (foundation design decision 5).
export const PRETEND_USER_ID_PREFIX = "pretend-user-";

// The name of the browser cookie that remembers who the switcher signed you
// in as. It holds a pretend user's id and nothing else.
export const DEV_USER_COOKIE = "collabz_dev_user";

// True only where the pretend cohort has been deliberately switched on.
//
// Two conditions, and BOTH must hold:
//
// 1. The environment variable PRETEND_COHORT is exactly "on".
//    Why opt-in, rather than "on unless we detect production": if we got the
//    detecting wrong, the switcher would be left ON. With opt-in, forgetting
//    to set the variable leaves it OFF, which is the safe way to fail.
//    It has to be exactly "on" (not "true", not "ON") so there is one
//    spelling to search for and no guessing about what counts.
//
// 2. This is not Vercel's production deployment.
//    A second lock: if someone adds the variable to Vercel's Production
//    settings by mistake, production still refuses.
//    Why VERCEL_ENV and not NODE_ENV: Vercel sets NODE_ENV to "production"
//    on PREVIEW deploys too, and the switcher has to work on previews.
//    VERCEL_ENV is "production" only for the real site.
export function isPretendCohortEnabled(): boolean {
  const switchedOn = process.env.PRETEND_COHORT === "on";
  const isProductionDeployment = process.env.VERCEL_ENV === "production";

  return switchedOn && !isProductionDeployment;
}
