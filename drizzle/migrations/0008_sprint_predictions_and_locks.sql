-- SPRINT WEEKEND DATA
ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS has_sprint boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sprint_at timestamptz,
  ADD COLUMN IF NOT EXISTS sprint_qualifying_at timestamptz;

-- SPRINT PREDICTIONS
CREATE TABLE IF NOT EXISTS public.sprint_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  top8 text[] NOT NULL DEFAULT '{}',
  pole_driver_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, race_id)
);

GRANT SELECT, INSERT, UPDATE ON public.sprint_predictions TO authenticated;
GRANT ALL ON public.sprint_predictions TO service_role;
ALTER TABLE public.sprint_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own sprint predictions select" ON public.sprint_predictions;
CREATE POLICY "own sprint predictions select" ON public.sprint_predictions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "locked sprint predictions readable by league" ON public.sprint_predictions;
CREATE POLICY "locked sprint predictions readable by league" ON public.sprint_predictions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.races r
      WHERE r.id = sprint_predictions.race_id
        AND r.sprint_at IS NOT NULL
        AND r.sprint_at <= now()
    )
  );

DROP POLICY IF EXISTS "own sprint predictions insert" ON public.sprint_predictions;
CREATE POLICY "own sprint predictions insert" ON public.sprint_predictions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own sprint predictions update" ON public.sprint_predictions;
CREATE POLICY "own sprint predictions update" ON public.sprint_predictions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS sprint_predictions_race_idx
  ON public.sprint_predictions (race_id);

-- SPRINT RESULTS
CREATE TABLE IF NOT EXISTS public.sprint_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  position int,
  status text,
  finished boolean NOT NULL DEFAULT true,
  pole boolean NOT NULL DEFAULT false,
  UNIQUE (race_id, driver_id)
);

GRANT SELECT ON public.sprint_results TO anon, authenticated;
GRANT ALL ON public.sprint_results TO service_role;
ALTER TABLE public.sprint_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sprint results readable by everyone" ON public.sprint_results;
CREATE POLICY "sprint results readable by everyone" ON public.sprint_results
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS sprint_results_race_idx
  ON public.sprint_results (race_id, position);

-- SPRINT LOCK ENFORCEMENT
CREATE OR REPLACE FUNCTION public.enforce_sprint_prediction_locks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT sprint_at, sprint_qualifying_at
    INTO r
    FROM public.races
   WHERE id = NEW.race_id;

  IF r IS NULL THEN
    RAISE EXCEPTION 'Unknown race';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF r.sprint_at IS NOT NULL
       AND now() >= r.sprint_at
       AND COALESCE(array_length(NEW.top8, 1), 0) > 0 THEN
      RAISE EXCEPTION 'Sprint predictions are locked: the sprint has started';
    END IF;

    IF r.sprint_qualifying_at IS NOT NULL
       AND now() >= r.sprint_qualifying_at
       AND NEW.pole_driver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Sprint pole picks are locked: sprint qualifying has started';
    END IF;
  ELSE
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.race_id IS DISTINCT FROM OLD.race_id THEN
      RAISE EXCEPTION 'Sprint prediction owner and race cannot be changed';
    END IF;

    IF r.sprint_at IS NOT NULL
       AND now() >= r.sprint_at
       AND NEW.top8 IS DISTINCT FROM OLD.top8 THEN
      RAISE EXCEPTION 'Sprint predictions are locked: the sprint has started';
    END IF;

    IF r.sprint_qualifying_at IS NOT NULL
       AND now() >= r.sprint_qualifying_at
       AND NEW.pole_driver_id IS DISTINCT FROM OLD.pole_driver_id THEN
      RAISE EXCEPTION 'Sprint pole picks are locked: sprint qualifying has started';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sprint_predictions_lock_guard ON public.sprint_predictions;
CREATE TRIGGER sprint_predictions_lock_guard
  BEFORE INSERT OR UPDATE ON public.sprint_predictions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sprint_prediction_locks();
