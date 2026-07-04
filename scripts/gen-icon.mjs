/* Generates the LMChat app icon (512×512 PNG): a rounded-rect in brand
   orange with the "M2" mark, written to build/icon.png (electron-builder
   picks it up automatically) and app/icon.png (Next.js favicon).

   Run with the globally installed playwright:
     NODE_PATH=$(npm root -g) node scripts/gen-icon.mjs
*/
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin: 0; background: transparent; }
  #icon {
    width: 512px; height: 512px;
    border-radius: 96px;
    background: #e06c3a;
    display: flex; align-items: center; justify-content: center;
  }
  #icon span {
    font: 700 200px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
    color: #14110f;
    letter-spacing: -0.03em;
    /* optical centering: nudge up so the glyph box sits on the visual center */
    transform: translateY(-10px);
  }
</style>
<div id="icon"><span>M2</span></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 600, height: 600 },
  deviceScaleFactor: 1,
});
await page.setContent(html);
const png = await page.locator("#icon").screenshot({ omitBackground: true });
await browser.close();

await mkdir(path.join(root, "build"), { recursive: true });
await writeFile(path.join(root, "build", "icon.png"), png);
await writeFile(path.join(root, "app", "icon.png"), png);

// sanity: PNG magic + 512×512 IHDR dimensions
const w = png.readUInt32BE(16);
const h = png.readUInt32BE(20);
if (png.readUInt32BE(0) !== 0x89504e47 || w !== 512 || h !== 512) {
  throw new Error(`unexpected icon output: ${w}x${h}`);
}
console.log(`wrote build/icon.png + app/icon.png (${w}x${h}, ${png.length} bytes)`);
