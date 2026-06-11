/**
 * optimize-solary-textures.mjs — one-time optimizer for the solary template's
 * photo textures (galacticScene.js lazy-loads the outputs).
 *
 * Input : .texture-raw/  (downloaded 2k sources, not committed)
 * Output: public/solary/textures/*.webp
 *
 * Sources & licenses (attribution also lives in public/solary/textures/README.md):
 *  - Planets/sun/ring: Solar System Scope textures — CC BY 4.0
 *    https://www.solarsystemscope.com/textures/
 *  - Andromeda (M31): "Andromeda Galaxy (with h-alpha)" by Adam Evans — CC BY 2.0
 *    https://commons.wikimedia.org/wiki/File:Andromeda_Galaxy_(with_h-alpha).jpg
 *
 * Usage: node scripts/optimize-solary-textures.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const RAW = path.resolve(".texture-raw");
const OUT = path.resolve("public/solary/textures");
await mkdir(OUT, { recursive: true });

const PLANETS = [
  ["2k_mercury.jpg", "mercury"],
  ["2k_venus_atmosphere.jpg", "venus"],
  ["2k_earth_daymap.jpg", "earth"],
  ["2k_mars.jpg", "mars"],
  ["2k_jupiter.jpg", "jupiter"],
  ["2k_saturn.jpg", "saturn"],
  ["2k_uranus.jpg", "uranus"],
  ["2k_neptune.jpg", "neptune"],
];

for (const [src, key] of PLANETS) {
  const out = path.join(OUT, `${key}.webp`);
  await sharp(path.join(RAW, src))
    .resize(1024, 512, { fit: "fill" })
    .webp({ quality: 80 })
    .toFile(out);
  console.log("planet ", key, (await sharp(out).metadata()).size ?? "");
}

/* Sun — slightly higher quality; it fills the screen when focused. */
await sharp(path.join(RAW, "2k_sun.jpg"))
  .resize(1024, 512, { fit: "fill" })
  .webp({ quality: 84 })
  .toFile(path.join(OUT, "sun.webp"));
console.log("sun     done");

/* Saturn ring strip (keeps alpha). x axis = inner→outer radius. */
const ringMeta = await sharp(path.join(RAW, "2k_saturn_ring_alpha.png")).metadata();
await sharp(path.join(RAW, "2k_saturn_ring_alpha.png"))
  .webp({ quality: 90, alphaQuality: 90 })
  .toFile(path.join(OUT, "saturn-ring.webp"));
console.log("ring    done", `${ringMeta.width}x${ringMeta.height}`);

/* NOTE: Andromeda stays procedural (makeAndromedaTexture in galacticScene.js)
   by user decision — the real M31 photo swap was tried and reverted. */
