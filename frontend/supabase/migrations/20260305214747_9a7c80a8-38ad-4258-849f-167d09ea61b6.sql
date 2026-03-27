
-- Extend empresas table with address and responsible person fields
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_apelido text,
  ADD COLUMN IF NOT EXISTS responsavel_cpf text,
  ADD COLUMN IF NOT EXISTS responsavel_email text;

-- Extend profiles with additional personal fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS apelido text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS celular text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text;

-- Create user_empresas junction table for multi-company support
CREATE TABLE IF NOT EXISTS public.user_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, empresa_id)
);

ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;

-- Users can view their own company associations
CREATE POLICY "Users can view own empresa links"
  ON public.user_empresas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage empresa links in their company
CREATE POLICY "Admins can manage empresa links"
  ON public.user_empresas FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND empresa_id = get_user_empresa_id(auth.uid())
  );

-- Allow authenticated users to insert their own links (for onboarding)
CREATE POLICY "Users can link themselves to empresa"
  ON public.user_empresas FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
