import { useCallback, useState } from "react";
import * as XLSX from "xlsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { createProductFromSession, listProductsFromSession } from "@/platform/api";
import { downloadPlanilhaPadrao } from "@/lib/template";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ParsedRow {
  descricao: string;
  sku: string;
  codigo_barras: string;
  categoria: string;
  marca: string;
  data_validade: string;
  lote: string;
  custo: string;
}

interface ValidatedRow extends ParsedRow {
  status: "ok" | "duplicado" | "erro";
  errors: string[];
}

type Step = "upload" | "preview" | "importing";

const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  descricao: "descricao",
  "descricao do produto": "descricao",
  nome: "descricao",
  produto: "descricao",
  sku: "sku",
  "codigo de barras": "codigo_barras",
  "codigo ean": "codigo_barras",
  codigo_barras: "codigo_barras",
  ean: "codigo_barras",
  barcode: "codigo_barras",
  categoria: "categoria",
  "categoria do produto": "categoria",
  category: "categoria",
  marca: "marca",
  brand: "marca",
  "data de validade": "data_validade",
  data_validade: "data_validade",
  validade: "data_validade",
  lote: "lote",
  batch: "lote",
  custo: "custo",
  cost: "custo",
  preco: "custo",
  price: "custo",
};

function normalizeHeader(header: string): keyof ParsedRow | null {
  const normalized = header.trim().toLowerCase();
  return COLUMN_MAP[normalized] ?? null;
}

async function listAllProductsForValidation() {
  const first = await listProductsFromSession({ page: 1, pageSize: 100 });
  const items = [...first.items];
  for (let page = 2; page <= first.total_pages; page += 1) {
    const next = await listProductsFromSession({ page, pageSize: 100 });
    items.push(...next.items);
  }
  return items;
}

