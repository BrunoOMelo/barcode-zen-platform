
-- Table for access profiles
CREATE TABLE public.perfis_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table for module permissions within a profile
CREATE TABLE public.perfil_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id uuid NOT NULL REFERENCES public.perfis_acesso(id) ON DELETE CASCADE,
  modulo text NOT NULL, -- inventarios, produtos, configuracoes, relatorios
  pode_ler boolean NOT NULL DEFAULT false,
  pode_alterar boolean NOT NULL DEFAULT false,
  pode_excluir boolean NOT NULL DEFAULT false,
  pode_compartilhar boolean NOT NULL DEFAULT false,
  UNIQUE(perfil_id, modulo)
);

-- Add perfil_acesso_id to profiles
ALTER TABLE public.profiles ADD COLUMN perfil_acesso_id uuid REFERENCES public.perfis_acesso(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_permissoes ENABLE ROW LEVEL SECURITY;

-- RLS for perfis_acesso
CREATE POLICY "Users can view perfis of their empresa"
  ON public.perfis_acesso FOR SELECT
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Admins can insert perfis"
  ON public.perfis_acesso FOR INSERT
  WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update perfis"
  ON public.perfis_acesso FOR UPDATE
  USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete perfis"
  ON public.perfis_acesso FOR DELETE
  USING (empresa_id = get_user_empresa_id(auth.uid()) AND has_role(auth.uid(), 'admin'));

-- RLS for perfil_permissoes (via perfil's empresa)
CREATE OR REPLACE FUNCTION public.perfil_belongs_to_user_empresa(_perfil_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis_acesso
    WHERE id = _perfil_id
      AND empresa_id = get_user_empresa_id(_user_id)
  )
$$;

CREATE POLICY "Users can view permissoes of their empresa perfis"
  ON public.perfil_permissoes FOR SELECT
  USING (perfil_belongs_to_user_empresa(perfil_id, auth.uid()));

CREATE POLICY "Admins can insert permissoes"
  ON public.perfil_permissoes FOR INSERT
  WITH CHECK (perfil_belongs_to_user_empresa(perfil_id, auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update permissoes"
  ON public.perfil_permissoes FOR UPDATE
  USING (perfil_belongs_to_user_empresa(perfil_id, auth.uid()) AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete permissoes"
  ON public.perfil_permissoes FOR DELETE
  USING (perfil_belongs_to_user_empresa(perfil_id, auth.uid()) AND has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_perfis_acesso_updated_at
  BEFORE UPDATE ON public.perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
