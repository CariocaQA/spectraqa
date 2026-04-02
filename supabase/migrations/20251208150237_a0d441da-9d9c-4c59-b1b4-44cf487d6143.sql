-- Adicionar campos de controle de acesso na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_expires_at timestamp with time zone DEFAULT NULL;

-- Criar função para verificar acesso do usuário
CREATE OR REPLACE FUNCTION public.check_user_access(_user_id uuid)
RETURNS TABLE (
  can_access boolean,
  is_blocked boolean,
  is_trial_expired boolean,
  trial_expires_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_blocked boolean;
  v_trial_expires_at timestamp with time zone;
  v_is_admin boolean;
BEGIN
  -- Admins sempre têm acesso
  SELECT public.has_role(_user_id, 'admin') INTO v_is_admin;
  IF v_is_admin THEN
    RETURN QUERY SELECT true, false, false, NULL::timestamp with time zone;
    RETURN;
  END IF;
  
  -- Buscar dados do perfil
  SELECT p.is_blocked, p.trial_expires_at
  INTO v_is_blocked, v_trial_expires_at
  FROM public.profiles p WHERE p.id = _user_id;
  
  RETURN QUERY SELECT 
    NOT COALESCE(v_is_blocked, false) AND 
    (v_trial_expires_at IS NULL OR v_trial_expires_at > NOW()),
    COALESCE(v_is_blocked, false),
    v_trial_expires_at IS NOT NULL AND v_trial_expires_at <= NOW(),
    v_trial_expires_at;
END;
$$;

-- Promover silasuni@gmail.com para admin (atualizar se já existe, inserir se não)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles WHERE email = 'silasuni@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Verificar se já tem role
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) THEN
      UPDATE public.user_roles SET role = 'admin' WHERE user_id = v_user_id;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');
    END IF;
  END IF;
END;
$$;

-- RLS: Admins podem ver todos os profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins podem atualizar qualquer profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));