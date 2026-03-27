import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaskedInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AvatarUpload } from "@/components/AvatarUpload";

export function MeuPerfilTab() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [perfil, setPerfil] = useState({
    nome: "", apelido: "", cpf: "", rg: "", celular: "", email: "",
    logradouro: "", numero: "", complemento: "", cep: "", bairro: "", cidade: "", estado: "",
  });

  useEffect(() => {
    if (profile) {
      setPerfil({
        nome: profile.nome || "", email: profile.email || "",
        apelido: profile.apelido || "", cpf: profile.cpf || "",
        rg: profile.rg || "", celular: profile.celular || "",
        logradouro: profile.logradouro || "", numero: profile.numero || "",
        complemento: profile.complemento || "", cep: profile.cep || "",
        bairro: profile.bairro || "", cidade: profile.cidade || "",
        estado: profile.estado || "",
      });
    }
  }, [profile]);

  const update = (field: string, value: string) =>
    setPerfil((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").update(perfil).eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu Perfil</CardTitle>
        <CardDescription>Atualize seus dados pessoais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user && (
          <AvatarUpload
            userId={user.id}
            currentUrl={profile?.foto_perfil_url}
            nome={profile?.nome}
            onUploaded={() => queryClient.invalidateQueries({ queryKey: ["profile"] })}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={perfil.nome} onChange={(e) => update("nome", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Apelido</Label>
            <Input value={perfil.apelido} onChange={(e) => update("apelido", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={perfil.email} disabled className="opacity-60" />
          </div>
          <div className="space-y-2">
            <Label>Celular</Label>
            <MaskedInput mask="celular" value={perfil.celular} onValueChange={(v) => update("celular", v)} />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <MaskedInput mask="cpf" value={perfil.cpf} onValueChange={(v) => update("cpf", v)} />
          </div>
          <div className="space-y-2">
            <Label>RG</Label>
            <Input value={perfil.rg} onChange={(e) => update("rg", e.target.value)} />
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Endereço</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Logradouro</Label>
              <Input value={perfil.logradouro} onChange={(e) => update("logradouro", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nº</Label>
              <Input value={perfil.numero} onChange={(e) => update("numero", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input value={perfil.complemento} onChange={(e) => update("complemento", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <MaskedInput mask="cep" value={perfil.cep} onValueChange={(v) => update("cep", v)} />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={perfil.bairro} onChange={(e) => update("bairro", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={perfil.cidade} onChange={(e) => update("cidade", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={perfil.estado} onChange={(e) => update("estado", e.target.value)} maxLength={2} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Perfil
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
