// Makes the QR code students scan at the live test (slice 1, #8, design
// decision 11).
//
//   npm run qr -- https://collabz.example.com/signup
//   npm run qr -- https://collabz.example.com/demo/graph public/qr-graph-demo.png
//
// With one argument it writes public/qr-code.png (the sign-up code). With a
// second argument it writes there instead (graph-demo, task 6.1). Anything in
// public/ is served by the app, so the picture can then be opened at
// <your site>/qr-code.png and printed from any laptop.
//
// WHY A SECOND ARGUMENT: the graph demo needs its own QR code, and without it
// making that one would overwrite the sign-up code people may have printed.
//
// Why a script rather than a QR website: anyone can make it again for a new
// address with one command, and the repo shows exactly how it was made.
//
// Owner: slice 1 (#8).

import { mkdir } from "node:fs/promises";
import path from "node:path";

import QRCode from "qrcode";

// Where the picture goes when no second argument is given, relative to the
// project folder. Unchanged from before, so `npm run qr -- <address>` still
// remakes the sign-up code.
const DEFAULT_OUTPUT = path.join(process.cwd(), "public", "qr-code.png");

async function main(): Promise<void> {
  // process.argv holds: node's path, this script's path, then what you typed
  // after "--". So the address is the third item.
  const address = process.argv[2];

  if (!address || !/^https?:\/\//.test(address)) {
    console.error("Give the full address to point at, e.g.:");
    console.error("  npm run qr -- https://collabz.example.com/signup");
    process.exit(1);
  }

  // The optional second item is where to write the picture. It is resolved
  // against the project folder and must end in .png, so a typo can't write a
  // file with some other name or type.
  const requestedOutput = process.argv[3];
  if (requestedOutput && !requestedOutput.toLowerCase().endsWith(".png")) {
    console.error("The output file must end in .png, e.g. public/qr-graph-demo.png");
    process.exit(1);
  }
  const OUTPUT = requestedOutput ? path.resolve(process.cwd(), requestedOutput) : DEFAULT_OUTPUT;

  // Make the folder if this project doesn't have it yet.
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

  console.log(`QR code for ${address} saved to ${path.relative(process.cwd(), OUTPUT)}`);
}

main();
