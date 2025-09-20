-- Create tenant_info table to store tenant details managed by landlords
CREATE TABLE public.tenant_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  profile_id UUID NULL, -- Will be linked when tenant signs up
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_info ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant_info
CREATE POLICY "Landlords can manage their tenant info" 
ON public.tenant_info 
FOR ALL 
USING (landlord_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_tenant_info_updated_at
  BEFORE UPDATE ON public.tenant_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update leases table to reference tenant_info instead of profiles directly
ALTER TABLE public.leases 
ADD COLUMN tenant_info_id UUID REFERENCES public.tenant_info(id);

-- Create index for better performance
CREATE INDEX idx_tenant_info_landlord_id ON public.tenant_info(landlord_id);
CREATE INDEX idx_tenant_info_email ON public.tenant_info(email);
CREATE INDEX idx_leases_tenant_info_id ON public.leases(tenant_info_id);