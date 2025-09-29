# Visitor Registration Units Fix

## Problem
The visitor registration form in the security portal was not displaying units in the dropdown when registering a new visitor. This was due to Row Level Security (RLS) policies preventing security personnel from accessing units and leases data.

## Root Cause
The RLS policies in the database only allowed:
- Landlords to view units in their properties
- Tenants to view units they lease

But security personnel were not included in these policies, so they couldn't access the units data needed for visitor registration.

## Solution Implemented

### 1. Database Changes
- **File**: `supabase/migrations/20250120000000_fix_security_access.sql`
- **File**: `apply-security-fix.sql` (for manual application)

Updated the following functions to include security role access:
- `user_can_view_unit()` - Now allows security to view all units
- `user_can_view_lease()` - Now allows security to view all leases

Added new RLS policies:
- `Security can view all profiles` - Allows security to view tenant profiles
- `Security can view all properties` - Allows security to view property information

### 2. Frontend Improvements
- **File**: `src/hooks/useSecurityUnits.tsx`
  - Added comprehensive logging for debugging
  - Improved error handling with detailed error messages
  - Added console logs to track data fetching process

- **File**: `src/components/dashboard/security/VisitorRegistrationModal.tsx`
  - Added loading state for units dropdown
  - Added empty state handling when no units are found
  - Added debug logging to track units data
  - Improved user experience with better placeholder text

## How to Apply the Fix

### Option 1: Using Supabase CLI
```bash
npx supabase db push
```

### Option 2: Manual SQL Execution
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `apply-security-fix.sql`
4. Execute the SQL

## Testing
After applying the database changes:
1. Log in as a security user
2. Navigate to the security portal
3. Open the visitor registration form
4. Check the "Visiting Unit" dropdown - it should now display all occupied units grouped by property
5. Verify that unit details (tenant name, property name) are shown correctly

## Expected Behavior
- Security personnel can now see all occupied units in the visitor registration form
- Units are grouped by property name for better organization
- Each unit shows the unit number and tenant name
- Loading states and error handling provide better user feedback
- Console logs help with debugging if issues persist

## Files Modified
1. `supabase/migrations/20250120000000_fix_security_access.sql` - Database migration
2. `apply-security-fix.sql` - Manual SQL script
3. `src/hooks/useSecurityUnits.tsx` - Enhanced data fetching with logging
4. `src/components/dashboard/security/VisitorRegistrationModal.tsx` - Improved UI and UX
