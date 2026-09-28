CREATE TABLE public.sync_state (
  key text PRIMARY KEY,
  synced_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sync_state TO authenticated, anon;
GRANT ALL ON public.sync_state TO service_role;
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync state readable by everyone" ON public.sync_state FOR SELECT USING (true);