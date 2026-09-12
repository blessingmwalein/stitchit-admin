/* One-off script to generate PWA icon set from the existing brand logo. Run with:
 *   node scripts/generate-pwa-icons.js
 * Not part of the build — icons are committed as static files.
 */
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "public", "STICHIT-01.png");
const OUT_DIR = path.join(ROOT, "public", "icons");
const BG = "#faf9f8"; // matches --background in app/globals.css

async function main() {
  const meta = await sharp(SOURCE).metadata();
  console.log(`source: ${SOURCE} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);

  // Standard (any-purpose) icons — logo as-is, resized.
  await sharp(SOURCE).resize(192, 192, { fit: "contain", background: BG }).flatten({ background: BG }).png().toFile(path.join(OUT_DIR, "icon-192.png"));
  await sharp(SOURCE).resize(512, 512, { fit: "contain", background: BG }).flatten({ background: BG }).png().toFile(path.join(OUT_DIR, "icon-512.png"));

  // Maskable icon — logo must sit inside the safe zone (center ~80% of canvas)
  // so it isn't clipped when the OS applies a circular/rounded mask.
  const maskableSize = 512;
  const safeZone = Math.round(maskableSize * 0.7);
  const logoBuf = await sharp(SOURCE).resize(safeZone, safeZone, { fit: "contain", background: BG }).toBuffer();
  await sharp({
    create: { width: maskableSize, height: maskableSize, channels: 4, background: BG },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .flatten({ background: BG })
    .png()
    .toFile(path.join(OUT_DIR, "icon-maskable-512.png"));

  // Apple touch icon — no transparency allowed, iOS ignores alpha and shows black.
  await sharp(SOURCE).resize(180, 180, { fit: "contain", background: BG }).flatten({ background: BG }).png().toFile(path.join(ROOT, "public", "apple-touch-icon.png"));

  console.log("Generated: icons/icon-192.png, icons/icon-512.png, icons/icon-maskable-512.png, apple-touch-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
