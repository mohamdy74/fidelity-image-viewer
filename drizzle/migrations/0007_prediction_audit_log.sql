CREATE TABLE public.prediction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL,
  user_id uuid NOT NULL,
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.prediction_logs TO authenticated;
GRANT ALL ON public.prediction_logs TO service_role;
ALTER TABLE public.prediction_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs readable" ON public.prediction_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "locked race logs readable by league" ON public.prediction_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.races r WHERE r.id = prediction_logs.race_id AND r.race_at <= now()));
CREATE INDEX prediction_logs_race_idx ON public.prediction_logs (race_id, created_at);

CREATE OR REPLACE FUNCTION public.log_prediction_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ch jsonb := '{}'::jsonb;
  act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := CASE WHEN coalesce(array_length(NEW.top10,1),0) = 10 THEN 'locked' ELSE 'pole' END;
    ch := jsonb_build_object('top10', NEW.top10, 'pole', NEW.pole_driver_id, 'fl', NEW.fastest_lap_driver_id, 'dnf', NEW.dnf_driver_id);
  ELSE
    IF NEW.top10 IS DISTINCT FROM OLD.top10 THEN ch := ch || jsonb_build_object('top10', jsonb_build_array(to_jsonb(OLD.top10), to_jsonb(NEW.top10))); END IF;
    IF NEW.pole_driver_id IS DISTINCT FROM OLD.pole_driver_id THEN ch := ch || jsonb_build_object('pole', jsonb_build_array(OLD.pole_driver_id, NEW.pole_driver_id)); END IF;
    IF NEW.fastest_lap_driver_id IS DISTINCT FROM OLD.fastest_lap_driver_id THEN ch := ch || jsonb_build_object('fl', jsonb_build_array(OLD.fastest_lap_driver_id, NEW.fastest_lap_driver_id)); END IF;
    IF NEW.dnf_driver_id IS DISTINCT FROM OLD.dnf_driver_id THEN ch := ch || jsonb_build_object('dnf', jsonb_build_array(OLD.dnf_driver_id, NEW.dnf_driver_id)); END IF;
    IF ch = '{}'::jsonb THEN RETURN NEW; END IF;
    act := CASE WHEN coalesce(array_length(OLD.top10,1),0) < 10 AND coalesce(array_length(NEW.top10,1),0) = 10 THEN 'locked'
                WHEN ch ?| array['top10','fl','dnf'] THEN 'edited' ELSE 'pole' END;
  END IF;
  INSERT INTO public.prediction_logs (prediction_id, user_id, race_id, action, changes)
  VALUES (NEW.id, NEW.user_id, NEW.race_id, act, ch);
  RETURN NEW;
END;
$$;

CREATE TRIGGER predictions_audit_log AFTER INSERT OR UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.log_prediction_change();