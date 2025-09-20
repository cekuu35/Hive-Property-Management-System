-- Create unit_applications table for tenant bookings
CREATE TABLE public.unit_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  application_message TEXT,
  preferred_move_in_date DATE,
  employment_info JSONB DEFAULT '{}',
  personal_references JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  UNIQUE(tenant_id, unit_id) -- Prevent duplicate applications for same unit
);

-- Enable RLS on unit_applications
ALTER TABLE public.unit_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for unit_applications
CREATE POLICY "Tenants can view their own applications" 
ON public.unit_applications 
FOR SELECT 
USING (tenant_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can create applications" 
ON public.unit_applications 
FOR INSERT 
WITH CHECK (tenant_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can update their pending applications" 
ON public.unit_applications 
FOR UPDATE 
USING (tenant_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND status = 'pending');

CREATE POLICY "Landlords can view applications for their properties" 
ON public.unit_applications 
FOR SELECT 
USING (property_id IN (
  SELECT p.id 
  FROM public.properties p 
  JOIN public.profiles pr ON p.landlord_id = pr.id 
  WHERE pr.user_id = auth.uid()
));

CREATE POLICY "Landlords can update applications for their properties" 
ON public.unit_applications 
FOR UPDATE 
USING (property_id IN (
  SELECT p.id 
  FROM public.properties p 
  JOIN public.profiles pr ON p.landlord_id = pr.id 
  WHERE pr.user_id = auth.uid()
));

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_unit_applications_updated_at
BEFORE UPDATE ON public.unit_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update properties table to be visible to tenants for browsing
CREATE POLICY "Properties are viewable by authenticated users for browsing" 
ON public.properties 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update units table to be visible to tenants for browsing
CREATE POLICY "Units are viewable by authenticated users for browsing" 
ON public.units 
FOR SELECT 
USING (auth.uid() IS NOT NULL OR user_can_view_unit(id));