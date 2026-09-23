import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://127.0.0.1:4173/FlyHrag/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-iphone",
      use: {
        ...devices["iPhone 14 Pro Max"],
        defaultBrowserType: "chromium",
        browserName: "chromium",
      },
    },
    { name: "webkit-iphone", use: { ...devices["iPhone 14 Pro Max"] } },
  ],
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173/FlyHrag/",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
