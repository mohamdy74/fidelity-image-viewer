CREATE POLICY "locked predictions readable by league"
ON public.predictions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.races r WHERE r.id = race_id AND r.race_at <= now()));

UPDATE public.drivers SET active = false WHERE id = 'tsunoda';