import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Settings
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
  
  const {
    tenants,
    loading,
    error,
    activeTenants,
    pendingTenants,
    terminatedTenants,
    totalMonthlyRent,
    totalSecurityDeposits,
    deleteTenant
  } = useLandlordTenants();

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
  };

  const handleEditTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setShowEditForm(true);
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    setSelectedTenant(null);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Personal Information</h4>
                  <p><strong>Name:</strong> {selectedTenant.tenant_info.first_name} {selectedTenant.tenant_info.last_name}</p>
                  <p><strong>Email:</strong> {selectedTenant.tenant_info.email}</p>
                  <p><strong>Phone:</strong> {selectedTenant.tenant_info.phone}</p>
                </div>
                <div>
                  <h4 className="font-medium">Lease Information</h4>
                  <p><strong>Status:</strong> {selectedTenant.status}</p>
                  <p><strong>Rent:</strong> KES {selectedTenant.rent_amount.toLocaleString()}</p>
                  <p><strong>Deposit:</strong> KES {selectedTenant.security_deposit.toLocaleString()}</p>
                </div>
              </div>
              {selectedTenant.units && (
                <div>
                  <h4 className="font-medium">Unit Information</h4>
                  <p><strong>Unit:</strong> {selectedTenant.units.unit_number}</p>
                  <p><strong>Property:</strong> {selectedTenant.units.properties?.name}</p>
                  <p><strong>Address:</strong> {selectedTenant.units.properties?.address}</p>
                </div>
              )}
              <div>
                <h4 className="font-medium">Payment Information</h4>
                <p><strong>Status:</strong> {selectedTenant.tenant_info.payment_status}</p>
                <p><strong>Balance:</strong> KES {selectedTenant.tenant_info.current_balance.toLocaleString()}</p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setShowTenantDetails(false);
                    handleEditTenant(selectedTenant);
                  }}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Tenant
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
    </div>
  );
};
