DROP POLICY IF EXISTS "scores readable by everyone" ON public.scores;
CREATE POLICY "scores readable by signed-in players" ON public.scores FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "profiles readable by everyone" ON public.profiles;
CREATE POLICY "profiles readable by signed-in players" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Weekend sessions are public" ON public.weekend_sessions;
CREATE POLICY "weekend sessions readable by signed-in players" ON public.weekend_sessions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "sync state readable by everyone" ON public.sync_state;
REVOKE SELECT ON public.scores, public.profiles, public.weekend_sessions, public.sync_state FROM anon;