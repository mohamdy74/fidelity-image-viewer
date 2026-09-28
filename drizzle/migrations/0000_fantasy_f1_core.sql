-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Driver',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Driver'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DRIVERS
CREATE TABLE public.drivers (
  id text PRIMARY KEY,
  code text,
  full_name text NOT NULL,
  team text,
  number int,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.drivers TO authenticated, anon;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers readable by everyone" ON public.drivers FOR SELECT USING (true);

-- RACES
CREATE TABLE public.races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season int NOT NULL,
  round int NOT NULL,
  name text NOT NULL,
  circuit text,
  country text,
  locality text,
  race_at timestamptz NOT NULL,
  qualifying_at timestamptz,
  has_results boolean NOT NULL DEFAULT false,
  UNIQUE (season, round)
);
GRANT SELECT ON public.races TO authenticated, anon;
GRANT ALL ON public.races TO service_role;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
CREATE POLICY "races readable by everyone" ON public.races FOR SELECT USING (true);

-- RACE RESULTS
CREATE TABLE public.race_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  driver_id text NOT NULL,
  position int,
  status text,
  finished boolean NOT NULL DEFAULT true,
  fastest_lap boolean NOT NULL DEFAULT false,
  pole boolean NOT NULL DEFAULT false,
  UNIQUE (race_id, driver_id)
);
GRANT SELECT ON public.race_results TO authenticated, anon;
GRANT ALL ON public.race_results TO service_role;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results readable by everyone" ON public.race_results FOR SELECT USING (true);

-- PREDICTIONS
CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  top10 text[] NOT NULL DEFAULT '{}',
  pole_driver_id text,
  fastest_lap_driver_id text,
  dnf_driver_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, race_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own predictions select" ON public.predictions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own predictions insert" ON public.predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own predictions update" ON public.predictions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- LOCK ENFORCEMENT
CREATE OR REPLACE FUNCTION public.enforce_prediction_locks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
BEGIN
  SELECT race_at, qualifying_at INTO r FROM public.races WHERE id = NEW.race_id;
  IF r IS NULL THEN
    RAISE EXCEPTION 'Unknown race';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF now() >= r.race_at THEN
      RAISE EXCEPTION 'Predictions are locked: the race has started';
    END IF;
    IF r.qualifying_at IS NOT NULL AND now() >= r.qualifying_at AND NEW.pole_driver_id IS NOT NULL THEN
      RAISE EXCEPTION 'Pole position picks are locked: qualifying has started';
    END IF;
  ELSE
    IF now() >= r.race_at THEN
      IF NEW.top10 IS DISTINCT FROM OLD.top10
         OR NEW.fastest_lap_driver_id IS DISTINCT FROM OLD.fastest_lap_driver_id
         OR NEW.dnf_driver_id IS DISTINCT FROM OLD.dnf_driver_id
         OR NEW.pole_driver_id IS DISTINCT FROM OLD.pole_driver_id THEN
        RAISE EXCEPTION 'Predictions are locked: the race has started';
      END IF;
    ELSIF r.qualifying_at IS NOT NULL AND now() >= r.qualifying_at
          AND NEW.pole_driver_id IS DISTINCT FROM OLD.pole_driver_id THEN
      RAISE EXCEPTION 'Pole position picks are locked: qualifying has started';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER predictions_lock_guard BEFORE INSERT OR UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_prediction_locks();

-- SCORES
CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  points int NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, race_id)
);
GRANT SELECT ON public.scores TO authenticated, anon;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores readable by everyone" ON public.scores FOR SELECT USING (true);