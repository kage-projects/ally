// Reproduce the checked-in artwork crops without re-encoding the source JPEG.
// These are image assets; all layout and text remain React/CSS components.
import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const crops = [
  ["status-left", 48, 21, 145, 31], ["status-right", 516, 20, 154, 30],
  ["header-camera", 490, 107, 39, 38],
  ["header-cart", 571, 103, 58, 51], ["header-chat", 652, 106, 52, 43],
  ["banner", 15, 508, 690, 201],
  ["live1", 27, 805, 155, 210], ["live2", 189, 805, 155, 210],
  ["video1", 377, 805, 155, 210], ["video2", 539, 805, 155, 210],
  ["promo", 15, 1071, 337, 404], ["product", 368, 1071, 337, 338],
  ["qris", 28, 206, 50, 48], ["balance", 105, 203, 27, 25],
  ["coins", 305, 199, 34, 33], ["paylater", 510, 203, 32, 27],
  ["nav-home", 33, 1487, 54, 52], ["nav-migoo", 155, 1488, 50, 50],
  ["nav-deals", 276, 1487, 50, 51], ["nav-live", 397, 1487, 50, 51],
  ["nav-notification", 519, 1489, 48, 49], ["nav-me", 639, 1488, 49, 50],
  ...[44, 169, 295, 420, 546, 671].map((x, i) => [`category${i + 1}`, x, 321, 68, 69]),
];
const browser = await chromium.launch({
  channel: process.env.VISUAL_BROWSER_CHANNEL ||
    (existsSync(chromium.executablePath()) ? undefined : "chrome"),
});
try {
  const page = await browser.newPage();
  const source = (await readFile("screenshots/reference/home.jpeg")).toString("base64");
  const results = await page.evaluate(async ({ source, crops }) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${source}`;
    await image.decode();
    const results = crops.map(([name, x, y, width, height]) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, x, y, width, height, 0, 0, width, height);
      if (["status-left", "status-right", "header-cart", "header-chat"].includes(name)) {
        // Keep the white icon strokes and remove the surrounding orange
        // background, so these small assets do not introduce rectangular seams.
        const pixels = context.getImageData(0, 0, width, height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const coverage = Math.max(0, Math.min(1, (pixels.data[i + 2] - 130) / 125));
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
          pixels.data[i + 3] = Math.round(coverage * 255);
        }
        context.putImageData(pixels, 0, 0);
      }
      return [name, canvas.toDataURL("image/png").split(",")[1]];
    });
    // The unobscured top strip repeats every ~146 screenshot pixels.
    // Mirror its upper half to extend the pattern behind the search controls.
    const pattern = document.createElement("canvas");
    pattern.width = pattern.height = 146;
    const ctx = pattern.getContext("2d");
    ctx.drawImage(image, 292, 0, 146, 73, 0, 0, 146, 73);
    ctx.translate(0, 146);
    ctx.scale(1, -1);
    ctx.drawImage(image, 292, 0, 146, 73, 0, 0, 146, 73);
    const background = document.createElement("canvas");
    background.width = 720;
    background.height = 178;
    const backgroundContext = background.getContext("2d");
    backgroundContext.drawImage(image, 0, 0, 720, 178, 0, 0, 720, 178);
    const backgroundPixels = backgroundContext.getImageData(0, 0, 720, 178);
    const patternPixels = pattern.getContext("2d").getImageData(0, 0, 146, 146);
    const mask = new Uint8Array(720 * 178);
    // Remove individual white strokes instead of replacing rectangular patches
    // of the original pattern. The actual controls remain React elements.
    for (const [left, top, width, height] of [
      [45, 16, 154, 42], [510, 15, 166, 43],
      [15, 86, 534, 78], [568, 89, 143, 69],
    ]) {
      for (let y = top; y < top + height; y++) {
        for (let x = left; x < left + width; x++) {
          const offset = (y * 720 + x) * 4;
          const inSearch = left === 15;
          if (inSearch || (backgroundPixels.data[offset + 1] > 185 && backgroundPixels.data[offset + 2] > 165)) {
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const mx = x + dx, my = y + dy;
              if (mx >= 0 && mx < 720 && my >= 0 && my < 178) mask[my * 720 + mx] = 1;
            }
          }
        }
      }
    }
    for (let y = 0; y < 178; y++) for (let x = 0; x < 720; x++) {
      if (!mask[y * 720 + x]) continue;
      const destination = (y * 720 + x) * 4;
      const sample = ((y % 146) * 146 + x % 146) * 4;
      for (let c = 0; c < 3; c++) backgroundPixels.data[destination + c] = patternPixels.data[sample + c];
    }
    backgroundContext.putImageData(backgroundPixels, 0, 0);
    results.push(["header-pattern", background.toDataURL("image/png").split(",")[1]]);
    return results;
  }, { source, crops });
  await mkdir("public/assets", { recursive: true });
  for (const [name, data] of results) {
    await writeFile(`public/assets/${name}.png`, Buffer.from(data, "base64"));
  }
  console.log(`Extracted ${results.length} reference assets.`);
} finally {
  await browser.close();
}
