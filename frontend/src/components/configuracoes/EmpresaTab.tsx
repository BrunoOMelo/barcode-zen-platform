import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export function EmpresaTab() {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState({
    nome: "", cnpj: "", logradouro: "", numero: "", complemento: "",
    cep: "", bairro: "", cidade: "", estado: "",
    responsavel_nome: "", responsavel_apelido: "", responsavel_cpf: "",
    responsavel_email: "", responsavel_celular: "",
  });

  useEffect(() => {
    if (profile?.empresa_id) {
      supabase.from("empresas").select("*").eq("id", profile.empresa_id).single()
        .then(({ data }) => {
          if (data) setEmpresa({
            nome: data.nome || "", cnpj: data.cnpj || "",
            logradouro: data.logradouro || "", numero: data.numero || "",
            complemento: data.complemento || "", cep: data.cep || "",
            bairro: data.bairro || "", cidade: data.cidade || "",
            estado: data.estado || "",
            responsavel_nome: data.responsavel_nome || "",
            responsavel_apelido: data.responsavel_apelido || "",
            responsavel_cpf: data.responsavel_cpf || "",
            responsavel_email: data.responsavel_email || "",
            responsavel_celular: data.responsavel_celular || "",
          });
        });
    }
  }, [profile?.empresa_id]);

  const update = (field: string, value: string) =>
    setEmpresa((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    if (!profile?.empresa_id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("empresas").update(empresa).eq("id", profile.empresa_id);
      if (error) throw error;
      toast.success("Empresa atualizada!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da Empresa</CardTitle>
        <CardDescription>Atualize as informações da sua empresa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Razão Social</Label>
            <Input value={empresa.nome} onChange={(e) => update("nome", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <MaskedInput mask="cnpj" value={empresa.cnpj} onValueChange={(v) => update("cnpj", v)} />
          </div>
          <div className="space-y-2">
            <Label>CEP</Label>
            <MaskedInput mask="cep" value={empresa.cep} onValueChange={(v) => update("cep", v)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Logradouro</Label>
            <Input value={empresa.logradouro} onChange={(e) => update("logradouro", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nº</Label>
            <Input value={empresa.numero} onChange={(e) => update("numero", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Complemento</Label>
            <Input value={empresa.complemento} onChange={(e) => update("complemento", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input value={empresa.bairro} onChange={(e) => update("bairro", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={empresa.cidade} onChange={(e) => update("cidade", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Input value={empresa.estado} onChange={(e) => update("estado", e.target.value)} maxLength={2} />
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Responsável</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={empresa.responsavel_nome} onChange={(e) => update("responsavel_nome", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Apelido</Label>
              <Input value={empresa.responsavel_apelido} onChange={(e) => update("responsavel_apelido", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <MaskedInput mask="cpf" value={empresa.responsavel_cpf} onValueChange={(v) => update("responsavel_cpf", v)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={empresa.responsavel_email} onChange={(e) => update("responsavel_email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Celular</Label>
              <MaskedInput mask="celular" value={empresa.responsavel_celular} onValueChange={(v) => update("responsavel_celular", v)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Empresa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
