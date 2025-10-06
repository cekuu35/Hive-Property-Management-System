-- Allow tenants to view their own tenant_info records
CREATE POLICY "Tenants can view their own tenant info"
ON public.tenant_info
FOR SELECT
USING (
  profile_id IN (
    SELECT id FROM public.profiles
    WHERE user_id = auth.uid()
  )
);