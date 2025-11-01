-- Add missing columns to lease_templates if they don't exist
ALTER TABLE public.lease_templates 
ADD COLUMN IF NOT EXISTS header_content TEXT;

ALTER TABLE public.lease_templates 
ADD COLUMN IF NOT EXISTS standard_terms TEXT;

ALTER TABLE public.lease_templates 
ADD COLUMN IF NOT EXISTS additional_terms TEXT;

ALTER TABLE public.lease_templates 
ADD COLUMN IF NOT EXISTS footer_content TEXT;

