import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateContractorData } from '@/hooks/useContractors';

interface ContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateContractorData) => Promise<boolean>;
}

const specialties = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'General Repairs',
  'Carpentry',
  'Painting',
  'Appliance Repair',
  'Roofing',
  'Landscaping',
  'Cleaning',
  'Pest Control',
  'Security Systems',
  'Other'
];

export const ContractorModal = ({ isOpen, onClose, onSubmit }: ContractorModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateContractorData>({
    name: '',
    specialty: '',
    phone: '',
    email: '',
    address: '',
    hourly_rate: undefined,
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.specialty) {
      return;
    }

    setLoading(true);
    
    try {
      const success = await onSubmit({
        ...formData,
        hourly_rate: formData.hourly_rate || undefined
      });
      
      if (success) {
        handleClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      specialty: '',
      phone: '',
      email: '',
      address: '',
      hourly_rate: undefined,
      description: ''
    });
    onClose();
  };

  const updateFormData = (field: keyof CreateContractorData, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Contractor</DialogTitle>
          <DialogDescription>
            Add a contractor to your network for maintenance requests
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="Enter contractor name"
              required
            />
          </div>

          <div>
            <Label htmlFor="specialty">Specialty *</Label>
            <Select value={formData.specialty} onValueChange={(value) => updateFormData('specialty', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateFormData('phone', e.target.value)}
              placeholder="+254 712 345 678"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              placeholder="contractor@example.com"
            />
          </div>

          <div>
            <Label htmlFor="hourly_rate">Hourly Rate (KES)</Label>
            <Input
              id="hourly_rate"
              type="number"
              min="0"
              step="0.01"
              value={formData.hourly_rate || ''}
              onChange={(e) => updateFormData('hourly_rate', e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="500.00"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateFormData('address', e.target.value)}
              placeholder="Enter contractor address"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Brief description of services and experience"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim() || !formData.specialty}>
              {loading ? 'Creating...' : 'Create Contractor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
