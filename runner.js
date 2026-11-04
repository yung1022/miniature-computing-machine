const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const DEFAULT_TARGET_URL = "https://grinding.tnstats.dev/";
const DEFAULT_NAVIGATION_TIMEOUT_MS = 60_000;
const HEARTBEAT_MS = 60_000;

async function readScriptSource() {
  const scriptPath = path.join(__dirname, "script.js");
  return fs.readFile(scriptPath, "utf8");
}

function getTargetUrl() {
  const rawValue = process.env.TARGET_URL || DEFAULT_TARGET_URL;
  return new URL(rawValue).toString();
}

async function main() {
  const targetUrl = getTargetUrl();
  const scriptSource = await readScriptSource();

  console.log(`Launching Chromium for ${targetUrl}`);

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (message) => {
    console.log(`[page:${message.type()}] ${message.text()}`);
  });

  page.on("pageerror", (error) => {
    console.error("[pageerror]", error);
  });

  page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT_MS);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  console.log("Page loaded. Evaluating script.js in the page context.");

  await page.evaluate((source) => {
    window.eval(`${source}\n//# sourceURL=repo-script.js`);
  }, scriptSource);

  console.log("script.js evaluated. Keeping the workflow alive.");

  process.on("SIGTERM", async () => {
    console.log("Received SIGTERM. Closing browser.");
    await browser.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("Received SIGINT. Closing browser.");
    await browser.close();
    process.exit(0);
  });

  setInterval(async () => {
    try {
      const currentUrl = page.url();
      console.log(`Heartbeat: browser still running on ${currentUrl}`);
    } catch (error) {
      console.error("Heartbeat failed:", error);
    }
  }, HEARTBEAT_MS);

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
