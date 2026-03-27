import * as XLSX from "xlsx";

const TEMPLATE_HEADERS = [
  "ID",
  "SKU",
  "Codigo EAN",
  "Descricao do produto",
  "Marca",
  "Categoria do produto",
  "Saldo inicial",
  "Data de Validade",
  "Lote",
  "Custo",
  "Quantidade",
];

const EXAMPLE_ROW = [
  "",
  "SKU001",
  "7891234567890",
  "Produto Exemplo",
  "Marca X",
  "Alimentos",
  "100",
  "2026-12-31",
  "LOTE001",
  "19.90",
  "0",
];

export function downloadPlanilhaPadrao() {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, EXAMPLE_ROW]);

  // Column widths
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  XLSX.writeFile(wb, "planilha_padrao_inventario.xlsx");
}
