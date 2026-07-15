
-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  name TEXT,
  bearing_type TEXT,
  nominal_inner_dia NUMERIC,
  nominal_outer_dia NUMERIC,
  nominal_width NUMERIC,
  has_laser_marking BOOLEAN NOT NULL DEFAULT false,
  laser_text TEXT,
  packing_type TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products open all" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- TOLERANCES (all nullable — filled only when known)
CREATE TABLE public.product_tolerances (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  inner_dia_min NUMERIC, inner_dia_max NUMERIC,
  outer_dia_min NUMERIC, outer_dia_max NUMERIC,
  width_min NUMERIC, width_max NUMERIC,
  noise_max NUMERIC,
  vibration_low_max NUMERIC, vibration_mid_max NUMERIC, vibration_high_max NUMERIC,
  radial_play_min NUMERIC, radial_play_max NUMERIC,
  hardness_inner_min NUMERIC, hardness_inner_max NUMERIC,
  hardness_outer_min NUMERIC, hardness_outer_max NUMERIC,
  unit_dim TEXT DEFAULT 'μm',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_tolerances TO anon, authenticated;
GRANT ALL ON public.product_tolerances TO service_role;
ALTER TABLE public.product_tolerances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tolerances open all" ON public.product_tolerances FOR ALL USING (true) WITH CHECK (true);

-- JOBS
CREATE TABLE public.test_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  quantity_total INT NOT NULL DEFAULT 0,
  sample_inner INT NOT NULL DEFAULT 0,
  sample_outer INT NOT NULL DEFAULT 0,
  sample_width INT NOT NULL DEFAULT 0,
  sample_general INT NOT NULL DEFAULT 1,
  instructions TEXT NOT NULL DEFAULT 'normal',
  office_note TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  decision TEXT,
  decision_note TEXT,
  marked_at TIMESTAMPTZ,
  packed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_jobs TO anon, authenticated;
GRANT ALL ON public.test_jobs TO service_role;
ALTER TABLE public.test_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs open all" ON public.test_jobs FOR ALL USING (true) WITH CHECK (true);

-- CHECKLIST (office decides what worker must fill)
CREATE TABLE public.job_checklist (
  job_id UUID PRIMARY KEY REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  check_inner_dia BOOLEAN NOT NULL DEFAULT true,
  check_outer_dia BOOLEAN NOT NULL DEFAULT true,
  check_width BOOLEAN NOT NULL DEFAULT true,
  check_noise BOOLEAN NOT NULL DEFAULT false,
  check_vibration BOOLEAN NOT NULL DEFAULT false,
  check_radial_play BOOLEAN NOT NULL DEFAULT false,
  check_hardness BOOLEAN NOT NULL DEFAULT false,
  check_appearance BOOLEAN NOT NULL DEFAULT true,
  check_spin BOOLEAN NOT NULL DEFAULT false,
  check_cage BOOLEAN NOT NULL DEFAULT false,
  check_oil_hole BOOLEAN NOT NULL DEFAULT false,
  check_chamfer BOOLEAN NOT NULL DEFAULT false,
  extra_instructions TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_checklist TO anon, authenticated;
GRANT ALL ON public.job_checklist TO service_role;
ALTER TABLE public.job_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist open all" ON public.job_checklist FOR ALL USING (true) WITH CHECK (true);

-- STATIONS (one per checkpoint, worker claims & fills)
CREATE TABLE public.job_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  checkpoint_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  claimed_by TEXT,
  claimed_date DATE,
  measurements JSONB,
  result TEXT,
  note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, checkpoint_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_stations TO anon, authenticated;
GRANT ALL ON public.job_stations TO service_role;
ALTER TABLE public.job_stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stations open all" ON public.job_stations FOR ALL USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tol_updated BEFORE UPDATE ON public.product_tolerances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.test_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED: 4 bearings from screenshot
INSERT INTO public.products (reference, name, bearing_type, nominal_inner_dia, nominal_outer_dia, nominal_width, has_laser_marking, laser_text, packing_type, remark) VALUES
('61907-2RS-C3-ZEN', '深沟球轴承 61907-2RS-C3', '深沟球', 35, 55, 10, true, 'ZEN', 'Karton einzeln', 'ZEN打字, GCr15表面无伤疤锈蚀, 公差游隙符合国标'),
('61907-2RS-SU-ZEN', '深沟球轴承 61907-2RS-SU', '深沟球', 35, 55, 10, true, 'ZEN', 'Karton einzeln', 'ZEN打字'),
('61907-2RS-ZEN',    '深沟球轴承 61907-2RS',    '深沟球', 35, 55, 10, true, 'ZEN', 'Blister',        'ZEN打字'),
('61907-2Z-C2-ZEN',  '深沟球轴承 61907-2Z-C2',  '深沟球', 35, 55, 10, true, 'ZEN', 'Karton einzeln', 'ZEN打字');

INSERT INTO public.product_tolerances (product_id, inner_dia_min, inner_dia_max, outer_dia_min, outer_dia_max, width_min, width_max, noise_max, radial_play_min, radial_play_max) 
SELECT id, -12, 0, -13, 0, -120, 0, 42, 15, 33 FROM public.products WHERE reference='61907-2RS-C3-ZEN';
INSERT INTO public.product_tolerances (product_id, inner_dia_min, inner_dia_max, outer_dia_min, outer_dia_max, width_min, width_max, noise_max, radial_play_min, radial_play_max)
SELECT id, -12, 0, -13, 0, -120, 0, 42, 6, 20 FROM public.products WHERE reference='61907-2RS-SU-ZEN';
INSERT INTO public.product_tolerances (product_id, inner_dia_min, inner_dia_max, outer_dia_min, outer_dia_max, width_min, width_max, noise_max, radial_play_min, radial_play_max)
SELECT id, -12, 0, -13, 0, -120, 0, 42, 6, 20 FROM public.products WHERE reference='61907-2RS-ZEN';
INSERT INTO public.product_tolerances (product_id, inner_dia_min, inner_dia_max, outer_dia_min, outer_dia_max, width_min, width_max, noise_max, radial_play_min, radial_play_max)
SELECT id, -12, 0, -13, 0, -120, 0, 42, 1, 11 FROM public.products WHERE reference='61907-2Z-C2-ZEN';
