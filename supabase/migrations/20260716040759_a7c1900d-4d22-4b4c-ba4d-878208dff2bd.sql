
ALTER TABLE public.test_jobs
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS customer text,
  ADD COLUMN IF NOT EXISTS supplier text,
  ADD COLUMN IF NOT EXISTS incoming_qty integer,
  ADD COLUMN IF NOT EXISTS laser_text text,
  ADD COLUMN IF NOT EXISTS storage_location text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by text,
  ADD COLUMN IF NOT EXISTS defect_count integer,
  ADD COLUMN IF NOT EXISTS defect_note text,
  ADD COLUMN IF NOT EXISTS shipment_mode text,
  ADD COLUMN IF NOT EXISTS destination_country text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipment_status text;

CREATE TABLE IF NOT EXISTS public.job_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.test_jobs(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  note text,
  status text NOT NULL DEFAULT 'open',
  done_by text,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_returns TO anon, authenticated;
GRANT ALL ON public.job_returns TO service_role;

ALTER TABLE public.job_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "returns open all" ON public.job_returns;
CREATE POLICY "returns open all" ON public.job_returns FOR ALL USING (true) WITH CHECK (true);
