-- Gestão de usuários restrita a ADMIN e ao perfil EPI (SAFETY_ENGINEER), que também gerencia administradores.
-- Também fecha a brecha em que chamadas anônimas (auth.uid() NULL) pulavam a checagem de admin.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Regra única de quem pode gerenciar um usuário com o papel alvo
CREATE OR REPLACE FUNCTION public.can_manage_role(p_target user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT p_target IS NOT NULL
     AND COALESCE(public.current_user_role() IN ('ADMIN', 'SAFETY_ENGINEER'), false);
$$;

REVOKE ALL ON FUNCTION public.can_manage_role(user_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_role(user_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_user(new_email text, new_password text, new_full_name text, new_role user_role, new_custom_role text DEFAULT NULL::text, new_permissions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_user_id UUID;
  v_user JSONB;
BEGIN
  IF NOT public.can_manage_role(new_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem cadastrar usuários com este perfil.';
  END IF;

  IF new_email IS NULL OR trim(new_email) = '' THEN
    RAISE EXCEPTION 'O e-mail é obrigatório.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = LOWER(trim(new_email))) THEN
    RAISE EXCEPTION 'Já existe um usuário cadastrado com este e-mail.';
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, email_change_token_current, reauthentication_token,
    email_change_confirm_status, raw_app_meta_data, raw_user_meta_data, is_super_admin,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    LOWER(trim(new_email)), extensions.crypt(new_password, extensions.gen_salt('bf', 10)), NOW(),
    '', '', '', '', '', '', '', '', 0,
    jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', new_role::text),
    jsonb_build_object('full_name', trim(new_full_name), 'role', new_role::text, 'custom_role', NULLIF(trim(new_custom_role), '')),
    false, NOW(), NOW()
  );

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text, 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', LOWER(trim(new_email)), 'email_verified', true, 'phone_verified', false),
    NOW(), NOW()
  );

  INSERT INTO public.users (id, email, full_name, role, custom_role, permissions)
  VALUES (
    v_user_id, LOWER(trim(new_email)), trim(new_full_name), new_role, NULLIF(trim(new_custom_role), ''),
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_deactivate_user(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_target_role user_role;
BEGIN
  SELECT role INTO v_target_role FROM public.users WHERE id = target_user_id;
  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  IF NOT public.can_manage_role(v_target_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem desativar usuários com este perfil.';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode desativar sua própria conta.';
  END IF;

  UPDATE public.users SET deleted_at = NOW() WHERE id = target_user_id;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_create_user(text, text, text, user_role, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_deactivate_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, user_role, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_user(uuid) TO authenticated;

-- Edição direta da tabela users (permissões/cargo): mesma regra
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Managers can update users" ON public.users
  FOR UPDATE TO authenticated
  USING (public.can_manage_role(role))
  WITH CHECK (public.can_manage_role(role));

-- Troca de papel: só se quem altera pode gerenciar o papel antigo e o novo
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.role() = 'authenticated'
     AND NOT (public.can_manage_role(OLD.role) AND public.can_manage_role(NEW.role)) THEN
    RAISE EXCEPTION 'Not authorized to change role';
  END IF;
  RETURN NEW;
END;
$function$;

-- Thiago (Téc. Segurança) passa de ADMIN para o perfil EPI
UPDATE public.users SET role = 'SAFETY_ENGINEER', updated_at = NOW()
WHERE email = 'thiagolima@engenharq.com.br' AND role = 'ADMIN';

-- RPCs do balcão não podem ser chamadas sem login
REVOKE ALL ON FUNCTION public.complete_almoxarifado_order(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_or_delete_almoxarifado_order(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_almoxarifado_order(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_or_delete_almoxarifado_order(uuid, text, text) TO authenticated;
