-- Adiciona colunas para suporte a materiais de construção civil, ferramentas e insumos
ALTER TABLE public.epi_catalog 
ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'EPI' 
  CHECK (item_type IN ('EPI', 'MATERIAL', 'FERRAMENTA')),
ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'un';

-- Garante que registros existentes permaneçam como 'EPI' e 'un'
UPDATE public.epi_catalog 
SET item_type = 'EPI', unit = 'un' 
WHERE item_type IS NULL OR unit IS NULL;

-- Índice para filtragem rápida por tipo de item
CREATE INDEX IF NOT EXISTS idx_epi_catalog_item_type ON public.epi_catalog(item_type);
