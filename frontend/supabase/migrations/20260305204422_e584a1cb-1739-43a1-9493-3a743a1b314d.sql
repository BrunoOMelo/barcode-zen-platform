
-- =============================================
-- TRI SisInventario — Fase 3: Inventários & Contagens
-- =============================================

-- TABELA: inventarios
CREATE TABLE public.inventarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  status public.inventory_status NOT NULL DEFAULT 'criado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_fim TIMESTAMP WITH TIME ZONE,
  criado_por UUID REFERENCES auth.users(id)
);

ALTER TABLE public.inventarios ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inventarios_empresa ON public.inventarios(empresa_id);
CREATE INDEX idx_inventarios_status ON public.inventarios(empresa_id, status);

CREATE TRIGGER update_inventarios_updated_at
  BEFORE UPDATE ON public.inventarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: inventarios
CREATE POLICY "Users can view inventarios of their empresa"
  ON public.inventarios FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Admins can create inventarios"
  ON public.inventarios FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = public.get_user_empresa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  );

CREATE POLICY "Admins can update inventarios"
  ON public.inventarios FOR UPDATE TO authenticated
  USING (
    empresa_id = public.get_user_empresa_id(auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  );

CREATE POLICY "Admins can delete inventarios"
  ON public.inventarios FOR DELETE TO authenticated
  USING (
    empresa_id = public.get_user_empresa_id(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- =============================================
-- TABELA: inventario_produtos
-- =============================================
CREATE TABLE public.inventario_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID NOT NULL REFERENCES public.inventarios(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  estoque_sistema NUMERIC NOT NULL DEFAULT 0,
  estoque_contado NUMERIC,
  divergencia NUMERIC,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(inventario_id, produto_id)
);

ALTER TABLE public.inventario_produtos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inv_produtos_inventario ON public.inventario_produtos(inventario_id);
CREATE INDEX idx_inv_produtos_produto ON public.inventario_produtos(produto_id);
CREATE INDEX idx_inv_produtos_status ON public.inventario_produtos(inventario_id, status);

CREATE TRIGGER update_inv_produtos_updated_at
  BEFORE UPDATE ON public.inventario_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to check inventario ownership
CREATE OR REPLACE FUNCTION public.inventario_belongs_to_user_empresa(_inventario_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.inventarios
    WHERE id = _inventario_id
      AND empresa_id = public.get_user_empresa_id(_user_id)
  )
$$;

-- RLS: inventario_produtos
CREATE POLICY "Users can view inv products of their empresa"
  ON public.inventario_produtos FOR SELECT TO authenticated
  USING (public.inventario_belongs_to_user_empresa(inventario_id, auth.uid()));

CREATE POLICY "Admins can insert inv products"
  ON public.inventario_produtos FOR INSERT TO authenticated
  WITH CHECK (
    public.inventario_belongs_to_user_empresa(inventario_id, auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  );

CREATE POLICY "Admins can update inv products"
  ON public.inventario_produtos FOR UPDATE TO authenticated
  USING (
    public.inventario_belongs_to_user_empresa(inventario_id, auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  );

CREATE POLICY "Admins can delete inv products"
  ON public.inventario_produtos FOR DELETE TO authenticated
  USING (
    public.inventario_belongs_to_user_empresa(inventario_id, auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- =============================================
-- TABELA: contagens
-- =============================================
CREATE TABLE public.contagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID NOT NULL REFERENCES public.inventarios(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  quantidade NUMERIC NOT NULL,
  tipo public.count_type NOT NULL DEFAULT 'primeira',
  data_contagem TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contagens ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contagens_inventario ON public.contagens(inventario_id);
CREATE INDEX idx_contagens_produto ON public.contagens(inventario_id, produto_id);
CREATE INDEX idx_contagens_usuario ON public.contagens(usuario_id);

-- RLS: contagens
CREATE POLICY "Users can view contagens of their empresa"
  ON public.contagens FOR SELECT TO authenticated
  USING (public.inventario_belongs_to_user_empresa(inventario_id, auth.uid()));

CREATE POLICY "Operators can insert contagens"
  ON public.contagens FOR INSERT TO authenticated
  WITH CHECK (
    public.inventario_belongs_to_user_empresa(inventario_id, auth.uid())
    AND usuario_id = auth.uid()
  );

-- =============================================
-- TRIGGER: atualizar estoque_contado e divergencia após contagem
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_contagem()
RETURNS TRIGGER AS $$
BEGIN
  -- Update inventario_produtos with the latest count
  UPDATE public.inventario_produtos
  SET
    estoque_contado = NEW.quantidade,
    divergencia = NEW.quantidade - estoque_sistema,
    status = CASE
      WHEN NEW.quantidade = estoque_sistema THEN 'ok'
      ELSE 'divergente'
    END
  WHERE inventario_id = NEW.inventario_id
    AND produto_id = NEW.produto_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contagem_inserted
  AFTER INSERT ON public.contagens
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_contagem();
