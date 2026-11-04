/*
 * Replace this with the exact browser-side code you want to run.
 * It executes inside the page context on GitHub Actions after the target URL loads.
 */

console.log("script.js started on", window.location.href);

setInterval(() => {
  console.log("script.js heartbeat", new Date().toISOString());
}, 10000);
