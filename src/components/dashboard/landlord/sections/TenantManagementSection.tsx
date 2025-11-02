import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { 
  UserPlus, 
  Users, 
  DollarSign, 
  Shield, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Clock,
  Settings,
  User,
  Key,
  XCircle,
  Building
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLandlordTenants } from '@/hooks/useLandlordTenants';
import { useUnitApplications } from '@/hooks/useUnitApplications';
import { TenantCreationForm } from '../TenantCreationForm';
import { TenantEditForm } from '../TenantEditForm';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { format } from 'date-fns';
import { validateAndCorrectProfileId, safeUpdateTenantProfileId } from '@/utils/profileValidation';
import { toast } from 'sonner';
import { useCanAddResource } from '@/components/subscription/SubscriptionGuard';
import { useNavigate } from 'react-router-dom';

export const TenantManagementSection = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [tenantCredentials, setTenantCredentials] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<string>('all');
  
  const {
    tenants,
    loading,
    error,
    activeTenants,
    pendingTenants,
    terminatedTenants,
    totalMonthlyRent,
    totalSecurityDeposits,
    occupancyRate,
    totalUnits,
    occupiedUnits,
    deleteTenant,
    refetch
  } = useLandlordTenants();

  const canAddTenant = useCanAddResource('max_tenants');
  const navigate = useNavigate();

  const {
    applications,
    loading: applicationsLoading,
    updateApplicationStatus,
    refetch: refetchApplications
  } = useUnitApplications();

  // Filter pending applications
  const pendingApplications = applications.filter((app: any) => app.status === 'pending');

  // Get unique apartments (properties) from tenants
  const apartments = Array.from(
    new Set(
      tenants
        .map(tenant => tenant.units?.properties?.name)
        .filter(Boolean)
    )
  ).sort();

  // Filter tenants by selected apartment
  const filteredTenants = selectedApartment === 'all' 
    ? tenants 
    : tenants.filter(tenant => tenant.units?.properties?.name === selectedApartment);

  const handleCreateSuccess = (credentials?: any) => {
    console.log('🔄 Tenant created successfully, refreshing tenant list...');
    setShowCreateForm(false);
    // Refresh the tenant list to show the newly created tenant
    refetch();
    if (credentials) {
      setTenantCredentials(credentials);
      setShowCredentials(true);
    }
  };

  const handleShowCredentials = async (tenant: any) => {
    console.log('🔍 [TenantManagementSection] Showing credentials for tenant:', tenant);
    console.log('🔍 [TenantManagementSection] Profile ID:', tenant?.tenant_info?.profile_id);
    console.log('🔍 [TenantManagementSection] Email:', tenant?.tenant_info?.email);
    
    setSelectedTenant(tenant);
    // Clear any previous credentials since we're viewing an existing tenant
    setTenantCredentials(null);
    setCurrentPassword('');
    setShowCredentials(true);
    
    // Try to get current password if tenant has a profile_id
    if (tenant?.tenant_info?.profile_id) {
      try {
        setPasswordLoading(true);
        
        // Validate and correct the profile_id if needed
        const validProfileId = await validateAndCorrectProfileId(tenant.tenant_info.profile_id);
        
        if (!validProfileId) {
          console.warn('⚠️ [TenantManagementSection] Invalid profile ID found:', tenant.tenant_info.profile_id);
          return;
        }

        // If the profile_id was corrected, update the tenant_info
        if (validProfileId !== tenant.tenant_info.profile_id) {
          console.log('🔧 [TenantManagementSection] Correcting profile_id from', tenant.tenant_info.profile_id, 'to', validProfileId);
          await safeUpdateTenantProfileId(tenant.id, validProfileId);
        }
        
        // First, try to find the profile by profile_id (more reliable than email)
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, user_id, email')
          .eq('id', validProfileId)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            console.warn('⚠️ [TenantManagementSection] No profile found for profile_id:', tenant.tenant_info.profile_id);
          } else {
            console.warn('⚠️ [TenantManagementSection] Error fetching profile:', profileError);
          }
          return;
        }

        if (!profileData?.user_id) {
          console.warn('⚠️ [TenantManagementSection] No user_id found in profile data');
          return;
        }

        console.log('🔍 [TenantManagementSection] Found user_id:', profileData.user_id);
        
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
          profileData.user_id
        );

        console.log('🔍 [TenantManagementSection] User data response:', userData);
        console.log('🔍 [TenantManagementSection] User error:', userError);

        if (!userError && userData?.user) {
          setCurrentPassword('***HIDDEN***');
        } else {
          console.warn('⚠️ [TenantManagementSection] No user found or error:', userError);
        }
      } catch (error) {
        console.error('❌ [TenantManagementSection] Error fetching user data:', error);
      } finally {
        setPasswordLoading(false);
      }
    } else {
      console.warn('⚠️ [TenantManagementSection] No profile_id found for tenant');
    }
  };

  const handleEditTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setShowEditForm(true);
  };

  const handleApproveApplication = async (applicationId: string) => {
    try {
      await updateApplicationStatus(applicationId, 'approved');
      toast.success('Application approved successfully');
      // Refresh both tenant list and applications list
      refetch(); // Refresh tenant list to show the newly created tenant
      refetchApplications(); // Refresh applications list to remove the approved application
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    try {
      await updateApplicationStatus(applicationId, 'rejected');
      toast.success('Application rejected');
      // Refresh applications list to remove the rejected application
      refetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    }
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    setSelectedTenant(null);
    // Refresh the tenant list to show updated tenant data
    refetch();
  };

  const handleEditCancel = () => {
    setShowEditForm(false);
    setSelectedTenant(null);
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      await deleteTenant(tenantId);
    }
  };

  const handleMarkAsPaid = async (tenant: any) => {
    if (!window.confirm(`Mark rent balance as paid for ${tenant.tenant_info.first_name} ${tenant.tenant_info.last_name}?`)) {
      return;
    }

    try {
      // Update tenant_info to set balance to 0 and payment_status to paid
      const { error } = await supabaseAdmin
        .from('tenant_info')
        .update({
          current_balance: 0,
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant.tenant_info.id);

      if (error) {
        console.error('Error marking rent as paid:', error);
        toast.error('Failed to mark rent as paid');
        return;
      }

      toast.success('Rent balance marked as paid');
      refetch(); // Refresh the tenant list
    } catch (error) {
      console.error('Error marking rent as paid:', error);
      toast.error('Failed to mark rent as paid');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'terminated':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Terminated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
      case 'overdue':
        return <Badge className="bg-orange-100 text-orange-800">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tenant Management</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading tenants...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tenant Management</h2>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tenant Management</h2>
          <p className="text-muted-foreground">Manage your tenants and their information</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              // Check subscription before opening form
              const check = canAddTenant();
              if (!check.allowed) {
                toast.error(
                  check.reason === 'no_subscription' 
                    ? "Subscription Required" 
                    : "Tenant Limit Reached",
                  {
                    description: check.message
                  }
                );
                navigate('/landlord/plans-billing');
                return;
              }
              setShowCreateForm(true);
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
          
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
              </DialogHeader>
              <TenantCreationForm 
                onSuccess={handleCreateSuccess}
                onCancel={() => setShowCreateForm(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Applications Section */}
      {pendingApplications.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Applications ({pendingApplications.length})
            </CardTitle>
            <CardDescription>
              Review and approve tenant applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApplications.map((application: any) => (
                <div key={application.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {application.profiles?.first_name?.[0]}{application.profiles?.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">
                        {application.profiles?.first_name} {application.profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {application.properties?.name} - Unit {application.units?.unit_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Applied {format(new Date(application.created_at), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectApplication(application.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveApplication(application.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeTenants.length} active, {pendingTenants.length} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalMonthlyRent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {activeTenants.length} active tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Deposits</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totalSecurityDeposits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total held deposits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {occupancyRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {occupiedUnits} of {totalUnits} units occupied
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table with Apartment Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Management</CardTitle>
          <CardDescription>
            Manage your tenants by apartment or view all tenants
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No tenants yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first tenant
              </p>
              <Button onClick={() => {
                // Check subscription before opening form
                const check = canAddTenant();
                if (!check.allowed) {
                  toast.error(
                    check.reason === 'no_subscription' 
                      ? "Subscription Required" 
                      : "Tenant Limit Reached",
                    {
                      description: check.message
                    }
                  );
                  navigate('/landlord/plans-billing');
                  return;
                }
                setShowCreateForm(true);
              }}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Tenant
              </Button>
            </div>
          ) : (
            <Tabs value={selectedApartment} onValueChange={setSelectedApartment} className="w-full">
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All Tenants ({tenants.length})
                </TabsTrigger>
                {apartments.map((apartment) => {
                  const apartmentTenantCount = tenants.filter(tenant => 
                    tenant.units?.properties?.name === apartment
                  ).length;
                  return (
                    <TabsTrigger 
                      key={apartment} 
                      value={apartment}
                      className="flex items-center gap-2"
                    >
                      <Building className="h-4 w-4" />
                      {apartment} ({apartmentTenantCount})
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              
              <TabsContent value="all" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">All Tenants ({tenants.length})</h3>
                  </div>
                  <TenantsTable 
                    tenants={tenants}
                    onViewDetails={(tenant) => {
                      setSelectedTenant(tenant);
                      setShowTenantDetails(true);
                    }}
                    onShowCredentials={handleShowCredentials}
                    onEditTenant={handleEditTenant}
                    onDeleteTenant={handleDeleteTenant}
                    onMarkAsPaid={handleMarkAsPaid}
                    getStatusBadge={getStatusBadge}
                    getPaymentStatusBadge={getPaymentStatusBadge}
                  />
                </div>
              </TabsContent>
              
              {apartments.map((apartment) => {
                const apartmentTenants = tenants.filter(tenant => 
                  tenant.units?.properties?.name === apartment
                );
                return (
                  <TabsContent key={apartment} value={apartment} className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{apartment} ({apartmentTenants.length} tenants)</h3>
                      </div>
                      <TenantsTable 
                        tenants={apartmentTenants}
                        onViewDetails={(tenant) => {
                          setSelectedTenant(tenant);
                          setShowTenantDetails(true);
                        }}
                        onShowCredentials={handleShowCredentials}
                        onEditTenant={handleEditTenant}
                        onDeleteTenant={handleDeleteTenant}
                        onMarkAsPaid={handleMarkAsPaid}
                        getStatusBadge={getStatusBadge}
                        getPaymentStatusBadge={getPaymentStatusBadge}
                      />
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Tenant Details Dialog */}
      <Dialog open={showTenantDetails} onOpenChange={setShowTenantDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Tenant Information
            </DialogTitle>
            <CardDescription>
              Complete tenant details and account information
            </CardDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="flex gap-2 p-4 bg-muted/50 rounded-lg">
                <Button
                  onClick={() => {
                    setShowTenantDetails(false);
                    handleEditTenant(selectedTenant);
                  }}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Tenant Information
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTenantDetails(false)}
                >
                  Close
                </Button>
              </div>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                      <p className="text-base">{selectedTenant.tenant_info.first_name} {selectedTenant.tenant_info.last_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                      <p className="text-base">{selectedTenant.tenant_info.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                      <p className="text-base">{selectedTenant.tenant_info.phone}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Tenant Status</Label>
                      <Badge 
                        variant={selectedTenant.tenant_info.tenant_status === 'active' ? 'default' : 'secondary'}
                        className={
                          selectedTenant.tenant_info.tenant_status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {selectedTenant.tenant_info.tenant_status || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Login Email</Label>
                      <p className="text-base font-mono bg-muted text-foreground p-2 rounded">{selectedTenant.tenant_info.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Account Status</Label>
                      <p className="text-base">
                        {selectedTenant.tenant_info.profile_id ? '✅ Active Account' : '❌ No Account'}
                      </p>
                    </div>
                  </div>
                  {selectedTenant.tenant_info.profile_id && (
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Login Credentials:</strong> The tenant can log in using their email address. 
                        If they need a password reset, use the "Edit Tenant" button to reset their password.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Lease Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lease Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Rent Amount</Label>
                      <p className="text-base font-semibold text-green-600">
                        KES {selectedTenant.rent_amount?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Security Deposit</Label>
                      <p className="text-base font-semibold text-blue-600">
                        KES {selectedTenant.security_deposit?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Lease Start Date</Label>
                      <p className="text-base">
                        {selectedTenant.lease_start_date ? new Date(selectedTenant.lease_start_date).toLocaleDateString() : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Lease End Date</Label>
                      <p className="text-base">
                        {selectedTenant.lease_end_date ? new Date(selectedTenant.lease_end_date).toLocaleDateString() : 'Not set'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Unit Information */}
              {selectedTenant.units && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Unit Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Unit Number</Label>
                        <p className="text-base font-semibold">{selectedTenant.units.unit_number}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Unit Type</Label>
                        <p className="text-base">{selectedTenant.units.type || 'Not specified'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm font-medium text-muted-foreground">Property</Label>
                        <p className="text-base font-semibold">{selectedTenant.units.properties?.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedTenant.units.properties?.address}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Payment Status</Label>
                      <Badge 
                        variant={
                          selectedTenant.tenant_info.payment_status === 'paid' ? 'default' : 
                          selectedTenant.tenant_info.payment_status === 'overdue' ? 'destructive' : 'secondary'
                        }
                        className={
                          selectedTenant.tenant_info.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 
                          selectedTenant.tenant_info.payment_status === 'overdue' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {selectedTenant.tenant_info.payment_status || 'Unknown'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Current Balance</Label>
                      <p className="text-base font-semibold text-red-600">
                        KES {selectedTenant.tenant_info.current_balance?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              {(selectedTenant.tenant_info.emergency_contact_name || selectedTenant.tenant_info.emergency_contact_phone) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Contact Name</Label>
                        <p className="text-base">{selectedTenant.tenant_info.emergency_contact_name || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Contact Phone</Label>
                        <p className="text-base">{selectedTenant.tenant_info.emergency_contact_phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedTenant.tenant_info.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base">{selectedTenant.tenant_info.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    setShowTenantDetails(false);
                    handleEditTenant(selectedTenant);
                  }}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Tenant Information
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowTenantDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tenant Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant Information</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <TenantEditForm
              tenant={selectedTenant}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
              onResetPassword={(email) => {
                console.log('Reset password for:', email);
                // This will be handled by the TenantEditForm component
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Tenant Credentials Dialog */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Tenant Login Credentials
            </DialogTitle>
            <CardDescription>
              Share these credentials with the tenant for login access
            </CardDescription>
          </DialogHeader>
          {(tenantCredentials || selectedTenant) && (
            <div className="space-y-4">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Save these credentials securely. The tenant will need these to log in to their account.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tenant Name</Label>
                  <p className="text-base font-semibold">
                    {tenantCredentials?.tenantName || 
                     `${selectedTenant?.tenant_info?.first_name} ${selectedTenant?.tenant_info?.last_name}`}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Login Email</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-mono text-base text-foreground">
                      {tenantCredentials?.email || selectedTenant?.tenant_info?.email}
                    </p>
                  </div>
                </div>
                
                {tenantCredentials?.password && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Temporary Password</Label>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-lg shadow-sm">
                      <p className="font-mono text-base font-semibold text-blue-900 dark:text-blue-100">
                        {tenantCredentials.password}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      The tenant should change this password on first login
                    </p>
                  </div>
                )}
                
                {!tenantCredentials?.password && currentPassword && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Current Password</Label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <p className="font-mono text-base font-semibold text-gray-800 dark:text-gray-200">
                        {currentPassword}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Password is hidden for security. Use "Edit Tenant" to reset and see new password.
                    </p>
                  </div>
                )}
                
                {!tenantCredentials?.password && !currentPassword && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Account Status</Label>
                    <div className="p-3 rounded-lg">
                      {selectedTenant?.tenant_info?.profile_id ? (
                        <div className="bg-green-50 border border-green-200 p-3 rounded">
                          <p className="text-green-800 font-medium">
                            ✅ Account exists - Use "Edit Tenant" to reset password
                          </p>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 p-3 rounded">
                          <p className="text-red-800 font-medium">
                            ❌ No account created yet
                          </p>
                          <p className="text-red-600 text-sm mt-1">
                            This tenant was created before the account creation feature was added. 
                            Use "Edit Tenant" to create an account and generate credentials.
                          </p>
                        </div>
                      )}
                    </div>
                    {passwordLoading && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Checking account status...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {selectedTenant?.tenant_info?.profile_id ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Instructions for Tenant:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Go to the login page</li>
                    <li>• Enter the email address above</li>
                    <li>• Enter the password (if provided)</li>
                    <li>• Change password on first login</li>
                    <li>• Contact you if they need help</li>
                  </ul>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Next Steps:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• This tenant doesn't have a login account yet</li>
                    <li>• Use "Edit Tenant" to create an account and generate credentials</li>
                    <li>• Once created, share the credentials with the tenant</li>
                    <li>• The tenant can then log in and access their portal</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setShowCredentials(false);
                    setTenantCredentials(null);
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
                {tenantCredentials?.password && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Email: ${tenantCredentials.email}\nPassword: ${tenantCredentials.password}`
                      );
                    }}
                  >
                    Copy Credentials
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// TenantsTable Component
interface TenantsTableProps {
  tenants: any[];
  onViewDetails: (tenant: any) => void;
  onShowCredentials: (tenant: any) => void;
  onEditTenant: (tenant: any) => void;
  onDeleteTenant: (tenantId: string) => void;
  onMarkAsPaid: (tenant: any) => void;
  getStatusBadge: (status: string) => JSX.Element;
  getPaymentStatusBadge: (status: string) => JSX.Element;
}

const TenantsTable = ({ 
  tenants, 
  onViewDetails, 
  onShowCredentials, 
  onEditTenant, 
  onDeleteTenant,
  onMarkAsPaid,
  getStatusBadge, 
  getPaymentStatusBadge 
}: TenantsTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Rent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants
          .sort((a, b) => {
            // First sort by property name
            const propertyA = a.units?.properties?.name || '';
            const propertyB = b.units?.properties?.name || '';
            
            if (propertyA !== propertyB) {
              return propertyA.localeCompare(propertyB);
            }
            
            // Then sort by unit number
            const unitNumA = parseInt(a.units?.unit_number || '0') || a.units?.unit_number || '';
            const unitNumB = parseInt(b.units?.unit_number || '0') || b.units?.unit_number || '';
            
            if (typeof unitNumA === 'number' && typeof unitNumB === 'number') {
              return unitNumA - unitNumB;
            }
            
            return String(unitNumA).localeCompare(String(unitNumB));
          })
          .map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {tenant.tenant_info.first_name} {tenant.tenant_info.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ID: {tenant.id.slice(0, 8)}...
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="text-sm">{tenant.tenant_info.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {tenant.tenant_info.phone}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {tenant.units ? (
                  <div>
                    <div className="font-medium">Unit {tenant.units.unit_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {tenant.units.properties?.name}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Not assigned</span>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">KES {tenant.rent_amount.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    Deposit: KES {tenant.security_deposit.toLocaleString()}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(tenant.status)}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {getPaymentStatusBadge(tenant.tenant_info.payment_status)}
                  <div className="text-sm text-muted-foreground">
                    Balance: KES {tenant.tenant_info.current_balance.toLocaleString()}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(tenant)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onShowCredentials(tenant)}
                    title="View Credentials"
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditTenant(tenant)}
                    title="Edit Tenant"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {tenant.tenant_info.current_balance > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkAsPaid(tenant)}
                      title="Mark Rent as Paid"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteTenant(tenant.id)}
                    title="Delete Tenant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
};

export default TenantManagementSection;