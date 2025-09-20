import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { DocumentUpload } from './DocumentUpload';

interface PropertyFormProps {
  property?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
}

export const PropertyForm = ({ property, open, onOpenChange, onSubmit }: PropertyFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    number_of_units: 1,
    images: [] as string[],
    amenities: [] as string[],
    policies_documents: [] as any[]
  });
  const [newAmenity, setNewAmenity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || '',
        address: property.address || '',
        description: property.description || '',
        number_of_units: property.total_units || 1,
        images: property.images || [],
        amenities: property.amenities || [],
        policies_documents: property.policies_documents || []
      });
    } else {
      setFormData({
        name: '',
        address: '',
        description: '',
        number_of_units: 1,
        images: [],
        amenities: [],
        policies_documents: []
      });
    }
  }, [property, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (property) {
        // For edits, don't include number_of_units
        const { number_of_units, ...editData } = formData;
        await onSubmit(editData);
      } else {
        // For creation, include number_of_units
        await onSubmit(formData);
      }
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
          <DialogTitle>{property ? 'Edit Property' : 'Add New Property'}</DialogTitle>
          <DialogDescription>
            {property ? 'Update property information' : 'Create a new rental property in your portfolio'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Sunset Apartments"
                required
              />
            </div>
            {!property && (
              <div>
                <Label htmlFor="units">Number of Units *</Label>
                <Input
                  id="units"
                  type="number"
                  min="1"
                  max="500"
                  value={formData.number_of_units}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_units: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>
            )}
            <div className={!property ? "md:col-span-2" : ""}>
              <Label htmlFor="address">Full Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g., 123 Westlands Road, Nairobi"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your property..."
              rows={3}
            />
          </div>

          {/* Images */}
          <ImageUpload
            images={formData.images}
            onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
            entityId={property?.id || 'new-property'}
            maxImages={10}
          />

          {/* Policy Documents */}
          <DocumentUpload
            documents={formData.policies_documents}
            onDocumentsChange={(documents) => setFormData(prev => ({ ...prev, policies_documents: documents }))}
            entityId={property?.id || 'new-property'}
            maxDocuments={10}
          />

          {/* Amenities */}
          <div>
            <Label>Property Amenities</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Add amenity (e.g., Swimming Pool)"
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
              {submitting ? 'Saving...' : (property ? 'Update Property' : 'Create Property')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};