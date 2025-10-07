import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';

const tenantSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters').max(100),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address').max(255),
  phone: z.string().min(10, 'Phone number must be at least 10 characters').max(20),
  unit_id: z.string().min(1, 'Please select a unit'),
  lease_start: z.string().min(1, 'Please select a lease start date'),
  lease_end: z.string().min(1, 'Please select a lease end date'),
  rent_amount: z.number().min(0, 'Rent amount must be positive'),
  deposit_amount: z.number().min(0, 'Deposit amount must be positive'),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantCreationFormProps {
  onSuccess?: (credentials?: { email: string; password: string; tenantName: string }) => void;
  onCancel?: () => void;
}

export const TenantCreationForm = ({ onSuccess, onCancel }: TenantCreationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { properties, units, loading: propertiesLoading } = useProperties();
  const { createTenant } = useTenants();

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
      deposit_amount: 0,
    }
  });

  const selectedPropertyId = watch('unit_id');

  // Get property for selected unit
  const selectedUnit = units.find(u => u.id === selectedPropertyId);
  const propertyForUnit = selectedUnit ? properties.find(p => p.id === selectedUnit.property_id) : null;

  // Get vacant units
  const availableUnits = units.filter(unit => unit.status === 'vacant');

  // Auto-fill rent and deposit when unit is selected
  useEffect(() => {
    if (selectedUnit) {
      setValue('rent_amount', selectedUnit.rent_amount || 0);
      setValue('deposit_amount', selectedUnit.deposit_amount || 0);
    }
  }, [selectedUnit, setValue]);

  const onSubmit = async (data: TenantFormData) => {
    setIsSubmitting(true);

    try {
      // Ensure all required fields are present
      const tenantData = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        unit_id: data.unit_id,
        lease_start: data.lease_start,
        lease_end: data.lease_end,
        rent_amount: data.rent_amount,
        deposit_amount: data.deposit_amount,
      };

      const result = await createTenant(tenantData);

      if (result.success) {
        toast({
          title: "Success",
          description: "Tenant created successfully!",
        });
        reset();
        onSuccess?.(result.credentials);
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Create New Tenant
        </CardTitle>
        <CardDescription>
          Add a new tenant and create their lease automatically
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
                  disabled={isSubmitting}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive mt-1">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  {...register('last_name')}
                  placeholder="Enter last name"
                  disabled={isSubmitting}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive mt-1">{errors.last_name.message}</p>
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
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="Enter phone number"
                  disabled={isSubmitting}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Unit Assignment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Unit Assignment</h3>
              <p className="text-sm text-muted-foreground">
                Rent and deposit will auto-fill when you select a unit
              </p>
            </div>
            <div>
              <Label htmlFor="unit">Unit *</Label>
              <Select 
                onValueChange={(value) => setValue('unit_id', value)}
                disabled={isSubmitting || propertiesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    availableUnits.length === 0 
                      ? "No vacant units available" 
                      : "Select a unit"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.length === 0 ? (
                    <SelectItem value="no-units" disabled>
                      No vacant units available
                    </SelectItem>
                  ) : (
                    availableUnits.map((unit) => {
                      const property = properties.find(p => p.id === unit.property_id);
                      return (
                        <SelectItem key={unit.id} value={unit.id}>
                          {property?.name} - Unit {unit.unit_number} ({unit.type}) - KES {unit.rent_amount?.toLocaleString() || 0}/month
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {errors.unit_id && (
                <p className="text-sm text-destructive mt-1">{errors.unit_id.message}</p>
              )}
              {availableUnits.length === 0 && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need to create vacant units before adding tenants. Go to Properties section to add units.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Selected Unit Summary */}
              {selectedUnit && propertyForUnit && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Selected Unit Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700 font-medium">Property:</span>
                      <p className="text-green-800">{propertyForUnit.name}</p>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Unit:</span>
                      <p className="text-green-800">Unit {selectedUnit.unit_number} ({selectedUnit.type})</p>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Monthly Rent:</span>
                      <p className="text-green-800 font-semibold">KES {selectedUnit.rent_amount?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Security Deposit:</span>
                      <p className="text-green-800 font-semibold">KES {selectedUnit.deposit_amount?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lease Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Lease Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lease_start">Lease Start Date *</Label>
                <Input
                  id="lease_start"
                  type="date"
                  {...register('lease_start')}
                  disabled={isSubmitting}
                />
                {errors.lease_start && (
                  <p className="text-sm text-destructive mt-1">{errors.lease_start.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lease_end">Lease End Date *</Label>
                <Input
                  id="lease_end"
                  type="date"
                  {...register('lease_end')}
                  disabled={isSubmitting}
                />
                {errors.lease_end && (
                  <p className="text-sm text-destructive mt-1">{errors.lease_end.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rent_amount">Monthly Rent (KES) *</Label>
                <Input
                  id="rent_amount"
                  type="number"
                  {...register('rent_amount', { valueAsNumber: true })}
                  placeholder="Enter monthly rent"
                  disabled={isSubmitting}
                  className={selectedUnit ? "bg-blue-50 border-blue-200" : ""}
                />
                {selectedUnit && (
                  <p className="text-xs text-blue-600 mt-1">
                    Auto-filled from selected unit (you can edit if needed)
                  </p>
                )}
                {errors.rent_amount && (
                  <p className="text-sm text-destructive mt-1">{errors.rent_amount.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="deposit_amount">Security Deposit (KES) *</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  {...register('deposit_amount', { valueAsNumber: true })}
                  placeholder="Enter security deposit"
                  disabled={isSubmitting}
                  className={selectedUnit ? "bg-blue-50 border-blue-200" : ""}
                />
                {selectedUnit && (
                  <p className="text-xs text-blue-600 mt-1">
                    Auto-filled from selected unit (you can edit if needed)
                  </p>
                )}
                {errors.deposit_amount && (
                  <p className="text-sm text-destructive mt-1">{errors.deposit_amount.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || availableUnits.length === 0}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Tenant
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
