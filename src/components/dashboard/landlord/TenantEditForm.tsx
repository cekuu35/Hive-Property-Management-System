import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { Key, AlertCircle, CheckCircle, Eye } from 'lucide-react';

const editTenantSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
  tenant_status: z.enum(['active', 'inactive', 'suspended']),
  payment_status: z.enum(['paid', 'unpaid', 'overdue']),
  current_balance: z.number().min(0, 'Balance cannot be negative'),
});

type EditTenantFormData = z.infer<typeof editTenantSchema>;

interface TenantEditFormProps {
  tenant: any;
  onSuccess: () => void;
  onCancel: () => void;
  onResetPassword?: (email: string) => void;
}

export const TenantEditForm = ({ tenant, onSuccess, onCancel, onResetPassword }: TenantEditFormProps) => {
  const [loading, setLoading] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditTenantFormData>({
    resolver: zodResolver(editTenantSchema),
    defaultValues: {
      first_name: tenant?.tenant_info?.first_name || '',
      last_name: tenant?.tenant_info?.last_name || '',
      email: tenant?.tenant_info?.email || '',
      phone: tenant?.tenant_info?.phone || '',
      emergency_contact_name: tenant?.tenant_info?.emergency_contact_name || '',
      emergency_contact_phone: tenant?.tenant_info?.emergency_contact_phone || '',
      notes: tenant?.tenant_info?.notes || '',
      tenant_status: tenant?.tenant_info?.tenant_status || 'active',
      payment_status: tenant?.tenant_info?.payment_status || 'unpaid',
      current_balance: tenant?.tenant_info?.current_balance || 0,
    },
  });

  const onSubmit = async (data: EditTenantFormData) => {
    try {
      setLoading(true);

      // Update tenant_info record
      const { error: tenantInfoError } = await supabaseAdmin
        .from('tenant_info')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          notes: data.notes || null,
          tenant_status: data.tenant_status,
          payment_status: data.payment_status,
          current_balance: data.current_balance,
        })
        .eq('id', tenant.tenant_info.id);

      if (tenantInfoError) {
        throw tenantInfoError;
      }

      // If email changed, update the auth user email
      if (data.email !== tenant.tenant_info.email) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          tenant.tenant_info.profile_id,
          { email: data.email }
        );

        if (authError) {
          console.warn('Failed to update auth user email:', authError);
          // Don't throw here, the tenant_info was updated successfully
        }
      }

      toast.success('Tenant information updated successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShowCurrentPassword = async () => {
    console.log('🔍 [TenantEditForm] Checking password for tenant:', tenant);
    console.log('🔍 [TenantEditForm] Profile ID:', tenant?.tenant_info?.profile_id);
    
    if (!tenant?.tenant_info?.profile_id) {
      toast.error('No profile ID found for this tenant. The tenant may not have an account yet.');
      return;
    }

    try {
      setPasswordLoading(true);
      
      // First, get the user_id from the profiles table
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('id', tenant.tenant_info.profile_id)
        .single();

      if (profileError || !profileData?.user_id) {
        console.error('❌ [TenantEditForm] Error fetching profile:', profileError);
        toast.error('Profile not found. The tenant may not have a complete account setup.');
        return;
      }

      console.log('🔍 [TenantEditForm] Found user_id:', profileData.user_id);
      
      // Get the current user data using the user_id
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
        profileData.user_id
      );

      console.log('🔍 [TenantEditForm] User data response:', userData);
      console.log('🔍 [TenantEditForm] User error:', userError);

      if (userError) {
        console.error('❌ [TenantEditForm] Error fetching user:', userError);
        throw userError;
      }

      if (userData?.user) {
        // We can't get the actual password, but we can show that the account exists
        setCurrentPassword('***HIDDEN***');
        setShowCurrentPassword(true);
        toast.info('Password is hidden for security. Use "Reset Password" to generate a new one.');
      } else {
        toast.error('User account not found');
      }
    } catch (error) {
      console.error('❌ [TenantEditForm] Error fetching user data:', error);
      toast.error(`Failed to fetch user information: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    console.log('🔍 [TenantEditForm] Resetting password for tenant:', tenant);
    console.log('🔍 [TenantEditForm] Email:', tenant?.tenant_info?.email);
    console.log('🔍 [TenantEditForm] Profile ID:', tenant?.tenant_info?.profile_id);
    
    if (!tenant?.tenant_info?.email) {
      toast.error('No email address found for this tenant');
      return;
    }

    if (!tenant?.tenant_info?.profile_id) {
      toast.error('No profile ID found for this tenant. The tenant may not have an account yet.');
      return;
    }

    try {
      setResetPasswordLoading(true);
      setPasswordResetSuccess(false);

      // First, get the user_id from the profiles table
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('id', tenant.tenant_info.profile_id)
        .single();

      if (profileError || !profileData?.user_id) {
        console.error('❌ [TenantEditForm] Error fetching profile:', profileError);
        toast.error('Profile not found. The tenant may not have a complete account setup.');
        return;
      }

      console.log('🔍 [TenantEditForm] Found user_id:', profileData.user_id);

      // Generate a new random password
      const newPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      console.log('🔍 [TenantEditForm] Generated new password, updating user...');
      
      // Update the auth user password using the user_id
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        profileData.user_id,
        { password: newPassword }
      );

      console.log('🔍 [TenantEditForm] Auth update response:', { authError });

      if (authError) {
        console.error('❌ [TenantEditForm] Auth error:', authError);
        throw authError;
      }

      setPasswordResetSuccess(true);
      setCurrentPassword(newPassword);
      setShowCurrentPassword(true);
      toast.success('Password reset successfully! New password generated.');
      
      // Show the new password to the landlord
      if (onResetPassword) {
        onResetPassword(tenant.tenant_info.email);
      }
    } catch (error) {
      console.error('❌ [TenantEditForm] Error resetting password:', error);
      toast.error(`Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update the tenant's personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  {...register('first_name')}
                  className={errors.first_name ? 'border-red-500' : ''}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  {...register('last_name')}
                  className={errors.last_name ? 'border-red-500' : ''}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.last_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>Emergency contact information (optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  {...register('emergency_contact_name')}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  {...register('emergency_contact_phone')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>Manage tenant account and payment status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenant_status">Tenant Status</Label>
                <Select
                  value={watch('tenant_status')}
                  onValueChange={(value) => setValue('tenant_status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select
                  value={watch('payment_status')}
                  onValueChange={(value) => setValue('payment_status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="current_balance">Current Balance (KES)</Label>
                <Input
                  id="current_balance"
                  type="number"
                  step="0.01"
                  {...register('current_balance', { valueAsNumber: true })}
                  className={errors.current_balance ? 'border-red-500' : ''}
                />
                {errors.current_balance && (
                  <p className="text-sm text-red-500 mt-1">{errors.current_balance.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Management */}
        {tenant?.tenant_info?.profile_id && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Password Management
              </CardTitle>
              <CardDescription>View and manage the tenant's login password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You can view the current password status or reset it to generate a new temporary password.
                </AlertDescription>
              </Alert>
              
              {/* Current Password Display */}
              {showCurrentPassword && (
                <div className="p-4 bg-gray-50 border rounded-lg">
                  <Label className="text-sm font-medium text-muted-foreground">Current Password</Label>
                  <div className="mt-2 p-3 bg-white border rounded-lg">
                    <p className="font-mono text-base font-semibold text-gray-800">
                      {currentPassword}
                    </p>
                    {currentPassword === '***HIDDEN***' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Password is hidden for security. Reset to generate a new one.
                      </p>
                    )}
                    {currentPassword !== '***HIDDEN***' && (
                      <p className="text-sm text-green-600 mt-1">
                        ✅ New password generated - share this with the tenant
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {passwordResetSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Password reset successfully! A new temporary password has been generated.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShowCurrentPassword}
                  disabled={passwordLoading}
                  className="flex-1"
                >
                  {passwordLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Checking...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Current Password
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetPassword}
                  disabled={resetPasswordLoading}
                  className="flex-1"
                >
                  {resetPasswordLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Reset Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Additional notes about this tenant (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('notes')}
              placeholder="Enter any additional notes about this tenant..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              'Update Tenant'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
