import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";

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

interface ImportRowData {
  descricao: string;
  sku: string;
  codigo_barras: string;
  categoria: string;
  custo: string;
}

interface InventoryImportRowData {
  descricao: string;
  sku: string;
  codigo_barras: string;
  categoria: string;
  custo: string;
  saldo_inicial: string;
}

type SpreadsheetFormat = "csv" | "xlsx" | "xls";

function loadSeed(): SeedData {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const seedPath = path.resolve(currentDir, "..", "..", ".e2e-seed.json");
  const raw = fs.readFileSync(seedPath, "utf-8");
  return JSON.parse(raw) as SeedData;
}

function generateImportRow(format: SpreadsheetFormat): ImportRowData {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    descricao: `Produto Import ${format.toUpperCase()} ${suffix}`,
    sku: `IMP-${format.toUpperCase()}-${suffix.slice(-8)}`,
    codigo_barras: `789${suffix.slice(-10)}`,
    categoria: "Importacao",
    custo: "10.50",
  };
}

function buildSpreadsheetFile(format: SpreadsheetFormat, row: ImportRowData): {
  name: string;
  mimeType: string;
  buffer: Buffer;
} {
  if (format === "csv") {
    const csvContent = [
      "descricao,sku,codigo_barras,categoria,custo",
      `"${row.descricao}","${row.sku}","${row.codigo_barras}","${row.categoria}","${row.custo}"`,
    ].join("\n");
    return {
      name: `import-${Date.now()}.csv`,
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent, "utf-8"),
    };
  }

  const worksheet = XLSX.utils.json_to_sheet([row]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");

  const fileExtension = format === "xlsx" ? "xlsx" : "xls";
  const mimeType =
    format === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/vnd.ms-excel";

  return {
    name: `import-${Date.now()}.${fileExtension}`,
    mimeType,
    buffer: XLSX.write(workbook, { type: "buffer", bookType: fileExtension }),
  };
}

function buildCsvFile(headers: string[], rows: string[][], namePrefix: string): {
  name: string;
  mimeType: string;
  buffer: Buffer;
} {
  const headerLine = headers.join(",");
  const rowLines = rows.map((row) => row.map((value) => `"${value}"`).join(","));
  const csvContent = [headerLine, ...rowLines].join("\n");
  return {
    name: `${namePrefix}-${Date.now()}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(csvContent, "utf-8"),
  };
}

function buildInventoryImportCsvFile(rows: InventoryImportRowData[]): {
  name: string;
  mimeType: string;
  buffer: Buffer;
} {
  const headers = [
    "Descricao do produto",
    "SKU",
    "Codigo EAN",
    "Categoria do produto",
    "Custo",
    "Saldo inicial",
  ];
  const rowLines = rows.map((row) =>
    [
      row.descricao,
      row.sku,
      row.codigo_barras,
      row.categoria,
      row.custo,
      row.saldo_inicial,
    ]
      .map((value) => `"${value}"`)
      .join(","),
  );
  const csvContent = [headers.join(","), ...rowLines].join("\n");
  return {
    name: `inventory-import-${Date.now()}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(csvContent, "utf-8"),
  };
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

async function importSpreadsheetAndValidate(
  page: import("@playwright/test").Page,
  format: SpreadsheetFormat,
) {
  const row = generateImportRow(format);
  const spreadsheetFile = buildSpreadsheetFile(format, row);

  await page.getByRole("button", { name: "Importar" }).first().click();

  const importDialog = page.getByRole("dialog");
  await expect(importDialog.getByText("Importar Produtos")).toBeVisible();

  await page.locator("#import-file-input").setInputFiles(spreadsheetFile);

  await expect(importDialog.getByText(/Validos:\s*1/)).toBeVisible();

  const createProductResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/products/") &&
      response.request().method() === "POST",
  );

  await importDialog.getByRole("button", { name: /^Importar \d+ produto\(s\)$/ }).click();

  const createProductResponse = await createProductResponsePromise;
  expect(createProductResponse.status()).toBe(201);

  await expect(importDialog).toBeHidden();

  const searchInput = page.locator('input[placeholder="Buscar por SKU, codigo ou descricao..."]');
  await searchInput.fill(row.sku);

  await expect(page.getByRole("cell", { name: row.descricao }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: row.codigo_barras }).first()).toBeVisible();
}

