-- Make zip nullable so users can sign up without it initially
ALTER TABLE public.profiles ALTER COLUMN zip DROP NOT NULL;