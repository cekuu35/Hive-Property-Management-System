import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, Shield, Wrench, Building, AlertCircle } from 'lucide-react';
import { useStaffMembers, CreateStaffData } from '@/hooks/useStaffMembers';
import { useProperties } from '@/hooks/useProperties';
import { useToast } from '@/hooks/use-toast';

interface StaffCreationFormProps {
  onSuccess?: (credentials: { email: string; password: string; role: string }) => void;
  onCancel?: () => void;
}

export const StaffCreationForm: React.FC<StaffCreationFormProps> = ({ onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateStaffData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'security',
    property_ids: [],
    notes: ''
  });
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; role: string } | null>(null);

  const { createStaffMember } = useStaffMembers();
  const { properties } = useProperties();
  const { toast } = useToast();

  const handleInputChange = (field: keyof CreateStaffData, value: string | string[]) => {
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
      const result = await createStaffMember(formData);
      
      if (result.success) {
        // Show credentials immediately
        setCreatedCredentials({
          email: result.email!,
          password: result.password!,
          role: result.role!
        });
        setShowCredentials(true);
        
        // Show success toast
        toast({
          title: 'Success',
          description: `${result.role === 'security' ? 'Security' : 'Caretaker'} account created successfully!`,
        });

        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          role: 'security',
          property_ids: [],
          notes: ''
        });

        if (onSuccess) {
          onSuccess({
            email: result.email!,
            password: result.password!,
            role: result.role!
          });
        }
      } else {
        // Show error message
        toast({
          title: 'Error',
          description: result.error || 'Failed to create staff member',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating staff member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Credentials copied to clipboard',
    });
  };

  if (showCredentials && createdCredentials) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Account Created Successfully!</CardTitle>
          <CardDescription>
            {createdCredentials.role === 'security' ? 'Security' : 'Caretaker'} account has been created. 
            Please provide these credentials to the staff member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg space-y-3 border-2 border-blue-200 dark:border-blue-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">Email:</span>
              <div className="flex items-center gap-2">
                <code className="bg-white dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-2 border-blue-300 dark:border-blue-600 px-2 py-1 rounded-md text-sm shadow-inner">{createdCredentials.email}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdCredentials.email)}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">🔑 Password:</span>
              <div className="flex items-center gap-2">
                <code className="bg-white dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-2 border-blue-300 dark:border-blue-600 px-2 py-1 rounded-md text-sm font-mono shadow-inner">{createdCredentials.password}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdCredentials.password)}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Role:</span>
              <span className="capitalize">{createdCredentials.role}</span>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-medium">Important:</p>
                <p>Please save these credentials securely. The password cannot be recovered if lost.</p>
                <p className="mt-2 font-medium">Note: Property assignments will be created after database migration is applied.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowCredentials(false);
                setCreatedCredentials(null);
              }}
              className="flex-1"
            >
              Create Another Account
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Done
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Create Staff Account
        </CardTitle>
        <CardDescription>
          Create accounts for security personnel and caretakers to manage your properties.
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
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Staff Account
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
