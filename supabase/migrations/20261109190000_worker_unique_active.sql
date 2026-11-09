-- CPF e matrícula únicos só entre colaboradores ATIVOS, comparando o CPF só pelos números.
-- Antes: cadastro excluído bloqueava o CPF para sempre (recontratação impossível) e
-- "105.558.774-85" e "10555877485" contavam como CPFs diferentes.
ALTER TABLE public.workers DROP CONSTRAINT workers_cpf_key;
ALTER TABLE public.workers DROP CONSTRAINT workers_registration_number_key;

CREATE UNIQUE INDEX workers_cpf_active_key
  ON public.workers ((regexp_replace(cpf, '\D', '', 'g'))) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX workers_registration_active_key
  ON public.workers ((lower(trim(registration_number)))) WHERE deleted_at IS NULL;

-- Aviso legível em qualquer tela (cadastro, perfil, importação); os índices acima seguram corrida entre dois cadastros.
CREATE OR REPLACE FUNCTION private.check_worker_duplicates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
DECLARE
  v_name text;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_name FROM public.workers
  WHERE deleted_at IS NULL AND id <> NEW.id
    AND regexp_replace(cpf, '\D', '', 'g') = regexp_replace(NEW.cpf, '\D', '', 'g')
  LIMIT 1;
  IF v_name IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um colaborador ativo com este CPF: %.', v_name USING ERRCODE = '23505';
  END IF;

  SELECT full_name INTO v_name FROM public.workers
  WHERE deleted_at IS NULL AND id <> NEW.id
    AND lower(trim(registration_number)) = lower(trim(NEW.registration_number))
  LIMIT 1;
  IF v_name IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um colaborador ativo com esta matrícula: %.', v_name USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_worker_duplicates
  BEFORE INSERT OR UPDATE OF cpf, registration_number, deleted_at ON public.workers
  FOR EACH ROW EXECUTE FUNCTION private.check_worker_duplicates();
