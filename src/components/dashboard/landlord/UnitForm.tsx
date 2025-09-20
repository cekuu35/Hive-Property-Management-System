import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { ImageUpload } from './ImageUpload';

interface UnitFormProps {
  unit?: any;
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
}

const unitTypes = [
  'Studio', 'One Bedroom', 'Two Bedroom', 'Three Bedroom', 'Four Bedroom', 
  'Penthouse', 'Loft', 'Duplex', 'Townhouse'
];

const unitStatuses = [
  { value: 'vacant', label: 'Vacant' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Under Maintenance' }
];

export const UnitForm = ({ unit, propertyId, open, onOpenChange, onSubmit }: UnitFormProps) => {
  const [formData, setFormData] = useState({
    unit_number: '',
    type: '',
    rent_amount: '',
    deposit_amount: '',
    square_feet: '',
    status: 'vacant',
    images: [] as string[],
    amenities: [] as string[]
  });
  const [newAmenity, setNewAmenity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (unit) {
      setFormData({
        unit_number: unit.unit_number || '',
        type: unit.type || '',
        rent_amount: unit.rent_amount?.toString() || '',
        deposit_amount: unit.deposit_amount?.toString() || '',
        square_feet: unit.square_feet?.toString() || '',
        status: unit.status || 'vacant',
        images: unit.images || [],
        amenities: unit.amenities || []
      });
    } else {
      setFormData({
        unit_number: '',
        type: '',
        rent_amount: '',
        deposit_amount: '',
        square_feet: '',
        status: 'vacant',
        images: [],
        amenities: []
      });
    }
  }, [unit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const unitData = {
        property_id: propertyId,
        unit_number: formData.unit_number,
        type: formData.type,
        rent_amount: parseFloat(formData.rent_amount),
        deposit_amount: parseFloat(formData.deposit_amount),
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
        status: formData.status,
        images: formData.images,
        amenities: formData.amenities
      };
      
      await onSubmit(unitData);
      onOpenChange(false);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter(a => a !== amenity)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{unit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          <DialogDescription>
            {unit ? 'Update unit information' : 'Create a new unit in this property'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit_number">Unit Number *</Label>
              <Input
                id="unit_number"
                value={formData.unit_number}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_number: e.target.value }))}
                placeholder="e.g., 2A, 101, B-12"
                required
              />
            </div>
            <div>
              <Label htmlFor="type">Unit Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit type" />
                </SelectTrigger>
                <SelectContent>
                  {unitTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Financial Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rent_amount">Monthly Rent (KES) *</Label>
              <Input
                id="rent_amount"
                type="number"
                value={formData.rent_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, rent_amount: e.target.value }))}
                placeholder="e.g., 25000"
                min="0"
                step="100"
                required
              />
            </div>
            <div>
              <Label htmlFor="deposit_amount">Security Deposit (KES) *</Label>
              <Input
                id="deposit_amount"
                type="number"
                value={formData.deposit_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, deposit_amount: e.target.value }))}
                placeholder="e.g., 50000"
                min="0"
                step="100"
                required
              />
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="square_feet">Square Feet</Label>
              <Input
                id="square_feet"
                type="number"
                value={formData.square_feet}
                onChange={(e) => setFormData(prev => ({ ...prev, square_feet: e.target.value }))}
                placeholder="e.g., 800"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {unitStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Images */}
          <ImageUpload
            images={formData.images}
            onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
            entityId={unit?.id || `${propertyId}-new-unit`}
            maxImages={8}
          />

          {/* Unit Amenities */}
          <div>
            <Label>Unit Amenities</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Add amenity (e.g., Balcony, AC)"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
              />
              <Button type="button" onClick={addAmenity} variant="outline">
                Add
              </Button>
            </div>
            {formData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.amenities.map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {amenity}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeAmenity(amenity)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : (unit ? 'Update Unit' : 'Create Unit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};