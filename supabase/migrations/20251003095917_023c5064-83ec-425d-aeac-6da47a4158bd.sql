-- Create contractors table for maintenance management
CREATE TABLE IF NOT EXISTS public.contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  rating NUMERIC NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  hourly_rate NUMERIC,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- Create policies for contractors
CREATE POLICY "Landlords can manage their contractors"
ON public.contractors
FOR ALL
USING (landlord_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contractors_updated_at
BEFORE UPDATE ON public.contractors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_contractors_landlord_id ON public.contractors(landlord_id);
CREATE INDEX IF NOT EXISTS idx_contractors_specialty ON public.contractors(specialty);
CREATE INDEX IF NOT EXISTS idx_contractors_is_active ON public.contractors(is_active);