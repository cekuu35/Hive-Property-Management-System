import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Receipt, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  Building2,
  User,
  Calendar,
  Search,
  Filter
} from 'lucide-react';
import { useUtilityBills } from '@/hooks/useUtilityBills';
import { useProperties } from '@/hooks/useProperties';
import { useLandlordTenants } from '@/hooks/useLandlordTenants';
import { format } from 'date-fns';
import { toast } from 'sonner';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
    case 'overdue':
      return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
    case 'unpaid':
    default:
      return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Unpaid</Badge>;
  }
};

export const UtilityBillsManagement = () => {
  const { 
    landlordBills, 
    utilities, 
    loading, 
    error, 
    createBill, 
    updateBill, 
    deleteBill, 
    fetchLandlordBills 
  } = useUtilityBills();
  
  const { properties } = useProperties();
  const { tenants } = useLandlordTenants();

  // Debug logging
  console.log('🔍 [UtilityBillsManagement] Debug Info:');
  console.log('Landlord bills data:', landlordBills);
  console.log('Landlord bills count:', landlordBills?.length);
  console.log('Sample bill structure:', landlordBills?.[0]);
  console.log('Properties data:', properties);
  console.log('Properties count:', properties?.length);
  console.log('Tenants data:', tenants);
  console.log('Tenants count:', tenants?.length);
  console.log('Utilities data:', utilities);
  console.log('Utilities count:', utilities?.length);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');

  // Create bill form state
  const [createForm, setCreateForm] = useState({
    unit_id: '',
    utility_id: '',
    month: '',
    amount: '',
    due_date: '',
    tenant_id: ''
  });

  // Edit bill form state
  const [editForm, setEditForm] = useState({
    amount: '',
    due_date: '',
    status: '',
    payment_reason: ''
  });

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBill({
        unit_id: createForm.unit_id,
        utility_id: createForm.utility_id,
        month: createForm.month,
        amount: parseFloat(createForm.amount),
        due_date: createForm.due_date,
        tenant_id: createForm.tenant_id || undefined
      });
      
      setShowCreateDialog(false);
      setCreateForm({
        unit_id: '',
        utility_id: '',
        month: '',
        amount: '',
        due_date: '',
        tenant_id: ''
      });
    } catch (error) {
      console.error('Error creating bill:', error);
    }
  };

  const handleEditBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    try {
      await updateBill(selectedBill.id, {
        amount: parseFloat(editForm.amount),
        due_date: editForm.due_date,
        status: editForm.status,
        payment_reason: editForm.payment_reason
      });
      
      setShowEditDialog(false);
      setSelectedBill(null);
    } catch (error) {
      console.error('Error updating bill:', error);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      try {
        await deleteBill(billId);
      } catch (error) {
        console.error('Error deleting bill:', error);
      }
    }
  };

  const openEditDialog = (bill: any) => {
    setSelectedBill(bill);
    setEditForm({
      amount: bill.amount.toString(),
      due_date: bill.due_date,
      status: bill.status,
      payment_reason: ''
    });
    setShowEditDialog(true);
  };

    // Filter bills
    const filteredBills = landlordBills.filter(bill => {
      const billData = bill as any;
      const utilityName = billData.utilities?.name || '';
      const unitNumber = billData.units?.unit_number || '';
      const propertyName = billData.units?.properties?.name || '';
      const tenantName = billData.tenant_info ? `${billData.tenant_info.first_name} ${billData.tenant_info.last_name}` : '';
      
      const matchesSearch = 
        utilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenantName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
      const matchesUnit = unitFilter === 'all' || bill.unit_id === unitFilter;

      return matchesSearch && matchesStatus && matchesUnit;
    });

  // Get unique units for filter
  const uniqueUnits = Array.from(new Set(landlordBills.map(bill => bill.unit_id)))
    .map(unitId => {
      const bill = landlordBills.find(b => b.unit_id === unitId);
      return { id: unitId, label: `${bill?.property_name} - Unit ${bill?.unit_number}` };
    });

  // Calculate totals
  const totals = {
    total: landlordBills.reduce((sum, bill) => sum + bill.amount, 0),
    paid: landlordBills.filter(bill => bill.status === 'paid').reduce((sum, bill) => sum + bill.amount, 0),
    unpaid: landlordBills.filter(bill => bill.status === 'unpaid').reduce((sum, bill) => sum + bill.amount, 0),
    overdue: landlordBills.filter(bill => bill.status === 'overdue').reduce((sum, bill) => sum + bill.amount, 0)
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Utility Bills Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading utility bills...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Utility Bills Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              KES {totals.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {landlordBills.length} bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              KES {totals.paid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {landlordBills.filter(b => b.status === 'paid').length} bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              KES {totals.unpaid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {landlordBills.filter(b => b.status === 'unpaid').length} bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              KES {totals.overdue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {landlordBills.filter(b => b.status === 'overdue').length} bills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Utility Bills Management
              </CardTitle>
              <CardDescription>
                Create and manage utility bills for your properties
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Utility Bill</DialogTitle>
                  <DialogDescription>
                    Add a new utility bill for one of your units. Select a unit to see its current tenant, and the tenant will be auto-selected for the bill.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBill} className="space-y-4">
                  {loading && (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">Loading data...</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="unit_id">Unit</Label>
                      <Select
                        value={createForm.unit_id}
                        onValueChange={(value) => {
                          // Find the tenant for this unit and auto-select them
                          const selectedUnit = properties
                            .flatMap(p => (p as any).units || [])
                            .find((unit: any) => unit.id === value);
                          
                          const unitTenant = tenants.find(tenant => 
                            tenant.units?.id === value
                          );
                          
                          setCreateForm(prev => ({ 
                            ...prev, 
                            unit_id: value,
                            tenant_id: unitTenant?.tenant_info?.id || ''
                          }));
                        }}
                        required
                        disabled={loading || !properties || properties.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties && properties.length > 0 ? (
                            properties
                              .map(property => 
                                (property as any).units?.map((unit: any) => ({
                                  ...unit,
                                  propertyName: property.name
                                }))
                              )
                              .flat()
                              .filter(Boolean)
                              .sort((a: any, b: any) => {
                                // First sort by property name
                                if (a.propertyName !== b.propertyName) {
                                  return a.propertyName.localeCompare(b.propertyName);
                                }
                                
                                // Then sort by unit number
                                const unitNumA = parseInt(a.unit_number) || a.unit_number;
                                const unitNumB = parseInt(b.unit_number) || b.unit_number;
                                
                                if (typeof unitNumA === 'number' && typeof unitNumB === 'number') {
                                  return unitNumA - unitNumB;
                                }
                                
                                return String(unitNumA).localeCompare(String(unitNumB));
                              })
                              .map((unit: any) => {
                                // Find tenant for this unit
                                const unitTenant = tenants.find(tenant => 
                                  tenant.units?.id === unit.id
                                );
                                
                                const tenantName = unitTenant?.tenant_info 
                                  ? `${unitTenant.tenant_info.first_name} ${unitTenant.tenant_info.last_name}`
                                  : 'Vacant';
                                
                                return (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {unit.propertyName} - Unit {unit.unit_number}
                                      </span>
                                      <span className={`text-xs ${unitTenant ? 'text-green-600' : 'text-muted-foreground'}`}>
                                        {unitTenant ? `👤 ${tenantName}` : '🏠 Vacant'}
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })
                          ) : (
                            <SelectItem value="no-units" disabled>
                              No units available - Add properties first
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="utility_id">Utility</Label>
                      <Select
                        value={createForm.utility_id}
                        onValueChange={(value) => setCreateForm(prev => ({ ...prev, utility_id: value }))}
                        required
                        disabled={loading || !utilities || utilities.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select utility" />
                        </SelectTrigger>
                        <SelectContent>
                          {utilities && utilities.length > 0 ? (
                            utilities.map(utility => (
                              <SelectItem key={utility.id} value={utility.id}>
                                {utility.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-utilities" disabled>
                              No utilities available - Run the SQL script to add utilities
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="month">Month</Label>
                      <Input
                        id="month"
                        value={createForm.month}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, month: e.target.value }))}
                        placeholder="e.g., October 2025"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="amount">Amount (KES)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={createForm.amount}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={createForm.due_date}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, due_date: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="tenant_id">
                        Tenant {createForm.tenant_id ? '(Auto-selected from unit)' : '(Optional)'}
                      </Label>
                      <Select
                        value={createForm.tenant_id}
                        onValueChange={(value) => setCreateForm(prev => ({ ...prev, tenant_id: value }))}
                        disabled={loading || !tenants || tenants.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            createForm.tenant_id 
                              ? tenants.find(t => t.tenant_info?.id === createForm.tenant_id)?.tenant_info 
                                  ? `${tenants.find(t => t.tenant_info?.id === createForm.tenant_id)?.tenant_info.first_name} ${tenants.find(t => t.tenant_info?.id === createForm.tenant_id)?.tenant_info.last_name}`
                                  : "Select tenant"
                              : "Select tenant"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants && tenants.length > 0 ? (
                            tenants.map(tenant => (
                              <SelectItem key={tenant.tenant_info?.id} value={tenant.tenant_info?.id}>
                                {tenant.tenant_info?.first_name} {tenant.tenant_info?.last_name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-tenants" disabled>
                              No tenants available - Add tenants to your properties first
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        console.log('🔄 Refreshing data...');
                        fetchLandlordBills();
                      }}
                    >
                      Refresh Data
                    </Button>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Bill</Button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {uniqueUnits.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bills Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utility</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No bills found</h3>
                      <p className="text-muted-foreground">Create your first utility bill to get started</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill) => {
                    // Debug logging for each bill
                    console.log('Bill data:', {
                      id: bill.id,
                      tenant_id: (bill as any).tenant_id,
                      tenant_info: (bill as any).tenant_info,
                      unit_id: (bill as any).units?.id,
                      unit_number: (bill as any).units?.unit_number
                    });

                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{(bill as any).utilities?.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{(bill as any).units?.properties?.name || 'Unknown Property'}</div>
                              <div className="text-sm text-muted-foreground">Unit {(bill as any).units?.unit_number || 'Unknown'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(bill as any).tenant_info ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {(bill as any).tenant_info.first_name} {(bill as any).tenant_info.last_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Tenant ID: {(bill as any).tenant_id || 'N/A'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <span className="text-muted-foreground">
                                  {(bill as any).tenant_id ? 'Tenant data not found' : 'No tenant assigned'}
                                </span>
                                <div className="text-xs text-red-500">
                                  {(bill as any).tenant_id ? `Missing tenant ID: ${(bill as any).tenant_id}` : `Bill ID: ${bill.id}`}
                                </div>
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{bill.month}</TableCell>
                        <TableCell className="font-medium">
                          KES {bill.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(bill.due_date), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(bill.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(bill)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBill(bill.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Bill Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Utility Bill</DialogTitle>
            <DialogDescription>
              Update the bill details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditBill} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_amount">Amount (KES)</Label>
                <Input
                  id="edit_amount"
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit_due_date">Due Date</Label>
                <Input
                  id="edit_due_date"
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit_payment_reason">Payment Reason (if marked as paid)</Label>
                <Input
                  id="edit_payment_reason"
                  value={editForm.payment_reason}
                  onChange={(e) => setEditForm(prev => ({ ...prev, payment_reason: e.target.value }))}
                  placeholder="e.g., Cash payment, Bank transfer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Bill</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};




