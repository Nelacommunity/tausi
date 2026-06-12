import { chromium } from "playwright";

const url = process.env.URL || "http://localhost:3000/";
const browser = await chromium.launch({ channel: "chrome" });

for (const [name, w, h] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `/tmp/landing-${name}-fold.png` });
  // scroll through to trigger reveals, then full page
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/landing-${name}-full.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log("done");
