import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MultiplePhotoUpload } from '@/components/ui/PhotoUpload';
import { PhotoGallery } from '@/components/ui/PhotoGallery';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useAuth } from '@/hooks/useAuth';

interface MaintenanceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Priority = 'low' | 'medium' | 'high' | 'emergency';
type Category = 'plumbing' | 'electrical' | 'hvac' | 'appliances' | 'general' | 'pest_control' | 'security';

export const MaintenanceRequestModal = ({ isOpen, onClose, onSuccess }: MaintenanceRequestModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    category: 'general' as Category,
    preferredDate: '',
  });
  const { toast } = useToast();
  const { createMaintenanceRequest, debugTenantUnitAssignment } = useMaintenanceRequests();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const success = await createMaintenanceRequest({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        preferredDate: formData.preferredDate || undefined,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
      });
      
      if (success) {
        // Reset form
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          category: 'general',
          preferredDate: '',
        });
        setUploadedImages([]);
        onSuccess?.(); // Call the success callback to refresh data
        onClose();
      }
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (results: Array<{ url: string; path: string; size: number }>) => {
    const newUrls = results.map(result => result.url);
    setUploadedImages(prev => [...prev, ...newUrls]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDebugUnitAssignment = async () => {
    try {
      await debugTenantUnitAssignment();
      toast({
        title: "Debug Info",
        description: "Check the browser console for detailed unit assignment information.",
      });
    } catch (error) {
      toast({
        title: "Debug Failed",
        description: "Failed to retrieve debug information.",
        variant: "destructive"
      });
    }
  };

  const categoryOptions = [
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'hvac', label: 'HVAC/AC' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'general', label: 'General Repair' },
    { value: 'pest_control', label: 'Pest Control' },
    { value: 'security', label: 'Security' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', description: 'Can wait a few days' },
    { value: 'medium', label: 'Medium', description: 'Should be addressed soon' },
    { value: 'high', label: 'High', description: 'Needs immediate attention' },
    { value: 'emergency', label: 'Emergency', description: 'Safety concern or major issue' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Maintenance Request</DialogTitle>
          <DialogDescription>
            Describe the issue you're experiencing and we'll assign it to our maintenance team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Request Title *</Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Leaking kitchen faucet"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <select 
              className="w-full p-3 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              required
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-background text-foreground">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-4">
            <Label>Priority Level *</Label>
            <RadioGroup value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
              {priorityOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="cursor-pointer flex-1">
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Please provide as much detail as possible about the issue..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Preferred Date */}
          <div className="space-y-2">
            <Label htmlFor="preferredDate">Preferred Service Date</Label>
            <Input
              id="preferredDate"
              type="date"
              value={formData.preferredDate}
              onChange={(e) => handleInputChange('preferredDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <Label>Photos (Optional)</Label>
            
            {/* Photo Gallery */}
            {uploadedImages.length > 0 && (
              <PhotoGallery
                photos={uploadedImages}
                onRemove={removeImage}
                maxColumns={3}
                showActions={true}
                allowFullscreen={true}
                className="mb-4"
              />
            )}

            {/* Upload Component */}
            <MultiplePhotoUpload
              onUpload={handleImageUpload}
              currentPhotos={uploadedImages}
              bucket="maintenance-photos"
              path={user?.id || 'anonymous'}
              maxSize={10}
              compress={true}
              quality={0.8}
              maxPhotos={5}
              placeholder="Click to upload maintenance photos"
            />
          </div>

          {/* Debug Button (only for development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleDebugUnitAssignment}
                className="w-full"
              >
                Debug Unit Assignment
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};