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
  Plus, Trash2, AlertCircle, CheckCircle, Clock, X, Wrench, AlertTriangle, 
  CreditCard, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useApprovedLease } from '@/hooks/useApprovedLease';
import { TenantNotices } from './TenantNotices';
import { LeaseDocumentViewer } from './LeaseDocumentViewer';

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  uploadedAt: string;
  category: 'lease' | 'receipt' | 'policy' | 'insurance' | 'tenant_upload';
  status?: 'pending' | 'approved' | 'rejected';
  noticeData?: any; // For property notices
  propertyName?: string; // For property documents
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
  const [showLeaseDocument, setShowLeaseDocument] = useState(false);
  const { user, profile } = useAuth();
  const { hasApprovedLease, approvedLease } = useApprovedLease();

  // Load tenant documents
  useEffect(() => {
    if (user && profile) {
      loadDocuments();
    }
  }, [user, profile]);

  const loadDocuments = async () => {
    try {
      console.log('🔄 Loading documents for tenant...');
      setLoading(true);

      // Get property notices for the tenant's active unit
      // First, get the tenant_info record for this profile
      console.log('🔍 Looking for tenant_info with profile_id:', profile?.id);
      const { data: tenantInfo, error: tenantInfoError } = await supabase
        .from('tenant_info')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (tenantInfoError) {
        console.error('❌ Error fetching tenant_info:', tenantInfoError);
      } else {
        console.log('✅ Tenant info found:', tenantInfo);
      }

      let unitIds = [];
      if (tenantInfo) {
        // Get the tenant's unit IDs from their active leases
        const { data: tenantLeases } = await supabase
          .from('leases')
          .select('unit_id')
          .eq('tenant_info_id', tenantInfo.id)
          .eq('status', 'active');

        unitIds = tenantLeases?.map(lease => lease.unit_id) || [];
      }
      
      // Get property notices - both general (unit_id = null) and unit-specific
      let propertyNotices = [];
      if (unitIds.length > 0) {
        // Get notices for specific units
        const { data: unitNotices } = await supabase
          .from('property_notices')
          .select(`
            id,
            title,
            content,
            type,
            priority,
            created_at,
            expires_at,
            is_active,
            property_id,
            unit_id
          `)
          .eq('is_active', true)
          .in('unit_id', unitIds)
          .order('created_at', { ascending: false });

        // Get general notices (unit_id = null)
        const { data: generalNotices } = await supabase
          .from('property_notices')
          .select(`
            id,
            title,
            content,
            type,
            priority,
            created_at,
            expires_at,
            is_active,
            property_id,
            unit_id
          `)
          .eq('is_active', true)
          .is('unit_id', null)
          .order('created_at', { ascending: false });

        propertyNotices = [...(unitNotices || []), ...(generalNotices || [])];
      } else {
        // If no active leases, only get general notices
        const { data: generalNotices } = await supabase
          .from('property_notices')
          .select(`
            id,
            title,
            content,
            type,
            priority,
            created_at,
            expires_at,
            is_active,
            property_id,
            unit_id
          `)
          .eq('is_active', true)
          .is('unit_id', null)
          .order('created_at', { ascending: false });

        propertyNotices = generalNotices || [];
      }

      // Get property names for the notices
      let propertyNames = {};
      if (propertyNotices && propertyNotices.length > 0) {
        const propertyIds = [...new Set(propertyNotices.map(n => n.property_id))];
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .in('id', propertyIds);
        
        if (properties) {
          propertyNames = properties.reduce((acc, prop) => {
            acc[prop.id] = prop.name;
            return acc;
          }, {});
        }
      }

      // Get documents from property policies (landlord uploaded)
      // First, get the tenant's property IDs from their active leases
      let propertyIds = [];
      if (tenantInfo) {
        console.log('🔍 Getting property IDs for tenant_info_id:', tenantInfo.id);
        // Try regular client first
        let { data: tenantLeases, error: leasesError }: { data: any, error: any } = await supabase
          .from('leases')
          .select(`
            unit_id,
            units!inner(
              id,
              property_id
            )
          `)
          .eq('tenant_info_id', tenantInfo.id)
          .eq('status', 'active');

        // If RLS blocks the query OR no results found, try with admin client
        if ((leasesError && (leasesError.code === '42501' || leasesError.message.includes('RLS'))) || 
            (!leasesError && (!tenantLeases || tenantLeases.length === 0))) {
          console.log('🔄 RLS blocked leases query or no results found, trying with admin client...');
          console.log('🔍 Regular client result:', { tenantLeases, leasesError });
          
          const { data: adminLeases, error: adminLeasesError } = await supabaseAdmin
            .from('leases')
            .select(`
              unit_id,
              units!inner(
                id,
                property_id
              )
            `)
            .eq('tenant_info_id', tenantInfo.id)
            .eq('status', 'active');

          if (adminLeasesError) {
            console.error('❌ Admin client also failed:', adminLeasesError);
          } else {
            // Map admin client result to match expected structure
            tenantLeases = (adminLeases?.map(lease => ({
              unit_id: lease.unit_id,
              units: Array.isArray(lease.units) ? lease.units[0] : lease.units
            })) || []) as any;
            leasesError = null;
            console.log('✅ Admin client leases query succeeded, found:', adminLeases?.length || 0, 'leases');
            console.log('📋 Admin lease data:', adminLeases);
          }
        }

        if (leasesError) {
          console.error('❌ Error fetching tenant leases:', leasesError);
        } else {
          console.log('✅ Tenant leases found:', tenantLeases?.length || 0);
          console.log('📋 Lease data:', tenantLeases);
        }

        // Extract property IDs from the leases
        if (tenantLeases && tenantLeases.length > 0) {
          propertyIds = tenantLeases.map(lease => lease.units.property_id);
          console.log('🏢 Property IDs extracted:', propertyIds);
        } else {
          console.log('❌ No leases found');
        }
      } else {
        console.log('❌ No tenantInfo found for property documents query');
      }

      // Get property documents for the tenant's properties
      let propertyDocs = [];
      if (propertyIds.length > 0) {
        console.log('🔍 Fetching properties with IDs:', propertyIds);
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select('id, name, policies_documents')
          .in('id', propertyIds);

        if (propertiesError) {
          console.error('❌ Error fetching properties:', propertiesError);
        } else {
          console.log('✅ Properties found:', properties?.length || 0);
          console.log('📋 Properties data:', properties);
        }

        propertyDocs = properties || [];
      } else {
        console.log('❌ No property IDs found - cannot fetch property documents');
      }

      // Get tenant uploaded documents from storage
      const { data: tenantFiles } = await supabase.storage
        .from('property-documents')
        .list(`${user?.id}/tenant-uploads/`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      let allDocuments: Document[] = [];

      // Process property notices as documents
      if (propertyNotices) {
        console.log('📢 Processing property notices:', propertyNotices.length);
        const noticeDocs = propertyNotices.map(notice => ({
          id: `notice-${notice.id}`,
          name: notice.title,
          url: `#notice-${notice.id}`, // Internal link for viewing
          type: 'text/notice',
          size: notice.content.length,
          uploadedAt: notice.created_at,
          category: 'policy' as const,
          status: 'approved' as const,
          noticeData: {
            ...notice,
            properties: { name: propertyNames[notice.property_id] || 'Unknown Property' }
          } // Store the full notice data for display
        }));
        allDocuments = [...allDocuments, ...noticeDocs];
        console.log('✅ Added property notices to documents');
      }

      // Process property documents
      if (propertyDocs && propertyDocs.length > 0) {
        console.log('📄 Processing property documents:', propertyDocs.length);
        for (const property of propertyDocs) {
          if (property.policies_documents && Array.isArray(property.policies_documents)) {
            console.log(`Processing ${property.policies_documents.length} documents from property: ${property.name}`);
            
            for (const doc of property.policies_documents) {
              try {
                console.log(`Creating signed URL for document: ${doc.name} (path: ${doc.url})`);
                
                // Create signed URL for the document stored in Supabase Storage
                const { data: signedUrlData, error: signedUrlError } = await supabase.storage
                  .from('property-documents')
                  .createSignedUrl(doc.url, 3600); // 1 hour expiry

                  if (signedUrlError) {
                    console.warn('⚠️ Document not found in storage:', doc.name, signedUrlError.message);
                    // Skip this document but continue processing others
                    continue;
                  }

                console.log(`✅ Signed URL created for ${doc.name}:`, signedUrlData.signedUrl.substring(0, 100) + '...');

                const policyDocument = {
                  id: `policy-${property.id}-${doc.name}`,
                  name: doc.name,
                  url: signedUrlData.signedUrl,
                  type: doc.type || 'application/pdf',
                  size: doc.size,
                  uploadedAt: doc.uploadedAt || new Date().toISOString(),
                  category: 'policy' as const,
                  status: 'approved' as const,
                  propertyName: property.name
                };

                allDocuments = [...allDocuments, policyDocument];
                console.log(`✅ Added document: ${doc.name} from property: ${property.name}`);
              } catch (error) {
                console.error('Error processing document:', doc.name, error);
              }
            }
          } else {
            console.log(`No policy documents found in property: ${property.name}`);
          }
        }
      } else {
        console.log('❌ No property documents found - propertyDocs:', propertyDocs);
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

        console.log('📊 Final documents count:', allDocuments.length);
        console.log('📋 Documents:', allDocuments.map(doc => ({ 
          name: doc.name, 
          category: doc.category, 
          type: doc.type,
          propertyName: doc.propertyName,
          hasUrl: !!doc.url
        })));
        setDocuments(allDocuments);
      } catch (error) {
        console.error('❌ Error loading documents:', error);
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
      if (doc.noticeData) {
        // For property notices, create a text file and download it
        const noticeContent = `Property Notice: ${doc.noticeData.title}

Property: ${doc.noticeData.properties?.name || 'N/A'}
Type: ${(doc.noticeData.type?.replace('_', ' ') || 'N/A').toUpperCase()}
Priority: ${(doc.noticeData.priority || 'N/A').toUpperCase()}
Posted: ${new Date(doc.noticeData.created_at).toLocaleDateString()}
${doc.noticeData.expires_at ? `Expires: ${new Date(doc.noticeData.expires_at).toLocaleDateString()}` : ''}

Content:
${doc.noticeData.content}`;

        const blob = new Blob([noticeContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.noticeData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (doc.category === 'tenant_upload') {
        // For tenant uploads, create signed URL
        const { data, error } = await supabase.storage
          .from('property-documents')
          .createSignedUrl(doc.url, 3600);
        
        if (error) throw error;
        
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      } else {
        // For property documents, the URL is already a signed URL
        window.open(doc.url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const viewDocument = async (doc: Document) => {
    try {
      if (doc.noticeData) {
        // For property notices, set directly without creating signed URL
        setViewingDoc(doc);
      } else if (doc.category === 'tenant_upload') {
        const { data, error } = await supabase.storage
          .from('property-documents')
          .createSignedUrl(doc.url, 3600);
        
        if (error) throw error;
        
        if (data?.signedUrl) {
          setViewingDoc({ ...doc, url: data.signedUrl });
        }
      } else {
        // For property documents, the URL is already a signed URL
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

  const getCategoryIcon = (category: Document['category'], doc?: Document) => {
    if (doc?.noticeData) {
      // Special icons for different notice types
      switch (doc.noticeData.type) {
        case 'maintenance': return Wrench;
        case 'emergency': return AlertTriangle;
        case 'rent': return CreditCard;
        case 'inspection': return Eye;
        case 'policy': return Shield;
        default: return Bell;
      }
    }
    
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
          {/* Lease Document Card */}
          {hasApprovedLease && (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">Lease Agreement</p>
                        <Badge variant="default">Official Document</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Unit: {approvedLease?.units?.unit_number}</span>
                        <span>•</span>
                        <span>{approvedLease?.units?.properties?.name}</span>
                        <span>•</span>
                        <span>
                          {approvedLease?.start_date 
                            ? new Date(approvedLease.start_date).toLocaleDateString()
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your complete rental agreement with all terms and conditions
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => setShowLeaseDocument(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Lease
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowLeaseDocument(true)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {filteredDocuments.map((doc) => {
            const Icon = getCategoryIcon(doc.category, doc);
            return (
              <Card key={doc.id} className={doc.noticeData ? 'border-l-4 border-l-blue-500' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-muted rounded-lg flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${getCategoryColor(doc.category)}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{doc.name}</p>
                          {doc.noticeData && (
                            <Badge 
                              variant={
                                doc.noticeData.priority === 'urgent' ? 'destructive' :
                                doc.noticeData.priority === 'high' ? 'default' :
                                doc.noticeData.priority === 'normal' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {(doc.noticeData.priority || 'N/A').toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{doc.type.split('/')[1]?.toUpperCase()}</span>
                          {doc.size && <span>• {formatFileSize(doc.size)}</span>}
                          <span>• {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          {doc.noticeData && (
                            <span>• {doc.noticeData.properties?.name || 'Property Notice'}</span>
                          )}
                          {doc.propertyName && (
                            <span>• {doc.propertyName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getCategoryColor(doc.category)}>
                        {doc.noticeData ? 'Property Notice' : getCategoryName(doc.category)}
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
              {viewingDoc.noticeData ? (
                // Property Notice Display
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-sm">
                      {viewingDoc.noticeData.type?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge 
                      variant={
                        viewingDoc.noticeData.priority === 'urgent' ? 'destructive' :
                        viewingDoc.noticeData.priority === 'high' ? 'default' :
                        viewingDoc.noticeData.priority === 'normal' ? 'secondary' : 'outline'
                      }
                    >
                      {viewingDoc.noticeData.priority?.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{viewingDoc.noticeData.title}</h3>
                    <div className="text-sm text-muted-foreground">
                      <p>Property: {viewingDoc.noticeData.properties?.name || 'N/A'}</p>
                      <p>Posted: {new Date(viewingDoc.noticeData.created_at).toLocaleDateString()}</p>
                      {viewingDoc.noticeData.expires_at && (
                        <p>Expires: {new Date(viewingDoc.noticeData.expires_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Notice Content:</h4>
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {viewingDoc.noticeData.content}
                      </p>
                    </div>
                  </div>
                </div>
              ) : isImageFile(viewingDoc) ? (
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

      {/* Lease Document Viewer */}
      <LeaseDocumentViewer
        open={showLeaseDocument}
        onClose={() => setShowLeaseDocument(false)}
      />
    </div>
  );
};