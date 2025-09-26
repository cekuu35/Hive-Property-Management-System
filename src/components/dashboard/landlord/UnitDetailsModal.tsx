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
import { CalendarDays, DollarSign, Wrench, User, Home, FileText, AlertTriangle, TrendingUp, Calendar as CalendarIcon, Clock, PlusCircle, Bell, Shield, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { MaintenanceRequestModal } from '@/components/dashboard/maintenance/MaintenanceRequestModal';
import { PaymentModal } from '@/components/dashboard/landlord/payments/PaymentModal';
import { NoticeModal } from './NoticeModal';
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
  
  // Modal states
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (unit?.id && open) {
      fetchUnitDetails();
    }
  }, [unit?.id, open]);

  const fetchUnitDetails = async () => {
    if (!unit?.id) return;
    setLoading(true);

    try {
      // Fetch active lease
      const { data: lease } = await supabase
        .from('leases')
        .select('*')
        .eq('unit_id', unit.id)
        .eq('status', 'active')
        .single();

      setLeaseData(lease);

      // Fetch tenant profile if lease exists
      if (lease?.tenant_id || lease?.tenant_info_id) {
        // First try to get from profiles table using tenant_id
        if (lease.tenant_id) {
          const { data: tenant } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', lease.tenant_id)
            .maybeSingle();
          
          if (tenant) {
            setTenantProfile(tenant);
          }
        }
        
        // If no profile found, try tenant_info table
        if (!tenantProfile && lease.tenant_info_id) {
          const { data: tenantInfo } = await supabase
            .from('tenant_info')
            .select('*')
            .eq('id', lease.tenant_info_id)
            .maybeSingle();
          
          if (tenantInfo) {
            // Transform tenant_info to match profile structure
            setTenantProfile({
              id: tenantInfo.id,
              first_name: tenantInfo.first_name,
              last_name: tenantInfo.last_name,
              phone: tenantInfo.phone,
              avatar_url: tenantInfo.avatar_url,
              email: tenantInfo.email
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
            {leaseData && tenantProfile ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Current Tenant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                              .filter(p => p.status === 'pending' || p.status === 'late')
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
                          .reduce((sum, req) => sum + (req.actual_cost || req.estimated_cost || 0), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending Requests</p>
                      <p className="font-medium">
                        {maintenanceRequests.filter(req => req.status === 'pending' || req.status === 'in_progress').length}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed This Year</p>
                      <p className="font-medium">
                        {maintenanceRequests.filter(req => 
                          req.status === 'completed' && 
                          new Date(req.created_at).getFullYear() === new Date().getFullYear()
                        ).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

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
                        {Math.ceil((new Date().getTime() - new Date(unit.created_at || new Date()).getTime()) / (1000 * 60 * 60 * 24))} days since creation
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
                          {rentPayments.filter(p => p.status === 'late').length} late payments
                        </span>
                        <Badge variant={rentPayments.filter(p => p.status === 'late').length === 0 ? "default" : "destructive"}>
                          {rentPayments.filter(p => p.status === 'late').length === 0 ? "Current" : "Overdue"}
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
                  <Calendar className="h-5 w-5" />
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
                      {maintenanceRequests.length > 0 ?
                        Math.round(maintenanceRequests.reduce((sum, req) => {
                          if (req.completed_date && req.created_at) {
                            return sum + (new Date(req.completed_date).getTime() - new Date(req.created_at).getTime()) / (1000 * 60 * 60 * 24);
                          }
                          return sum;
                        }, 0) / maintenanceRequests.filter(req => req.completed_date).length) || 0 : 0}
                    </div>
                    <div className="text-muted-foreground">Avg. Repair Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {unit.rent_amount && maintenanceRequests.length > 0 ?
                        Math.round((maintenanceRequests.reduce((sum, req) => sum + (req.actual_cost || req.estimated_cost || 0), 0) / (unit.rent_amount * 12)) * 100) : 0}%
                    </div>
                    <div className="text-muted-foreground">Maintenance/Rent Ratio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      {leaseData ? 
                        Math.round(((new Date().getTime() - new Date(leaseData.start_date).getTime()) / (1000 * 60 * 60 * 24)) / 30) : 0}
                    </div>
                    <div className="text-muted-foreground">Months Occupied</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onEdit}>
            Edit Unit
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>

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
    </Dialog>
  );
};