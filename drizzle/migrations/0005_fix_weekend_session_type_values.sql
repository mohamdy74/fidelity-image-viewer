ALTER TABLE public.weekend_sessions DROP CONSTRAINT weekend_sessions_session_type_check;
ALTER TABLE public.weekend_sessions ADD CONSTRAINT weekend_sessions_session_type_check
  CHECK (session_type = ANY (ARRAY['fp1','fp2','fp3','sprint','sprint_qualifying','qualifying','race']));