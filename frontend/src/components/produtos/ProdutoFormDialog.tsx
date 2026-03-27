import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
  marca: string;
  data_validade: string;
  lote: string;
  custo: string;
  ativo: boolean;
}

export function ProdutoFormDialog({ open, onOpenChange, produto }: ProdutoFormDialogProps) {
  const createProduto = useCreateProduto();
  const updateProduto = useUpdateProduto();
  const isEditing = !!produto;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      descricao: produto?.descricao ?? "",
      sku: produto?.sku ?? "",
      codigo_barras: produto?.codigo_barras ?? "",
      categoria: produto?.categoria ?? "",
      marca: (produto as any)?.marca ?? "",
      data_validade: (produto as any)?.data_validade ?? "",
      lote: (produto as any)?.lote ?? "",
      custo: (produto as any)?.custo?.toString() ?? "",
      ativo: produto?.ativo ?? true,
    },
  });

  const ativo = watch("ativo");

  const onSubmit = async (values: FormValues) => {
    try {
      const payload: any = {
        descricao: values.descricao,
        sku: values.sku || null,
        codigo_barras: values.codigo_barras || null,
        categoria: values.categoria || null,
        marca: values.marca || null,
        data_validade: values.data_validade || null,
        lote: values.lote || null,
        custo: values.custo ? Number(values.custo) : null,
        ativo: values.ativo,
      };
      if (isEditing && produto) {
        await updateProduto.mutateAsync({ id: produto.id, ...payload });
      } else {
        await createProduto.mutateAsync(payload);
      }
      reset();
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input
              id="descricao"
              placeholder="Nome do produto"
              {...register("descricao", { required: "Descrição é obrigatória" })}
            />
            {errors.descricao && (
              <p className="text-xs text-destructive">{errors.descricao.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" placeholder="SKU001" {...register("sku")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo_barras">Código EAN</Label>
              <Input id="codigo_barras" placeholder="7891234567890" {...register("codigo_barras")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" placeholder="Ex: Nestlé" {...register("marca")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input id="categoria" placeholder="Ex: Alimentos" {...register("categoria")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lote">Lote</Label>
              <Input id="lote" placeholder="LOTE001" {...register("lote")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo">Custo (R$)</Label>
              <Input id="custo" type="number" step="0.01" placeholder="0.00" {...register("custo")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_validade">Data de Validade</Label>
            <Input id="data_validade" type="date" {...register("data_validade")} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ativo">Produto ativo</Label>
            <Switch
              id="ativo"
              checked={ativo}
              onCheckedChange={(checked) => setValue("ativo", checked)}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProduto.isPending || updateProduto.isPending}>
              {createProduto.isPending || updateProduto.isPending
                ? "Salvando..."
                : isEditing ? "Atualizar" : "Criar Produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
