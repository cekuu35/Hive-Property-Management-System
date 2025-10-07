import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Mail, 
  Phone, 
  Home,
  DollarSign,
  Calendar,
  Shield,
  Save,
  X,
  Eye,
  Key
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClientTenantCreationService } from '@/services/clientTenantCreationService';
import { useProperties } from '@/hooks/useProperties';
import { format } from 'date-fns';

const tenantEditSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  property_id: z.string().optional(),
  unit_id: z.string().optional(),
  rent_amount: z.number().min(0, 'Rent amount must be positive'),
  security_deposit: z.number().min(0, 'Security deposit must be positive'),
  lease_start_date: z.string().optional(),
  lease_end_date: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
  tenant_status: z.enum(['active', 'pending', 'inactive', 'terminated']),
  payment_status: z.enum(['paid', 'unpaid', 'overdue']),
  current_balance: z.number().min(0, 'Balance must be positive'),
});

type TenantEditFormData = z.infer<typeof tenantEditSchema>;

interface TenantEditFormProps {
  tenant: any;
  onSuccess?: () => void;
  onCancel?: () => void;
  onResetPassword?: (email: string) => void;
}

export const TenantEditForm = ({ 
  tenant, 
  onSuccess, 
  onCancel, 
  onResetPassword 
}: TenantEditFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const { toast } = useToast();
  const { properties, units, getPropertyUnits, loading: propertiesLoading } = useProperties();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<TenantEditFormData>({
    resolver: zodResolver(tenantEditSchema),
    defaultValues: {
      first_name: tenant?.tenant_info?.first_name || '',
      last_name: tenant?.tenant_info?.last_name || '',
      email: tenant?.tenant_info?.email || '',
      phone: tenant?.tenant_info?.phone || '',
      property_id: tenant?.units?.properties?.id || '',
      unit_id: tenant?.units?.id || '',
      rent_amount: tenant?.rent_amount || 0,
      security_deposit: tenant?.security_deposit || 0,
      lease_start_date: tenant?.lease_start_date || '',
      lease_end_date: tenant?.lease_end_date || '',
      emergency_contact_name: tenant?.tenant_info?.emergency_contact_name || '',
      emergency_contact_phone: tenant?.tenant_info?.emergency_contact_phone || '',
      notes: tenant?.tenant_info?.notes || '',
      tenant_status: tenant?.tenant_info?.tenant_status || 'active',
      payment_status: tenant?.tenant_info?.payment_status || 'unpaid',
      current_balance: tenant?.tenant_info?.current_balance || 0,
    }
  });

  const selectedPropertyId = watch('property_id');
  const selectedUnitId = watch('unit_id');
  
  // Set property_id when component mounts if tenant has a unit
  useEffect(() => {
    if (tenant?.units?.properties?.id && !selectedPropertyId) {
      setValue('property_id', tenant.units.properties.id);
    }
  }, [tenant, selectedPropertyId, setValue]);
  
  // Get all units for the selected property
  const availableUnits = selectedPropertyId 
    ? getPropertyUnits(selectedPropertyId).filter(unit => 
        unit.status === 'vacant' || unit.id === tenant?.units?.id
      )
    : [];

  // Debug logging
  console.log('🔍 TenantEditForm debug:', {
    selectedPropertyId,
    selectedUnitId,
    availableUnitsCount: availableUnits.length,
    propertiesCount: properties.length,
    unitsCount: units.length,
    tenantUnits: tenant?.units,
    availableUnits: availableUnits.map(u => ({ id: u.id, number: u.unit_number, rent: u.rent_amount, status: u.status }))
  });

  const onSubmit = async (data: TenantEditFormData) => {
    if (!tenant?.id) {
      toast({
        title: "Error",
        description: "Tenant ID not found",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔄 Starting tenant update process...');
      
      // Update tenant_info table (only tenant-specific fields)
      const tenantInfoUpdates = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        notes: data.notes,
        tenant_status: data.tenant_status,
        payment_status: data.payment_status,
        current_balance: data.current_balance,
      };

      console.log('📝 Updating tenant_info with:', tenantInfoUpdates);

      // Update tenant_info table
      const { error: tenantInfoError } = await ClientTenantCreationService.updateTenantInfo(
        tenant.id, 
        tenantInfoUpdates
      );

      if (tenantInfoError) {
        throw new Error(`Tenant info update failed: ${tenantInfoError}`);
      }

      console.log('✅ Tenant info updated successfully');

      // Update lease information if lease fields are provided
      if (data.lease_start_date || data.lease_end_date || data.rent_amount || data.security_deposit || data.unit_id) {
        console.log('📝 Updating lease information...');
        
        const leaseUpdates = {
          unit_id: data.unit_id,
          rent_amount: data.rent_amount,
          deposit_amount: data.security_deposit,
          start_date: data.lease_start_date,
          end_date: data.lease_end_date,
        };

        console.log('📝 Updating lease with:', leaseUpdates);

        const { error: leaseError } = await ClientTenantCreationService.updateLease(
          tenant.id,
          leaseUpdates
        );

        if (leaseError) {
          console.warn('⚠️ Lease update failed:', leaseError);
          // Don't fail the entire operation if lease update fails
        } else {
          console.log('✅ Lease updated successfully');
        }
      }

      toast({
        title: "Success",
        description: "Tenant information updated successfully!",
      });

      onSuccess?.();
    } catch (error) {
      console.error('❌ Error updating tenant:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update tenant",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!tenant?.tenant_info?.email) {
      toast({
        title: "Error",
        description: "Tenant email not found",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate new password
      const password = generateRandomPassword();
      
      // Update password in Supabase Auth
      const { error } = await ClientTenantCreationService.resetPassword(
        tenant.tenant_info.profile_id,
        password
      );

      if (error) {
        throw new Error(error);
      }

      setNewPassword(password);
      setShowPasswordReset(true);
      
      toast({
        title: "Success",
        description: "Password reset successfully!",
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  if (showPasswordReset && newPassword) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Key className="h-5 w-5" />
            Password Reset Successfully!
          </CardTitle>
          <CardDescription>
            The tenant's password has been reset. Share these new credentials securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>Email:</strong> {tenant?.tenant_info?.email}
            </AlertDescription>
          </Alert>
          
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <strong>New Password:</strong> {newPassword}
            </AlertDescription>
          </Alert>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Important:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Save these credentials securely</li>
              <li>• The tenant should change their password on first login</li>
              <li>• Share these credentials with the tenant immediately</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowPasswordReset(false)} variant="outline">
              Back to Edit Form
            </Button>
            <Button onClick={onCancel}>
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Edit Tenant Information
        </CardTitle>
        <CardDescription>
          Update tenant details, lease information, and account settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tenant Status & Quick Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-medium">{tenant?.tenant_info?.first_name} {tenant?.tenant_info?.last_name}</h3>
                <p className="text-sm text-muted-foreground">{tenant?.tenant_info?.email}</p>
              </div>
              <Badge 
                variant={tenant?.tenant_info?.tenant_status === 'active' ? 'default' : 'secondary'}
                className={
                  tenant?.tenant_info?.tenant_status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }
              >
                {tenant?.tenant_info?.tenant_status || 'Unknown'}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetPassword}
                disabled={!tenant?.tenant_info?.profile_id}
              >
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  {...register('first_name')}
                  placeholder="Enter first name"
                />
                {errors.first_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  {...register('last_name')}
                  placeholder="Enter last name"
                />
                {errors.last_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Property and Unit Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Property Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property">Property</Label>
                <Select onValueChange={(value) => {
                  setValue('property_id', value);
                  setValue('unit_id', ''); // Reset unit selection when property changes
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select onValueChange={(value) => {
                  setValue('unit_id', value);
                  // Auto-update rent amount when unit is selected
                  const selectedUnit = availableUnits.find(u => u.id === value);
                  if (selectedUnit && selectedUnit.rent_amount) {
                    setValue('rent_amount', selectedUnit.rent_amount);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedPropertyId 
                        ? "Select a property first" 
                        : availableUnits.length === 0 
                          ? "No units available" 
                          : "Select a unit"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.length === 0 ? (
                      <SelectItem value="no-units" disabled>
                        {!selectedPropertyId 
                          ? "Please select a property first" 
                          : "No units available"}
                      </SelectItem>
                    ) : (
                      availableUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          Unit {unit.unit_number} - {unit.type} (KES {unit.rent_amount?.toLocaleString() || 0}/month)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedPropertyId && availableUnits.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No units available in this property
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rent_amount">Monthly Rent (KES) *</Label>
                <Input
                  id="rent_amount"
                  type="number"
                  {...register('rent_amount', { valueAsNumber: true })}
                  placeholder="Enter monthly rent"
                />
                {errors.rent_amount && (
                  <p className="text-sm text-red-600 mt-1">{errors.rent_amount.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="security_deposit">Security Deposit (KES) *</Label>
                <Input
                  id="security_deposit"
                  type="number"
                  {...register('security_deposit', { valueAsNumber: true })}
                  placeholder="Enter security deposit"
                />
                {errors.security_deposit && (
                  <p className="text-sm text-red-600 mt-1">{errors.security_deposit.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="current_balance">Current Balance (KES) *</Label>
                <Input
                  id="current_balance"
                  type="number"
                  {...register('current_balance', { valueAsNumber: true })}
                  placeholder="Enter current balance"
                />
                {errors.current_balance && (
                  <p className="text-sm text-red-600 mt-1">{errors.current_balance.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Lease Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Lease Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lease_start_date">Lease Start Date</Label>
                <Input
                  id="lease_start_date"
                  type="date"
                  {...register('lease_start_date')}
                />
              </div>
              <div>
                <Label htmlFor="lease_end_date">Lease End Date</Label>
                <Input
                  id="lease_end_date"
                  type="date"
                  {...register('lease_end_date')}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Status Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenant_status">Tenant Status</Label>
                <Select onValueChange={(value) => setValue('tenant_status', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select onValueChange={(value) => setValue('payment_status', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  {...register('emergency_contact_name')}
                  placeholder="Enter emergency contact name"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  {...register('emergency_contact_phone')}
                  placeholder="Enter emergency contact phone"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Notes</h3>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Enter any additional notes about the tenant"
                rows={3}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Tenant...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Tenant
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
