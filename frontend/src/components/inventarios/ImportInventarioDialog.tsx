import { useCallback, useState } from "react";
import * as XLSX from "xlsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  type InventarioImportacaoRowInput,
  useCreateInventarioFromSpreadsheet,
} from "@/hooks/useInventarios";
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
  source_row: number;
  descricao: string;
  sku: string;
  codigo_barras: string;
  categoria: string;
  custo: string;
  saldo_inicial: string;
}

interface ValidatedRow extends ParsedRow {
  status: "ok" | "erro";
  errors: string[];
}

type Step = "upload" | "preview" | "importing";

const COLUMN_MAP: Record<string, keyof Omit<ParsedRow, "source_row">> = {
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
  custo: "custo",
  cost: "custo",
  "saldo inicial": "saldo_inicial",
  saldo_inicial: "saldo_inicial",
};

function normalizeHeader(header: string): keyof Omit<ParsedRow, "source_row"> | null {
  const normalized = header.trim().toLowerCase();
  return COLUMN_MAP[normalized] ?? null;
}

function toInventoryImportRow(row: ValidatedRow): InventarioImportacaoRowInput {
  const cost = row.custo.trim() ? Number(row.custo.replace(",", ".")) : undefined;
  const initialQuantity = row.saldo_inicial.trim() ? Number(row.saldo_inicial.replace(",", ".")) : undefined;
  return {
    descricao: row.descricao,
    sku: row.sku || undefined,
    codigo_barras: row.codigo_barras || undefined,
    categoria: row.categoria || undefined,
    custo: Number.isFinite(cost) ? cost : undefined,
    saldo_inicial: Number.isFinite(initialQuantity) ? Math.max(0, Number(initialQuantity)) : undefined,
    source_row: row.source_row,
  };
}

interface ImportInventarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialInventoryName?: string;
  onImported?: (inventoryId: string) => void;
}

