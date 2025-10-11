-- Create landlords table for multi-landlord support
CREATE TABLE IF NOT EXISTS public.landlords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subaccount_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for landlords
CREATE POLICY "Landlords can view their own data" ON public.landlords
    FOR SELECT
    USING (id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "Landlords can update their own data" ON public.landlords
    FOR UPDATE
    USING (id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    ));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.landlords TO authenticated;
GRANT ALL ON public.landlords TO service_role;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_landlords_subaccount_code ON public.landlords(subaccount_code);
CREATE INDEX IF NOT EXISTS idx_landlords_email ON public.landlords(email);
