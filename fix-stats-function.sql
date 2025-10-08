-- Fix the get_tenant_creation_stats function to handle division by zero
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
    CASE 
      WHEN COUNT(*) = 0 THEN 0::NUMERIC
      ELSE ROUND(
        (COUNT(CASE WHEN status = 'success' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 
        2
      )
    END as success_rate,
    (SELECT COUNT(*) FROM detect_orphaned_applications()) as orphaned_applications
  FROM public.tenant_creation_logs
  WHERE created_at >= NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




