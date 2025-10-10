import { supabaseAdmin } from '@/integrations/supabase/admin';
import { validateAndCorrectProfileId, safeUpdateTenantProfileId } from './profileValidation';

/**
 * Checks and fixes all tenant profile_id mismatches
 * This function should be run periodically to ensure data integrity
 */
export async function checkAndFixAllProfileIds(): Promise<{
  totalChecked: number;
  fixed: number;
  errors: number;
  details: Array<{
    tenantId: string;
    tenantName: string;
    email: string;
    originalProfileId: string;
    correctedProfileId: string | null;
    status: 'valid' | 'fixed' | 'error';
    error?: string;
  }>;
}> {
  console.log('🔍 [DataIntegrityCheck] Starting profile ID integrity check...');
  
  const result = {
    totalChecked: 0,
    fixed: 0,
    errors: 0,
    details: [] as Array<{
      tenantId: string;
      tenantName: string;
      email: string;
      originalProfileId: string;
      correctedProfileId: string | null;
      status: 'valid' | 'fixed' | 'error';
      error?: string;
    }>
  };

  try {
    // Get all tenants with profile_id
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenant_info')
      .select('id, first_name, last_name, email, profile_id')
      .not('profile_id', 'is', null);
      
    if (tenantsError) {
      console.error('❌ [DataIntegrityCheck] Error getting tenants:', tenantsError);
      return result;
    }

    result.totalChecked = tenants.length;
    console.log(`📋 [DataIntegrityCheck] Checking ${tenants.length} tenants with profile_id`);

    for (const tenant of tenants) {
      const detail: {
        tenantId: any;
        tenantName: string;
        email: any;
        originalProfileId: any;
        correctedProfileId: string | null;
        status: 'valid' | 'fixed' | 'error';
        error?: string;
      } = {
        tenantId: tenant.id,
        tenantName: `${tenant.first_name} ${tenant.last_name}`,
        email: tenant.email,
        originalProfileId: tenant.profile_id,
        correctedProfileId: null as string | null,
        status: 'valid' as 'valid' | 'fixed' | 'error'
      };

      try {
        // Validate the profile_id
        const validProfileId = await validateAndCorrectProfileId(tenant.profile_id);
        
        if (!validProfileId) {
          detail.status = 'error';
          detail.error = 'No valid profile found';
          result.errors++;
          console.error(`❌ [DataIntegrityCheck] No valid profile found for tenant ${tenant.first_name} ${tenant.last_name}`);
        } else if (validProfileId !== tenant.profile_id) {
          // Profile ID needs correction
          const updateSuccess = await safeUpdateTenantProfileId(tenant.id, validProfileId);
          
          if (updateSuccess) {
            detail.status = 'fixed';
            detail.correctedProfileId = validProfileId;
            result.fixed++;
            console.log(`✅ [DataIntegrityCheck] Fixed profile_id for ${tenant.first_name} ${tenant.last_name}: ${tenant.profile_id} → ${validProfileId}`);
          } else {
            detail.status = 'error';
            detail.error = 'Failed to update profile_id';
            result.errors++;
            console.error(`❌ [DataIntegrityCheck] Failed to update profile_id for ${tenant.first_name} ${tenant.last_name}`);
          }
        } else {
          // Profile ID is already correct
          detail.status = 'valid';
          console.log(`✅ [DataIntegrityCheck] Profile ID is valid for ${tenant.first_name} ${tenant.last_name}`);
        }
      } catch (error) {
        detail.status = 'error';
        detail.error = error instanceof Error ? error.message : 'Unknown error';
        result.errors++;
        console.error(`❌ [DataIntegrityCheck] Error checking tenant ${tenant.first_name} ${tenant.last_name}:`, error);
      }

      result.details.push(detail);
    }

    console.log(`🎉 [DataIntegrityCheck] Integrity check completed: ${result.fixed} fixed, ${result.errors} errors, ${result.totalChecked - result.fixed - result.errors} valid`);
    return result;
  } catch (error) {
    console.error('❌ [DataIntegrityCheck] Fatal error during integrity check:', error);
    return result;
  }
}

/**
 * Runs a quick check to see if there are any profile_id mismatches
 * Returns true if all profile_ids are valid, false if any issues found
 */
export async function quickProfileIdCheck(): Promise<boolean> {
  try {
    const result = await checkAndFixAllProfileIds();
    return result.errors === 0 && result.fixed === 0;
  } catch (error) {
    console.error('❌ [DataIntegrityCheck] Error in quick check:', error);
    return false;
  }
}




