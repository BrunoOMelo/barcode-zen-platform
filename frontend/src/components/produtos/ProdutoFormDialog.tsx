import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateProduto, useUpdateProduto, type Produto } from "@/hooks/useProdutos";

interface ProdutoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: Produto | null;
}

interface FormValues {
  descricao: string;
  sku: string;
  codigo_barras: string;
  categoria: string;
  custo: string;
  quantidade: string;
  ativo: boolean;
}

export function ProdutoFormDialog({ open, onOpenChange, produto }: ProdutoFormDialogProps) {
  const createProduto = useCreateProduto();
  const updateProduto = useUpdateProduto();
  const isEditing = Boolean(produto);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      descricao: produto?.descricao ?? "",
      sku: produto?.sku ?? "",
      codigo_barras: produto?.codigo_barras ?? "",
      categoria: produto?.categoria ?? "",
      custo: produto?.custo !== null && produto?.custo !== undefined ? String(produto.custo) : "",
      quantidade: String(produto?.quantidade ?? 0),
      ativo: produto?.ativo ?? true,
    },
  });

  const ativo = watch("ativo");

  const onSubmit = async (values: FormValues) => {
    const parsedCost = values.custo.trim() ? Number(values.custo) : null;
    const parsedQuantity = values.quantidade.trim() ? Number(values.quantidade) : 0;

    const payload = {
      descricao: values.descricao.trim(),
      sku: values.sku.trim() || null,
      codigo_barras: values.codigo_barras.trim() || null,
      categoria: values.categoria.trim() || null,
      custo: parsedCost,
      quantidade: Number.isFinite(parsedQuantity) ? Math.max(0, parsedQuantity) : 0,
      ativo: values.ativo,
    };

    if (isEditing && produto) {
      await updateProduto.mutateAsync({ id: produto.id, ...payload });
    } else {
      await createProduto.mutateAsync(payload);
    }

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descricao *</Label>
            <Input
              id="descricao"
              placeholder="Nome do produto"
              {...register("descricao", { required: "Descricao e obrigatoria" })}
            />
            {errors.descricao ? <p className="text-xs text-destructive">{errors.descricao.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" placeholder="SKU001" {...register("sku")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo_barras">Codigo EAN</Label>
              <Input id="codigo_barras" placeholder="7891234567890" {...register("codigo_barras")} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Informe pelo menos SKU ou Codigo EAN.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input id="categoria" placeholder="Ex: Alimentos" {...register("categoria")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo">Custo (R$)</Label>
              <Input id="custo" type="number" step="0.01" min={0} placeholder="0.00" {...register("custo")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade inicial</Label>
            <Input id="quantidade" type="number" min={0} step="1" placeholder="0" {...register("quantidade")} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ativo">Produto ativo</Label>
            <Switch id="ativo" checked={ativo} onCheckedChange={(checked) => setValue("ativo", checked)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProduto.isPending || updateProduto.isPending}>
              {createProduto.isPending || updateProduto.isPending
                ? "Salvando..."
                : isEditing
                  ? "Atualizar"
                  : "Criar Produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
