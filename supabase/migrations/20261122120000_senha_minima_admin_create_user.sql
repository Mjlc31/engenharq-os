-- QA de 18/11, P2-4: senha provisória com no mínimo 8 caracteres (a tela também exige).
-- Só acrescenta a checagem; o resto do corpo é o que estava no banco em 22/11/2026.
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

  IF length(btrim(coalesce(new_password, ''))) < 8 THEN
    RAISE EXCEPTION 'A senha provisória precisa ter pelo menos 8 caracteres.';
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
