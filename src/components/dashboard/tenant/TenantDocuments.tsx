import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, Upload, Download, Eye, Search, Filter, Bell, Receipt, Shield, 
  Plus, Trash2, AlertCircle, CheckCircle, Clock, X 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { TenantNotices } from './TenantNotices';

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  uploadedAt: string;
  category: 'lease' | 'receipt' | 'policy' | 'insurance' | 'tenant_upload';
  status?: 'pending' | 'approved' | 'rejected';
}

interface TenantDocumentsProps {
  className?: string;
}

export const TenantDocuments = ({ className }: TenantDocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Document['category']>('tenant_upload');
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { user, profile } = useAuth();

  // Load tenant documents
  useEffect(() => {
    if (user && profile) {
      loadDocuments();
    }
  }, [user, profile]);

  const loadDocuments = async () => {
    try {
      setLoading(true);

      // Get documents from property policies (landlord uploaded)
      const { data: propertyDocs } = await supabase
        .from('properties')
        .select(`
          policies_documents,
          units!inner(
            leases!inner(
              tenant_id,
              status
            )
          )
        `)
        .eq('units.leases.tenant_id', profile?.id)
        .eq('units.leases.status', 'active');

      // Get tenant uploaded documents from storage
      const { data: tenantFiles } = await supabase.storage
        .from('property-documents')
        .list(`${user?.id}/tenant-uploads/`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      let allDocuments: Document[] = [];

      // Process property documents
      if (propertyDocs?.[0]?.policies_documents) {
        const policyDocs = Array.isArray(propertyDocs[0].policies_documents) 
          ? propertyDocs[0].policies_documents 
          : [];
        
        allDocuments = policyDocs.map((doc: any) => ({
          id: `policy-${Math.random()}`,
          name: doc.name,
          url: doc.url,
          type: doc.type || 'application/pdf',
          size: doc.size,
          uploadedAt: doc.uploadedAt || new Date().toISOString(),
          category: 'policy' as const
        }));
      }

      // Process tenant uploaded files
      if (tenantFiles) {
        const tenantDocs = tenantFiles.map(file => ({
          id: `tenant-${file.name}`,
          name: file.name.replace(/^\d+_/, ''), // Remove timestamp prefix
          url: file.name,
          type: file.metadata?.mimetype || 'application/octet-stream',
          size: file.metadata?.size,
          uploadedAt: file.created_at,
          category: 'tenant_upload' as const,
          status: 'approved' as const
        }));
        allDocuments = [...allDocuments, ...tenantDocs];
      }

      setDocuments(allDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, category: Document['category']) => {
    if (!user) {
      toast.error('Please log in to upload documents');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/tenant-uploads/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const newDocument: Document = {
        id: `tenant-${fileName}`,
        name: file.name,
        url: fileName,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        category,
        status: 'approved'
      };

      setDocuments(prev => [newDocument, ...prev]);
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (doc: Document) => {
    if (doc.category !== 'tenant_upload') {
      toast.error('You can only delete documents you uploaded');
      return;
    }

    try {
      await supabase.storage
        .from('property-documents')
        .remove([doc.url]);

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      if (doc.category === 'tenant_upload') {
        // For tenant uploads, create signed URL
        const { data, error } = await supabase.storage
          .from('property-documents')
          .createSignedUrl(doc.url, 3600);
        
        if (error) throw error;
        
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      } else {
        // For property documents, use direct URL if available
        window.open(doc.url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const viewDocument = async (doc: Document) => {
    try {
      if (doc.category === 'tenant_upload') {
        const { data, error } = await supabase.storage
          .from('property-documents')
          .createSignedUrl(doc.url, 3600);
        
        if (error) throw error;
        
        if (data?.signedUrl) {
          setViewingDoc({ ...doc, url: data.signedUrl });
        }
      } else {
        setViewingDoc(doc);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to load document');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
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

      uploadDocument(file, selectedCategory);
    }
    
    e.target.value = '';
    setUploadModalOpen(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      uploadDocument(file, selectedCategory);
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getCategoryIcon = (category: Document['category']) => {
    switch (category) {
      case 'lease': return FileText;
      case 'receipt': return Receipt;
      case 'policy': return Bell;
      case 'insurance': return Shield;
      case 'tenant_upload': return Upload;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: Document['category']) => {
    switch (category) {
      case 'lease': return 'text-primary';
      case 'receipt': return 'text-success';
      case 'policy': return 'text-warning';
      case 'insurance': return 'text-destructive';
      case 'tenant_upload': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getCategoryName = (category: Document['category']) => {
    switch (category) {
      case 'lease': return 'Lease Agreement';
      case 'receipt': return 'Receipts';
      case 'policy': return 'Notices & Policies';
      case 'insurance': return 'Insurance';
      case 'tenant_upload': return 'My Documents';
      default: return 'Other';
    }
  };

  const isImageFile = (doc: Document) => doc.type.startsWith('image/');
  const isPdfFile = (doc: Document) => doc.type === 'application/pdf';

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Documents</h3>
          <p className="text-muted-foreground">Access your rental documents and upload files</p>
        </div>
        <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Document Category</Label>
                <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as Document['category'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_upload">General Document</SelectItem>
                    <SelectItem value="receipt">Payment Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium mb-2">
                  {dragOver ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Or click to browse (PDF, DOC, TXT, Images)
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Choose Files'}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Important Notices */}
      <TenantNotices maxNotices={5} />

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="lease">Lease Agreements</SelectItem>
            <SelectItem value="receipt">Receipts</SelectItem>
            <SelectItem value="policy">Policies</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
            <SelectItem value="tenant_upload">My Documents</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document Categories Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['lease', 'receipt', 'policy', 'insurance', 'tenant_upload'] as Document['category'][]).map((category) => {
          const count = documents.filter(doc => doc.category === category).length;
          const Icon = getCategoryIcon(category);
          return (
            <Card 
              key={category} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setCategoryFilter(category)}
            >
              <CardContent className="p-4 text-center">
                <Icon className={`h-8 w-8 mx-auto mb-2 ${getCategoryColor(category)}`} />
                <p className="font-medium text-sm">{getCategoryName(category)}</p>
                <p className="text-xs text-muted-foreground">{count} document{count !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">No Documents Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || categoryFilter !== 'all' 
                ? 'No documents match your current filters' 
                : 'No documents available yet'}
            </p>
            <Button onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((doc) => {
            const Icon = getCategoryIcon(doc.category);
            return (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-muted rounded-lg flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${getCategoryColor(doc.category)}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{doc.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{doc.type.split('/')[1]?.toUpperCase()}</span>
                          {doc.size && <span>• {formatFileSize(doc.size)}</span>}
                          <span>• {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getCategoryColor(doc.category)}>
                        {getCategoryName(doc.category)}
                      </Badge>
                      {doc.status && (
                        <Badge variant={doc.status === 'approved' ? 'default' : doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                          {doc.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {doc.status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                          {doc.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {doc.status}
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" onClick={() => viewDocument(doc)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadDocument(doc)}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      {doc.category === 'tenant_upload' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteDocument(doc)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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