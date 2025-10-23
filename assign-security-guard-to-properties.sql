-- =====================================================
-- Assign Security Guard to All Properties
-- =====================================================
-- This allows the security guard to create incidents for any property
-- =====================================================

-- Option 1: Assign by email (if you know the email)
DO $$
DECLARE
    guard_id UUID;
BEGIN
    -- Get security guard UUID by email
    SELECT id INTO guard_id
    FROM public.profiles
    WHERE email = 'apollonjenga97@gmail.com' -- Replace with actual security guard email
    AND role = 'security';

    -- If guard found, assign to all properties
    IF guard_id IS NOT NULL THEN
        INSERT INTO public.staff_assignments (staff_id, property_id, role, is_active)
        SELECT guard_id, p.id, 'security', true
        FROM public.properties p
        ON CONFLICT (staff_id, property_id, role) DO NOTHING;
        
        RAISE NOTICE 'Security guard % assigned to % properties', guard_id, (SELECT COUNT(*) FROM public.properties);
    ELSE
        RAISE NOTICE 'Security guard not found with that email';
    END IF;
END $$;

-- Option 2: Assign ALL security guards to all properties
-- Uncomment if you want to assign all security staff
/*
INSERT INTO public.staff_assignments (staff_id, property_id, role, is_active)
SELECT p.id, prop.id, 'security', true
FROM public.profiles p
CROSS JOIN public.properties prop
WHERE p.role = 'security'
ON CONFLICT (staff_id, property_id, role) DO NOTHING;
*/

-- Verify assignments
SELECT 
    p.email,
    p.first_name,
    p.last_name,
    COUNT(sa.property_id) as assigned_properties
FROM public.profiles p
LEFT JOIN public.staff_assignments sa ON sa.staff_id = p.id AND sa.role = 'security'
WHERE p.role = 'security'
GROUP BY p.id, p.email, p.first_name, p.last_name;



