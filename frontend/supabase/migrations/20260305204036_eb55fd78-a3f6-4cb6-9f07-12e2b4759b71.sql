
-- =============================================
-- TRI SisInventario — Fase 2: Schema completo
-- =============================================

-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'operador');

-- 2. Enum de status de inventário
CREATE TYPE public.inventory_status AS ENUM ('criado', 'em_contagem', 'em_recontagem', 'em_analise', 'finalizado');

-- 3. Enum de tipo de contagem
CREATE TYPE public.count_type AS ENUM ('primeira', 'recontagem');

-- 4. Função update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- TABELA: empresas
-- =============================================
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABELA: profiles
-- =============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABELA: user_roles (separada conforme boas práticas)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'operador',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNÇÃO: has_role (SECURITY DEFINER — evita recursão RLS)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- FUNÇÃO: get_user_empresa_id (SECURITY DEFINER)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- =============================================
-- TABELA: produtos
-- =============================================
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sku TEXT,
  codigo_barras TEXT,
  descricao TEXT NOT NULL,
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_produtos_empresa ON public.produtos(empresa_id);
CREATE INDEX idx_produtos_sku ON public.produtos(empresa_id, sku);
CREATE INDEX idx_produtos_codigo_barras ON public.produtos(empresa_id, codigo_barras);
CREATE INDEX idx_produtos_descricao ON public.produtos USING gin(to_tsvector('portuguese', descricao));

CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER: auto-criar profile no signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.email, '')
  );
  -- Primeiro usuário recebe role admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES: empresas
-- =============================================
CREATE POLICY "Users can view their own empresa"
  ON public.empresas FOR SELECT TO authenticated
  USING (id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Admins can update their empresa"
  ON public.empresas FOR UPDATE TO authenticated
  USING (id = public.get_user_empresa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES: profiles
-- =============================================
CREATE POLICY "Users can view profiles in same empresa"
  ON public.profiles FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES: user_roles
-- =============================================
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles in their empresa"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.profiles p1, public.profiles p2
      WHERE p1.user_id = auth.uid()
        AND p2.user_id = public.user_roles.user_id
        AND p1.empresa_id = p2.empresa_id
    )
  );

-- =============================================
-- RLS POLICIES: produtos
-- =============================================
CREATE POLICY "Users can view products in their empresa"
  ON public.produtos FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Admins can insert products"
  ON public.produtos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.produtos FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
  ON public.produtos FOR DELETE TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