interface ImportProdutosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProdutosDialog({ open, onOpenChange }: ImportProdutosDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const queryClient = useQueryClient();

  const resetState = useCallback(() => {
    setStep("upload");
    setRows([]);
    setFileName("");
  }, []);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (!jsonData.length) {
      toast.error("Arquivo vazio ou sem dados validos.");
      return;
    }

    const headers = Object.keys(jsonData[0]);
    const mapping: Record<string, keyof ParsedRow> = {};
    for (const header of headers) {
      const mapped = normalizeHeader(header);
      if (mapped) mapping[header] = mapped;
    }

    if (!Object.values(mapping).includes("descricao")) {
      toast.error("Coluna 'descricao' nao encontrada.");
      return;
    }

    const parsed: ParsedRow[] = jsonData.map((row) => {
      const result: ParsedRow = {
        descricao: "",
        sku: "",
        codigo_barras: "",
        categoria: "",
        marca: "",
        data_validade: "",
        lote: "",
        custo: "",
      };
      for (const [originalKey, mappedKey] of Object.entries(mapping)) {
        result[mappedKey] = String(row[originalKey] ?? "").trim();
      }
      return result;
    });

    let existingSkus = new Set<string>();
    let existingBarcodes = new Set<string>();
    try {
      const existingProducts = await listAllProductsForValidation();
      existingSkus = new Set(existingProducts.map((product) => product.sku?.toLowerCase()).filter(Boolean));
      existingBarcodes = new Set(existingProducts.map((product) => product.barcode?.toLowerCase()).filter(Boolean));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Falha ao validar base existente.";
      toast.error(message);
      return;
    }

    const fileSkus = new Map<string, number>();
    const fileBarcodes = new Map<string, number>();

    const validated: ValidatedRow[] = parsed.map((row, index) => {
      const errors: string[] = [];
      let status: ValidatedRow["status"] = "ok";

      if (!row.descricao) {
        errors.push("Descricao obrigatoria");
        status = "erro";
      }

      if (!row.sku && !row.codigo_barras) {
        errors.push("Informe SKU ou codigo de barras");
        status = "erro";
      }

      if (row.sku) {
        const normalizedSku = row.sku.toLowerCase();
        if (existingSkus.has(normalizedSku)) {
          errors.push("SKU ja existe no sistema");
          status = "duplicado";
        } else if (fileSkus.has(normalizedSku)) {
          errors.push(`SKU duplicado na linha ${Number(fileSkus.get(normalizedSku)) + 2}`);
          status = "duplicado";
        }
        fileSkus.set(normalizedSku, index);
      }

      if (row.codigo_barras) {
        const normalizedBarcode = row.codigo_barras.toLowerCase();
        if (existingBarcodes.has(normalizedBarcode)) {
          errors.push("Codigo de barras ja existe no sistema");
          status = status === "erro" ? "erro" : "duplicado";
        } else if (fileBarcodes.has(normalizedBarcode)) {
          errors.push(`Codigo de barras duplicado na linha ${Number(fileBarcodes.get(normalizedBarcode)) + 2}`);
          status = status === "erro" ? "erro" : "duplicado";
        }
        fileBarcodes.set(normalizedBarcode, index);
      }

      return { ...row, status, errors };
    });

    setRows(validated);
    setStep("preview");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const validRows = rows.filter((row) => row.status === "ok");
  const duplicateRows = rows.filter((row) => row.status === "duplicado");
  const errorRows = rows.filter((row) => row.status === "erro");

  const handleImport = async () => {
    if (!validRows.length) return;
    setStep("importing");

    let successCount = 0;
    let failedCount = 0;

    for (const row of validRows) {
      const barcode = row.codigo_barras || row.sku;
      if (!barcode) {
        failedCount += 1;
        continue;
      }
      try {
        await createProductFromSession({
          name: row.descricao,
          sku: row.sku || barcode,
          barcode,
          category: row.categoria || undefined,
          cost: row.custo ? Number(row.custo) : undefined,
          active: true,
          quantity: 0,
        });
        successCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["produtos"] });

    if (successCount > 0) {
      toast.success(`${successCount} produto(s) importado(s) com sucesso.`);
    }
    if (failedCount > 0) {
      toast.warning(`${failedCount} produto(s) nao puderam ser importados.`);
      setStep("preview");
      return;
    }

    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Produtos
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Envie um arquivo CSV ou Excel (.xlsx) com os produtos."}
            {step === "preview" && "Revise os dados antes de confirmar a importacao."}
            {step === "importing" && "Importando produtos..."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-muted/30"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("import-file-input")?.click()}
            >
              <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="mt-1 text-sm text-muted-foreground">Formatos aceitos: .csv, .xlsx, .xls</p>
            </div>

            <div className="flex items-center justify-center">
              <Button variant="link" size="sm" onClick={downloadPlanilhaPadrao} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar planilha padrao
              </Button>
            </div>

            <input
              id="import-file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {step === "preview" && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">Arquivo: {fileName}</Badge>
              <Badge variant="outline">Total: {rows.length}</Badge>
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Validos: {validRows.length}
              </Badge>
              {duplicateRows.length > 0 && (
                <Badge variant="secondary" className="gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> Duplicados: {duplicateRows.length}
                </Badge>
              )}
              {errorRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" /> Erros: {errorRows.length}
                </Badge>
              )}
            </div>

            <ScrollArea className="max-h-[400px] flex-1 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Codigo de Barras</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={`${row.descricao}-${index}`}>
                      <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="max-w-[220px] truncate font-medium">{row.descricao || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.sku || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.codigo_barras || "-"}</TableCell>
                      <TableCell className="text-sm">{row.categoria || "-"}</TableCell>
                      <TableCell>
                        {row.status === "ok" && <Badge variant="default">OK</Badge>}
                        {row.status === "duplicado" && <Badge variant="secondary">Duplicado</Badge>}
                        {row.status === "erro" && <Badge variant="destructive">Erro</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetState}>
                Voltar
              </Button>
              <Button onClick={() => void handleImport()} disabled={!validRows.length}>
                Importar {validRows.length} produto(s)
              </Button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando produtos...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
