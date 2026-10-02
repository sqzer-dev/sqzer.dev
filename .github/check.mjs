// The page in a headless browser, against the version of `sqzer` that
// `site/package.json` names. Run by `.github/workflows/check.yml` on every
// pull request, the Dependabot bumps included, with `site/` served at `URL`.
//
//   npm install --no-save --no-package-lock playwright@1.63.0
//   npx playwright install --with-deps chromium
//   python3 -m http.server -d site 8000 &
//   node .github/check.mjs
import { chromium } from "playwright";

const url = process.env.URL ?? "http://localhost:8000/";
const problems = [];

// The server was started a moment ago and may not be listening yet.
for (let attempt = 1; ; attempt++) {
  try {
    const response = await fetch(url);
    if (response.ok) break;
    throw new Error(`HTTP ${response.status}`);
  } catch (e) {
    if (attempt === 20) throw new Error(`${url} is not serving: ${e.message}`);
    await new Promise((done) => setTimeout(done, 500));
  }
}

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});
const status = () => page.textContent("#status");

try {
  // 1. the self-test: `decodeAny` on the page and in a worker
  await page.goto(`${url}selftest/`);
  await page.waitForFunction(() => document.getElementById("out").textContent.endsWith("done\n"), null, { timeout: 120_000 });
  const out = await page.textContent("#out");
  console.log(out);
  problems.push(...out.split("\n").filter((line) => line.startsWith("FAIL")));

  // 2. the page: a JPEG in, an image out, with the defaults
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
  const summary = await page.textContent("#summary");
  console.log(`${await status()}\n${summary}`);
  if (!/^Done/.test(await status())) {
    problems.push(`the page: ${await status()}`);
  } else {
    // the download is a picture of the fixture's size, not just a link. The
    // page's CSP lets an <img> load a blob and nothing else read one, so the
    // byte count comes from the result block, as the command line prints it
    const made = await page.evaluate(async () => {
      const a = document.getElementById("download");
      if (a.hidden || !a.href) return "no download";
      const img = new Image();
      img.src = a.href;
      try {
        await img.decode();
        return { name: a.download, width: img.naturalWidth, height: img.naturalHeight };
      } catch (e) {
        return `${a.download} is no image this browser decodes: ${e.message}`;
      }
    });
    const bytes = summary.match(/-> (\d+(?:\.\d+)? [KM]?B) /)?.[1];
    console.log({ ...(typeof made === "string" ? { made } : made), bytes });
    if (typeof made === "string") problems.push(`the page: ${made}`);
    else if (made.width !== 48 || made.height !== 32) problems.push(`the page: the output is ${made.width}x${made.height}, the fixture is 48x32`);
    if (!bytes || bytes === "0 B") problems.push(`the page: the output has ${bytes ?? "no"} bytes`);
  }
} catch (e) {
  // what the browser said before the wait ran out is the diagnosis
  problems.push(`the check did not finish: ${e.message.split("\n")[0]}`);
} finally {
  await browser.close();
}

if (problems.length) {
  console.error(`\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("\nok");
