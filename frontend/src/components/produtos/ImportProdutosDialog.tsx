import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { downloadPlanilhaPadrao } from "@/lib/template";

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
  "descrição": "descricao",
  "descriçao": "descricao",
  "descricao do produto": "descricao",
  "descrição do produto": "descricao",
  nome: "descricao",
  produto: "descricao",
  sku: "sku",
  "código de barras": "codigo_barras",
  "codigo de barras": "codigo_barras",
  "codigo ean": "codigo_barras",
  "código ean": "codigo_barras",
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
  "preço": "custo",
  preco: "custo",
};

function normalizeHeader(header: string): keyof ParsedRow | null {
  const normalized = header.trim().toLowerCase();
  return COLUMN_MAP[normalized] ?? null;
}

interface ImportProdutosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProdutosDialog({ open, onOpenChange }: ImportProdutosDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const resetState = useCallback(() => {
    setStep("upload");
    setRows([]);
    setFileName("");
  }, []);

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (!jsonData.length) {
      toast.error("Arquivo vazio ou sem dados válidos");
      return;
    }

    const headers = Object.keys(jsonData[0]);
    const mapping: Record<string, keyof ParsedRow> = {};
    for (const h of headers) {
      const mapped = normalizeHeader(h);
      if (mapped) mapping[h] = mapped;
    }

    if (!Object.values(mapping).includes("descricao")) {
      toast.error("Coluna 'Descrição' não encontrada. Verifique o cabeçalho do arquivo.");
      return;
    }

    const parsed: ParsedRow[] = jsonData.map((row) => {
      const result: ParsedRow = { descricao: "", sku: "", codigo_barras: "", categoria: "", marca: "", data_validade: "", lote: "", custo: "" };
      for (const [orig, mapped] of Object.entries(mapping)) {
        result[mapped] = String(row[orig] ?? "").trim();
      }
      return result;
    });

    if (!profile?.empresa_id) return;
    const { data: existing } = await supabase
      .from("produtos")
      .select("sku, codigo_barras")
      .eq("empresa_id", profile.empresa_id);

    const existingSkus = new Set((existing ?? []).map((p) => p.sku?.toLowerCase()).filter(Boolean));
    const existingEans = new Set((existing ?? []).map((p) => p.codigo_barras?.toLowerCase()).filter(Boolean));

    const fileSkus = new Map<string, number>();
    const fileEans = new Map<string, number>();

    const validated: ValidatedRow[] = parsed.map((row, idx) => {
      const errors: string[] = [];
      let status: ValidatedRow["status"] = "ok";

      if (!row.descricao) {
        errors.push("Descrição obrigatória");
        status = "erro";
      }

      if (row.sku) {
        const skuLow = row.sku.toLowerCase();
        if (existingSkus.has(skuLow)) {
          errors.push("SKU já existe no sistema");
          status = "duplicado";
        } else if (fileSkus.has(skuLow)) {
          errors.push(`SKU duplicado na linha ${(fileSkus.get(skuLow) ?? 0) + 2}`);
          status = "duplicado";
        }
        fileSkus.set(skuLow, idx);
      }

      if (row.codigo_barras) {
        const eanLow = row.codigo_barras.toLowerCase();
        if (existingEans.has(eanLow)) {
          errors.push("Cód. barras já existe no sistema");
          status = status === "ok" ? "duplicado" : status;
        } else if (fileEans.has(eanLow)) {
          errors.push(`Cód. barras duplicado na linha ${(fileEans.get(eanLow) ?? 0) + 2}`);
          status = status === "ok" ? "duplicado" : status;
        }
        fileEans.set(eanLow, idx);
      }

      return { ...row, status, errors };
    });

    setRows(validated);
    setStep("preview");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const validRows = rows.filter((r) => r.status === "ok");
  const errorRows = rows.filter((r) => r.status === "erro");
  const dupRows = rows.filter((r) => r.status === "duplicado");

  const handleImport = async () => {
    if (!profile?.empresa_id || !validRows.length) return;
    setStep("importing");

    const toInsert = validRows.map((r) => ({
      descricao: r.descricao,
      sku: r.sku || null,
      codigo_barras: r.codigo_barras || null,
      categoria: r.categoria || null,
      marca: r.marca || null,
      data_validade: r.data_validade || null,
      lote: r.lote || null,
      custo: r.custo ? Number(r.custo) : null,
      empresa_id: profile.empresa_id,
    }));

    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const { error } = await supabase.from("produtos").insert(batch);
      if (error) {
        toast.error(`Erro ao importar lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        setStep("preview");
        return;
      }
      inserted += batch.length;
    }

    queryClient.invalidateQueries({ queryKey: ["produtos"] });
    toast.success(`${inserted} produto${inserted !== 1 ? "s" : ""} importado${inserted !== 1 ? "s" : ""} com sucesso!`);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Produtos
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Envie um arquivo CSV ou Excel (.xlsx) com os produtos."
              : step === "preview"
                ? "Revise os dados antes de confirmar a importação."
                : "Importando produtos..."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary hover:bg-muted/30"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("import-file-input")?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-sm text-muted-foreground mt-1">Formatos aceitos: .csv, .xlsx, .xls</p>
            </div>
            <div className="flex items-center justify-center">
              <Button variant="link" size="sm" onClick={downloadPlanilhaPadrao} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar planilha padrão
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
              <Badge variant="outline" className="gap-1">Total: {rows.length}</Badge>
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Válidos: {validRows.length}
              </Badge>
              {dupRows.length > 0 && (
                <Badge variant="secondary" className="gap-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> Duplicados: {dupRows.length}
                </Badge>
              )}
              {errorRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" /> Erros: {errorRows.length}
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>EAN</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow
                      key={i}
                      className={
                        row.status === "erro" ? "bg-destructive/5"
                          : row.status === "duplicado" ? "bg-amber-50 dark:bg-amber-950/20" : ""
                      }
                    >
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{row.descricao || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.sku || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.codigo_barras || "—"}</TableCell>
                      <TableCell className="text-sm">{row.marca || "—"}</TableCell>
                      <TableCell className="text-sm">{row.categoria || "—"}</TableCell>
                      <TableCell>
                        {row.status === "ok" ? (
                          <Badge variant="default" className="text-xs">OK</Badge>
                        ) : row.status === "duplicado" ? (
                          <Badge variant="secondary" className="text-xs text-amber-600" title={row.errors.join("; ")}>Duplicado</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs" title={row.errors.join("; ")}>Erro</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {(dupRows.length > 0 || errorRows.length > 0) && (
              <p className="text-xs text-muted-foreground">
                ⚠ Linhas com erro ou duplicados serão ignoradas na importação.
              </p>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={resetState}>Voltar</Button>
              <Button onClick={handleImport} disabled={!validRows.length}>
                Importar {validRows.length} produto{validRows.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando produtos...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
