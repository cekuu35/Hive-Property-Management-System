import { supabaseAdmin } from '@/integrations/supabase/admin';

/**
 * Validates that a profile_id exists in the profiles table
 * @param profileId - The profile ID to validate
 * @returns Promise<boolean> - True if profile exists, false otherwise
 */
export async function validateProfileId(profileId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', profileId)
      .single();

    if (error) {
      console.error('❌ [ProfileValidation] Error validating profile ID:', error);
      return false;
    }

    return !!data?.id;
  } catch (error) {
    console.error('❌ [ProfileValidation] Exception validating profile ID:', error);
    return false;
  }
}

/**
 * Gets the correct profile ID for a given auth user ID
 * @param authUserId - The auth user ID
 * @returns Promise<string | null> - The profile ID if found, null otherwise
 */
export async function getProfileIdByAuthUserId(authUserId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', authUserId)
      .single();

    if (error) {
      console.error('❌ [ProfileValidation] Error getting profile ID by auth user ID:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('❌ [ProfileValidation] Exception getting profile ID by auth user ID:', error);
    return null;
  }
}

/**
 * Validates and corrects a profile_id if it's actually an auth user ID
 * @param profileId - The profile ID to validate/correct
 * @returns Promise<string | null> - The correct profile ID, or null if not found
 */
export async function validateAndCorrectProfileId(profileId: string): Promise<string | null> {
  // First, check if it's already a valid profile ID
  const isValidProfileId = await validateProfileId(profileId);
  if (isValidProfileId) {
    console.log('✅ [ProfileValidation] Profile ID is valid:', profileId);
    return profileId;
  }

  // If not, check if it's an auth user ID
  console.log('🔍 [ProfileValidation] Profile ID not found, checking if it\'s an auth user ID:', profileId);
  const correctProfileId = await getProfileIdByAuthUserId(profileId);
  
  if (correctProfileId) {
    console.log('✅ [ProfileValidation] Found correct profile ID:', correctProfileId);
    return correctProfileId;
  }

  console.error('❌ [ProfileValidation] No valid profile found for ID:', profileId);
  return null;
}

/**
 * Safely updates tenant_info with a profile_id, ensuring it's valid
 * @param tenantId - The tenant_info ID
 * @param profileId - The profile ID to set
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function safeUpdateTenantProfileId(tenantId: string, profileId: string): Promise<boolean> {
  try {
    // Validate the profile ID first
    const validProfileId = await validateAndCorrectProfileId(profileId);
    
    if (!validProfileId) {
      console.error('❌ [ProfileValidation] Cannot update tenant profile_id: invalid profile ID');
      return false;
    }

    // Update the tenant_info with the validated profile ID
    const { error } = await supabaseAdmin
      .from('tenant_info')
      .update({ profile_id: validProfileId })
      .eq('id', tenantId);

    if (error) {
      console.error('❌ [ProfileValidation] Error updating tenant profile_id:', error);
      return false;
    }

    console.log('✅ [ProfileValidation] Successfully updated tenant profile_id:', validProfileId);
    return true;
  } catch (error) {
    console.error('❌ [ProfileValidation] Exception updating tenant profile_id:', error);
    return false;
  }
}




