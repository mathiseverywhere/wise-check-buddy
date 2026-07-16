ALTER TABLE public.test_jobs ADD COLUMN IF NOT EXISTS inspection_tag text;
ALTER TABLE public.test_jobs ADD COLUMN IF NOT EXISTS transported_by text;
ALTER TABLE public.test_jobs ADD COLUMN IF NOT EXISTS transported_at timestamptz;