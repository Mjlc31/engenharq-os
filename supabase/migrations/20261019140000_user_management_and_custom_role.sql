-- Migração: Suporte a Cargo/Função Digitável e Criação Segura de Usuários (RBAC)
-- Data: 2026-10-19

-- 1. Adicionar coluna custom_role na tabela public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS custom_role TEXT;

-- 2. Atualizar trigger handle_new_user para capturar custom_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _role user_role;
  _custom_role text;
BEGIN
  BEGIN
    _role := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    _role := 'SITE_MANAGER';
  END;
  _role := COALESCE(_role, 'SITE_MANAGER');
  _custom_role := new.raw_user_meta_data->>'custom_role';

  INSERT INTO public.users (id, email, full_name, role, custom_role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuario ' || split_part(new.email, '@', 1)),
    _role,
    _custom_role
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    custom_role = COALESCE(EXCLUDED.custom_role, public.users.custom_role);

  new.raw_app_meta_data := COALESCE(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', _role::text);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função RPC SECURITY DEFINER para criação de usuários por Administradores
-- Não desloga a sessão do administrador, confirma o e-mail imediatamente e inicializa tokens do GoTrue
CREATE OR REPLACE FUNCTION public.admin_create_user(
  new_email TEXT,
  new_password TEXT,
  new_full_name TEXT,
  new_role user_role,
  new_custom_role TEXT DEFAULT NULL,
  new_permissions JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_role user_role;
  v_user_id UUID;
  v_user JSONB;
BEGIN
  -- Validar se o usuário que está chamando é Administrador
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
      RAISE EXCEPTION 'Apenas administradores podem cadastrar novos usuários.';
    END IF;
  END IF;

  -- Validar e-mail
  IF new_email IS NULL OR trim(new_email) = '' THEN
    RAISE EXCEPTION 'O e-mail é obrigatório.';
  END IF;

  -- Verificar duplicidade no auth
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(trim(new_email))) THEN
    RAISE EXCEPTION 'Já existe um usuário cadastrado com este e-mail.';
  END IF;

  v_user_id := gen_random_uuid();

  -- Inserir no auth.users (email_confirmed_at ativo e tokens vazios conforme padrão GoTrue)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    reauthentication_token,
    email_change_confirm_status,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    LOWER(trim(new_email)),
    extensions.crypt(new_password, extensions.gen_salt('bf', 10)),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    0,
    jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', new_role::text),
    jsonb_build_object('full_name', trim(new_full_name), 'role', new_role::text, 'custom_role', NULLIF(trim(new_custom_role), '')),
    false,
    NOW(),
    NOW()
  );

  -- Inserir identidade para login imediato por e-mail/senha
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    'email',
    jsonb_build_object('sub', v_user_id::text, 'email', LOWER(trim(new_email)), 'email_verified', true, 'phone_verified', false),
    NOW(),
    NOW()
  );

  -- Inserir / Atualizar na tabela public.users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    custom_role,
    permissions
  ) VALUES (
    v_user_id,
    LOWER(trim(new_email)),
    trim(new_full_name),
    new_role,
    NULLIF(trim(new_custom_role), ''),
    COALESCE(new_permissions, '{
      "dashboard": { "view": true },
      "cadastros": { "view": true, "create": false, "edit": false, "delete": false },
      "estoque": { "view": true, "create": false, "edit": false, "descarte": false },
      "operacoes": { "entregas": true, "transferencias_enviar": false, "transferencias_receber": false },
      "sst": { "treinamentos": false, "aso": false },
      "relatorios": { "ficha_epi": true, "historico_financeiro": false, "medidas_disciplinares": false },
      "configuracoes": { "gerenciar_usuarios": false }
    }'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    custom_role = EXCLUDED.custom_role,
    permissions = EXCLUDED.permissions;

  SELECT to_jsonb(u) INTO v_user FROM public.users u WHERE u.id = v_user_id;
  RETURN v_user;
END;
$$;

-- 4. Função RPC para desativação de usuário
CREATE OR REPLACE FUNCTION public.admin_deactivate_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role user_role;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();
    IF v_caller_role IS DISTINCT FROM 'ADMIN' THEN
      RAISE EXCEPTION 'Apenas administradores podem desativar usuários.';
    END IF;
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode desativar sua própria conta de administrador.';
  END IF;

  UPDATE public.users 
  SET deleted_at = NOW() 
  WHERE id = target_user_id;

  RETURN true;
END;
$$;

-- 5. Políticas RLS de inserção para administradores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Admins can insert users'
  ) THEN
    CREATE POLICY "Admins can insert users" ON public.users 
    FOR INSERT TO authenticated 
    WITH CHECK ((SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN');
  END IF;
END $$;
