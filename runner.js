const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const DEFAULT_TARGET_URL = "https://grinding.tnstats.dev/";
const DEFAULT_NAVIGATION_TIMEOUT_MS = 60_000;
const HEARTBEAT_MS = 60_000;
// End gracefully before the workflow's 360-minute hard timeout.
const GRACEFUL_RUNTIME_MS = 359.9 * 60 * 1000;
const SCRIPT_FILES = ["script.js", "script2.js"];

async function readScripts() {
  return Promise.all(
    SCRIPT_FILES.map(async (filename) => ({
      filename,
      source: await fs.readFile(path.join(__dirname, filename), "utf8")
    }))
  );
}

function getTargetUrl() {
  const url = new URL(process.env.TARGET_URL || DEFAULT_TARGET_URL);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("TARGET_URL must use http or https.");
  }
  return url.toString();
}

function getLocalStorageData() {
  let parsed;
  try {
    parsed = JSON.parse(process.env.LOCAL_STORAGE_JSON || "{}");
  } catch (error) {
    throw new Error(`LOCAL_STORAGE_JSON must be valid JSON: ${error.message}`);
  }

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("LOCAL_STORAGE_JSON must be a JSON object of key/value pairs.");
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    ])
  );
}

async function main() {
  const targetUrl = getTargetUrl();
  const scripts = await readScripts();
  const localStorageData = getLocalStorageData();

  console.log(`Launching Chromium for ${targetUrl}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (message) => {
    console.log(`[page:${message.type()}] ${message.text()}`);
  });

  page.on("pageerror", (error) => {
    console.error("[pageerror]", error);
  });

  page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT_MS);

  // Initialize localStorage for the target origin before the site loads.
  await page.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) {
      window.localStorage.setItem(key, value);
    }
  }, localStorageData);

  // --- NEW: Inject AUTH_PASSWORD securely into the browser context ---
  await page.addInitScript((password) => {
    window.INJECTED_AUTH_PASSWORD = password;
  }, process.env.AUTH_PASSWORD || "");
  // -----------------------------------------------------------------

  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  console.log("Page loaded. Evaluating scripts in the same page.");

  for (const { filename, source } of scripts) {
    console.log(`Evaluating ${filename}.`);
    await page.evaluate(({ source, filename }) => {
      window.eval(`${source}\n//# sourceURL=${filename}`);
    }, { source, filename });
  }

  console.log("Scripts evaluated. Keeping the workflow alive.");

  let shuttingDown = false;
  let heartbeatTimer;
  let runtimeTimer;

  const shutdown = async (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${reason}. Closing browser and exiting successfully.`);

    clearInterval(heartbeatTimer);
    clearTimeout(runtimeTimer);

    try {
      await browser.close();
    } catch (error) {
      console.error("Error while closing browser:", error);
    }

    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("Received SIGTERM"));
  process.on("SIGINT", () => shutdown("Received SIGINT"));

  heartbeatTimer = setInterval(() => {
    console.log(`Heartbeat: browser still running on ${page.url()}`);
  }, HEARTBEAT_MS);

  runtimeTimer = setTimeout(() => {
    shutdown("Reached planned 350-minute runtime");
  }, GRACEFUL_RUNTIME_MS);

  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
