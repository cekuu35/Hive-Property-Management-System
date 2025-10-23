import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  UserCheck, Phone, MapPin, Clock, AlertCircle, CheckCircle, 
  Building, Users, Calendar, FileText, Camera, QrCode
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useVisitors } from '@/hooks/useVisitors';
import { useSecurityUnits } from '@/hooks/useSecurityUnits';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface VisitorRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefillData?: {
    name?: string;
    phone?: string;
    purpose?: string;
    unit?: string;
  };
}

export const VisitorRegistrationModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  prefillData = {}
}: VisitorRegistrationModalProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { registerVisitor, testVisitorInsert } = useVisitors();
  const { occupiedUnits, getGroupedUnits, loading: unitsLoading } = useSecurityUnits();
  
  const [formData, setFormData] = useState({
    visitor_name: prefillData.name || '',
    visitor_phone: prefillData.phone || '',
    purpose: prefillData.purpose || '',
    visiting_unit_id: prefillData.unit || '',
    emergency_contact: '',
    id_number: '',
    vehicle_plate: '',
    expected_duration: '',
    special_instructions: '',
    visitor_type: 'guest'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>('');

  const groupedUnits = getGroupedUnits();

  // Generate QR code for visitor
  const generateQRCode = () => {
    const visitorData = {
      name: formData.visitor_name,
      phone: formData.visitor_phone,
      purpose: formData.purpose,
      unit: selectedUnit?.unit_number,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    };
    setQrCode(JSON.stringify(visitorData));
  };

  // Find selected unit details
  useEffect(() => {
    if (formData.visiting_unit_id) {
      const unit = occupiedUnits.find(u => u.unit_id === formData.visiting_unit_id);
      setSelectedUnit(unit);
    }
  }, [formData.visiting_unit_id, occupiedUnits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.visitor_name || !formData.purpose || !formData.visiting_unit_id) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await registerVisitor({
        visitor_name: formData.visitor_name,
        visitor_phone: formData.visitor_phone,
        visiting_unit_id: formData.visiting_unit_id,
        visiting_tenant_id: selectedUnit?.tenant_id,
        purpose: formData.purpose,
        security_notes: formData.special_instructions,
        emergency_contact: formData.emergency_contact
      });

      if (success) {
        toast({
          title: "Visitor Registered Successfully",
          description: "Visitor has been checked in and appears in the visitors log",
        });
        
        // Generate QR code
        generateQRCode();
        
        onSuccess?.();
        
        // Reset form after a delay
        setTimeout(() => {
          setFormData({
            visitor_name: '',
            visitor_phone: '',
            purpose: '',
            visiting_unit_id: '',
            emergency_contact: '',
            id_number: '',
            vehicle_plate: '',
            expected_duration: '',
            special_instructions: '',
            visitor_type: 'guest'
          });
          setQrCode('');
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error registering visitor:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to register visitor. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Visitor Registration
          </DialogTitle>
          <DialogDescription>
            Register a new visitor and generate access credentials
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visitor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visitor Information</CardTitle>
              <CardDescription>Basic visitor details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="visitor_name">Full Name *</Label>
                  <Input
                    id="visitor_name"
                    value={formData.visitor_name}
                    onChange={(e) => handleInputChange('visitor_name', e.target.value)}
                    placeholder="Enter visitor's full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="visitor_phone">Phone Number</Label>
                  <Input
                    id="visitor_phone"
                    value={formData.visitor_phone}
                    onChange={(e) => handleInputChange('visitor_phone', e.target.value)}
                    placeholder="Phone number (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id_number">ID Number</Label>
                  <Input
                    id="id_number"
                    value={formData.id_number}
                    onChange={(e) => handleInputChange('id_number', e.target.value)}
                    placeholder="National ID or passport"
                  />
                </div>
                <div>
                  <Label htmlFor="visitor_type">Visitor Type</Label>
                  <Select value={formData.visitor_type} onValueChange={(value) => handleInputChange('visitor_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guest">Guest</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visit Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visit Details</CardTitle>
              <CardDescription>Information about the visit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="visiting_unit">Visiting Unit *</Label>
                <Select value={formData.visiting_unit_id} onValueChange={(value) => handleInputChange('visiting_unit_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={unitsLoading ? "Loading units..." : "Select unit"} />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsLoading ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Loading units...
                      </div>
                    ) : Object.keys(groupedUnits).length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No occupied units found
                      </div>
                    ) : (
                      Object.entries(groupedUnits).map(([propertyName, units]) => (
                        <div key={propertyName}>
                          <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                            {propertyName}
                          </div>
                          {units.map((unit) => (
                            <SelectItem key={unit.unit_id} value={unit.unit_id}>
                              <div className="flex flex-col">
                                <span>Unit {unit.unit_number}</span>
                                <span className="text-xs text-muted-foreground">
                                  {unit.tenant_name}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedUnit && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <p className="text-sm">
                      <strong>Tenant:</strong> {selectedUnit.tenant_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Property:</strong> {selectedUnit.property_name}
                    </p>
                    {selectedUnit.tenant_phone && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Contact:</strong> {selectedUnit.tenant_phone}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="purpose">Purpose of Visit *</Label>
                <Input
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => handleInputChange('purpose', e.target.value)}
                  placeholder="Reason for the visit"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expected_duration">Expected Duration</Label>
                  <Input
                    id="expected_duration"
                    value={formData.expected_duration}
                    onChange={(e) => handleInputChange('expected_duration', e.target.value)}
                    placeholder="e.g., 2 hours"
                  />
                </div>
                <div>
                  <Label htmlFor="vehicle_plate">Vehicle Plate</Label>
                  <Input
                    id="vehicle_plate"
                    value={formData.vehicle_plate}
                    onChange={(e) => handleInputChange('vehicle_plate', e.target.value)}
                    placeholder="Vehicle registration"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={formData.special_instructions}
                  onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                  placeholder="Any special instructions or notes"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Emergency Contact</CardTitle>
              <CardDescription>Emergency contact information</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                  placeholder="Emergency contact name and phone"
                />
              </div>
            </CardContent>
          </Card>

          {/* Visitor Details & Access Code */}
          {qrCode && (
            <Card className="border-success bg-success/5">
              <CardHeader>
                <CardTitle className="text-lg text-success flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Visitor Successfully Registered!
                </CardTitle>
                <CardDescription>
                  Visitor has been checked in and access code generated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Visitor Summary */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg border">
                  <div>
                    <p className="text-xs text-muted-foreground">Visitor Name</p>
                    <p className="font-medium">{formData.visitor_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unit</p>
                    <p className="font-medium">{selectedUnit?.unit_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Purpose</p>
                    <p className="font-medium">{formData.purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Check-in Time</p>
                    <p className="font-medium">{format(new Date(), 'h:mm a')}</p>
                  </div>
                </div>

                {/* Access Code Display */}
                <div className="text-center space-y-3">
                  <div className="p-6 bg-white rounded-lg border-2 border-dashed border-success">
                    {/* QR Code Pattern (Visual representation) */}
                    <div className="grid grid-cols-8 gap-1 w-32 h-32 mx-auto mb-4">
                      {Array.from({ length: 64 }).map((_, i) => {
                        const qrData = JSON.parse(qrCode);
                        const accessId = qrData.id || '';
                        return (
                          <div
                            key={i}
                            className={`rounded-sm ${
                              accessId && (accessId.charCodeAt(i % accessId.length) + i) % 2 === 0
                                ? 'bg-black'
                                : 'bg-white border border-gray-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-success">
                        {JSON.parse(qrCode).id?.toUpperCase() || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Visitor Access Code
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Generated: {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
                    <p className="text-success font-medium">✓ Valid for this visit</p>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const data = JSON.parse(qrCode);
                      navigator.clipboard.writeText(`Visitor: ${data.name}\nCode: ${data.id}\nUnit: ${data.unit}\nTime: ${format(new Date(data.timestamp), 'MMM d, h:mm a')}`);
                      toast({
                        title: "Copied",
                        description: "Visitor details copied to clipboard"
                      });
                    }}
                  >
                    Copy Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={async () => {
                const success = await testVisitorInsert();
                toast({
                  title: success ? "Test Passed" : "Test Failed",
                  description: success ? "Visitor insert test successful" : "Visitor insert test failed - check console",
                  variant: success ? "default" : "destructive"
                });
              }}
            >
              Test Insert
            </Button>
            
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Register Visitor
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
