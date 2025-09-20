import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Edit, Trash2, Bell, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Notice {
  id: string;
  property_id: string;
  unit_id?: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

interface Unit {
  id: string;
  unit_number: string;
  type: string;
}

interface NoticesModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  units: Unit[];
}

const noticeTypes = [
  { value: 'general', label: 'General Notice' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'rent', label: 'Rent Related' },
  { value: 'policy', label: 'Policy Update' },
  { value: 'emergency', label: 'Emergency' }
];

const priorityLevels = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

export const NoticesModal = ({ isOpen, onClose, propertyId, propertyName, units }: NoticesModalProps) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [showCalendar, setShowCalendar] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'normal',
    unit_id: '',
    expires_at: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchNotices();
    }
  }, [isOpen, propertyId]);

  useEffect(() => {
    if (editingNotice) {
      setFormData({
        title: editingNotice.title,
        content: editingNotice.content,
        type: editingNotice.type,
        priority: editingNotice.priority,
        unit_id: editingNotice.unit_id || '',
        expires_at: editingNotice.expires_at || ''
      });
      if (editingNotice.expires_at) {
        setExpiryDate(new Date(editingNotice.expires_at));
      }
      setShowForm(true);
    }
  }, [editingNotice]);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('property_notices')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
      toast.error('Failed to load notices');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const noticeData = {
        property_id: propertyId,
        unit_id: formData.unit_id || null,
        title: formData.title,
        content: formData.content,
        type: formData.type,
        priority: formData.priority,
        expires_at: expiryDate ? expiryDate.toISOString() : null,
        landlord_id: profile.id,
        is_active: true
      };

      if (editingNotice) {
        const { error } = await supabase
          .from('property_notices')
          .update(noticeData)
          .eq('id', editingNotice.id);

        if (error) throw error;
        toast.success('Notice updated successfully');
      } else {
        const { error } = await supabase
          .from('property_notices')
          .insert([noticeData]);

        if (error) throw error;
        toast.success('Notice created successfully');
      }

      resetForm();
      fetchNotices();
    } catch (error) {
      console.error('Error saving notice:', error);
      toast.error('Failed to save notice');
    } finally {
      setLoading(false);
    }
  };

  const deleteNotice = async (noticeId: string) => {
    try {
      const { error } = await supabase
        .from('property_notices')
        .delete()
        .eq('id', noticeId);

      if (error) throw error;
      toast.success('Notice deleted successfully');
      fetchNotices();
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast.error('Failed to delete notice');
    }
  };

  const toggleNoticeStatus = async (noticeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('property_notices')
        .update({ is_active: !currentStatus })
        .eq('id', noticeId);

      if (error) throw error;
      toast.success(`Notice ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchNotices();
    } catch (error) {
      console.error('Error updating notice status:', error);
      toast.error('Failed to update notice');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'general',
      priority: 'normal',
      unit_id: '',
      expires_at: ''
    });
    setExpiryDate(undefined);
    setShowForm(false);
    setEditingNotice(null);
  };

  const getUnitName = (unitId: string) => {
    const unit = units.find(u => u.id === unitId);
    return unit ? `Unit ${unit.unit_number} (${unit.type})` : 'All Units';
  };

  const getPriorityColor = (priority: string) => {
    return priorityLevels.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Property Notices - {propertyName}
          </DialogTitle>
          <DialogDescription>
            Create and manage public notices for your property and units
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Notice
            </Button>
            {showForm && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>

          {/* Notice Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingNotice ? 'Edit Notice' : 'Create New Notice'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Notice Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g., Water Maintenance Schedule"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="type">Notice Type</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {noticeTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority Level</Label>
                      <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityLevels.map(priority => (
                            <SelectItem key={priority.value} value={priority.value}>
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="unit">Target Unit (Optional)</Label>
                      <Select value={formData.unit_id || ""} onValueChange={(value) => setFormData(prev => ({ ...prev, unit_id: value || "" }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit or leave empty for all units" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map(unit => (
                            <SelectItem key={unit.id} value={unit.id}>
                              Unit {unit.unit_number} ({unit.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expires">Expiry Date (Optional)</Label>
                    <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !expiryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expiryDate ? format(expiryDate, "PPP") : "Select expiry date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={expiryDate}
                          onSelect={(date) => {
                            setExpiryDate(date);
                            setShowCalendar(false);
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="content">Notice Content *</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter the full notice content..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : (editingNotice ? 'Update Notice' : 'Create Notice')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Notices List */}
          <div className="space-y-4">
            <h3 className="font-medium">Active Notices</h3>
            {notices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notices created yet
              </div>
            ) : (
              notices.map((notice) => (
                <Card key={notice.id} className={`${notice.is_active ? '' : 'opacity-60'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{notice.title}</h4>
                          <Badge className={getPriorityColor(notice.priority)}>
                            {notice.priority}
                          </Badge>
                          <Badge variant="outline">
                            {noticeTypes.find(t => t.value === notice.type)?.label}
                          </Badge>
                          {!notice.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          Target: {notice.unit_id ? getUnitName(notice.unit_id) : 'All Units'}
                        </p>
                        
                        <p className="text-sm mb-2">{notice.content}</p>
                        
                        <div className="text-xs text-muted-foreground">
                          Created: {format(new Date(notice.created_at), 'PPp')}
                          {notice.expires_at && (
                            <span> • Expires: {format(new Date(notice.expires_at), 'PPp')}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleNoticeStatus(notice.id, notice.is_active)}
                        >
                          {notice.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNotice(notice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotice(notice.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};