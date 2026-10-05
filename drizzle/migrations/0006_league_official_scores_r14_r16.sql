ALTER TABLE public.predictions DISABLE TRIGGER predictions_lock_guard;
UPDATE public.predictions SET
  top10 = ARRAY['max_verstappen','antonelli','hamilton','russell','norris','leclerc','piastri','hadjar','gasly','lawson'],
  pole_driver_id='max_verstappen', fastest_lap_driver_id='max_verstappen', dnf_driver_id='sainz', updated_at=now()
WHERE id='38aa1a8b-caa8-4c84-a7b2-54acf3c3e7ae';
ALTER TABLE public.predictions ENABLE TRIGGER predictions_lock_guard;

UPDATE public.scores SET points=8,
  breakdown='{"top10":2,"pole":3,"fastestLap":3,"dnf":0,"perfect":0,"perfectTop10":false,"perfectWeekend":false,"total":8}'::jsonb, updated_at=now()
WHERE user_id='0e4835bf-adfa-42bc-b671-8ec3f35bb20c' AND race_id='730391bf-8c3b-4bc6-b5ff-ebb1a3dd1b33';

INSERT INTO public.scores (user_id, race_id, points, breakdown) VALUES
('746f335e-b2f5-49a1-8a61-dd045a2a7dfd','5018a795-9074-4775-a681-ef4608b45527',13,'{"manual":true,"total":13}'),
('0e4835bf-adfa-42bc-b671-8ec3f35bb20c','5018a795-9074-4775-a681-ef4608b45527',13,'{"manual":true,"total":13}'),
('b851645e-8ccc-46a2-b180-a101dfb3dae9','5018a795-9074-4775-a681-ef4608b45527',12,'{"manual":true,"total":12}'),
('fbae0e81-deb4-485f-bf2b-bf6078f52cd1','5018a795-9074-4775-a681-ef4608b45527',12,'{"manual":true,"total":12}'),
('6252a581-52a5-46e5-955b-ed5667d75cdb','5018a795-9074-4775-a681-ef4608b45527',9,'{"manual":true,"total":9}'),
('fbae0e81-deb4-485f-bf2b-bf6078f52cd1','97e60ab0-8f41-4d7a-978d-60d36e52ef03',8,'{"manual":true,"total":8}'),
('6252a581-52a5-46e5-955b-ed5667d75cdb','97e60ab0-8f41-4d7a-978d-60d36e52ef03',5,'{"manual":true,"total":5}'),
('746f335e-b2f5-49a1-8a61-dd045a2a7dfd','97e60ab0-8f41-4d7a-978d-60d36e52ef03',-4,'{"manual":true,"total":-4}'),
('0e4835bf-adfa-42bc-b671-8ec3f35bb20c','97e60ab0-8f41-4d7a-978d-60d36e52ef03',-7,'{"manual":true,"total":-7}'),
('b851645e-8ccc-46a2-b180-a101dfb3dae9','97e60ab0-8f41-4d7a-978d-60d36e52ef03',-14,'{"manual":true,"noSubmission":true,"total":-14}')
ON CONFLICT (user_id, race_id) DO UPDATE SET points=EXCLUDED.points, breakdown=EXCLUDED.breakdown, updated_at=now();