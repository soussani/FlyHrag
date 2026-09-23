import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#102e4d"/><path d="M131 331V157h53v64h93v-64h53v174h-53v-66h-93v66z" fill="#eaf4ff"/><path d="m271 366 100-205 29 20-88 196z" fill="#58b6ff"/><path d="m322 221 46 4-13 27-47-2z" fill="#58b6ff"/></svg>`;
await mkdir("public/icons", { recursive: true });
await writeFile("public/icons/mark.svg", svg);
for (const [name, size] of [
  ["icon-192", 192],
  ["icon-512", 512],
  ["apple-touch-icon", 180],
  ["maskable-512", 512],
])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/${name}.png`);
