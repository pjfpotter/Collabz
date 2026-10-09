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
};

export default nextConfig;
