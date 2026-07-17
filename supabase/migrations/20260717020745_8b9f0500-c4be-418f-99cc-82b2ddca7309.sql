
-- Pallets: office bundles multiple test_jobs onto a pallet with a chosen carton size
CREATE TABLE public.pallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  carton_size TEXT NOT NULL,
  shipment_mode TEXT NOT NULL CHECK (shipment_mode IN ('air','sea')),
  destination_country TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assembling' CHECK (status IN ('assembling','ready_to_pack','packed','shipped')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pallets TO anon, authenticated;
GRANT ALL ON public.pallets TO service_role;
ALTER TABLE public.pallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pallets are open (prototype)" ON public.pallets FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER pallets_updated_at BEFORE UPDATE ON public.pallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add pallet reference on jobs
ALTER TABLE public.test_jobs ADD COLUMN pallet_id UUID REFERENCES public.pallets(id) ON DELETE SET NULL;
CREATE INDEX idx_test_jobs_pallet_id ON public.test_jobs(pallet_id);
