import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, DollarSign, Home, Ruler, Send } from 'lucide-react';
import { useUnitApplications } from '@/hooks/useUnitApplications';

interface UnitApplicationModalProps {
  unit: any;
  property: any;
  open: boolean;
  onClose: () => void;
}

export const UnitApplicationModal = ({ unit, property, open, onClose }: UnitApplicationModalProps) => {
  const { submitApplication } = useUnitApplications();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    application_message: '',
    preferred_move_in_date: '',
    employment_info: {
      employer: '',
      position: '',
      monthly_income: '',
      employment_duration: ''
    },
    personal_references: [
      { name: '', relationship: '', phone: '', email: '' }
    ]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!unit || !property) return;

    setLoading(true);
    try {
      await submitApplication({
        unit_id: unit.id,
        property_id: property.id,
        application_message: formData.application_message,
        preferred_move_in_date: formData.preferred_move_in_date,
        employment_info: formData.employment_info,
        personal_references: formData.personal_references
      });
      
      onClose();
      // Reset form
      setFormData({
        application_message: '',
        preferred_move_in_date: '',
        employment_info: {
          employer: '',
          position: '',
          monthly_income: '',
          employment_duration: ''
        },
        personal_references: [
          { name: '', relationship: '', phone: '', email: '' }
        ]
      });
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEmploymentInfo = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      employment_info: {
        ...prev.employment_info,
        [field]: value
      }
    }));
  };

  const updateReference = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      personal_references: prev.personal_references.map((ref, i) => 
        i === index ? { ...ref, [field]: value } : ref
      )
    }));
  };

  if (!unit || !property) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Apply for Unit {unit.unit_number}
          </DialogTitle>
          <DialogDescription>
            {property.name} • {property.address}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Unit Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Unit Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unit:</span>
                  <span className="font-medium">{unit.unit_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{unit.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rent:</span>
                  <span className="font-medium">KES {unit.rent_amount.toLocaleString()}/month</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deposit:</span>
                  <span className="font-medium">KES {unit.deposit_amount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Application Message */}
          <div className="space-y-3">
            <Label htmlFor="message">Application Message</Label>
            <Textarea
              id="message"
              placeholder="Tell us why you're interested in this unit and any additional information you'd like to share..."
              value={formData.application_message}
              onChange={(e) => setFormData(prev => ({ ...prev, application_message: e.target.value }))}
              rows={4}
            />
          </div>

          {/* Preferred Move-in Date */}
          <div className="space-y-3">
            <Label htmlFor="moveInDate">Preferred Move-in Date</Label>
            <Input
              id="moveInDate"
              type="date"
              value={formData.preferred_move_in_date}
              onChange={(e) => setFormData(prev => ({ ...prev, preferred_move_in_date: e.target.value }))}
            />
          </div>

          {/* Employment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Employment Information</CardTitle>
              <CardDescription>Help us verify your ability to pay rent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employer">Current Employer</Label>
                  <Input
                    id="employer"
                    placeholder="Company name"
                    value={formData.employment_info.employer}
                    onChange={(e) => updateEmploymentInfo('employer', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position/Job Title</Label>
                  <Input
                    id="position"
                    placeholder="Your job title"
                    value={formData.employment_info.position}
                    onChange={(e) => updateEmploymentInfo('position', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income">Monthly Income (KES)</Label>
                  <Input
                    id="income"
                    type="number"
                    placeholder="50000"
                    value={formData.employment_info.monthly_income}
                    onChange={(e) => updateEmploymentInfo('monthly_income', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Employment Duration</Label>
                  <Input
                    id="duration"
                    placeholder="2 years"
                    value={formData.employment_info.employment_duration}
                    onChange={(e) => updateEmploymentInfo('employment_duration', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Reference</CardTitle>
              <CardDescription>Provide one personal reference who can vouch for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refName">Full Name</Label>
                  <Input
                    id="refName"
                    placeholder="Reference full name"
                    value={formData.personal_references[0].name}
                    onChange={(e) => updateReference(0, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    placeholder="Friend, Family, Colleague"
                    value={formData.personal_references[0].relationship}
                    onChange={(e) => updateReference(0, 'relationship', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refPhone">Phone Number</Label>
                  <Input
                    id="refPhone"
                    placeholder="+254 712 345 678"
                    value={formData.personal_references[0].phone}
                    onChange={(e) => updateReference(0, 'phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refEmail">Email (Optional)</Label>
                  <Input
                    id="refEmail"
                    type="email"
                    placeholder="reference@email.com"
                    value={formData.personal_references[0].email}
                    onChange={(e) => updateReference(0, 'email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </div>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};