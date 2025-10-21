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
import { toast } from 'sonner';

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

    // Validate move-in date
    if (!formData.preferred_move_in_date) {
      toast.error('Please select a preferred move-in date');
      return;
    }

    const moveInDate = new Date(formData.preferred_move_in_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const maxFutureDate = new Date();
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 6); // Max 6 months in future

    if (moveInDate < today) {
      toast.error('Move-in date cannot be in the past');
      return;
    }

    if (moveInDate > maxFutureDate) {
      toast.error('Move-in date cannot be more than 6 months in the future');
      return;
    }

    // Validate employment information
    if (!formData.employment_info.employer || !formData.employment_info.employer.trim()) {
      toast.error('Please provide your current employer');
      return;
    }

    if (!formData.employment_info.position || !formData.employment_info.position.trim()) {
      toast.error('Please provide your job position');
      return;
    }

    if (!formData.employment_info.monthly_income || formData.employment_info.monthly_income.trim() === '') {
      toast.error('Please provide your monthly income');
      return;
    }

    const monthlyIncome = parseInt(formData.employment_info.monthly_income);
    if (isNaN(monthlyIncome) || monthlyIncome <= 0) {
      toast.error('Please provide a valid monthly income');
      return;
    }

    // Verify income is at least 3x the rent
    if (monthlyIncome < unit.rent_amount * 3) {
      toast.error(`Your monthly income should be at least 3x the monthly rent (KES ${(unit.rent_amount * 3).toLocaleString()})`);
      return;
    }

    // Validate personal reference
    if (!formData.personal_references[0].name || !formData.personal_references[0].name.trim()) {
      toast.error('Please provide at least one personal reference name');
      return;
    }

    if (!formData.personal_references[0].phone || !formData.personal_references[0].phone.trim()) {
      toast.error('Please provide a phone number for your personal reference');
      return;
    }

    if (!formData.personal_references[0].relationship || !formData.personal_references[0].relationship.trim()) {
      toast.error('Please provide your relationship with the reference');
      return;
    }

    // Check for duplicate application (optional but good UX)
    // This check would need the applications list from useUnitApplications
    // const existingApplication = applications.find(
    //   app => app.unit_id === unit.id && app.status !== 'withdrawn'
    // );
    // if (existingApplication) {
    //   toast.error(`You already have a ${existingApplication.status} application for this unit`);
    //   return;
    // }

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
            <Label htmlFor="moveInDate">
              Preferred Move-in Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="moveInDate"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              max={new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              value={formData.preferred_move_in_date}
              onChange={(e) => setFormData(prev => ({ ...prev, preferred_move_in_date: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Select a date between today and 6 months from now
            </p>
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
                  <Label htmlFor="employer">
                    Current Employer <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="employer"
                    placeholder="Company name"
                    required
                    value={formData.employment_info.employer}
                    onChange={(e) => updateEmploymentInfo('employer', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">
                    Position/Job Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="position"
                    placeholder="Your job title"
                    required
                    value={formData.employment_info.position}
                    onChange={(e) => updateEmploymentInfo('position', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income">
                    Monthly Income (KES) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="income"
                    type="number"
                    placeholder="50000"
                    min="1"
                    required
                    value={formData.employment_info.monthly_income}
                    onChange={(e) => updateEmploymentInfo('monthly_income', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum: KES {(unit.rent_amount * 3).toLocaleString()} (3x rent)
                  </p>
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
                  <Label htmlFor="refName">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="refName"
                    placeholder="Reference full name"
                    required
                    value={formData.personal_references[0].name}
                    onChange={(e) => updateReference(0, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">
                    Relationship <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="relationship"
                    placeholder="Friend, Family, Colleague"
                    required
                    value={formData.personal_references[0].relationship}
                    onChange={(e) => updateReference(0, 'relationship', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="refPhone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="refPhone"
                    placeholder="+254 712 345 678"
                    required
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