// Makes the QR code students scan at the live test (slice 1, #8, design
// decision 11).
//
//   npm run qr -- https://collabz.example.com/signup
//
// It writes public/qr-code.png. Anything in public/ is served by the app, so
// the picture can then be opened at <your site>/qr-code.png and printed from
// any laptop.
//
// Why a script rather than a QR website: anyone can make it again for a new
// address with one command, and the repo shows exactly how it was made.
//
// Owner: slice 1 (#8).

import { mkdir } from "node:fs/promises";
import path from "node:path";

import QRCode from "qrcode";

// Where the picture goes, relative to the project folder.
const OUTPUT = path.join(process.cwd(), "public", "qr-code.png");

async function main(): Promise<void> {
  // process.argv holds: node's path, this script's path, then what you typed
  // after "--". So the address is the third item.
  const address = process.argv[2];

  if (!address || !/^https?:\/\//.test(address)) {
    console.error("Give the full address to point at, e.g.:");
    console.error("  npm run qr -- https://collabz.example.com/signup");
    process.exit(1);
  }

  // Make the public/ folder if this project doesn't have one yet.
  await mkdir(path.dirname(OUTPUT), { recursive: true });

  await QRCode.toFile(OUTPUT, address, {
    // Big enough to print clearly on a poster or a slide.
    width: 1000,
    // The blank border around the code. Phone cameras need some quiet space
    // around it to find it; 4 squares is the QR standard's recommendation.
    margin: 4,
    // "H" (high) error correction: still scans when part of the print is
    // smudged, folded or catches the light. It makes the pattern a little
    // busier, which doesn't matter at this size.
    errorCorrectionLevel: "H",
  });

  console.log(`QR code for ${address} saved to public/qr-code.png`);
}

main();
