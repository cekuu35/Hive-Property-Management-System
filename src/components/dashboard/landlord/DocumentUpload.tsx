import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Upload, X, Download, Eye, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Document {
  name: string;
  url: string;
  type: string;
  size?: number;
  uploadedAt?: string;
}

interface DocumentUploadProps {
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
  entityId: string;
  maxDocuments?: number;
  className?: string;
}

export const DocumentUpload = ({ 
  documents, 
  onDocumentsChange, 
  entityId, 
  maxDocuments = 10,
  className 
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const { user } = useAuth();
  const [dragOver, setDragOver] = useState(false);

  const uploadDocument = async (file: File) => {
    if (!user) {
      toast.error('Please log in to upload documents');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${entityId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // For private buckets, we store the file path instead of public URL
      const newDocument: Document = {
        name: file.name,
        url: fileName, // Store the file path for private access
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

      onDocumentsChange([...documents, newDocument]);
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (documentUrl: string) => {
    try {
      // For private buckets, documentUrl is actually the file path
      await supabase.storage
        .from('property-documents')
        .remove([documentUrl]);

      onDocumentsChange(documents.filter(doc => doc.url !== documentUrl));
      toast.success('Document removed successfully');
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Failed to remove document');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      // Validate file type (allow common document types)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        continue;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      // Check max documents limit
      if (documents.length >= maxDocuments) {
        toast.error(`Maximum ${maxDocuments} documents allowed`);
        break;
      }

      uploadDocument(file);
    }
    
    // Reset input
    e.target.value = '';
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .createSignedUrl(doc.url, 3600); // 1 hour expiry
      
      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const viewDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .createSignedUrl(doc.url, 3600); // 1 hour expiry
      
      if (error) throw error;
      
      if (data?.signedUrl) {
        setViewingDoc({ ...doc, url: data.signedUrl });
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to load document');
    }
  };

  const startEditDocument = (doc: Document) => {
    setEditingDoc(doc);
    document.getElementById(`edit-file-input-${entityId}`)?.click();
  };

  const handleEditFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingDoc) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error(`${file.name} is not a supported file type`);
      setEditingDoc(null);
      e.target.value = '';
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`${file.name} is too large (max 5MB)`);
      setEditingDoc(null);
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      
      // Remove old document
      await supabase.storage
        .from('property-documents')
        .remove([editingDoc.url]);

      // Upload new document
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${entityId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const updatedDocument: Document = {
        name: file.name,
        url: fileName, // Store file path for private access
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

      // Update documents array
      const updatedDocuments = documents.map(doc => 
        doc.url === editingDoc.url ? updatedDocument : doc
      );
      
      onDocumentsChange(updatedDocuments);
      toast.success('Document updated successfully');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    } finally {
      setUploading(false);
      setEditingDoc(null);
      e.target.value = '';
    }
  };

  const isImageFile = (doc: Document) => {
    return doc.type.startsWith('image/');
  };

  const isPdfFile = (doc: Document) => {
    return doc.type === 'application/pdf';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className={className}>
      <Label>Policy Documents & Rules</Label>
      
      <Card className="mt-2">
        <CardContent className="p-4">
          {/* Upload Area */}
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const files = Array.from(e.dataTransfer.files);
              
              for (const file of files) {
                // Validate file type
                const allowedTypes = [
                  'application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'text/plain',
                  'image/jpeg',
                  'image/png',
                  'image/gif'
                ];
                
                if (!allowedTypes.includes(file.type)) {
                  toast.error(`${file.name} is not a supported file type`);
                  continue;
                }

                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                  toast.error(`${file.name} is too large (max 5MB)`);
                  continue;
                }

                // Check max documents limit
                if (documents.length >= maxDocuments) {
                  toast.error(`Maximum ${maxDocuments} documents allowed`);
                  break;
                }

                uploadDocument(file);
              }
            }}
          >
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(`file-input-${entityId}`)?.click()}
                disabled={uploading || documents.length >= maxDocuments}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Documents'}
              </Button>
              <p className="text-sm text-muted-foreground">
                {dragOver 
                  ? 'Drop files here to upload' 
                  : 'Upload policies, rules, lease templates (PDF, DOC, TXT, Images) or drag & drop'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Max {maxDocuments} documents, 5MB each
              </p>
            </div>
          </div>

          <input
            id={`file-input-${entityId}`}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
            onChange={handleFileSelect}
            className="hidden"
          />

          <input
            id={`edit-file-input-${entityId}`}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
            onChange={handleEditFileSelect}
            className="hidden"
          />

          {/* Documents List */}
          {documents.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-medium">Uploaded Documents</Label>
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]" title={doc.name}>
                        {doc.name}
                      </p>
                      {doc.size && (
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.size)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {doc.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => viewDocument(doc)}
                      className="h-8 w-8 p-0"
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                   <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocument(doc)}
                      className="h-8 w-8 p-0"
                      title="Download document"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditDocument(doc)}
                      className="h-8 w-8 p-0"
                      title="Replace document"
                      disabled={uploading}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.url)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title="Delete document"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewingDoc?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingDoc && (
            <div className="flex-1 overflow-hidden">
              {isImageFile(viewingDoc) ? (
                <div className="flex justify-center p-4">
                  <img
                    src={viewingDoc.url}
                    alt={viewingDoc.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                </div>
              ) : isPdfFile(viewingDoc) ? (
                <iframe
                  src={viewingDoc.url}
                  className="w-full h-[60vh] border rounded-lg"
                  title={viewingDoc.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Preview not available</h3>
                  <p className="text-muted-foreground mb-4">
                    This file type cannot be previewed inline.
                  </p>
                  <Button onClick={() => downloadDocument(viewingDoc)} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};