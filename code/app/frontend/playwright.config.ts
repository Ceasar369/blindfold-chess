import { defineConfig, devices } from "@playwright/test";

// The site under test runs on its own: session 42 tests its copy with
// BASE_URL=http://localhost:3242 npx playwright test.
const baseURL = process.env.BASE_URL;
if (!baseURL) throw new Error("BASE_URL is not set: the site to test, such as http://localhost:3242.");

export default defineConfig({
  testDir: "e2e",
  workers: 2,
  reporter: "list",
  timeout: 120_000,
  // A stuck click fails in 15 seconds, not at the test's limit. A broken site stops the run at 10 failures.
  maxFailures: 10,
  use: { baseURL, trace: "retain-on-failure", actionTimeout: 15_000 },
  projects: [
    { name: "1440", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    // A phone: Safari's engine, 390 wide, touch, with Safari's own bars taken off.
    { name: "390", use: { ...devices["iPhone 14"] } },
  ],
});
