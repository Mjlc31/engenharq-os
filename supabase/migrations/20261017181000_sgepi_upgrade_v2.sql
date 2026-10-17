-- Migration: SGEPI Full Stack Upgrade V2

-- 1. Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transfer_status') THEN
        CREATE TYPE transfer_status AS ENUM ('EM_TRANSITO', 'RECEBIDO', 'CANCELADO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aso_type') THEN
        CREATE TYPE aso_type AS ENUM ('ADMISSIONAL', 'PERIODICO', 'RETORNO_TRABALHO', 'MUDANCA_FUNCAO', 'DEMISSIONAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'disciplinary_type') THEN
        CREATE TYPE disciplinary_type AS ENUM ('ORIENTACAO_SEGURANCA', 'ADVERTENCIA_VERBAL', 'ADVERTENCIA_ESCRITA', 'PERSONALIZADO');
    END IF;
END $$;

-- 2. Alterações em epi_catalog
ALTER TABLE public.epi_catalog
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS discard_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS discard_notes TEXT NULL,
ADD COLUMN IF NOT EXISTS discarded_at TIMESTAMP WITH TIME ZONE NULL;

-- 3. Alterações em workers
ALTER TABLE public.workers
ADD COLUMN IF NOT EXISTS apt_for_height BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS apt_for_confined_space BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Alterações em epi_assignments
ALTER TABLE public.epi_assignments
ADD COLUMN IF NOT EXISTS unit_price_at_delivery NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(20) DEFAULT 'SIGNATURE';

-- 5. Alterações em users (permissões RBAC)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{
    "dashboard": { "view": true },
    "cadastros": { "view": true, "create": false, "edit": false, "delete": false },
    "estoque": { "view": true, "create": false, "edit": false, "descarte": false },
    "operacoes": { "entregas": true, "transferencias_enviar": false, "transferencias_receber": false },
    "sst": { "treinamentos": false, "aso": false },
    "relatorios": { "ficha_epi": true, "historico_financeiro": false, "medidas_disciplinares": false },
    "configuracoes": { "gerenciar_usuarios": false }
}'::jsonb;

-- 6. Histórico de Compras de EPIs
CREATE TABLE IF NOT EXISTS public.epi_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES public.epi_catalog(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.construction_sites(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    invoice_number VARCHAR(100),
    supplier VARCHAR(150),
    arrival_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    registered_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Estoque Descentralizado por Obra
CREATE TABLE IF NOT EXISTS public.site_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.construction_sites(id) ON DELETE CASCADE,
    catalog_id UUID NOT NULL REFERENCES public.epi_catalog(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(site_id, catalog_id)
);

-- 8. Transferências entre Obras
CREATE TABLE IF NOT EXISTS public.site_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES public.epi_catalog(id) ON DELETE CASCADE,
    origin_site_id UUID NOT NULL REFERENCES public.construction_sites(id) ON DELETE CASCADE,
    destination_site_id UUID NOT NULL REFERENCES public.construction_sites(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status transfer_status NOT NULL DEFAULT 'EM_TRANSITO',
    sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_name VARCHAR(150) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    receiver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    receiver_name VARCHAR(150),
    received_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_sites_different CHECK (origin_site_id <> destination_site_id)
);

-- 9. Catálogo de Treinamentos (NRs)
CREATE TABLE IF NOT EXISTS public.training_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nr_code VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    workload_hours INTEGER NOT NULL DEFAULT 8,
    default_validity_months INTEGER NOT NULL DEFAULT 12,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Histórico de Treinamentos por Colaborador
CREATE TABLE IF NOT EXISTS public.worker_trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES public.training_catalog(id) ON DELETE CASCADE,
    instructor_name VARCHAR(150) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until DATE NOT NULL,
    photos_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Atestados de Saúde Ocupacional (ASOs)
CREATE TABLE IF NOT EXISTS public.worker_asos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    type aso_type NOT NULL,
    issued_at DATE NOT NULL,
    validity_years INTEGER NOT NULL CHECK (validity_years IN (1, 2)),
    valid_until DATE NOT NULL,
    fit_for_height BOOLEAN NOT NULL DEFAULT FALSE,
    fit_for_confined_space BOOLEAN NOT NULL DEFAULT FALSE,
    doctor_name VARCHAR(150),
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Medidas Disciplinares
CREATE TABLE IF NOT EXISTS public.disciplinary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    type disciplinary_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    content_html TEXT NOT NULL,
    applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    pdf_url TEXT
);

-- 13. Trigger para sincronizar aptidões do ASO no trabalhador
CREATE OR REPLACE FUNCTION sync_worker_aso_fitness()
RETURNS TRIGGER AS $fn$
BEGIN
    UPDATE public.workers
    SET 
        apt_for_height = NEW.fit_for_height,
        apt_for_confined_space = NEW.fit_for_confined_space,
        apt_for_height_and_confined_space = (NEW.fit_for_height AND NEW.fit_for_confined_space),
        updated_at = NOW()
    WHERE id = NEW.worker_id;
    RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DO $body$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_worker_aso_fitness'
    ) THEN
        CREATE TRIGGER trg_sync_worker_aso_fitness
        AFTER INSERT OR UPDATE ON public.worker_asos
        FOR EACH ROW EXECUTE PROCEDURE sync_worker_aso_fitness();
    END IF;
END;
$body$;

-- 14. RPC: Transferência - Envio (Origem -> Em Trânsito)
CREATE OR REPLACE FUNCTION transfer_epi_send(
    p_catalog_id UUID,
    p_origin_site_id UUID,
    p_destination_site_id UUID,
    p_quantity INTEGER,
    p_sender_id UUID,
    p_sender_name TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $func$
DECLARE
    v_transfer_id UUID;
    v_origin_stock INTEGER;
    v_catalog_stock INTEGER;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
    END IF;

    IF p_origin_site_id = p_destination_site_id THEN
        RAISE EXCEPTION 'A obra de origem e destino devem ser diferentes.';
    END IF;

    SELECT quantity INTO v_origin_stock 
    FROM public.site_inventory 
    WHERE site_id = p_origin_site_id AND catalog_id = p_catalog_id
    FOR UPDATE;

    IF v_origin_stock IS NULL THEN
        SELECT current_stock INTO v_catalog_stock FROM public.epi_catalog WHERE id = p_catalog_id;
        IF v_catalog_stock IS NULL OR v_catalog_stock < p_quantity THEN
            RAISE EXCEPTION 'Saldo insuficiente para transferir.';
        END IF;

        INSERT INTO public.site_inventory (site_id, catalog_id, quantity)
        VALUES (p_origin_site_id, p_catalog_id, v_catalog_stock - p_quantity);
    ELSE
        IF v_origin_stock < p_quantity THEN
            RAISE EXCEPTION 'Saldo insuficiente na obra de origem (disponível: %)', v_origin_stock;
        END IF;

        UPDATE public.site_inventory
        SET quantity = quantity - p_quantity, updated_at = NOW()
        WHERE site_id = p_origin_site_id AND catalog_id = p_catalog_id;
    END IF;

    INSERT INTO public.site_transfers (
        catalog_id,
        origin_site_id,
        destination_site_id,
        quantity,
        status,
        sender_user_id,
        sender_name,
        sent_at,
        notes
    ) VALUES (
        p_catalog_id,
        p_origin_site_id,
        p_destination_site_id,
        p_quantity,
        'EM_TRANSITO',
        p_sender_id,
        p_sender_name,
        NOW(),
        p_notes
    ) RETURNING id INTO v_transfer_id;

    RETURN v_transfer_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. RPC: Transferência - Recebimento (Em Trânsito -> Destino)
CREATE OR REPLACE FUNCTION transfer_epi_receive(
    p_transfer_id UUID,
    p_receiver_id UUID,
    p_receiver_name TEXT
)
RETURNS BOOLEAN AS $func$
DECLARE
    v_transfer RECORD;
BEGIN
    SELECT * INTO v_transfer
    FROM public.site_transfers
    WHERE id = p_transfer_id
    FOR UPDATE;

    IF v_transfer IS NULL THEN
        RAISE EXCEPTION 'Transferência não encontrada.';
    END IF;

    IF v_transfer.status <> 'EM_TRANSITO' THEN
        RAISE EXCEPTION 'Esta transferência já foi finalizada ou cancelada (status atual: %).', v_transfer.status;
    END IF;

    INSERT INTO public.site_inventory (site_id, catalog_id, quantity)
    VALUES (v_transfer.destination_site_id, v_transfer.catalog_id, v_transfer.quantity)
    ON CONFLICT (site_id, catalog_id)
    DO UPDATE SET quantity = public.site_inventory.quantity + EXCLUDED.quantity, updated_at = NOW();

    UPDATE public.site_transfers
    SET 
        status = 'RECEBIDO',
        receiver_user_id = p_receiver_id,
        receiver_name = p_receiver_name,
        received_at = NOW()
    WHERE id = p_transfer_id;

    RETURN TRUE;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. RPC: Descarte de EPI
CREATE OR REPLACE FUNCTION discard_epi(
    p_catalog_id UUID,
    p_quantity INTEGER,
    p_reason TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $func$
DECLARE
    v_current_stock INTEGER;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantidade de descarte deve ser maior que zero.';
    END IF;

    SELECT current_stock INTO v_current_stock
    FROM public.epi_catalog
    WHERE id = p_catalog_id
    FOR UPDATE;

    IF v_current_stock IS NULL OR v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para descarte (disponível: %)', COALESCE(v_current_stock, 0);
    END IF;

    UPDATE public.epi_catalog
    SET 
        current_stock = current_stock - p_quantity,
        discard_reason = p_reason,
        discard_notes = p_notes,
        discarded_at = NOW(),
        updated_at = NOW()
    WHERE id = p_catalog_id;

    RETURN TRUE;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. RLS
ALTER TABLE public.epi_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_asos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_records ENABLE ROW LEVEL SECURITY;

DO $pol$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth full access epi_purchases') THEN
        CREATE POLICY "Auth full access epi_purchases" ON public.epi_purchases FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth full access site_inventory') THEN
        CREATE POLICY "Auth full access site_inventory" ON public.site_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth full access site_transfers') THEN
        CREATE POLICY "Auth full access site_transfers" ON public.site_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth full access training_catalog') THEN
        CREATE POLICY "Auth full access training_catalog" ON public.training_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth full access worker_trainings') THEN
        CREATE POLICY "Auth full access worker_trainings" ON public.worker_trainings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth full access worker_asos') THEN
        CREATE POLICY "Auth full access worker_asos" ON public.worker_asos FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth full access disciplinary_records') THEN
        CREATE POLICY "Auth full access disciplinary_records" ON public.disciplinary_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END;
$pol$;
