-- Create payments table for transaction logging
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenant_info(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.landlords(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
    payment_method TEXT,
    subaccount_code TEXT,
    paystack_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
CREATE POLICY "Tenants can view their own payments" ON public.payments
    FOR SELECT
    USING (tenant_id IN (
        SELECT id FROM public.tenant_info WHERE profile_id = auth.uid()
    ));

CREATE POLICY "Landlords can view their property payments" ON public.payments
    FOR SELECT
    USING (landlord_id IN (
        SELECT id FROM public.landlords WHERE id IN (
            SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Service role can manage all payments" ON public.payments
    FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_landlord_id ON public.payments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON public.payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
