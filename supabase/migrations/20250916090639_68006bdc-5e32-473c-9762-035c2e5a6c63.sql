-- Create visitor requests and management system

-- Create visitor_requests table for tenant-initiated visitor pre-registration
CREATE TABLE public.visitor_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT,
  purpose TEXT NOT NULL,
  expected_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_duration INTEGER, -- in minutes
  special_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by UUID, -- tenant profile id who approved
  approved_at TIMESTAMP WITH TIME ZONE,
  security_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visitors table for actual visitor check-ins (managed by security)
CREATE TABLE public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_request_id UUID, -- optional link to pre-approval
  security_id UUID NOT NULL, -- security staff who registered visitor
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT,
  visiting_unit_id UUID, -- unit being visited
  visiting_tenant_id UUID, -- tenant being visited
  purpose TEXT NOT NULL,
  time_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  time_out TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checked_out')),
  security_notes TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.visitor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visitor_requests
CREATE POLICY "Tenants can create their own visitor requests" 
ON public.visitor_requests 
FOR INSERT 
WITH CHECK (tenant_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Tenants can view their own visitor requests" 
ON public.visitor_requests 
FOR SELECT 
USING (tenant_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Tenants can update their pending visitor requests" 
ON public.visitor_requests 
FOR UPDATE 
USING (
  tenant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) 
  AND status = 'pending'
);

CREATE POLICY "Security can view all visitor requests" 
ON public.visitor_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'security'
  )
);

CREATE POLICY "Security can update visitor request status" 
ON public.visitor_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'security'
  )
);

-- RLS Policies for visitors
CREATE POLICY "Security can manage all visitor records" 
ON public.visitors 
FOR ALL 
USING (
  security_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'security'
  )
);

CREATE POLICY "Tenants can view visitors to their units" 
ON public.visitors 
FOR SELECT 
USING (
  visiting_tenant_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Landlords can view visitors to their properties" 
ON public.visitors 
FOR SELECT 
USING (
  visiting_unit_id IN (
    SELECT u.id 
    FROM units u
    JOIN properties p ON u.property_id = p.id
    JOIN profiles pr ON p.landlord_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_visitor_requests_updated_at
BEFORE UPDATE ON public.visitor_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at
BEFORE UPDATE ON public.visitors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_visitor_requests_tenant_id ON public.visitor_requests(tenant_id);
CREATE INDEX idx_visitor_requests_status ON public.visitor_requests(status);
CREATE INDEX idx_visitor_requests_expected_arrival ON public.visitor_requests(expected_arrival);
CREATE INDEX idx_visitors_security_id ON public.visitors(security_id);
CREATE INDEX idx_visitors_visiting_unit_id ON public.visitors(visiting_unit_id);
CREATE INDEX idx_visitors_visiting_tenant_id ON public.visitors(visiting_tenant_id);
CREATE INDEX idx_visitors_status ON public.visitors(status);
CREATE INDEX idx_visitors_time_in ON public.visitors(time_in);