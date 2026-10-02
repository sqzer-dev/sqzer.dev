// The page in a headless browser, against the version of `sqzer` that
// `site/package.json` names. Run by `.github/workflows/check.yml` on every
// pull request, the Dependabot bumps included, with `site/` served at `URL`.
//
//   npm install --no-save --no-package-lock playwright
//   npx playwright install --with-deps chromium
//   python3 -m http.server -d site 8000 &
//   node .github/check.mjs
import { chromium } from "playwright";

const url = process.env.URL ?? "http://localhost:8000/";
const problems = [];
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});
const status = () => page.textContent("#status");

// 1. the self-test: `decodeAny` on the page and in a worker
await page.goto(`${url}selftest/`);
await page.waitForFunction(() => document.getElementById("out").textContent.endsWith("done\n"), null, { timeout: 120_000 });
const out = await page.textContent("#out");
console.log(out);
problems.push(...out.split("\n").filter((line) => line.startsWith("FAIL")));

// 2. the page: a JPEG in, a result out, with the defaults
const settled = (done) =>
  page.waitForFunction((done) => {
    const s = document.getElementById("status");
    return done.test(s.textContent) || s.classList.contains("failed");
  }, done, { timeout: 120_000 });
await page.goto(url);
await settled(/^Ready\./);
if (await status() === "Ready.") {
  await page.setInputFiles("#file", new URL("../site/selftest/fixtures/pattern-rgb.jpg", import.meta.url).pathname);
  await settled(/^Done/);
}
console.log(`${await status()}\n${await page.textContent("#summary")}`);
if (!/^Done/.test(await status())) problems.push(`the page: ${await status()}`);
if (await page.$eval("#download", (a) => a.hidden || !a.href)) problems.push("the page: nothing to download");

await browser.close();
if (problems.length) {
  console.error(`\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("\nok");