async function openImportDialog(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Importar" }).first().click();
  const importDialog = page.getByRole("dialog");
  await expect(importDialog.getByText("Importar Produtos")).toBeVisible();
  return importDialog;
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

test("admin can execute core flow with product, inventory and counting", async ({ page }) => {
  const seed = loadSeed();
  await platformLogin(page, seed.apiBaseUrl, {
    email: seed.admin.email,
    password: seed.admin.password,
  });

  const suffix = Date.now().toString();
  const productName = `Produto Core ${suffix}`;
  const productSku = `CORE-${suffix.slice(-8)}`;
  const barcode = `789${suffix.slice(-10)}`;
  const inventoryName = `Inventario Core ${suffix}`;

  await page.getByRole("button", { name: "Novo Produto" }).click();
  await page.locator("#descricao").fill(productName);
  await page.locator("#sku").fill(productSku);
  await page.locator("#codigo_barras").fill(barcode);
  await page.locator("#quantidade").fill("10");

  const createProductResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/products/") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Criar Produto" }).click();
  const createProductResponse = await createProductResponsePromise;
  expect(createProductResponse.status()).toBe(201);
  const createdProduct = (await createProductResponse.json()) as { id: string };

  await page.getByRole("tab", { name: /Inventar/i }).click();
  await page.getByRole("button", { name: "Novo inventario" }).click();
  await expect(page).toHaveURL(/\/inventarios\/criar$/);

  await page.locator("#nome").fill(inventoryName);
  await page.getByRole("button", { name: "Proximo" }).click();

  await page.locator("#inventory-product-search").fill(productSku);
  await page.getByTestId(`inventory-product-checkbox-${createdProduct.id}`).click();
  await page.getByRole("button", { name: "Proximo" }).click();

  await page.getByTestId(`inventory-step3-system-${createdProduct.id}`).fill("20");

  const createInventoryResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/inventories/") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Criar Inventario" }).click();
  const createInventoryResponse = await createInventoryResponsePromise;
  expect(createInventoryResponse.status()).toBe(201);
  const createdInventory = (await createInventoryResponse.json()) as { id: string };

  await expect(page).toHaveURL(/\/estoque$/);
  await page.getByRole("tab", { name: /Inventar/i }).click();
  await expect(page.getByTestId(`inventory-card-${createdInventory.id}`)).toBeVisible();
  await page.getByTestId(`inventory-start-count-${createdInventory.id}`).click();

  await expect(page).toHaveURL(new RegExp(`/inventarios/${createdInventory.id}/contagem$`));

  await page.locator("#barcode-input").fill(barcode);
  await expect(page.getByRole("button", { name: "Buscar produto" })).toBeEnabled();
  await page.getByRole("button", { name: "Buscar produto" }).click();
  await expect(page.getByText(productName)).toBeVisible();

  const registerCountResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/v1/inventories/${createdInventory.id}/counts`) &&
      response.request().method() === "POST",
  );
  await page.locator("#count-quantity").fill("19");
  await page.getByTestId("count-confirm").click();
  const registerCountResponse = await registerCountResponsePromise;
  expect(registerCountResponse.status()).toBe(201);
  await expect(page.getByText("Quantidade: 19")).toBeVisible();
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

for (const format of ["csv", "xlsx", "xls"] as const) {
  test(`admin can import products from ${format.toUpperCase()} spreadsheet`, async ({ page }) => {
    const seed = loadSeed();
    await platformLogin(page, seed.apiBaseUrl, {
      email: seed.admin.email,
      password: seed.admin.password,
    });

    await importSpreadsheetAndValidate(page, format);
  });
}

test("admin sees clear error for empty spreadsheet", async ({ page }) => {
  const seed = loadSeed();
  await platformLogin(page, seed.apiBaseUrl, {
    email: seed.admin.email,
    password: seed.admin.password,
  });

  await openImportDialog(page);
  const emptyFile = buildCsvFile(
    ["descricao", "sku", "codigo_barras", "categoria", "custo"],
    [],
    "empty-import",
  );
  await page.locator("#import-file-input").setInputFiles(emptyFile);

  await expect(page.getByText("Arquivo vazio ou sem linhas de produtos.")).toBeVisible();
});

test("admin sees clear error when required descricao column is missing", async ({ page }) => {
  const seed = loadSeed();
  await platformLogin(page, seed.apiBaseUrl, {
    email: seed.admin.email,
    password: seed.admin.password,
  });

  await openImportDialog(page);
  const invalidColumnsFile = buildCsvFile(
    ["sku", "codigo_barras", "categoria", "custo"],
    [["SKU-SEM-DESCRICAO-001", "7890000000010", "Teste", "9.99"]],
    "missing-description-column",
  );
  await page.locator("#import-file-input").setInputFiles(invalidColumnsFile);

  await expect(page.getByText("Coluna obrigatoria 'descricao' nao encontrada. Baixe a planilha padrao.")).toBeVisible();
});

test("admin sees duplicate row details clearly during preview", async ({ page }) => {
  const seed = loadSeed();
  await platformLogin(page, seed.apiBaseUrl, {
    email: seed.admin.email,
    password: seed.admin.password,
  });

  await openImportDialog(page);
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const duplicatedSku = `IMP-DUP-${suffix.slice(-8)}`;
  const duplicateFile = buildCsvFile(
    ["descricao", "sku", "codigo_barras", "categoria", "custo"],
    [
      [`Produto Duplicado A ${suffix}`, duplicatedSku, `789${suffix.slice(-10)}`, "Teste", "10.00"],
      [`Produto Duplicado B ${suffix}`, duplicatedSku, `780${suffix.slice(-10)}`, "Teste", "12.00"],
    ],
    "duplicate-rows",
  );
  await page.locator("#import-file-input").setInputFiles(duplicateFile);

  const importDialog = page.getByRole("dialog");
  await expect(importDialog.getByText(/Duplicados:\s*1/)).toBeVisible();
  await expect(importDialog.getByText("SKU duplicado na linha 2")).toBeVisible();
  await expect(
    importDialog.getByText('Revise as linhas com status "Duplicado" ou "Erro". Apenas linhas com status "OK" serao importadas.'),
  ).toBeVisible();
});

test("admin sees clear error for unreadable spreadsheet file", async ({ page }) => {
  const seed = loadSeed();
  await platformLogin(page, seed.apiBaseUrl, {
    email: seed.admin.email,
    password: seed.admin.password,
  });

  await openImportDialog(page);
  await page.locator("#import-file-input").setInputFiles({
    name: `invalid-${Date.now()}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]),
  });

  await expect(
    page.getByText(
      /Nao foi possivel ler o arquivo\. Use CSV, XLSX ou XLS valido\.|Arquivo sem planilha valida\. Use CSV, XLSX ou XLS\.|Arquivo vazio ou sem linhas de produtos\./,
    ),
  ).toBeVisible();
});

