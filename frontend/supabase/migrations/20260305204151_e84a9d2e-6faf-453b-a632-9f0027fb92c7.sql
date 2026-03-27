
-- Allow authenticated users to create an empresa (for first-time setup)
CREATE POLICY "Authenticated users can create empresa"
  ON public.empresas FOR INSERT TO authenticated
  WITH CHECK (true);
