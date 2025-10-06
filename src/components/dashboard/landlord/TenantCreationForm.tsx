import { useState } from 'react';
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
import { Loader2, UserPlus, CheckCircle, AlertCircle, Mail, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TenantCreationService, CreateTenantData } from '@/services/tenantCreationService';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';

const tenantSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
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
  const { toast } = useToast();
  const { profile } = useAuth();
  const { properties, loading: propertiesLoading } = useProperties();

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
    }
  });

  const selectedPropertyId = watch('unit_id');

  // Get units for selected property
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const availableUnits = selectedProperty?.units?.filter(unit => unit.status === 'available') || [];

  const onSubmit = async (data: TenantFormData) => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Landlord profile not found",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setCreationResult(null);

    try {
      const result = await TenantCreationService.createTenant(profile.id, data);

      if (result.success) {
        setCreationResult(result);
        setShowCredentials(true);
        
        toast({
          title: "Success",
          description: "Tenant created successfully!",
        });

        // Send welcome email (in production)
        await TenantCreationService.sendWelcomeEmail(
          result.email!,
          result.password!,
          `${data.first_name} ${data.last_name}`
        );

        // Reset form
        reset();
        
        // Call success callback
        onSuccess?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create tenant",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating tenant:', error);
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
  };

  if (showCredentials && creationResult) {
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
            <AlertDescription>
              <strong>Temporary Password:</strong> {creationResult.password}
            </AlertDescription>
          </Alert>

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
                <Select onValueChange={(value) => setValue('unit_id', value)}>
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
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        Unit {unit.unit_number} - {unit.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
