import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Edit, Shield, Wrench, Building } from 'lucide-react';
import { useStaffMembers, StaffMember } from '@/hooks/useStaffMembers';
import { useProperties } from '@/hooks/useProperties';
import { useToast } from '@/hooks/use-toast';
import { StaffCreationService } from '@/services/staffCreationService';
import { useAuth } from '@/hooks/useAuth';

interface StaffEditFormProps {
  staffMember: StaffMember;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const StaffEditForm: React.FC<StaffEditFormProps> = ({ staffMember, onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [formData, setFormData] = useState({
    first_name: staffMember.first_name,
    last_name: staffMember.last_name,
    email: staffMember.email,
    phone: staffMember.phone,
    role: staffMember.role,
    property_ids: staffMember.assignments.map(a => a.property_id),
    notes: staffMember.assignments[0]?.notes || ''
  });

  const { updateStaffMember } = useStaffMembers();
  const { properties } = useProperties();
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    const loadStaffData = async () => {
      if (!profile?.id) {
        setLoadingStaff(false);
        return;
      }

      try {
        setLoadingStaff(true);
        const fullStaffData = await StaffCreationService.getStaffMemberById(staffMember.id, profile.id);
        if (fullStaffData) {
          setFormData({
            first_name: fullStaffData.first_name,
            last_name: fullStaffData.last_name,
            email: fullStaffData.email,
            phone: fullStaffData.phone,
            role: fullStaffData.role,
            property_ids: fullStaffData.assignments.map(a => a.property_id),
            notes: fullStaffData.assignments[0]?.notes || ''
          });
        }
      } catch (error) {
        console.error('Error loading staff data:', error);
      } finally {
        setLoadingStaff(false);
      }
    };

    loadStaffData();
  }, [staffMember.id, profile?.id]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePropertyToggle = (propertyId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      property_ids: checked 
        ? [...prev.property_ids, propertyId]
        : prev.property_ids.filter(id => id !== propertyId)
    }));
  };

  const validateForm = (): string | null => {
    if (!formData.first_name.trim()) return 'First name is required';
    if (!formData.last_name.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (!formData.role) return 'Role is required';
    if (formData.property_ids.length === 0) return 'At least one property must be selected';

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Please enter a valid email address';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Validation Error',
        description: validationError,
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateStaffMember(staffMember.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        property_ids: formData.property_ids,
        notes: formData.notes
      });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Staff member updated successfully!',
        });

        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update staff member',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error updating staff member:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingStaff) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading staff member data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="w-5 h-5" />
          Edit Staff Member
        </CardTitle>
        <CardDescription>
          Update information for {staffMember.first_name} {staffMember.last_name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Role Assignment</h3>
            <div className="space-y-2">
              <Label htmlFor="role">Staff Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'security' | 'caretaker') => handleInputChange('role', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="security">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Security Personnel
                    </div>
                  </SelectItem>
                  <SelectItem value="caretaker">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Caretaker
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Property Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Property Assignment</h3>
            <div className="space-y-2">
              <Label>Select Properties *</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {properties.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No properties available. Please create properties first.
                  </p>
                ) : (
                  properties.map((property) => (
                    <div key={property.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`property-${property.id}`}
                        checked={formData.property_ids.includes(property.id)}
                        onCheckedChange={(checked) => 
                          handlePropertyToggle(property.id, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`property-${property.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          <span className="font-medium">{property.name}</span>
                          <span className="text-sm text-gray-500">- {property.address}</span>
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {formData.property_ids.length > 0 && (
                <p className="text-sm text-gray-600">
                  {formData.property_ids.length} propert{formData.property_ids.length === 1 ? 'y' : 'ies'} selected
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Add any additional notes or instructions..."
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || properties.length === 0}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Staff Member
                </>
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

