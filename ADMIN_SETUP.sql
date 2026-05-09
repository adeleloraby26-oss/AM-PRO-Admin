-- ============================================================
-- AM PRO ADMIN PANEL — SUPABASE SQL SETUP
-- Run this in your Supabase SQL Editor (in addition to SUPABASE_SETUP.sql)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. ADMIN USERS TABLE
--    Stores the admin panel credentials (username + password)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         serial PRIMARY KEY,
  username   text NOT NULL,
  password   text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert default admin credentials (change these immediately!)
INSERT INTO public.admin_users (username, password)
VALUES ('admin', 'AdminPass123!')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-running
DROP POLICY IF EXISTS "admin_select_anon" ON public.admin_users;

-- Allow anon to SELECT admin credentials (panel login uses anon key)
-- In production, replace this with a secure backend function
CREATE POLICY "admin_select_anon"
  ON public.admin_users
  FOR SELECT
  TO anon, authenticated
  USING (true);


-- ──────────────────────────────────────────────────────────
-- 2. TASKS TABLE
--    Stores tasks assigned to users by admins
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.users(id) ON DELETE CASCADE,
  text       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-running
DROP POLICY IF EXISTS "tasks_select_own"    ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_anon"   ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_anon"   ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_anon"   ON public.tasks;

-- Users can read their own tasks (used in dashboard)
CREATE POLICY "tasks_select_own"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin panel (anon key) can insert tasks
CREATE POLICY "tasks_insert_anon"
  ON public.tasks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admin panel (anon key) can delete tasks
CREATE POLICY "tasks_delete_anon"
  ON public.tasks
  FOR DELETE
  TO anon, authenticated
  USING (true);


-- ──────────────────────────────────────────────────────────
-- 3. EXTEND users TABLE POLICIES
--    Allow admin panel to read/update ALL users
-- ──────────────────────────────────────────────────────────

-- Drop old restrictive policies
DROP POLICY IF EXISTS "users_select_own"   ON public.users;
DROP POLICY IF EXISTS "users_update_own"   ON public.users;
DROP POLICY IF EXISTS "users_delete_own"   ON public.users;
DROP POLICY IF EXISTS "users_select_all"   ON public.users;
DROP POLICY IF EXISTS "users_update_all"   ON public.users;
DROP POLICY IF EXISTS "users_delete_all"   ON public.users;

-- Allow SELECT for anon + authenticated (admin reads all, user reads all — filtered in JS)
CREATE POLICY "users_select_all"
  ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow UPDATE for anon + authenticated (admin updates any row)
CREATE POLICY "users_update_all"
  ON public.users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow DELETE for anon + authenticated (admin deletes any row)
CREATE POLICY "users_delete_all"
  ON public.users
  FOR DELETE
  TO anon, authenticated
  USING (true);


-- ──────────────────────────────────────────────────────────
-- 4. ENABLE REALTIME on tasks (for dashboard live updates)
-- ──────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;


-- ──────────────────────────────────────────────────────────
-- 5. CHANGE ADMIN CREDENTIALS (run after first setup)
-- ──────────────────────────────────────────────────────────
-- UPDATE public.admin_users SET username = 'your_username', password = 'YourStrongPass!9' WHERE id = 1;


-- ──────────────────────────────────────────────────────────
-- SECURITY NOTES
-- ──────────────────────────────────────────────────────────
-- • The admin panel uses the anon key to check credentials from admin_users.
--   For higher security, consider using a Supabase Edge Function that
--   accepts credentials and returns a signed token, and lock admin_users
--   to only that function.
-- • Password updates for auth users via the REST API require the service_role
--   key. Add that key server-side or use a Supabase Edge Function.
--   NEVER expose the service_role key in client-side JavaScript.
-- • The current setup is suitable for internal/team use. For public-facing
--   deployments, add rate limiting and IP allowlisting in Supabase.
-- ============================================================
