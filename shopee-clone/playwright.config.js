import { defineConfig, chromium } from "@playwright/test";
import { existsSync } from "node:fs";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  reporter: "html",

  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    browserName: "chromium",
    channel: process.env.VISUAL_BROWSER_CHANNEL ||
      (existsSync(chromium.executablePath()) ? undefined : "chrome"),
    isMobile: true,
    hasTouch: true,
  },

  projects: [
    {
      name: "mobile-reference",
      use: { viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 },
    },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
    },
  ],

  webServer: {
    command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run dev -- --host 127.0.0.1`,
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
