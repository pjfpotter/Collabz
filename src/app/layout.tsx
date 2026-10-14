import type { Metadata, Viewport } from "next";
import { Figtree, Instrument_Serif } from "next/font/google";
import "./globals.css";

import { NavBar } from "@/components/NavBar";

// The two typefaces from the design (slice 10, #45, design decision 2).
// next/font downloads them at build time and serves them from our own site,
// so the browser never contacts Google and the text doesn't jump when the
// font arrives. `variable` puts each one in a CSS variable that globals.css
// hands to Tailwind as font-sans and font-display.
//
// Figtree is the body face. Instrument Serif is the display face for
// aliases and headings; it only comes in one weight, plus an italic that the
// wordmark's "z" uses.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  // Page titles already read "Page · Collabz" (each page sets its own, e.g.
  // "Requests · Collabz"), which is what the visual-design spec asks for. So
  // there is deliberately no title template here: it would add the suffix a
  // second time. This is only the fallback for a page with no title.
  title: "Collabz",
  description: "Match bootcamp students by chemistry, not CVs.",
  // Icons. The manifest (manifest.webmanifest) and the share image
  // (opengraph-image.png) are picked up automatically from the files in this
  // folder. The icons are listed by hand because Next.js drops the icon
  // files it finds in this folder as soon as `icons` is set here, and we have
  // to set it for the pinned-tab icon below.
  //
  // favicon.ico lives in public/, not in this folder: Next.js tries to
  // process an ico placed here, and ours holds PNGs without an alpha channel,
  // which the build refuses. In public/ it is served untouched at
  // /favicon.ico, which is where browsers look for it anyway.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
    // Safari's single-colour pinned-tab icon.
    other: [{ rel: "mask-icon", url: "/mask-icon.svg", color: "#0D100C" }],
  },
};

// The colour of the browser's own toolbar on a phone. One value per colour
// scheme, the same page colours as the tokens in globals.css.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F3EA" },
    { media: "(prefers-color-scheme: dark)", color: "#0D100C" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* The same nav bar on every page: this layout wraps all of them. */}
        <NavBar />
        {children}
      </body>
    </html>
  );
}