export function ImportInventarioDialog({
  open,
  onOpenChange,
  initialInventoryName,
  onImported,
}: ImportInventarioDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [inventoryName, setInventoryName] = useState(initialInventoryName ?? "");
  const importMutation = useCreateInventarioFromSpreadsheet();

  const resetState = useCallback(() => {
    setStep("upload");
    setRows([]);
    setFileName("");
    setInventoryName(initialInventoryName ?? "");
  }, [initialInventoryName]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    let jsonData: Record<string, unknown>[] = [];
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        toast.error("Arquivo sem planilha valida. Use CSV, XLSX ou XLS.");
        return;
      }
      const sheet = workbook.Sheets[firstSheetName];
      jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    } catch {
      toast.error("Nao foi possivel ler o arquivo. Use CSV, XLSX ou XLS valido.");
      return;
    }

    if (!jsonData.length) {
      toast.error("Arquivo vazio ou sem linhas para importacao.");
      return;
    }

    const headers = Object.keys(jsonData[0]);
    const mapping: Record<string, keyof Omit<ParsedRow, "source_row">> = {};
    for (const header of headers) {
      const mapped = normalizeHeader(header);
      if (mapped) {
        mapping[header] = mapped;
      }
    }

    if (!Object.values(mapping).includes("descricao")) {
      toast.error("Coluna obrigatoria 'descricao' nao encontrada. Baixe a planilha padrao.");
      return;
    }

    const parsedRows: ParsedRow[] = jsonData.map((row, index) => {
      const parsed: ParsedRow = {
        source_row: index + 2,
        descricao: "",
        sku: "",
        codigo_barras: "",
        categoria: "",
        custo: "",
        saldo_inicial: "",
      };
      for (const [originalKey, mappedKey] of Object.entries(mapping)) {
        parsed[mappedKey] = String(row[originalKey] ?? "").trim();
      }
      return parsed;
    });

    const seenSkus = new Map<string, number>();
    const seenBarcodes = new Map<string, number>();

    const validatedRows = parsedRows.map((row) => {
      const errors: string[] = [];

      if (!row.descricao.trim()) {
        errors.push("Descricao obrigatoria.");
      }

      if (!row.sku && !row.codigo_barras) {
        errors.push("Informe SKU ou codigo de barras.");
      }

      if (row.saldo_inicial.trim()) {
        const normalizedBalance = Number(row.saldo_inicial.replace(",", "."));
        if (!Number.isFinite(normalizedBalance) || normalizedBalance < 0) {
          errors.push("Saldo inicial invalido.");
        }
      }

      if (row.custo.trim()) {
        const normalizedCost = Number(row.custo.replace(",", "."));
        if (!Number.isFinite(normalizedCost) || normalizedCost < 0) {
          errors.push("Custo invalido.");
        }
      }

      if (row.sku) {
        const normalizedSku = row.sku.toUpperCase();
        if (seenSkus.has(normalizedSku)) {
          const firstLine = seenSkus.get(normalizedSku) ?? row.source_row;
          errors.push(`SKU duplicado na linha ${firstLine}.`);
        } else {
          seenSkus.set(normalizedSku, row.source_row);
        }
      }

      if (row.codigo_barras) {
        const normalizedBarcode = row.codigo_barras.toUpperCase();
        if (seenBarcodes.has(normalizedBarcode)) {
          const firstLine = seenBarcodes.get(normalizedBarcode) ?? row.source_row;
          errors.push(`Codigo de barras duplicado na linha ${firstLine}.`);
        } else {
          seenBarcodes.set(normalizedBarcode, row.source_row);
        }
      }

      return {
        ...row,
        status: errors.length ? "erro" : "ok",
        errors,
      } satisfies ValidatedRow;
    });

    setRows(validatedRows);
    setStep("preview");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const validRows = rows.filter((row) => row.status === "ok");
  const errorRows = rows.filter((row) => row.status === "erro");

  const handleImport = async () => {
    if (!inventoryName.trim()) {
      toast.error("Digite um nome para o inventario.");
      return;
    }

    if (!validRows.length) {
      toast.error("Nenhuma linha valida para importar.");
      return;
    }

    setStep("importing");

    const result = await importMutation.mutateAsync({
      nome: inventoryName,
      rows: validRows.map(toInventoryImportRow),
    });

    if (result.errors.length > 0) {
      const errorsByRow = new Map<number, string[]>();
      for (const rowError of result.errors) {
        if (!rowError.source_row) {
          continue;
        }
        const current = errorsByRow.get(rowError.source_row) ?? [];
        current.push(rowError.message);
        errorsByRow.set(rowError.source_row, current);
      }

      setRows((previousRows) =>
        previousRows.map((row) => {
          const backendErrors = errorsByRow.get(row.source_row);
          if (!backendErrors || backendErrors.length === 0) {
            return row;
          }
          return {
            ...row,
            status: "erro",
            errors: Array.from(new Set([...row.errors, ...backendErrors])),
          };
        }),
      );
      setStep("preview");
      return;
    }

    onImported?.(result.inventario.id);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Inventario por Planilha
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Use a planilha padrao com descricao, SKU/codigo e saldo inicial."}
            {step === "preview" && "Revise as linhas antes de criar o inventario em lote."}
            {step === "importing" && "Processando importacao em lote..."}
          </DialogDescription>
        </DialogHeader>

        {(step === "upload" || step === "preview") && (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="inventory-import-name">
              Nome do inventario
            </label>
            <Input
              id="inventory-import-name"
              placeholder="Ex: Inventario Abril 2026"
              value={inventoryName}
              onChange={(event) => setInventoryName(event.target.value)}
            />
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary hover:bg-muted/30"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("inventory-import-file-input")?.click()}
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
              id="inventory-import-file-input"
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
                <CheckCircle2 className="h-3 w-3" />
                Validos: {validRows.length}
              </Badge>
              {errorRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" />
                  Erros: {errorRows.length}
                </Badge>
              )}
            </div>

            {errorRows.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Corrija as linhas com erro. Apenas linhas validas serao enviadas para importacao.
              </p>
            )}

            <ScrollArea className="max-h-[420px] flex-1 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[56px]">Linha</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Codigo de barras</TableHead>
                    <TableHead className="w-[100px]">Saldo</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.source_row}-${row.descricao}-${row.sku}-${row.codigo_barras}`}>
                      <TableCell className="text-xs text-muted-foreground">{row.source_row}</TableCell>
                      <TableCell className="max-w-[220px] truncate font-medium">{row.descricao || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.sku || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.codigo_barras || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.saldo_inicial || "0"}</TableCell>
                      <TableCell>
                        {row.status === "ok" ? (
                          <Badge variant="default">OK</Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Erro
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px] text-xs text-muted-foreground">
                        {row.errors.length > 0 ? row.errors.join(" | ") : "Pronto para importar"}
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
              <Button onClick={() => void handleImport()} disabled={importMutation.isPending || !validRows.length}>
                Criar inventario com {validRows.length} item(ns)
              </Button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processando importacao do inventario...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
