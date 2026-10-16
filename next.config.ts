import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Tells Next.js that THIS folder is the project. Without it, Next.js
    // guesses by looking upwards for a package-lock.json, and a stray one in
    // a parent folder (it happened: one in a home folder) makes it guess
    // wrong and print a warning on every start.
    //
    // `import.meta.dirname` is "the folder this file is in", as a full path,
    // so it is right on every laptop and on Vercel without anyone typing
    // their own path in.
    root: import.meta.dirname,
  },

  // The interactive course lives in public/course/ (portfolio-readme).
  // Next.js serves a file in public/ at its exact path only, so
  // /course/index.html works but /course on its own would be "not found".
  // This sends the short address to the real file.
  //
  // WHY permanent: false (a 307, not a 308): browsers cache a permanent
  // redirect for a long time, and we may yet move the course. A temporary
  // one costs nothing and can be changed whenever we like.
  //
  // The source is the exact path "/course", so no other route is touched.
  async redirects() {
    return [
      {
        source: "/course",
        destination: "/course/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
