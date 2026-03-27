import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Building2, User, MapPin } from "lucide-react";
import ninjaLogo from "@/assets/ninja-logo.jpg";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Step = 1 | 2 | 3;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Empresa fields
  const [empresa, setEmpresa] = useState({
    nome: "",
    cnpj: "",
    logradouro: "",
    numero: "",
    complemento: "",
    cep: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

  // Responsável fields
  const [responsavel, setResponsavel] = useState({
    nome: "",
    apelido: "",
    cpf: "",
    email: "",
    celular: "",
  });

  // User Master fields
  const [master, setMaster] = useState({
    apelido: "",
    cpf: "",
    rg: "",
    celular: "",
    logradouro: "",
    numero: "",
    complemento: "",
    cep: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

  const updateEmpresa = (field: string, value: string) =>
    setEmpresa((prev) => ({ ...prev, [field]: value }));

  const updateResponsavel = (field: string, value: string) =>
    setResponsavel((prev) => ({ ...prev, [field]: value }));

  const updateMaster = (field: string, value: string) =>
    setMaster((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Create empresa
      const { data: empresaData, error: empError } = await supabase
        .from("empresas")
        .insert({
          nome: empresa.nome,
          cnpj: empresa.cnpj || null,
          logradouro: empresa.logradouro || null,
          numero: empresa.numero || null,
          complemento: empresa.complemento || null,
          cep: empresa.cep || null,
          bairro: empresa.bairro || null,
          cidade: empresa.cidade || null,
          estado: empresa.estado || null,
          responsavel_nome: responsavel.nome || null,
          responsavel_apelido: responsavel.apelido || null,
          responsavel_cpf: responsavel.cpf || null,
          responsavel_email: responsavel.email || null,
          responsavel_celular: responsavel.celular || null,
        })
        .select()
        .single();
      if (empError) throw empError;

      // 2. Update profile with empresa_id and master info
      const { error: profError } = await supabase
        .from("profiles")
        .update({
          empresa_id: empresaData.id,
          apelido: master.apelido || null,
          cpf: master.cpf || null,
          rg: master.rg || null,
          celular: master.celular || null,
          logradouro: master.logradouro || null,
          numero: master.numero || null,
          complemento: master.complemento || null,
          cep: master.cep || null,
          bairro: master.bairro || null,
          cidade: master.cidade || null,
          estado: master.estado || null,
        })
        .eq("user_id", user.id);
      if (profError) throw profError;

      // 3. Link user to empresa (multi-company support)
      await supabase.from("user_empresas").insert({
        user_id: user.id,
        empresa_id: empresaData.id,
      });

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Empresa configurada com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error(`Erro ao configurar empresa: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Empresa", "Responsável", "Usuário Master"];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <img src={ninjaLogo} alt="Ninja Stock" className="mx-auto mb-4 h-20 w-20 rounded-xl object-contain" />
          <h1 className="text-2xl font-bold text-foreground">Ninja Stock</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure sua empresa para começar</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  s <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`h-0.5 w-8 ${s < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">{stepLabels[step - 1]}</p>

        {/* Step 1: Empresa */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
              <CardDescription>Informe os dados da empresa que será cadastrada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Razão Social *</Label>
                  <Input
                    placeholder="Nome da empresa"
                    value={empresa.nome}
                    onChange={(e) => updateEmpresa("nome", e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <MaskedInput
                    mask="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={empresa.cnpj}
                    onValueChange={(v) => updateEmpresa("cnpj", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <MaskedInput
                    mask="cep"
                    placeholder="00000-000"
                    value={empresa.cep}
                    onValueChange={(v) => updateEmpresa("cep", v)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Logradouro</Label>
                  <Input
                    placeholder="Rua, Avenida..."
                    value={empresa.logradouro}
                    onChange={(e) => updateEmpresa("logradouro", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nº</Label>
                  <Input
                    placeholder="123"
                    value={empresa.numero}
                    onChange={(e) => updateEmpresa("numero", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    placeholder="Sala, Bloco..."
                    value={empresa.complemento}
                    onChange={(e) => updateEmpresa("complemento", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    placeholder="Bairro"
                    value={empresa.bairro}
                    onChange={(e) => updateEmpresa("bairro", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    placeholder="Cidade"
                    value={empresa.cidade}
                    onChange={(e) => updateEmpresa("cidade", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    placeholder="SP"
                    value={empresa.estado}
                    onChange={(e) => updateEmpresa("estado", e.target.value)}
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!empresa.nome.trim()}>
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Responsável */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Responsável pela Empresa
              </CardTitle>
              <CardDescription>
                Este contato receberá o relatório final de cada inventário concluído
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Nome completo"
                    value={responsavel.nome}
                    onChange={(e) => updateResponsavel("nome", e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apelido</Label>
                  <Input
                    placeholder="Como prefere ser chamado"
                    value={responsavel.apelido}
                    onChange={(e) => updateResponsavel("apelido", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <MaskedInput
                    mask="cpf"
                    placeholder="000.000.000-00"
                    value={responsavel.cpf}
                    onValueChange={(v) => updateResponsavel("cpf", v)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    placeholder="responsavel@empresa.com"
                    value={responsavel.email}
                    onChange={(e) => updateResponsavel("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Celular</Label>
                  <MaskedInput
                    mask="celular"
                    placeholder="(00) 00000-0000"
                    value={responsavel.celular}
                    onValueChange={(v) => updateResponsavel("celular", v)}
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!responsavel.nome.trim() || !responsavel.email.trim()}
                >
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Usuário Master */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Usuário Master
              </CardTitle>
              <CardDescription>
                Dados complementares do administrador principal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Apelido</Label>
                  <Input
                    placeholder="Como prefere ser chamado"
                    value={master.apelido}
                    onChange={(e) => updateMaster("apelido", e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <MaskedInput
                    mask="cpf"
                    placeholder="000.000.000-00"
                    value={master.cpf}
                    onValueChange={(v) => updateMaster("cpf", v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input
                    placeholder="00.000.000-0"
                    value={master.rg}
                    onChange={(e) => updateMaster("rg", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Celular</Label>
                  <MaskedInput
                    mask="celular"
                    placeholder="(00) 00000-0000"
                    value={master.celular}
                    onValueChange={(v) => updateMaster("celular", v)}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">Endereço</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Logradouro</Label>
                    <Input
                      placeholder="Rua, Avenida..."
                      value={master.logradouro}
                      onChange={(e) => updateMaster("logradouro", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nº</Label>
                    <Input
                      placeholder="123"
                      value={master.numero}
                      onChange={(e) => updateMaster("numero", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Complemento</Label>
                    <Input
                      placeholder="Apto, Sala..."
                      value={master.complemento}
                      onChange={(e) => updateMaster("complemento", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <MaskedInput
                      mask="cep"
                      placeholder="00000-000"
                      value={master.cep}
                      onValueChange={(v) => updateMaster("cep", v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input
                      placeholder="Bairro"
                      value={master.bairro}
                      onChange={(e) => updateMaster("bairro", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      placeholder="Cidade"
                      value={master.cidade}
                      onChange={(e) => updateMaster("cidade", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      placeholder="SP"
                      value={master.estado}
                      onChange={(e) => updateMaster("estado", e.target.value)}
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Configurando..." : "Finalizar Cadastro"}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
