import path from "path";
import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(frontendRoot, "..", "backend");
const useManagedWebServers = process.env.PW_USE_WEBSERVER === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  globalSetup: useManagedWebServers ? "./tests/e2e/global-setup.ts" : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: useManagedWebServers
    ? [
        {
          command: "python -m uvicorn main:app --host 127.0.0.1 --port 8000",
          url: "http://127.0.0.1:8000/api/v1/health",
          reuseExistingServer: true,
          timeout: 120_000,
          cwd: backendRoot,
        },
        {
          command: "npm run dev -- --host 127.0.0.1 --port 5173",
          url: "http://127.0.0.1:5173/login",
          reuseExistingServer: true,
          timeout: 120_000,
          cwd: frontendRoot,
        },
      ]
    : undefined,
});
