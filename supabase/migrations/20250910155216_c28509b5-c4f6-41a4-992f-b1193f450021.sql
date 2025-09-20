-- Create expenses table for tracking property expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  property_id UUID,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies for expenses
CREATE POLICY "Landlords can view their expenses" 
ON public.expenses 
FOR SELECT 
USING (landlord_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Landlords can create expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (landlord_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Landlords can update their expenses" 
ON public.expenses 
FOR UPDATE 
USING (landlord_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Landlords can delete their expenses" 
ON public.expenses 
FOR DELETE 
USING (landlord_id IN (
  SELECT profiles.id
  FROM profiles
  WHERE profiles.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add policies to rent_payments for landlords to update payment status
CREATE POLICY "Landlords can update rent payments for their properties" 
ON public.rent_payments 
FOR UPDATE 
USING (lease_id IN (
  SELECT l.id
  FROM leases l
  JOIN units u ON l.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  JOIN profiles pr ON p.landlord_id = pr.id
  WHERE pr.user_id = auth.uid()
));

-- Enable realtime for financial tables
ALTER TABLE public.rent_payments REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.rent_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;