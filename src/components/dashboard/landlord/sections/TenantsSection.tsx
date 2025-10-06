import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, Search, Phone, Mail, Calendar, DollarSign, Plus, Edit, MoreHorizontal, UserMinus, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useTenants, Tenant } from '@/hooks/useTenants';
import { useUnitApplications } from '@/hooks/useUnitApplications';
import { TenantForm } from '../TenantForm';
import { PaymentModal } from '../payments/PaymentModal';

export const TenantsSection = () => {
  const { tenants, loading, createTenant, updateTenant, terminateLease, refetch: refetchTenants } = useTenants();
  const { 
    applications, 
    loading: applicationsLoading, 
    updateApplicationStatus 
  } = useUnitApplications();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenantFormOpen, setTenantFormOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | undefined>();
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const filteredTenants = tenants.filter(tenant => {
    const fullName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim();
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tenant.email && tenant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         tenant.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.property_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tenant.lease_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddTenant = () => {
    setSelectedTenant(undefined);
    setFormMode('create');
    setTenantFormOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormMode('edit');
    setTenantFormOpen(true);
  };

  const handlePayment = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setPaymentModalOpen(true);
  };

  const handleTerminateLease = async (tenant: Tenant) => {
    await terminateLease(tenant.id);
  };

  const handleFormSubmit = async (data: any) => {
    if (formMode === 'create') {
      return await createTenant(data);
    } else if (selectedTenant) {
      return await updateTenant(selectedTenant.id, data);
    }
    return false;
  };

  // Get pending applications for landlord
  const pendingApplications = applications.filter(app => app.status === 'pending');

  const handleApproveApplication = async (applicationId: string) => {
    await updateApplicationStatus(applicationId, 'approved');
    // Refresh tenants list to show newly created active tenant
    refetchTenants();
  };

  const handleRejectApplication = async (applicationId: string) => {
    await updateApplicationStatus(applicationId, 'rejected');
  };

  // Calculate stats
  const activeTenants = tenants.filter(t => t.lease_status === 'active').length;
  const pendingLeases = tenants.filter(t => t.lease_status === 'pending').length;
  const noLeaseTenants = tenants.filter(t => t.lease_status === 'no_lease').length;
  const totalMonthlyRent = tenants.reduce((sum, t) => sum + (t.rent_amount || 0), 0);
  
  // For overdue payments, we would need to check payment records
  // For now, we'll use a placeholder
  const overduePayments = 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning'; 
      case 'former': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'success';
      case 'overdue': return 'destructive';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Tenants</h1>
          <p className="text-muted-foreground">Manage tenant relationships and lease agreements</p>
        </div>
        <Button className="gap-2" onClick={handleAddTenant}>
          <Plus className="h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={statusFilter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={statusFilter === 'active' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Button>
          <Button 
            variant={statusFilter === 'pending' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </Button>
          <Button 
            variant={statusFilter === 'no_lease' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setStatusFilter('no_lease')}
          >
            No Lease
          </Button>
          <Button 
            variant={statusFilter === 'terminated' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setStatusFilter('terminated')}
          >
            Former
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{activeTenants}</div>
            <div className="text-sm text-muted-foreground">Active Tenants</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{noLeaseTenants}</div>
            <div className="text-sm text-muted-foreground">No Lease</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{pendingApplications.length}</div>
            <div className="text-sm text-muted-foreground">Pending Applications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{overduePayments}</div>
            <div className="text-sm text-muted-foreground">Overdue Payments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">KES {totalMonthlyRent.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Monthly Rent</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Applications Section */}
      {pendingApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Pending Applications ({pendingApplications.length})
            </CardTitle>
            <CardDescription>Review and approve tenant applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApplications.map((application: any) => {
                const applicantName = `${application.profiles?.first_name || ''} ${application.profiles?.last_name || ''}`.trim();
                const initials = `${application.profiles?.first_name?.[0] || ''}${application.profiles?.last_name?.[0] || ''}`;
                
                return (
                  <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={application.profiles?.avatar_url || ''} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{applicantName || 'No Name'}</div>
                          <Badge 
                            variant={application.deposit_paid ? "default" : "destructive"}
                            className={application.deposit_paid ? 
                              "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : 
                              "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }
                          >
                            {application.deposit_paid ? "Deposit Paid" : "Deposit Pending"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {application.properties?.name} - Unit {application.units?.unit_number}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Applied {new Date(application.created_at).toLocaleDateString()}
                        </div>
                        {application.deposit_paid && application.deposit_paid_at && (
                          <div className="text-xs text-green-600">
                            Deposit paid on {new Date(application.deposit_paid_at).toLocaleDateString()}
                          </div>
                        )}
                        {application.preferred_move_in_date && (
                          <div className="text-xs text-muted-foreground">
                            Preferred move-in: {new Date(application.preferred_move_in_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        KES {application.units?.rent_amount?.toLocaleString()}/month
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => handleApproveApplication(application.id)}
                        disabled={!application.deposit_paid}
                        title={!application.deposit_paid ? "Cannot approve until deposit is paid" : "Approve application"}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRejectApplication(application.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Directory</CardTitle>
          <CardDescription>Complete list of all tenants and their lease information</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Lease Period</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading tenants...
                  </TableCell>
                </TableRow>
              ) : filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No tenants found. {statusFilter !== 'all' ? 'Try changing the filter.' : 'Add your first tenant to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((tenant) => {
                  const fullName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim();
                  const initials = `${tenant.first_name?.[0] || ''}${tenant.last_name?.[0] || ''}`;
                  
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={tenant.avatar_url || ''} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{fullName || 'No Name'}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {tenant.email || 'No email'}
                            </div>
                            {tenant.phone && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {tenant.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {tenant.property_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Unit {tenant.unit_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(tenant.lease_start).toLocaleDateString()}
                          </div>
                          <div className="text-muted-foreground">
                            to {new Date(tenant.lease_end).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">KES {tenant.rent_amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">per month</div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={tenant.lease_status === 'active' ? 'default' : 
                                  tenant.lease_status === 'pending' ? 'secondary' : 'outline'}
                          className={
                            tenant.lease_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            tenant.lease_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            tenant.lease_status === 'no_lease' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }
                        >
                          {tenant.lease_status === 'no_lease' ? 'No Lease' : tenant.lease_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Current
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50">
                            <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Tenant
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePayment(tenant)}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              Record Payment
                            </DropdownMenuItem>
                            {tenant.lease_status === 'active' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <UserMinus className="mr-2 h-4 w-4" />
                                    Terminate Lease
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Terminate Lease</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to terminate the lease for {fullName}? 
                                      This will mark the lease as terminated and make the unit available.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleTerminateLease(tenant)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Terminate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tenant Form Modal */}
      <TenantForm
        open={tenantFormOpen}
        onOpenChange={setTenantFormOpen}
        onSubmit={handleFormSubmit}
        tenant={selectedTenant}
        mode={formMode}
      />

      {/* Payment Modal */}
      {selectedTenant && (
        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          tenantName={`${selectedTenant.first_name || ''} ${selectedTenant.last_name || ''}`.trim()}
          unitInfo={`${selectedTenant.property_name} - Unit ${selectedTenant.unit_number}`}
          monthlyRent={selectedTenant.rent_amount}
        />
      )}
    </div>
  );
};