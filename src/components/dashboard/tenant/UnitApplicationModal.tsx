import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, DollarSign, Home, Ruler, Send, Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useUnitApplications } from '@/hooks/useUnitApplications';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UnitApplicationModalProps {
  unit: any;
  property: any;
  open: boolean;
  onClose: () => void;
}

export const UnitApplicationModal = ({ unit, property, open, onClose }: UnitApplicationModalProps) => {
  const { submitApplication } = useUnitApplications();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [documents, setDocuments] = useState<Array<{file: File, type: string, uploading: boolean, uploaded: boolean, url?: string}>>([]);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setDocuments(prev => [...prev, { file, type, uploading: false, uploaded: false }]);
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (documents.length === 0) return [];

    setUploadingDocuments(true);
    const uploadedDocs: Array<{type: string, url: string, name: string}> = [];

    try {
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        setDocuments(prev => prev.map((d, idx) => idx === i ? {...d, uploading: true} : d));

        const fileExt = doc.file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}-${doc.type}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('application-documents')
          .upload(fileName, doc.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Error uploading document:', error);
          toast.error(`Failed to upload ${doc.type}`);
          throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('application-documents')
          .getPublicUrl(fileName);

        uploadedDocs.push({
          type: doc.type,
          url: urlData.publicUrl,
          name: doc.file.name
        });

        setDocuments(prev => prev.map((d, idx) => idx === i ? {...d, uploading: false, uploaded: true, url: urlData.publicUrl} : d));
      }

      return uploadedDocs;
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw error;
    } finally {
      setUploadingDocuments(false);
    }
  };

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

    // Validate ID document upload
    if (!documents.some(d => d.type === 'National ID / Passport')) {
      toast.error('Please upload your National ID or Passport');
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
      // Upload documents first
      let uploadedDocuments: Array<{type: string, url: string, name: string}> = [];
      if (documents.length > 0) {
        toast.info('Uploading documents...');
        uploadedDocuments = await uploadDocuments();
      }

      await submitApplication({
        unit_id: unit.id,
        property_id: property.id,
        application_message: formData.application_message,
        preferred_move_in_date: formData.preferred_move_in_date,
        employment_info: formData.employment_info,
        personal_references: formData.personal_references,
        documents: uploadedDocuments
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
      setDocuments([]);
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

          {/* Document Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Required Documents</CardTitle>
              <CardDescription>Upload identification and supporting documents for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* ID Document */}
                <div className="space-y-2">
                  <Label htmlFor="idDocument" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    National ID / Passport <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="idDocument"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileSelect(e, 'National ID / Passport')}
                      disabled={uploadingDocuments || documents.some(d => d.type === 'National ID / Passport')}
                      className="flex-1"
                    />
                    {documents.some(d => d.type === 'National ID / Passport') && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clear photo or scan of your identification (Max 5MB, JPG/PNG/PDF)
                  </p>
                </div>

                {/* Proof of Income */}
                <div className="space-y-2">
                  <Label htmlFor="incomeProof" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Proof of Income (Optional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="incomeProof"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileSelect(e, 'Proof of Income')}
                      disabled={uploadingDocuments || documents.some(d => d.type === 'Proof of Income')}
                      className="flex-1"
                    />
                    {documents.some(d => d.type === 'Proof of Income') && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Payslip, bank statement, or employment letter
                  </p>
                </div>

                {/* Other Documents */}
                <div className="space-y-2">
                  <Label htmlFor="otherDoc" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Document (Optional)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="otherDoc"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileSelect(e, 'Additional Document')}
                      disabled={uploadingDocuments || documents.some(d => d.type === 'Additional Document')}
                      className="flex-1"
                    />
                    {documents.some(d => d.type === 'Additional Document') && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reference letter, previous lease agreement, etc.
                  </p>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-medium">Selected Documents ({documents.length})</Label>
                  <div className="space-y-2">
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{doc.type}</p>
                            <p className="text-xs text-muted-foreground">{doc.file.name} • {(doc.file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          {doc.uploading && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              Uploading...
                            </div>
                          )}
                          {doc.uploaded && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                          {!doc.uploading && !doc.uploaded && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Message */}
              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> National ID or Passport is required for application verification. Additional documents help strengthen your application.
                  </div>
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