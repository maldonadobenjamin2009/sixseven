-- Perfil privado de SixSeven vinculado con Supabase Auth.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_usuarios_auth_user'
      AND conrelid = 'public.usuarios'::regclass
  ) THEN
    ALTER TABLE public.usuarios
      ADD CONSTRAINT fk_usuarios_auth_user
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_sixseven_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  display_name TEXT;
  generated_username TEXT;
BEGIN
  display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Usuario'
  );
  generated_username :=
    left(regexp_replace(display_name, '[^a-zA-Z0-9_-]', '', 'g'), 35)
    || '-' || left(replace(NEW.id::text, '-', ''), 8);

  INSERT INTO public.usuarios (
    nombre_usuario, password_hash, rol, activo, auth_user_id, email, nombre_completo
  )
  VALUES (
    generated_username, NULL, 'docente', FALSE, NEW.id, lower(NEW.email), left(display_name, 120)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_sixseven_auth_user_created ON auth.users;
CREATE TRIGGER on_sixseven_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_sixseven_user();

-- Las tablas escolares se consultan solo desde el backend privado.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.usuarios FROM anon, authenticated;
REVOKE ALL ON TABLE public.cursos FROM anon, authenticated;
REVOKE ALL ON TABLE public.estudiantes FROM anon, authenticated;
REVOKE ALL ON TABLE public.asistencias FROM anon, authenticated;
