import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Plus, Edit, Trash2, AlertCircle, Shield, Wrench, Zap, Droplet, Wind, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface EmergencyContact {
  id: string;
  property_id: string;
  landlord_id: string;
  contact_type: 'maintenance' | 'security' | 'plumbing' | 'electrical' | 'hvac' | 'general';
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  description?: string;
  is_active: boolean;
  is_24_7: boolean;
  available_hours?: string;
  display_order: number;
  properties?: {
    name: string;
  };
}

interface Property {
  id: string;
  name: string;
  address: string;
}

const contactTypeIcons: Record<string, any> = {
  maintenance: Wrench,
  security: Shield,
  plumbing: Droplet,
  electrical: Zap,
  hvac: Wind,
  general: Phone,
};

const contactTypeLabels: Record<string, string> = {
  maintenance: 'General Maintenance',
  security: 'Security Emergency',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  general: 'General Contact',
};

export const EmergencyContactsManagement = () => {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  const [formData, setFormData] = useState({
    property_id: '',
    contact_type: 'maintenance' as EmergencyContact['contact_type'],
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    description: '',
    is_active: true,
    is_24_7: true,
    available_hours: '',
    display_order: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      fetchProperties();
      fetchContacts();
    }
  }, [profile]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address')
        .eq('landlord_id', profile?.id)
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    }
  };

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select(`
          *,
          properties (
            name
          )
        `)
        .eq('landlord_id', profile?.id)
        .order('display_order');

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load emergency contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (contact?: EmergencyContact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        property_id: contact.property_id,
        contact_type: contact.contact_type,
        contact_name: contact.contact_name,
        contact_phone: contact.contact_phone,
        contact_email: contact.contact_email || '',
        description: contact.description || '',
        is_active: contact.is_active,
        is_24_7: contact.is_24_7,
        available_hours: contact.available_hours || '',
        display_order: contact.display_order,
      });
    } else {
      setEditingContact(null);
      setFormData({
        property_id: '',
        contact_type: 'maintenance',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        description: '',
        is_active: true,
        is_24_7: true,
        available_hours: '',
        display_order: contacts.length,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingContact(null);
  };

  const handleSave = async () => {
    if (!formData.property_id || !formData.contact_name || !formData.contact_phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('emergency_contacts')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingContact.id);

        if (error) throw error;
        toast.success('Emergency contact updated successfully');
      } else {
        // Create new contact
        const { error } = await supabase
          .from('emergency_contacts')
          .insert({
            ...formData,
            landlord_id: profile?.id,
          });

        if (error) throw error;
        toast.success('Emergency contact created successfully');
      }

      handleCloseDialog();
      fetchContacts();
    } catch (error: any) {
      console.error('Error saving contact:', error);
      toast.error(error.message || 'Failed to save emergency contact');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this emergency contact?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Emergency contact deleted successfully');
      fetchContacts();
    } catch (error: any) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete emergency contact');
    }
  };

  const filteredContacts = selectedProperty === 'all'
    ? contacts
    : contacts.filter(c => c.property_id === selectedProperty);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading emergency contacts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Emergency Contacts Management
              </CardTitle>
              <CardDescription>
                Manage emergency contacts that will be displayed to tenants in their maintenance section
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>Filter by Property:</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          These emergency contacts will be visible to all tenants in the selected property's maintenance section.
          Make sure the information is accurate and up-to-date.
        </AlertDescription>
      </Alert>

      {/* Contacts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredContacts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No emergency contacts found</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredContacts.map((contact) => {
            const Icon = contactTypeIcons[contact.contact_type] || Phone;
            return (
              <Card key={contact.id} className={!contact.is_active ? 'opacity-50' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        contact.contact_type === 'security' ? 'bg-destructive/10' : 'bg-primary/10'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          contact.contact_type === 'security' ? 'text-destructive' : 'text-primary'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{contact.contact_name}</CardTitle>
                        <CardDescription>
                          {contactTypeLabels[contact.contact_type]}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(contact)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {contact.properties?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{contact.contact_phone}</span>
                    </div>
                    {contact.contact_email && (
                      <div className="text-sm text-muted-foreground">
                        {contact.contact_email}
                      </div>
                    )}
                    {contact.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {contact.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {contact.is_24_7 ? (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          24/7 Available
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {contact.available_hours || 'Limited Hours'}
                        </Badge>
                      )}
                      {!contact.is_active && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? 'Update the emergency contact information'
                : 'Add a new emergency contact for your property'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Property Selection */}
            <div>
              <Label htmlFor="property">Property *</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => setFormData({ ...formData, property_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name} - {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Type */}
            <div>
              <Label htmlFor="contact_type">Contact Type *</Label>
              <Select
                value={formData.contact_type}
                onValueChange={(value: any) => setFormData({ ...formData, contact_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(contactTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact Name */}
            <div>
              <Label htmlFor="contact_name">Contact Name *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="e.g., John Maintenance Services"
              />
            </div>

            {/* Contact Phone */}
            <div>
              <Label htmlFor="contact_phone">Phone Number *</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+254 700 123 456"
              />
            </div>

            {/* Contact Email */}
            <div>
              <Label htmlFor="contact_email">Email (Optional)</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional information about this contact..."
                rows={3}
              />
            </div>

            {/* 24/7 Availability */}
            <div className="flex items-center justify-between">
              <div>
                <Label>24/7 Availability</Label>
                <p className="text-sm text-muted-foreground">
                  Is this contact available 24 hours a day?
                </p>
              </div>
              <Switch
                checked={formData.is_24_7}
                onCheckedChange={(checked) => setFormData({ ...formData, is_24_7: checked })}
              />
            </div>

            {/* Available Hours (if not 24/7) */}
            {!formData.is_24_7 && (
              <div>
                <Label htmlFor="available_hours">Available Hours</Label>
                <Input
                  id="available_hours"
                  value={formData.available_hours}
                  onChange={(e) => setFormData({ ...formData, available_hours: e.target.value })}
                  placeholder="e.g., 8:00 AM - 5:00 PM Mon-Fri"
                />
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Only active contacts are visible to tenants
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingContact ? 'Update Contact' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

