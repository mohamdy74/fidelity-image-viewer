CREATE TABLE public.weekend_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('practice_1', 'practice_2', 'practice_3', 'sprint', 'sprint_qualifying', 'qualifying', 'race')),
  starts_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed')),
  classification JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (race_id, session_type)
);
GRANT SELECT ON public.weekend_sessions TO anon, authenticated;
GRANT ALL ON public.weekend_sessions TO service_role;
ALTER TABLE public.weekend_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Weekend sessions are public" ON public.weekend_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX weekend_sessions_race_idx ON public.weekend_sessions (race_id, starts_at);
COMMENT ON TABLE public.weekend_sessions IS 'Lightweight schedule and classification cache for each Formula 1 race weekend.';