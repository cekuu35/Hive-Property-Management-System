import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Edit, Save, Plus, Trash2, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface LeaseTemplate {
  id: string;
  landlord_id: string;
  name: string;
  header_content: string | null;
  standard_terms: string | null;
  additional_terms: string | null;
  footer_content: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const LeaseTemplatesSection = () => {
  const [templates, setTemplates] = useState<LeaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<LeaseTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<LeaseTemplate | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.id) {
      fetchTemplates();
    }
  }, [profile?.id]);

  const fetchTemplates = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lease_templates')
        .select('*')
        .eq('landlord_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lease templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (templateData: Partial<LeaseTemplate>) => {
    if (!profile?.id) return;

    try {
      if (editingTemplate?.id) {
        // Update existing template
        const { error } = await supabase
          .from('lease_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
          .eq('landlord_id', profile.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Lease template updated successfully',
        });
      } else {
        // Create new template
        const { error } = await supabase
          .from('lease_templates')
          .insert({
            ...templateData,
            landlord_id: profile.id,
          });

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Lease template created successfully',
        });
      }

      setEditingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save lease template',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!profile?.id) return;
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('lease_templates')
        .delete()
        .eq('id', templateId)
        .eq('landlord_id', profile.id);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (templateId: string) => {
    if (!profile?.id) return;

    try {
      // First, unset all other defaults
      await supabase
        .from('lease_templates')
        .update({ is_default: false })
        .eq('landlord_id', profile.id);

      // Then set this one as default
      const { error } = await supabase
        .from('lease_templates')
        .update({ is_default: true })
        .eq('id', templateId)
        .eq('landlord_id', profile.id);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Default template updated',
      });
      fetchTemplates();
    } catch (error: any) {
      console.error('Error setting default:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to set default template',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Lease Document Templates</h1>
          <p className="text-muted-foreground">
            Customize the lease documents that tenants see when viewing their lease agreements
          </p>
        </div>
        <Button onClick={() => setEditingTemplate({} as LeaseTemplate)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No lease templates created yet</p>
            <Button onClick={() => setEditingTemplate({} as LeaseTemplate)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {template.name}
                    {template.is_default && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </CardTitle>
                </div>
                <CardDescription>
                  Last updated: {new Date(template.updated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setPreviewTemplate(template);
                      setShowPreview(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
                {!template.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleSetDefault(template.id)}
                  >
                    Set as Default
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              This is how the lease document will appear to tenants (with actual data filled in)
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4 p-6 bg-background">
              {previewTemplate.header_content && (
                <div className="whitespace-pre-wrap text-foreground">{previewTemplate.header_content}</div>
              )}
              <Separator />
              {previewTemplate.standard_terms && (
                <>
                  <h3 className="text-lg font-semibold">Standard Terms</h3>
                  <div className="whitespace-pre-wrap text-foreground">{previewTemplate.standard_terms}</div>
                  <Separator />
                </>
              )}
              {previewTemplate.additional_terms && (
                <>
                  <h3 className="text-lg font-semibold">Additional Terms</h3>
                  <div className="whitespace-pre-wrap text-foreground">{previewTemplate.additional_terms}</div>
                  <Separator />
                </>
              )}
              {previewTemplate.footer_content && (
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">{previewTemplate.footer_content}</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editingTemplate !== null} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate?.id ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              Customize sections of the lease document. The template will automatically include property and tenant details.
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSave}
              onCancel={() => setEditingTemplate(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface TemplateEditorProps {
  template: Partial<LeaseTemplate>;
  onSave: (data: Partial<LeaseTemplate>) => Promise<void>;
  onCancel: () => void;
}

const TemplateEditor = ({ template, onSave, onCancel }: TemplateEditorProps) => {
  const [formData, setFormData] = useState({
    name: template.name || 'Default Lease Template',
    header_content: template.header_content || '',
    standard_terms: template.standard_terms || `Use of Premises: The Premises shall be used solely as a private residence.
Maintenance: Tenant shall maintain the Premises in good condition and shall be responsible for any damage caused by Tenant or Tenant's guests.
Utilities: Tenant shall be responsible for all utilities unless otherwise agreed in writing.
Alterations: No alterations or improvements to the Premises may be made without Landlord's prior written consent.
Termination: Either party may terminate this lease with proper written notice as required by law.`,
    additional_terms: template.additional_terms || '',
    footer_content: template.footer_content || 'This document is a legally binding agreement. Please keep a copy for your records.',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Default Lease Template"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="header_content">Header Content (Optional)</Label>
        <Textarea
          id="header_content"
          value={formData.header_content}
          onChange={(e) => setFormData({ ...formData, header_content: e.target.value })}
          placeholder="Additional text to appear at the top of the document..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          This will appear after the document title and agreement date
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="standard_terms">Standard Terms</Label>
        <Textarea
          id="standard_terms"
          value={formData.standard_terms}
          onChange={(e) => setFormData({ ...formData, standard_terms: e.target.value })}
          placeholder="Enter standard lease terms..."
          rows={8}
          required
        />
        <p className="text-xs text-muted-foreground">
          Standard terms and conditions that apply to all leases
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="additional_terms">Additional Terms (Optional)</Label>
        <Textarea
          id="additional_terms"
          value={formData.additional_terms}
          onChange={(e) => setFormData({ ...formData, additional_terms: e.target.value })}
          placeholder="Any additional terms or conditions..."
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          Additional terms that will appear in a separate section
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="footer_content">Footer Content (Optional)</Label>
        <Textarea
          id="footer_content"
          value={formData.footer_content}
          onChange={(e) => setFormData({ ...formData, footer_content: e.target.value })}
          placeholder="Footer text for the document..."
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Text to appear at the bottom of the document
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

