
-- Drop the overly permissive policy
DROP POLICY "Authenticated users can create empresa" ON public.empresas;

-- Only allow creating empresa if user doesn't already have one
CREATE POLICY "Users without empresa can create one"
  ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (public.get_user_empresa_id(auth.uid()) IS NULL);
