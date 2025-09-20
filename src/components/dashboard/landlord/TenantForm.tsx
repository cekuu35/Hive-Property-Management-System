import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties } from '@/hooks/useProperties';
import { CreateTenantData, Tenant } from '@/hooks/useTenants';

interface TenantFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTenantData) => Promise<boolean>;
  tenant?: Tenant;
  mode: 'create' | 'edit';
}

export const TenantForm = ({ open, onOpenChange, onSubmit, tenant, mode }: TenantFormProps) => {
  const { properties, units, loading: propertiesLoading, getPropertyUnits } = useProperties();
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    unit_id: '',
    rent_amount: '',
    deposit_amount: ''
  });

  // Get available units for selected property (properly sorted)
  const availableUnits = selectedProperty ? 
    getPropertyUnits(selectedProperty).filter(unit => {
      if (mode === 'edit' && tenant) {
        // For editing, include the current unit even if occupied
        return unit.status === 'vacant' || unit.id === tenant.unit_id;
      }
      // For creating, only show vacant units
      return unit.status === 'vacant';
    }) : [];

  // Initialize form data when tenant changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && tenant) {
      setFormData({
        first_name: tenant.first_name || '',
        last_name: tenant.last_name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        unit_id: tenant.unit_id,
        rent_amount: tenant.rent_amount.toString(),
        deposit_amount: tenant.deposit_amount.toString()
      });
      
      // Find the property for this unit
      const unit = units.find(u => u.id === tenant.unit_id);
      if (unit) {
        setSelectedProperty(unit.property_id);
      }
      
      // Set dates
      if (tenant.lease_start) {
        setStartDate(new Date(tenant.lease_start));
      }
      if (tenant.lease_end) {
        setEndDate(new Date(tenant.lease_end));
      }
    } else {
      // Reset form for create mode
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        unit_id: '',
        rent_amount: '',
        deposit_amount: ''
      });
      setSelectedProperty('');
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, [mode, tenant, units]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      return;
    }

    setLoading(true);
    
    const tenantData: CreateTenantData = {
      ...formData,
      rent_amount: parseFloat(formData.rent_amount),
      deposit_amount: parseFloat(formData.deposit_amount),
      lease_start: format(startDate, 'yyyy-MM-dd'),
      lease_end: format(endDate, 'yyyy-MM-dd')
    };

    const success = await onSubmit(tenantData);
    if (success) {
      onOpenChange(false);
    }
    
    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Tenant' : 'Edit Tenant'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  disabled={mode === 'edit'} // Don't allow email changes in edit mode
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+254 712 345 678"
                />
              </div>
            </div>
          </div>

          {/* Unit Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Unit Assignment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select 
                  value={selectedProperty} 
                  onValueChange={setSelectedProperty}
                  disabled={propertiesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select 
                  value={formData.unit_id} 
                  onValueChange={(value) => handleInputChange('unit_id', value)}
                  disabled={!selectedProperty}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map(unit => (
                      <SelectItem key={unit.id} value={unit.id}>
                        Unit {unit.unit_number} - KES {unit.rent_amount.toLocaleString()}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lease Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lease Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lease Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Lease End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rent_amount">Monthly Rent (KES) *</Label>
                <Input
                  id="rent_amount"
                  type="number"
                  value={formData.rent_amount}
                  onChange={(e) => handleInputChange('rent_amount', e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">Security Deposit (KES) *</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  value={formData.deposit_amount}
                  onChange={(e) => handleInputChange('deposit_amount', e.target.value)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : mode === 'create' ? 'Add Tenant' : 'Update Tenant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};