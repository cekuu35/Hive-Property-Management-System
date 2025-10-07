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
import { Loader2, UserPlus, CheckCircle, AlertCircle, Mail, Key, Info, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SimpleClientTenantService } from '@/services/simpleClientTenantService';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';

const tenantSchema = z.object({
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
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantCreationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TenantCreationForm = ({ onSuccess, onCancel }: TenantCreationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationResult, setCreationResult] = useState<any>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [emailConflict, setEmailConflict] = useState<any>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { properties, units, loading: propertiesLoading } = useProperties();

  console.log('🔍 TenantCreationForm render:', {
    profile: profile?.id,
    propertiesCount: properties.length,
    unitsCount: units.length,
    propertiesLoading,
    isSubmitting,
    showCredentials
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      rent_amount: 0,
      security_deposit: 0,
      property_id: undefined,
      unit_id: undefined,
    }
  });

  const selectedPropertyId = watch('property_id');
  const email = watch('email');

  // Get units for selected property
  const availableUnits = selectedPropertyId 
    ? units.filter(unit => 
        unit.property_id === selectedPropertyId && 
        unit.status === 'vacant'
      )
    : [];

  // Check email availability when email changes
  useEffect(() => {
    const checkEmail = async () => {
      if (email && email.includes('@')) {
        setCheckingEmail(true);
        try {
          const result = await SimpleClientTenantService.checkEmailAvailability(email);
          setEmailConflict(result);
        } catch (error) {
          console.error('Error checking email:', error);
        } finally {
          setCheckingEmail(false);
        }
      } else {
        setEmailConflict(null);
      }
    };

    const timeoutId = setTimeout(checkEmail, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [email]);

  const onSubmit = async (data: TenantFormData) => {
    console.log('🚀 Form submission started with data:', data);
    
    if (!profile?.id) {
      console.error('❌ No profile ID found');
      toast({
        title: "Error",
        description: "Landlord profile not found",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setCreationResult(null);

    // Check for email conflicts before submitting
    if (emailConflict && !emailConflict.available && !emailConflict.canCreateWithRoleSwitch) {
      console.log('❌ Email conflict detected:', emailConflict);
      toast({
        title: "Email Conflict",
        description: emailConflict.reason,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('📞 Calling SimpleClientTenantService.createTenant...');
      const result = await SimpleClientTenantService.createTenant(profile.id, data);
      console.log('📞 Service call result:', result);

      if (result.success) {
        console.log('✅ Tenant creation successful');
        setCreationResult(result);
        setShowCredentials(true);
        
        toast({
          title: "Success",
          description: "Tenant created successfully! They can now login with the credentials below.",
        });

        // Send welcome email (in production)
        try {
          await SimpleClientTenantService.sendWelcomeEmail(
            result.email!,
            result.password!,
            `${data.first_name} ${data.last_name}`
          );
          console.log('✅ Welcome email sent');
        } catch (emailError) {
          console.error('❌ Welcome email failed:', emailError);
        }

        // Reset form
        reset();
        
        // Call success callback
        onSuccess?.();
      } else {
        console.error('❌ Tenant creation failed:', result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to create tenant",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error creating tenant:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseCredentials = () => {
    setShowCredentials(false);
    setCreationResult(null);
    setPasswordCopied(false);
  };

  const copyPassword = async () => {
    if (creationResult?.password) {
      try {
        await navigator.clipboard.writeText(creationResult.password);
        setPasswordCopied(true);
        toast({
          title: "Password Copied",
          description: "Temporary password copied to clipboard",
        });
        setTimeout(() => setPasswordCopied(false), 2000);
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Could not copy password to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  if (showCredentials && creationResult) {
    console.log('🔍 Password display debug:', {
      showCredentials,
      creationResult,
      password: creationResult.password,
      email: creationResult.email
    });
    
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Tenant Created Successfully!
          </CardTitle>
          <CardDescription>
            The tenant has been created and their login credentials are ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              <strong>Email:</strong> {creationResult.email}
            </AlertDescription>
          </Alert>
          
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>Temporary Password:</strong> 
                <span className="ml-2 font-mono text-lg bg-gray-100 px-2 py-1 rounded">
                  {creationResult.password || 'NO PASSWORD GENERATED'}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyPassword}
                className="ml-4"
              >
                {passwordCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Ready to Login:</strong> The tenant can now login to the tenant portal
              using the email and password above. They will see their active lease and can pay rent immediately.
            </AlertDescription>
          </Alert>

          {!creationResult.auth_created && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Manual Account Creation Required:</strong> The tenant account was created but the login credentials need to be set up manually. 
                Use the email and password above to create the account in the Supabase dashboard or have the tenant sign up with these credentials.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">Important:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Save these credentials securely</li>
              <li>• The tenant should change their password on first login</li>
              <li>• A welcome email has been sent to the tenant</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCloseCredentials} variant="outline">
              Create Another Tenant
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
          <UserPlus className="h-5 w-5" />
          Create New Tenant
        </CardTitle>
        <CardDescription>
          Add a new tenant to your property management system. They will receive login credentials automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                {checkingEmail && (
                  <p className="text-sm text-blue-600 mt-1">Checking email availability...</p>
                )}
                {emailConflict && !emailConflict.available && (
                  <Alert className="mt-2">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {emailConflict.reason}
                      {emailConflict.canCreateWithRoleSwitch && (
                        <div className="mt-2 text-sm">
                          <strong>Note:</strong> The tenant will be able to switch between roles when logging in.
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                {emailConflict && emailConflict.available && (
                  <p className="text-sm text-green-600 mt-1">✓ Email is available</p>
                )}
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

          {/* Property and Unit Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Property Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property">Property</Label>
                <Select onValueChange={(value) => {
                  setValue('property_id', value);
                  setValue('unit_id', undefined); // Reset unit selection when property changes
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
                <Select onValueChange={(value) => setValue('unit_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !selectedPropertyId 
                        ? "Select a property first" 
                        : availableUnits.length === 0 
                          ? "No vacant units available" 
                          : "Select a unit"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.length === 0 ? (
                      <SelectItem value="no-units-available" disabled>
                        {!selectedPropertyId 
                          ? "Please select a property first" 
                          : "No vacant units available"}
                      </SelectItem>
                    ) : (
                      availableUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          Unit {unit.unit_number} - {unit.type}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedPropertyId && availableUnits.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No vacant units available in this property
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>

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
                  Creating Tenant...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Tenant
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
