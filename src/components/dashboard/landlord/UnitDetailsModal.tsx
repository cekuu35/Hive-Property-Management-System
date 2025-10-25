import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, DollarSign, Wrench, User, Home, FileText, AlertTriangle, TrendingUp, Calendar as CalendarIcon, Clock, PlusCircle, Bell, Shield, BarChart3, Calculator, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { MaintenanceRequestModal } from '@/components/dashboard/maintenance/MaintenanceRequestModal';
import { PaymentModal } from '@/components/dashboard/landlord/payments/PaymentModal';
import { NoticeModal } from './NoticeModal';
import { LateFeeConfigModal } from './LateFeeConfigModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UnitDetailsModalProps {
  unit: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

export const UnitDetailsModal = ({ unit, open, onOpenChange, onEdit }: UnitDetailsModalProps) => {
  const [leaseData, setLeaseData] = useState<any>(null);
  const [maintenanceRequests, setMaintenanceRequests] = useState<any[]>([]);
  const [rentPayments, setRentPayments] = useState<any[]>([]);
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Security deposit tracking
  const [depositData, setDepositData] = useState<any>(null);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [showDeductionsModal, setShowDeductionsModal] = useState(false);
  
  // Modal states
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showLateFeeConfig, setShowLateFeeConfig] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (unit?.id && open) {
      fetchUnitDetails();
    }
  }, [unit?.id, open]);

  const fetchSecurityDepositData = async (tenantInfoId: string) => {
    if (!tenantInfoId) return;

    try {
      console.log('🔍 [UnitDetailsModal] Fetching security deposit for tenant_info_id:', tenantInfoId);
      
      // Fetch deposit info from tenant_info
      const { data: depositInfo, error: depositError } = await supabase
        .from('tenant_info')
        .select('security_deposit_amount, security_deposit_remaining, security_deposit_paid, security_deposit_paid_date')
        .eq('id', tenantInfoId)
        .maybeSingle();

      if (depositError) {
        console.error('❌ [UnitDetailsModal] Error fetching deposit info:', depositError);
      } else if (depositInfo) {
        console.log('✅ [UnitDetailsModal] Found deposit info:', depositInfo);
        setDepositData(depositInfo);
      }

      // Fetch deduction history
      const { data: deductionHistory, error: deductionsError } = await supabase
        .from('security_deposit_deductions')
        .select('*')
        .eq('tenant_id', tenantInfoId)
        .order('deducted_at', { ascending: false });

      if (deductionsError) {
        console.error('❌ [UnitDetailsModal] Error fetching deductions:', deductionsError);
      } else {
        console.log('✅ [UnitDetailsModal] Found deductions:', deductionHistory?.length || 0);
        setDeductions(deductionHistory || []);
      }
    } catch (error) {
      console.error('Error fetching security deposit data:', error);
    }
  };

  const fetchUnitDetails = async () => {
    if (!unit?.id) return;
    setLoading(true);

    try {
      console.log('🔍 [UnitDetailsModal] Fetching details for unit:', unit.id);
      
      // Fetch active lease
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('*')
        .eq('unit_id', unit.id)
        .eq('status', 'active')
        .single();

      if (leaseError) {
        console.log('❌ [UnitDetailsModal] No active lease found for unit:', unit.id, leaseError);
      } else {
        console.log('✅ [UnitDetailsModal] Found active lease:', lease.id, 'Tenant Info ID:', lease.tenant_info_id);
      }

      setLeaseData(lease);

      // Fetch tenant profile if lease exists
      if (lease?.tenant_id || lease?.tenant_info_id) {
        let tenantFound = false;
        
        // First try to get from profiles table using tenant_id
        if (lease.tenant_id) {
          const { data: tenant } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', lease.tenant_id)
            .maybeSingle();
          
          if (tenant) {
            setTenantProfile(tenant);
            tenantFound = true;
          }
        }
        
        // If no profile found, try tenant_info table
        if (!tenantFound && lease.tenant_info_id) {
          console.log('🔍 [UnitDetailsModal] Trying tenant_info table with ID:', lease.tenant_info_id);
          const { data: tenantInfo, error: tenantInfoError } = await supabase
            .from('tenant_info')
            .select('*')
            .eq('id', lease.tenant_info_id)
            .maybeSingle();
          
          if (tenantInfoError) {
            console.log('❌ [UnitDetailsModal] Error fetching tenant_info:', tenantInfoError);
          } else if (tenantInfo) {
            console.log('✅ [UnitDetailsModal] Found tenant_info:', tenantInfo.first_name, tenantInfo.last_name);
            // Transform tenant_info to match profile structure
            setTenantProfile({
              id: tenantInfo.id,
              first_name: tenantInfo.first_name,
              last_name: tenantInfo.last_name,
              phone: tenantInfo.phone,
              avatar_url: tenantInfo.avatar_url,
              email: tenantInfo.email
            });
            tenantFound = true;
          } else {
            console.log('❌ [UnitDetailsModal] No tenant_info found for ID:', lease.tenant_info_id);
          }
        }
        
        // If still no tenant found, try to get from profiles using tenant_info_id as profile_id
        if (!tenantFound && lease.tenant_info_id) {
          console.log('🔍 [UnitDetailsModal] Trying profiles table with tenant_info_id as profile_id:', lease.tenant_info_id);
          const { data: tenant, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', lease.tenant_info_id)
            .maybeSingle();
          
          if (profileError) {
            console.log('❌ [UnitDetailsModal] Error fetching from profiles:', profileError);
          } else if (tenant) {
            console.log('✅ [UnitDetailsModal] Found tenant in profiles:', tenant.first_name, tenant.last_name);
            setTenantProfile(tenant);
            tenantFound = true;
          } else {
            console.log('❌ [UnitDetailsModal] No tenant found in profiles table');
          }
        }
        
        // Final fallback: if still no tenant found, create a basic tenant object from tenant_info
        if (!tenantFound && lease.tenant_info_id) {
          console.log('🔍 [UnitDetailsModal] Creating fallback tenant object from tenant_info');
          const { data: tenantInfo } = await supabase
            .from('tenant_info')
            .select('first_name, last_name, email, phone')
            .eq('id', lease.tenant_info_id)
            .single();
          
          if (tenantInfo) {
            console.log('✅ [UnitDetailsModal] Created fallback tenant object:', tenantInfo.first_name, tenantInfo.last_name);
            setTenantProfile({
              id: lease.tenant_info_id,
              first_name: tenantInfo.first_name,
              last_name: tenantInfo.last_name,
              email: tenantInfo.email,
              phone: tenantInfo.phone,
              avatar_url: null
            });
          }
        }
      }

      // Fetch maintenance requests
      const { data: maintenance } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('unit_id', unit.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setMaintenanceRequests(maintenance || []);

      // Fetch rent payments if lease exists
      if (lease?.id) {
        const { data: payments } = await supabase
          .from('rent_payments')
          .select('*')
          .eq('lease_id', lease.id)
          .order('due_date', { ascending: false })
          .limit(12);

        setRentPayments(payments || []);
      }

      // Fetch security deposit data after lease is loaded
      if (lease?.tenant_info_id) {
        await fetchSecurityDepositData(lease.tenant_info_id);
      }
    } catch (error) {
      console.error('Error fetching unit details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'occupied': return 'default';
      case 'vacant': return 'secondary';
      case 'maintenance': return 'destructive';
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'late': return 'destructive';
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const handleGenerateReport = () => {
    if (!unit) return;
    
    const reportData = {
      unit: unit,
      lease: leaseData,
      tenant: tenantProfile,
      maintenance: maintenanceRequests,
      payments: rentPayments,
      generatedAt: new Date().toISOString()
    };
    
    const reportContent = `
Unit Report - ${unit.unit_number || 'Unknown'}
=====================================
Generated: ${format(new Date(), 'PPP')}

Unit Details:
- Unit Number: ${unit.unit_number || 'Unknown'}
- Type: ${unit.type || 'Unknown'}
- Rent: KES ${unit.rent_amount?.toLocaleString() || '0'}
- Deposit: KES ${unit.deposit_amount?.toLocaleString() || '0'}
- Status: ${unit.status || 'Unknown'}

${leaseData ? `
Current Lease:
- Tenant: ${tenantProfile?.first_name || ''} ${tenantProfile?.last_name || ''}
- Start Date: ${format(new Date(leaseData.start_date), 'PPP')}
- End Date: ${format(new Date(leaseData.end_date), 'PPP')}
- Monthly Rent: KES ${leaseData.rent_amount?.toLocaleString()}
` : 'No active lease'}

Financial Summary:
- Total Collected: KES ${rentPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
- Outstanding: KES ${rentPayments.filter(p => p.status === 'pending' || p.status === 'late').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
- Maintenance Costs: KES ${maintenanceRequests.reduce((sum, req) => sum + (req.actual_cost || req.estimated_cost || 0), 0).toLocaleString()}

Maintenance Summary:
- Total Requests: ${maintenanceRequests.length}
- Pending: ${maintenanceRequests.filter(req => req.status === 'pending').length}
- Completed: ${maintenanceRequests.filter(req => req.status === 'completed').length}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Unit-${unit.unit_number || 'Unknown'}-Report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Generated",
      description: "Unit report has been downloaded successfully."
    });
  };

  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Unit {unit?.unit_number || 'Unknown'} - {unit?.type || 'Unknown'}
          </DialogTitle>
          <DialogDescription>
            Comprehensive unit management and tenant information
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-lg font-bold">KES {unit.rent_amount?.toLocaleString() || '0'}</div>
                  <div className="text-sm text-muted-foreground">Monthly Rent</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-warning" />
                <div>
                  <div className="text-lg font-bold">KES {unit.deposit_amount?.toLocaleString() || '0'}</div>
                  <div className="text-sm text-muted-foreground">Security Deposit</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(unit.status)} className="w-fit">
                  {unit.status?.charAt(0).toUpperCase() + unit.status?.slice(1)}
                </Badge>
                <div>
                  <div className="text-sm text-muted-foreground">Current Status</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tenant">Tenant</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Unit Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Unit Number:</span>
                    <span className="font-medium">{unit?.unit_number || 'Unknown'}</span>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{unit?.type || 'Unknown'}</span>
                    {unit?.square_feet && (
                      <>
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-medium">{unit.square_feet} sq ft</span>
                      </>
                    )}
                  </div>
                  {unit.amenities?.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Amenities:</p>
                      <div className="flex flex-wrap gap-1">
                        {unit.amenities.map((amenity: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Unit Images</CardTitle>
                </CardHeader>
                <CardContent>
                  {unit?.images?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {unit.images.slice(0, 4).map((image: string, idx: number) => (
                        <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                          <img 
                            src={image} 
                            alt={`Unit ${unit?.unit_number || 'Unknown'}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No images available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tenant" className="space-y-4">
            {leaseData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Current Tenant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tenantProfile ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Tenant Name</p>
                          <p className="font-medium">{tenantProfile.first_name} {tenantProfile.last_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{tenantProfile.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{tenantProfile.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lease Start</p>
                          <p className="font-medium">{format(new Date(leaseData.start_date), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lease End</p>
                          <p className="font-medium">{format(new Date(leaseData.end_date), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Rent</p>
                          <p className="font-medium">KES {leaseData.rent_amount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Security Deposit</p>
                          <p className="font-medium">KES {leaseData.deposit_amount?.toLocaleString()}</p>
                        </div>
                      </div>
                      {leaseData.lease_document_url && (
                        <Button variant="outline" asChild>
                          <a href={leaseData.lease_document_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-2" />
                            View Lease Document
                          </a>
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <h3 className="text-lg font-semibold mb-2">Tenant Information Not Available</h3>
                      <p className="text-muted-foreground mb-4">
                        This unit has an active lease but tenant profile information could not be loaded.
                      </p>
                      <div className="bg-muted p-4 rounded-lg text-left">
                        <p className="text-sm font-medium mb-2">Lease Information:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">Lease Start:</span>
                          <span>{format(new Date(leaseData.start_date), 'MMM d, yyyy')}</span>
                          <span className="text-muted-foreground">Lease End:</span>
                          <span>{format(new Date(leaseData.end_date), 'MMM d, yyyy')}</span>
                          <span className="text-muted-foreground">Monthly Rent:</span>
                          <span>KES {leaseData.rent_amount?.toLocaleString()}</span>
                          <span className="text-muted-foreground">Security Deposit:</span>
                          <span>KES {leaseData.deposit_amount?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Tenant</h3>
                  <p className="text-muted-foreground">This unit is currently vacant</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            {maintenanceRequests.length > 0 ? (
              <div className="space-y-3">
                {maintenanceRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench className="h-4 w-4" />
                            <h4 className="font-medium">{request.title}</h4>
                            <Badge variant={getPriorityColor(request.priority)}>
                              {request.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Category: {request.category}</span>
                            <span>Created: {format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                            {request.estimated_cost && (
                              <span>Est. Cost: KES {(request.estimated_cost || 0).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Maintenance Requests</h3>
                  <p className="text-muted-foreground">No maintenance history for this unit</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            {rentPayments.length > 0 ? (
              <div className="space-y-3">
                {rentPayments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-4 w-4" />
                          <div>
                            <p className="font-medium">KES {payment.amount?.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">
                              Due: {format(new Date(payment.due_date), 'MMM d, yyyy')}
                              {payment.paid_date && ` • Paid: ${format(new Date(payment.paid_date), 'MMM d, yyyy')}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                      {payment.late_fee > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Late Fee: KES {payment.late_fee.toLocaleString()}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
                  <p className="text-muted-foreground">No rent payments recorded for this unit</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="financials" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Monthly Rent</p>
                      <p className="text-lg font-bold">KES {unit.rent_amount?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Annual Income</p>
                      <p className="text-lg font-bold">KES {((unit.rent_amount || 0) * 12).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Security Deposit</p>
                      <p className="font-medium">KES {unit.deposit_amount?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deposit Status</p>
                      <Badge variant={leaseData ? "default" : "secondary"}>
                        {leaseData ? "Received" : "Not Applicable"}
                      </Badge>
                    </div>
                  </div>
                  
                  {rentPayments.length > 0 && (
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Collected</p>
                          <p className="font-bold text-success">
                            KES {rentPayments
                              .filter(p => p.status === 'paid')
                              .reduce((sum, p) => sum + (p.amount || 0), 0)
                              .toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Outstanding</p>
                          <p className="font-bold text-destructive">
                            KES {rentPayments
                              .filter(p => p.status === 'pending' || p.status === 'late' || p.status === 'overdue')
                              .reduce((sum, p) => sum + (p.amount || 0), 0)
                              .toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Maintenance Costs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Maintenance Cost</p>
                      <p className="text-lg font-bold">
                        KES {maintenanceRequests
                          .reduce((sum, req) => sum + (req.maintenance_cost || req.actual_cost || req.estimated_cost || 0), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending Requests</p>
                      <p className="font-medium">
                        {maintenanceRequests.filter(req => req.status === 'pending' || req.status === 'in_progress' || req.status === 'assigned').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed This Year</p>
                      <p className="font-medium">
                        {maintenanceRequests.filter(req => 
                          req.status === 'completed' && 
                          req.created_at &&
                          new Date(req.created_at).getFullYear() === new Date().getFullYear()
                        ).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Security Deposit Tracking */}
            {leaseData && depositData && (
              <Card className="border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Security Deposit Tracker
                  </CardTitle>
                  <CardDescription>
                    Track maintenance deductions and remaining balance for refund at lease end
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Deposit Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Initial Deposit</p>
                      <p className="text-lg font-bold text-blue-600">
                        KES {(depositData.security_deposit_amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Remaining Balance</p>
                      <p className="text-lg font-bold text-green-600">
                        KES {(depositData.security_deposit_remaining || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Total Deductions</p>
                      <p className="text-lg font-bold text-orange-600">
                        KES {((depositData.security_deposit_amount || 0) - (depositData.security_deposit_remaining || 0)).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Deposit Status</p>
                      <Badge variant={depositData.security_deposit_paid ? "default" : "secondary"} className="mt-1">
                        {depositData.security_deposit_paid ? "✓ Paid" : "Pending"}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Remaining Balance</span>
                      <span className="text-sm font-medium">
                        {depositData.security_deposit_amount > 0 
                          ? Math.round((depositData.security_deposit_remaining / depositData.security_deposit_amount) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className={cn(
                          "h-3 rounded-full transition-all",
                          depositData.security_deposit_amount > 0 && (depositData.security_deposit_remaining / depositData.security_deposit_amount) >= 0.8 ? "bg-green-600" :
                          depositData.security_deposit_amount > 0 && (depositData.security_deposit_remaining / depositData.security_deposit_amount) >= 0.5 ? "bg-yellow-600" :
                          "bg-red-600"
                        )}
                        style={{
                          width: `${depositData.security_deposit_amount > 0 
                            ? Math.max(0, (depositData.security_deposit_remaining / depositData.security_deposit_amount) * 100)
                            : 0}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Deduction History */}
                  {deductions.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">Recent Deductions</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowDeductionsModal(true)}
                          className="text-xs"
                        >
                          View All ({deductions.length})
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {deductions.slice(0, 3).map((deduction) => (
                          <div key={deduction.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{deduction.reason || 'Maintenance Cost'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(deduction.deducted_at), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                            <span className="font-semibold text-destructive">
                              -KES {(deduction.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info Message */}
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Refund Process:</strong> At lease end, refund the remaining balance of KES {(depositData.security_deposit_remaining || 0).toLocaleString()} to the tenant after final inspection.
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDeductionsModal(true)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View History
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        // Generate deposit report
                        const reportContent = `
Security Deposit Report - Unit ${unit.unit_number}
==========================================
Generated: ${format(new Date(), 'PPP')}

Tenant: ${tenantProfile?.first_name || ''} ${tenantProfile?.last_name || ''}
Lease Period: ${format(new Date(leaseData.start_date), 'PPP')} - ${format(new Date(leaseData.end_date), 'PPP')}

Initial Deposit: KES ${(depositData.security_deposit_amount || 0).toLocaleString()}
Total Deductions: KES ${((depositData.security_deposit_amount || 0) - (depositData.security_deposit_remaining || 0)).toLocaleString()}
Remaining Balance: KES ${(depositData.security_deposit_remaining || 0).toLocaleString()}

Deduction History:
${deductions.map(d => `- ${format(new Date(d.deducted_at), 'MMM d, yyyy')}: ${d.reason || 'Maintenance'} - KES ${(d.amount || 0).toLocaleString()}`).join('\n')}

Refund Amount Due: KES ${(depositData.security_deposit_remaining || 0).toLocaleString()}
`;
                        const blob = new Blob([reportContent], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Deposit-Report-Unit-${unit.unit_number}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        
                        toast({
                          title: "Report Generated",
                          description: "Security deposit report has been downloaded."
                        });
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setShowMaintenanceModal(true)}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add Maintenance
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setShowNoticeModal(true)}
                  >
                    <Bell className="h-4 w-4" />
                    Send Notice
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <DollarSign className="h-4 w-4" />
                    Record Payment
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={handleGenerateReport}
                  >
                    <FileText className="h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Occupancy Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-muted-foreground">Current Status</span>
                        <Badge variant={getStatusColor(unit.status)}>
                          {unit.status?.charAt(0).toUpperCase() + unit.status?.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    {leaseData && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Lease Duration</p>
                          <p className="font-medium">
                            {Math.ceil((new Date(leaseData.end_date).getTime() - new Date(leaseData.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Days Until Lease Expires</p>
                          <p className="font-medium">
                            {Math.max(0, Math.ceil((new Date(leaseData.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Lease Progress</p>
                          <div className="w-full bg-muted rounded-full h-2 mt-1">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{
                                width: `${Math.min(100, Math.max(0, 
                                  ((new Date().getTime() - new Date(leaseData.start_date).getTime()) / 
                                   (new Date(leaseData.end_date).getTime() - new Date(leaseData.start_date).getTime())) * 100
                                ))}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Unit Age</p>
                      <p className="font-medium">
                        {unit.created_at 
                          ? `${Math.ceil((new Date().getTime() - new Date(unit.created_at).getTime()) / (1000 * 60 * 60 * 24))} days since creation`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security & Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Security Deposit</p>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">KES {unit.deposit_amount?.toLocaleString() || '0'}</span>
                        <Badge variant={leaseData ? "default" : "secondary"}>
                          {leaseData ? "Secured" : "N/A"}
                        </Badge>
                      </div>
                    </div>
                    
                    {leaseData && (
                      <div>
                        <p className="text-sm text-muted-foreground">Lease Document</p>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {leaseData.lease_document_url ? "Available" : "Missing"}
                          </span>
                          <Badge variant={leaseData.lease_document_url ? "default" : "destructive"}>
                            {leaseData.lease_document_url ? "✓" : "⚠"}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Maintenance Status</p>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {maintenanceRequests.filter(req => req.status === 'pending').length} pending
                        </span>
                        <Badge variant={maintenanceRequests.filter(req => req.status === 'pending').length === 0 ? "default" : "secondary"}>
                          {maintenanceRequests.filter(req => req.status === 'pending').length === 0 ? "Up to date" : "Needs attention"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {rentPayments.filter(p => p.status === 'late' || p.status === 'overdue').length} late payments
                        </span>
                        <Badge variant={rentPayments.filter(p => p.status === 'late' || p.status === 'overdue').length === 0 ? "default" : "destructive"}>
                          {rentPayments.filter(p => p.status === 'late' || p.status === 'overdue').length === 0 ? "Current" : "Overdue"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {rentPayments.length > 0 ? 
                        Math.round((rentPayments.filter(p => p.status === 'paid').length / rentPayments.length) * 100) : 0}%
                    </div>
                    <div className="text-muted-foreground">Payment Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {(() => {
                        const completedRequests = maintenanceRequests.filter(req => req.completed_date && req.created_at);
                        if (completedRequests.length === 0) return 0;
                        const totalDays = completedRequests.reduce((sum, req) => {
                          return sum + (new Date(req.completed_date).getTime() - new Date(req.created_at).getTime()) / (1000 * 60 * 60 * 24);
                        }, 0);
                        return Math.round(totalDays / completedRequests.length);
                      })()}
                    </div>
                    <div className="text-muted-foreground">Avg. Repair Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {(() => {
                        if (!unit.rent_amount || unit.rent_amount === 0) return '0';
                        const totalMaintenanceCost = maintenanceRequests.reduce((sum, req) => {
                          return sum + (req.maintenance_cost || req.actual_cost || req.estimated_cost || 0);
                        }, 0);
                        const annualRent = unit.rent_amount * 12;
                        return Math.round((totalMaintenanceCost / annualRent) * 100);
                      })()}%
                    </div>
                    <div className="text-muted-foreground">Maintenance/Rent Ratio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {(() => {
                        if (!leaseData || !leaseData.start_date) return 0;
                        const startDate = new Date(leaseData.start_date);
                        const currentDate = new Date();
                        const daysDiff = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
                        return Math.max(0, Math.round(daysDiff / 30.44)); // Average days per month
                      })()}
                    </div>
                    <div className="text-muted-foreground">Months Occupied</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowLateFeeConfig(true)} className="gap-2">
            <Calculator className="h-4 w-4" />
            Configure Late Fees
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEdit}>
              Edit Unit
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Late Fee Configuration Modal */}
      <LateFeeConfigModal
        open={showLateFeeConfig}
        onOpenChange={setShowLateFeeConfig}
        unitId={unit?.id}
        unitNumber={unit?.unit_number}
        currentConfig={{
          late_fee_type: unit?.late_fee_type,
          late_fee_value: unit?.late_fee_value,
          late_fee_max_percentage: unit?.late_fee_max_percentage,
          late_fee_grace_period_days: unit?.late_fee_grace_period_days
        }}
        onSave={() => {
          fetchUnitDetails();
          toast({
            title: 'Late Fee Policy Updated',
            description: `Late fee settings for Unit ${unit?.unit_number} have been saved.`
          });
        }}
      />

      {/* Quick Action Modals */}
      <MaintenanceRequestModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
      />

      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        tenantName="Current Tenant"
        unitInfo={`Unit ${unit?.unit_number || ''}`}
        monthlyRent={leaseData?.rent_amount || unit?.rent_amount || 0}
      />

      <NoticeModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        tenantName={tenantProfile ? `${tenantProfile.first_name} ${tenantProfile.last_name}` : undefined}
        unitNumber={unit?.unit_number}
      />

      {/* Deductions History Modal */}
      <Dialog open={showDeductionsModal} onOpenChange={setShowDeductionsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Security Deposit Deduction History
            </DialogTitle>
            <DialogDescription>
              Complete history of all deductions from security deposit for Unit {unit?.unit_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {deductions.length > 0 ? (
              deductions.map((deduction) => (
                <Card key={deduction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-semibold">{deduction.reason || 'Maintenance Cost'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(deduction.deducted_at), 'MMMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-destructive">
                          -KES {(deduction.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {deduction.maintenance_request_id && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Related Maintenance Request ID:</span> {deduction.maintenance_request_id}
                      </div>
                    )}
                    {deduction.notes && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <p className="text-muted-foreground">{deduction.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Deductions Yet</h3>
                <p className="text-muted-foreground">
                  No maintenance costs have been deducted from the security deposit
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Total Deducted:</span>
              <span className="font-bold text-destructive ml-2">
                KES {deductions.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}
              </span>
            </div>
            <Button variant="outline" onClick={() => setShowDeductionsModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};