-- Add monitoring and recovery system for tenant creation failures

-- Create a table to track tenant creation attempts and failures
CREATE TABLE IF NOT EXISTS public.tenant_creation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.unit_applications(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attempting', 'success', 'failed', 'recovered')),
  error_message TEXT,
  rollback_actions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tenant_creation_logs
ALTER TABLE public.tenant_creation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant_creation_logs
CREATE POLICY "Landlords can view tenant creation logs for their properties" 
ON public.tenant_creation_logs 
FOR SELECT 
USING (application_id IN (
  SELECT ua.id 
  FROM public.unit_applications ua
  JOIN public.units u ON ua.unit_id = u.id
  JOIN public.properties p ON u.property_id = p.id
  JOIN public.profiles pr ON p.landlord_id = pr.id
  WHERE pr.user_id = auth.uid()
));

-- Create a function to log tenant creation attempts
CREATE OR REPLACE FUNCTION log_tenant_creation_attempt(
  p_application_id UUID,
  p_tenant_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_rollback_actions JSONB DEFAULT '[]'
) RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.tenant_creation_logs (
    application_id,
    tenant_id,
    status,
    error_message,
    rollback_actions
  ) VALUES (
    p_application_id,
    p_tenant_id,
    p_status,
    p_error_message,
    p_rollback_actions
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to detect orphaned approved applications
CREATE OR REPLACE FUNCTION detect_orphaned_applications()
RETURNS TABLE (
  application_id UUID,
  tenant_name TEXT,
  property_name TEXT,
  unit_number TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  days_since_approval INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id as application_id,
    CONCAT(p.first_name, ' ', p.last_name) as tenant_name,
    prop.name as property_name,
    u.unit_number,
    ua.reviewed_at as approved_at,
    EXTRACT(DAY FROM (NOW() - ua.reviewed_at))::INTEGER as days_since_approval
  FROM public.unit_applications ua
  JOIN public.profiles p ON ua.tenant_id = p.id
  JOIN public.units u ON ua.unit_id = u.id
  JOIN public.properties prop ON u.property_id = prop.id
  LEFT JOIN public.tenant_info ti ON ua.tenant_id = ti.profile_id
  WHERE ua.status = 'approved'
    AND ua.reviewed_at IS NOT NULL
    AND ti.id IS NULL  -- No tenant_info record exists
    AND ua.reviewed_at < NOW() - INTERVAL '1 hour'  -- Approved more than 1 hour ago
  ORDER BY ua.reviewed_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to automatically recover orphaned applications
CREATE OR REPLACE FUNCTION recover_orphaned_applications()
RETURNS INTEGER AS $$
DECLARE
  orphaned_record RECORD;
  recovered_count INTEGER := 0;
  log_id UUID;
BEGIN
  -- Get all orphaned applications
  FOR orphaned_record IN 
    SELECT * FROM detect_orphaned_applications()
  LOOP
    -- Log the recovery attempt
    SELECT log_tenant_creation_attempt(
      orphaned_record.application_id,
      NULL, -- tenant_id will be set after creation
      'attempting',
      'Automatic recovery attempt',
      '[]'::jsonb
    ) INTO log_id;
    
    -- Note: The actual tenant creation would be handled by the application
    -- This function just identifies the orphaned applications
    
    recovered_count := recovered_count + 1;
  END LOOP;
  
  RETURN recovered_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for monitoring tenant creation health
CREATE OR REPLACE VIEW tenant_creation_health AS
SELECT 
  DATE(created_at) as date,
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as error_count
FROM public.tenant_creation_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), status
ORDER BY date DESC, status;

-- Create a function to get tenant creation statistics
CREATE OR REPLACE FUNCTION get_tenant_creation_stats()
RETURNS TABLE (
  total_attempts BIGINT,
  successful_creations BIGINT,
  failed_creations BIGINT,
  recovery_attempts BIGINT,
  success_rate NUMERIC,
  orphaned_applications BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_creations,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_creations,
    COUNT(CASE WHEN status = 'recovered' THEN 1 END) as recovery_attempts,
    ROUND(
      (COUNT(CASE WHEN status = 'success' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 
      2
    ) as success_rate,
    (SELECT COUNT(*) FROM detect_orphaned_applications()) as orphaned_applications
  FROM public.tenant_creation_logs
  WHERE created_at >= NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically log when applications are approved
CREATE OR REPLACE FUNCTION trigger_log_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    PERFORM log_tenant_creation_attempt(
      NEW.id,
      NEW.tenant_id,
      'attempting',
      NULL,
      '[]'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_application_approval
  AFTER UPDATE ON public.unit_applications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_approval();

-- Create a scheduled job to run orphaned application recovery (if pg_cron is available)
-- This would run every hour to check for orphaned applications
-- SELECT cron.schedule('recover-orphaned-applications', '0 * * * *', 'SELECT recover_orphaned_applications();');

-- Grant necessary permissions
GRANT SELECT ON tenant_creation_health TO authenticated;
GRANT EXECUTE ON FUNCTION detect_orphaned_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_creation_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION recover_orphaned_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION log_tenant_creation_attempt(UUID, UUID, TEXT, TEXT, JSONB) TO authenticated;




