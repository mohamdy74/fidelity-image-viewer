-- Align the existing f1 fantasy project with the current application schema.
ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS season integer;

UPDATE public.races
SET season = 2026
WHERE season IS NULL;

ALTER TABLE public.races
  ALTER COLUMN season SET DEFAULT 2026,
  ALTER COLUMN season SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.races'::regclass
      AND contype = 'u'
      AND conname = 'races_season_round_key'
  ) THEN
    ALTER TABLE public.races
      ADD CONSTRAINT races_season_round_key UNIQUE (season, round);
  END IF;
END
$$;

ALTER TABLE public.sprint_predictions
  ADD COLUMN IF NOT EXISTS pole_driver_id text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.sprint_results
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS finished boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pole boolean NOT NULL DEFAULT false;

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

DROP TRIGGER IF EXISTS sprint_predictions_guard_trg ON public.sprint_predictions;
DROP TRIGGER IF EXISTS sprint_predictions_lock_guard ON public.sprint_predictions;
CREATE TRIGGER sprint_predictions_lock_guard
  BEFORE INSERT OR UPDATE ON public.sprint_predictions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sprint_prediction_locks();

-- 2026 sprint calendar from the Jolpica/Ergast feed used by the app.
UPDATE public.races SET
  has_sprint = true,
  sprint_at = '2026-03-14T03:00:00Z',
  sprint_qualifying_at = '2026-03-13T07:30:00Z'
WHERE season = 2026 AND round = 2;

UPDATE public.races SET
  has_sprint = true,
  sprint_at = '2026-05-02T16:00:00Z',
  sprint_qualifying_at = '2026-05-01T20:30:00Z'
WHERE season = 2026 AND round = 4;

UPDATE public.races SET
  has_sprint = true,
  sprint_at = '2026-05-23T16:00:00Z',
  sprint_qualifying_at = '2026-05-22T20:30:00Z'
WHERE season = 2026 AND round = 5;

UPDATE public.races SET
  has_sprint = true,
  sprint_at = '2026-07-04T11:00:00Z',
  sprint_qualifying_at = '2026-07-03T15:30:00Z'
WHERE season = 2026 AND round = 9;

UPDATE public.races SET
  has_sprint = true,
  sprint_at = '2026-08-22T10:00:00Z',
  sprint_qualifying_at = '2026-08-21T14:30:00Z'
WHERE season = 2026 AND round = 12;

UPDATE public.races SET
  has_sprint = true,
  sprint_at = '2026-10-10T09:00:00Z',
  sprint_qualifying_at = '2026-10-09T12:30:00Z'
WHERE season = 2026 AND round = 17;