test("admin can create inventory from spreadsheet and auto-create missing products", async ({ page }) => {
  const seed = loadSeed();
  await platformLogin(page, seed.apiBaseUrl, {
    email: seed.admin.email,
    password: seed.admin.password,
  });

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const inventoryName = `Inventario Importado ${suffix}`;
  const newSku = `INV-NEW-${suffix.slice(-8)}`;
  const newBarcode = `789${suffix.slice(-10)}`;
  const importFile = buildInventoryImportCsvFile([
    {
      descricao: "Produto E2E Alpha",
      sku: "E2E-ALPHA-001",
      codigo_barras: "7890000000001",
      categoria: "E2E",
      custo: "10.00",
      saldo_inicial: "15",
    },
    {
      descricao: `Produto Importado Inventario ${suffix}`,
      sku: newSku,
      codigo_barras: newBarcode,
      categoria: "Importacao",
      custo: "11.75",
      saldo_inicial: "12",
    },
  ]);

  await page.getByRole("tab", { name: /Inventar/i }).click();
  await page.getByRole("button", { name: "Novo inventario" }).click();
  await expect(page).toHaveURL(/\/inventarios\/criar$/);

  await page.locator("#nome").fill(inventoryName);
  await page.getByRole("button", { name: "Importar planilha" }).click();

  const importDialog = page.getByRole("dialog");
  await expect(importDialog.getByText("Importar Inventario por Planilha")).toBeVisible();
  await importDialog.locator("#inventory-import-name").fill(inventoryName);
  await page.locator("#inventory-import-file-input").setInputFiles(importFile);

  await expect(importDialog.getByText(/Validos:\s*2/)).toBeVisible();

  const importResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/inventories/import") &&
      response.request().method() === "POST",
  );

  await importDialog.getByRole("button", { name: /Criar inventario com 2 item\(ns\)/ }).click();

  const importResponse = await importResponsePromise;
  expect(importResponse.status()).toBe(201);
  const importBody = (await importResponse.json()) as {
    summary: {
      created_products: number;
      inventory_items_created: number;
    };
  };
  expect(importBody.summary.inventory_items_created).toBe(2);
  expect(importBody.summary.created_products).toBe(1);

  await expect(page).toHaveURL(/\/estoque$/);
  await page.getByRole("tab", { name: /Inventar/i }).click();
  await expect(page.getByText(inventoryName)).toBeVisible();

  await page.getByRole("tab", { name: /Produtos/i }).click();
  const searchInput = page.locator('input[placeholder="Buscar por SKU, codigo ou descricao..."]');
  await searchInput.fill(newSku);
  await expect(page.getByRole("cell", { name: newBarcode }).first()).toBeVisible();
});
