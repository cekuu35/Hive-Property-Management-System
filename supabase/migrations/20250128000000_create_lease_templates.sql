-- Create lease_templates table for customizable lease documents
CREATE TABLE IF NOT EXISTS public.lease_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Lease Template',
  header_content TEXT, -- Custom header text
  standard_terms TEXT, -- Custom standard terms section
  additional_terms TEXT, -- Additional terms section
  footer_content TEXT, -- Custom footer text
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(landlord_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lease_templates_landlord_id ON public.lease_templates(landlord_id);
CREATE INDEX IF NOT EXISTS idx_lease_templates_default ON public.lease_templates(landlord_id, is_default) WHERE is_default = true;

-- Enable Row Level Security
ALTER TABLE public.lease_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Landlords can view their own lease templates"
  ON public.lease_templates
  FOR SELECT
  USING (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can insert their own lease templates"
  ON public.lease_templates
  FOR INSERT
  WITH CHECK (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can update their own lease templates"
  ON public.lease_templates
  FOR UPDATE
  USING (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Landlords can delete their own lease templates"
  ON public.lease_templates
  FOR DELETE
  USING (landlord_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_lease_templates_updated_at
  BEFORE UPDATE ON public.lease_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

