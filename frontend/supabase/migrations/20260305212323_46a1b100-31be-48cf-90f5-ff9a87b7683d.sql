ALTER TABLE public.produtos
ADD COLUMN marca text DEFAULT NULL,
ADD COLUMN data_validade date DEFAULT NULL,
ADD COLUMN lote text DEFAULT NULL,
ADD COLUMN custo numeric DEFAULT NULL;