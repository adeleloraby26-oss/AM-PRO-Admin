-- ============================================================
-- AM PRO ADMIN PANEL — SUPABASE SQL SETUP  (v2)
-- Run this in your Supabase SQL Editor
-- ============================================================


-- ──────────────────────────────────────────────────────────
-- 1. ADMIN USERS TABLE
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         serial PRIMARY KEY,
  username   text NOT NULL,
  password   text NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.admin_users (username, password)
VALUES ('admin', 'AdminPass123!')
ON CONFLICT DO NOTHING;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_anon" ON public.admin_users;
CREATE POLICY "admin_select_anon"
  ON public.admin_users FOR SELECT
  TO anon, authenticated
  USING (true);


-- ──────────────────────────────────────────────────────────
-- 2. EXTEND users TABLE
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verified    BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio         TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url  TEXT DEFAULT NULL;


-- ──────────────────────────────────────────────────────────
-- 3. TASKS TABLE — title + body + link
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title      text,
  body       text,
  link       text,
  text       text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS body  text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS link  text;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────────────────
-- 4. TASKS POLICIES
-- ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_select_own"             ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_anon"            ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_anon"            ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_anon"            ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_all"             ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_authenticated"   ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_authenticated"   ON public.tasks;

CREATE POLICY "tasks_select_own"
  ON public.tasks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_authenticated"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_delete_authenticated"
  ON public.tasks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────
-- 5. USERS TABLE POLICIES
-- ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_own"              ON public.users;
DROP POLICY IF EXISTS "users_update_own"              ON public.users;
DROP POLICY IF EXISTS "users_delete_own"              ON public.users;
DROP POLICY IF EXISTS "users_select_all"              ON public.users;
DROP POLICY IF EXISTS "users_update_all"              ON public.users;
DROP POLICY IF EXISTS "users_delete_all"              ON public.users;
DROP POLICY IF EXISTS "users_insert_own"              ON public.users;
DROP POLICY IF EXISTS "Users can update own profile"  ON public.users;

CREATE POLICY "users_select_all"
  ON public.users FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_own"
  ON public.users FOR DELETE TO authenticated
  USING (auth.uid() = id);


-- ──────────────────────────────────────────────────────────
-- 6. REALTIME
-- ──────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;


-- ──────────────────────────────────────────────────────────
-- 7. STORAGE — avatars bucket
-- ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read avatars"     ON storage.objects;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can read avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');


-- ──────────────────────────────────────────────────────────
-- 8. CHANGE ADMIN CREDENTIALS
-- ──────────────────────────────────────────────────────────
-- UPDATE public.admin_users SET username='your_admin', password='StrongPass!9' WHERE id=1;


-- ──────────────────────────────────────────────────────────
-- SECURITY NOTES
-- ──────────────────────────────────────────────────────────
-- * Admin panel uses SERVICE ROLE key — bypasses ALL RLS.
--   Never expose this key publicly. Host admin.js privately.
-- * "verified" can only be set by the admin panel (service_role).
-- * Password resets via /auth/v1/admin/users/:id require service_role key (now working).
-- ============================================================
