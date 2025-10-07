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
  Clock,
  Settings,
  User,
  Key
} from 'lucide-react';
import { useLandlordTenants } from '@/hooks/useLandlordTenants';
import { TenantCreationForm } from '../TenantCreationForm';
import { TenantEditForm } from '../TenantEditForm';
import { format } from 'date-fns';

export const TenantManagementSection = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [tenantCredentials, setTenantCredentials] = useState<any>(null);
  
  const {
    tenants,
    loading,
    error,
    activeTenants,
    pendingTenants,
    terminatedTenants,
    totalMonthlyRent,
    totalSecurityDeposits,
    deleteTenant,
    refetch
  } = useLandlordTenants();

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

  const handleShowCredentials = (tenant: any) => {
    setSelectedTenant(tenant);
    setShowCredentials(true);
  };

  const handleEditTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setShowEditForm(true);
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
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Tenant
              </Button>
            </DialogTrigger>
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
              {tenants.length > 0 ? Math.round((activeTenants.length / tenants.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Active tenants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>
            Manage your tenants and their lease information
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
              <Button onClick={() => setShowCreateForm(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Tenant
              </Button>
            </div>
          ) : (
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
                {tenants.map((tenant) => (
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
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setShowTenantDetails(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShowCredentials(tenant)}
                          title="View Credentials"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTenant(tenant)}
                          title="Edit Tenant"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTenant(tenant.id)}
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
              <div className="flex gap-2 p-4 bg-gray-50 rounded-lg">
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
                      <p className="text-base font-mono bg-gray-100 p-2 rounded">{selectedTenant.tenant_info.email}</p>
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
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="font-mono text-base">
                      {tenantCredentials?.email || selectedTenant?.tenant_info?.email}
                    </p>
                  </div>
                </div>
                
                {tenantCredentials?.password && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Temporary Password</Label>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-mono text-base font-semibold text-yellow-800">
                        {tenantCredentials.password}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      The tenant should change this password on first login
                    </p>
                  </div>
                )}
                
                {!tenantCredentials?.password && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Password Status</Label>
                    <p className="text-base">
                      {selectedTenant?.tenant_info?.profile_id ? 
                        '✅ Account exists - Use "Edit Tenant" to reset password' : 
                        '❌ No account created yet'
                      }
                    </p>
                  </div>
                )}
              </div>

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
