import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  UserCheck, Plus, Clock, User, Phone, Calendar, MapPin, 
  CheckCircle, XCircle, AlertCircle, Eye, Edit, Trash2, Bell,
  Search, Check, ChevronsUpDown, Building, Users
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVisitorRequests } from '@/hooks/useVisitorRequests';
import { useVisitors } from '@/hooks/useVisitors';
import { useSecurityUnits } from '@/hooks/useSecurityUnits';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const SecurityVisitorManagement = () => {
  const [isCreateRequestDialogOpen, setIsCreateRequestDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [unitSearchOpen, setUnitSearchOpen] = useState(false);
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [newRequest, setNewRequest] = useState({
    visitor_name: '',
    visitor_phone: '',
    purpose: '',
    expected_arrival: '',
    expected_duration: '',
    special_instructions: ''
  });

  const { 
    requests, 
    loading: requestsLoading, 
    createSecurityVisitorRequest, 
    updateVisitorRequestStatus 
  } = useVisitorRequests();
  
  const { 
    visitors, 
    loading: visitorsLoading, 
    registerVisitorFromApprovedRequest, 
    checkOutVisitor, 
    getStats 
  } = useVisitors();

  const { 
    occupiedUnits, 
    loading: unitsLoading, 
    getGroupedUnits, 
    searchUnits 
  } = useSecurityUnits();
  
  const { toast } = useToast();

  // Get filtered units based on search term
  const filteredUnits = unitSearchTerm ? searchUnits(unitSearchTerm) : occupiedUnits;
  const groupedUnits = getGroupedUnits();

  // Get selected unit details
  const selectedUnitDetails = occupiedUnits.find(unit => 
    `${unit.tenant_id}-${unit.unit_id}` === selectedUnit
  );

  const stats = getStats();

  const handleCreateRequest = async () => {
    if (!selectedUnit) {
      toast({
        title: "Error",
        description: "Please select a tenant and unit",
        variant: "destructive"
      });
      return;
    }

    const unitDetails = occupiedUnits.find(unit => 
      `${unit.tenant_id}-${unit.unit_id}` === selectedUnit
    );
    if (!unitDetails) return;

    const success = await createSecurityVisitorRequest({
      ...newRequest,
      tenant_id: unitDetails.tenant_id,
      expected_duration: newRequest.expected_duration ? parseInt(newRequest.expected_duration) : undefined
    });

    if (success) {
      setIsCreateRequestDialogOpen(false);
      setNewRequest({
        visitor_name: '',
        visitor_phone: '',
        purpose: '',
        expected_arrival: '',
        expected_duration: '',
        special_instructions: ''
      });
      setSelectedUnit('');
      setUnitSearchTerm('');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    await updateVisitorRequestStatus(requestId, 'approved');
  };

  const handleRejectRequest = async (requestId: string) => {
    await updateVisitorRequestStatus(requestId, 'rejected', 'Request rejected by security');
  };

  const handleRegisterApprovedVisitor = async (requestId: string) => {
    await registerVisitorFromApprovedRequest(requestId);
  };

  const handleCheckOut = async (visitorId: string) => {
    await checkOutVisitor(visitorId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      case 'expired': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getVisitorStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary text-primary-foreground';
      case 'checked_out': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter requests by type
  const tenantRequests = requests.filter(r => !r.security_id && r.status === 'pending');
  const securityRequests = requests.filter(r => r.security_id);
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const activeVisitors = visitors.filter(v => v.status === 'active');

  if (requestsLoading || visitorsLoading || unitsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading visitor management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Security Visitor Management</h1>
          <p className="text-muted-foreground">Manage visitor requests and registrations</p>
        </div>
        
        <Dialog open={isCreateRequestDialogOpen} onOpenChange={setIsCreateRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Request Visitor Access
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Visitor Access</DialogTitle>
              <DialogDescription>
                Create a visitor request that requires tenant approval before registration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant_unit" className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Tenant & Unit Selection
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Search and select from {occupiedUnits.length} occupied units
                </p>
                <Popover open={unitSearchOpen} onOpenChange={setUnitSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={unitSearchOpen}
                      className="w-full justify-between h-auto p-3"
                    >
                      {selectedUnitDetails ? (
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{selectedUnitDetails.tenant_name}</span>
                          <span className="text-xs text-muted-foreground">
                            Unit {selectedUnitDetails.unit_number} • {selectedUnitDetails.property_name}
                          </span>
                          {selectedUnitDetails.tenant_phone && (
                            <span className="text-xs text-muted-foreground">
                              📞 {selectedUnitDetails.tenant_phone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Search tenant or unit...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search by tenant name, unit number, or property..." 
                        value={unitSearchTerm}
                        onValueChange={setUnitSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No occupied units found.</CommandEmpty>
                        {Object.entries(groupedUnits).map(([propertyName, units]) => (
                          <CommandGroup key={propertyName} heading={propertyName}>
                            {units.map((unit) => (
                              <CommandItem
                                key={`${unit.tenant_id}-${unit.unit_id}`}
                                value={`${unit.tenant_name} ${unit.unit_number} ${unit.property_name}`}
                                onSelect={() => {
                                  setSelectedUnit(`${unit.tenant_id}-${unit.unit_id}`);
                                  setUnitSearchOpen(false);
                                  setUnitSearchTerm('');
                                }}
                                className="flex flex-col items-start p-3 cursor-pointer"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{unit.tenant_name}</span>
                                  </div>
                                  <Check
                                    className={cn(
                                      "h-4 w-4",
                                      selectedUnit === `${unit.tenant_id}-${unit.unit_id}` 
                                        ? "opacity-100" 
                                        : "opacity-0"
                                    )}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Unit {unit.unit_number} • {unit.property_address}
                                </div>
                                {unit.tenant_phone && (
                                  <div className="text-xs text-muted-foreground">
                                    📞 {unit.tenant_phone}
                                  </div>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {occupiedUnits.length === 0 && (
                  <div className="text-center p-4 text-sm text-muted-foreground border rounded-lg bg-muted/20">
                    <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No occupied units found. Ensure tenants have active leases.
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="visitor_name">Visitor Name</Label>
                <Input
                  id="visitor_name"
                  placeholder="Full name of visitor"
                  value={newRequest.visitor_name}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, visitor_name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="visitor_phone">Phone Number (Optional)</Label>
                <Input
                  id="visitor_phone"
                  placeholder="Visitor's phone number"
                  value={newRequest.visitor_phone}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, visitor_phone: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Input
                  id="purpose"
                  placeholder="Reason for the visit"
                  value={newRequest.purpose}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, purpose: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="expected_arrival">Expected Arrival</Label>
                <Input
                  id="expected_arrival"
                  type="datetime-local"
                  value={newRequest.expected_arrival}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, expected_arrival: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="expected_duration">Expected Duration (minutes)</Label>
                <Input
                  id="expected_duration"
                  type="number"
                  placeholder="How long will the visit take?"
                  value={newRequest.expected_duration}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, expected_duration: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="special_instructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="special_instructions"
                  placeholder="Any special instructions"
                  value={newRequest.special_instructions}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, special_instructions: e.target.value }))}
                />
              </div>
              
              <Button 
                onClick={handleCreateRequest} 
                className="w-full"
                disabled={!newRequest.visitor_name || !newRequest.purpose || !newRequest.expected_arrival || !selectedUnit}
              >
                <Bell className="h-4 w-4 mr-2" />
                Send Request to Tenant
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant Requests</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequests.length}</div>
            <p className="text-xs text-muted-foreground">Ready to register</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Visitors</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently on property</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaysVisitors}</div>
            <p className="text-xs text-muted-foreground">Visitors today</p>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Requests Needing Approval */}
      {tenantRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Tenant Visitor Requests
            </CardTitle>
            <CardDescription>Requests from tenants that need your approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenantRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{request.visitor_name}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested by: {request.tenant?.first_name} {request.tenant?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {format(new Date(request.expected_arrival), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.expected_duration && (
                      <p className="text-sm text-muted-foreground">
                        Duration: {request.expected_duration} minutes
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveRequest(request.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Requests Ready for Registration */}
      {approvedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Approved Requests - Ready to Register
            </CardTitle>
            <CardDescription>These visitors have been approved and can now be registered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {approvedRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-success/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{request.visitor_name}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Visiting: {request.tenant?.first_name} {request.tenant?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {format(new Date(request.expected_arrival), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.visitor_phone && (
                      <p className="text-sm text-muted-foreground">Phone: {request.visitor_phone}</p>
                    )}
                  </div>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleRegisterApprovedVisitor(request.id)}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Check In Visitor
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Visitors */}
      {activeVisitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Active Visitors
            </CardTitle>
            <CardDescription>Visitors currently on property</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeVisitors.map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{visitor.visitor_name}</h3>
                      <Badge className={getVisitorStatusColor(visitor.status)}>
                        {visitor.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Visiting: {visitor.unit?.unit_number || 'Unknown Unit'} - {visitor.tenant?.first_name} {visitor.tenant?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Checked in: {format(new Date(visitor.time_in), 'h:mm a')}
                    </p>
                    <p className="text-sm text-muted-foreground">Purpose: {visitor.purpose}</p>
                    {visitor.visitor_phone && (
                      <p className="text-sm text-muted-foreground">Phone: {visitor.visitor_phone}</p>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCheckOut(visitor.id)}
                  >
                    Check Out
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security's Own Requests */}
      {securityRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Your Visitor Requests
            </CardTitle>
            <CardDescription>Visitor requests you've submitted to tenants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {securityRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{request.visitor_name}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      For: {request.tenant?.first_name} {request.tenant?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">Purpose: {request.purpose}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {format(new Date(request.expected_arrival), 'MMM d, yyyy h:mm a')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested: {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};