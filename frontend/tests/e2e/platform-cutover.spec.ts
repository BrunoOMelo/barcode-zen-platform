import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

interface SeedData {
  apiBaseUrl: string;
  admin: {
    email: string;
    password: string;
    token: string;
    tenantAlphaId: string;
    tenantBetaId: string;
  };
  viewer: {
    email: string;
    password: string;
    token: string;
    tenantAlphaId: string;
  };
}

function loadSeed(): SeedData {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const seedPath = path.resolve(currentDir, "..", "..", ".e2e-seed.json");
  const raw = fs.readFileSync(seedPath, "utf-8");
  return JSON.parse(raw) as SeedData;
}

async function platformLogin(
  page: import("@playwright/test").Page,
  apiBaseUrl: string,
  credentials: { email: string; password: string },
) {
  await page.goto("/login");
  await page.locator("#apiBaseUrl").fill(apiBaseUrl);
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);
  await page.getByRole("button", { name: "Validar acesso" }).click();
  await page.getByRole("button", { name: "Entrar no sistema" }).click();
  await expect(page).toHaveURL(/\/estoque$/);
}

test("admin can navigate and load tenant scoped data", async ({ page }) => {
  const seed = loadSeed();
  await platformLogin(page, seed.apiBaseUrl, {
    email: seed.admin.email,
    password: seed.admin.password,
  });

  await expect(page.getByRole("cell", { name: "Produto E2E Alpha" }).first()).toBeVisible();

  await page.getByRole("tab", { name: /Inventar/i }).click();
  await expect(page.getByText("Inventario E2E Alpha")).toBeVisible();
});

test("tenant switch updates visible data isolation", async ({ page }) => {
  const seed = loadSeed();
  await platformLogin(page, seed.apiBaseUrl, {
    email: seed.admin.email,
    password: seed.admin.password,
  });

  await page.locator("#tenant-switch").click();
  await page.getByTestId(`tenant-option-${seed.admin.tenantBetaId}`).click();
  await expect(page).toHaveURL(/\/estoque$/);

  await expect(page.getByRole("cell", { name: "Produto E2E Beta" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Produto E2E Alpha" })).toHaveCount(0);
});

test("viewer is blocked from product creation by backend authorization", async ({ page }) => {
  const seed = loadSeed();
  await platformLogin(page, seed.apiBaseUrl, {
    email: seed.viewer.email,
    password: seed.viewer.password,
  });

  await page.getByRole("button", { name: "Novo Produto" }).click();
  await page.locator("#descricao").fill("Produto Viewer Bloqueado");
  await page.locator("#sku").fill("VIEWER-LOCK-001");

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/products/") &&
      response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Criar Produto" }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(403);
});
