import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUtilityBills } from '@/hooks/useUtilityBills';
import { useProperties } from '@/hooks/useProperties';
import { useLandlordTenants } from '@/hooks/useLandlordTenants';
import { toast } from 'sonner';
import { Calendar, Building2, User, Zap, Droplets, Wifi } from 'lucide-react';

const createBillSchema = z.object({
  unit_id: z.string().min(1, 'Unit is required'),
  utility_id: z.string().min(1, 'Utility is required'),
  month: z.string().min(1, 'Month is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  due_date: z.string().min(1, 'Due date is required'),
  tenant_id: z.string().optional(),
  notes: z.string().optional()
});

type CreateBillFormData = z.infer<typeof createBillSchema>;

interface CreateBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const getUtilityIcon = (utilityName: string) => {
  switch (utilityName.toLowerCase()) {
    case 'water':
      return <Droplets className="h-4 w-4" />;
    case 'electricity':
      return <Zap className="h-4 w-4" />;
    case 'internet':
      return <Wifi className="h-4 w-4" />;
    default:
      return <Zap className="h-4 w-4" />;
  }
};

export const CreateBillModal = ({ open, onOpenChange, onSuccess }: CreateBillModalProps) => {
  const { createBill, utilities } = useUtilityBills();
  const { properties } = useProperties();
  const { tenants } = useLandlordTenants();
  const [loading, setLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch
  } = useForm<CreateBillFormData>({
    resolver: zodResolver(createBillSchema),
    defaultValues: {
      unit_id: '',
      utility_id: '',
      month: '',
      amount: 0,
      due_date: '',
      tenant_id: '',
      notes: ''
    }
  });

  const watchedUnitId = watch('unit_id');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      reset();
      setSelectedUnit('');
      setSelectedTenant('');
    }
  }, [open, reset]);

  // Auto-select tenant when unit changes
  useEffect(() => {
    if (watchedUnitId) {
      const unit = properties
        .flatMap(p => p.units || [])
        .find(u => u.id === watchedUnitId);
      
      if (unit) {
        // Find tenant for this unit
        const tenant = tenants.find(t => 
          t.tenant_info.unit_id === watchedUnitId
        );
        
        if (tenant) {
          setValue('tenant_id', tenant.tenant_info.id);
          setSelectedTenant(tenant.tenant_info.id);
        } else {
          setValue('tenant_id', '');
          setSelectedTenant('');
        }
      }
    }
  }, [watchedUnitId, properties, tenants, setValue]);

  const onSubmit = async (data: CreateBillFormData) => {
    try {
      setLoading(true);
      
      await createBill({
        unit_id: data.unit_id,
        utility_id: data.utility_id,
        month: data.month,
        amount: data.amount,
        due_date: data.due_date,
        tenant_id: data.tenant_id || undefined
      });

      toast.success('Utility bill created successfully');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedUnit('');
    setSelectedTenant('');
    onOpenChange(false);
  };

  // Get current month as default
  const currentMonth = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Get next month for due date
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const defaultDueDate = nextMonth.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Create Utility Bill
          </DialogTitle>
          <DialogDescription>
            Add a new utility bill for one of your units. The tenant will be notified automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unit Selection */}
            <div className="space-y-2">
              <Label htmlFor="unit_id">Unit *</Label>
              <Select
                value={selectedUnit}
                onValueChange={(value) => {
                  setSelectedUnit(value);
                  setValue('unit_id', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => 
                    property.units?.map(unit => (
                      <SelectItem key={unit.id} value={unit.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{property.name} - Unit {unit.unit_number}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.unit_id && (
                <p className="text-sm text-red-500">{errors.unit_id.message}</p>
              )}
            </div>

            {/* Utility Selection */}
            <div className="space-y-2">
              <Label htmlFor="utility_id">Utility *</Label>
              <Select
                onValueChange={(value) => setValue('utility_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select utility" />
                </SelectTrigger>
                <SelectContent>
                  {utilities.map(utility => (
                    <SelectItem key={utility.id} value={utility.id}>
                      <div className="flex items-center gap-2">
                        {getUtilityIcon(utility.name)}
                        <span>{utility.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.utility_id && (
                <p className="text-sm text-red-500">{errors.utility_id.message}</p>
              )}
            </div>

            {/* Month */}
            <div className="space-y-2">
              <Label htmlFor="month">Month *</Label>
              <Input
                id="month"
                placeholder={currentMonth}
                {...register('month')}
              />
              {errors.month && (
                <p className="text-sm text-red-500">{errors.month.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                e.g., "October 2025" or "Oct 2025"
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="due_date"
                  type="date"
                  defaultValue={defaultDueDate}
                  className="pl-10"
                  {...register('due_date')}
                />
              </div>
              {errors.due_date && (
                <p className="text-sm text-red-500">{errors.due_date.message}</p>
              )}
            </div>

            {/* Tenant Selection (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Tenant (Optional)</Label>
              <Select
                value={selectedTenant}
                onValueChange={(value) => {
                  setSelectedTenant(value);
                  setValue('tenant_id', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No tenant assigned</SelectItem>
                  {tenants.map(tenant => (
                    <SelectItem key={tenant.tenant_info.id} value={tenant.tenant_info.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{tenant.tenant_info.first_name} {tenant.tenant_info.last_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If no tenant is selected, the bill will be available for any tenant in the unit
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this bill..."
              {...register('notes')}
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedUnit && (
            <Alert>
              <AlertDescription>
                <strong>Preview:</strong> This bill will be created for the selected unit and 
                {selectedTenant ? ' assigned to the selected tenant' : ' available for any tenant in the unit'}.
                The tenant will receive a notification about the new bill.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Bill'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};





