import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FileText, Home, Calendar, DollarSign, User, MapPin, Phone, Mail, Download, Eye } from 'lucide-react';
import { useApprovedLease } from '@/hooks/useApprovedLease';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface LeaseDetailsCardProps {
  onViewDocument?: () => void;
}

export const LeaseDetailsCard = ({ onViewDocument }: LeaseDetailsCardProps) => {
  const { approvedLease, hasApprovedLease, loading } = useApprovedLease();
  const { profile } = useAuth();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasApprovedLease || !approvedLease) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Information
          </CardTitle>
          <CardDescription>Your current lease details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">You don't have an active lease yet</p>
            <Button variant="outline">Browse Available Units</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lease = approvedLease;
  const startDate = lease.start_date ? new Date(lease.start_date) : null;
  const endDate = lease.end_date ? new Date(lease.end_date) : null;
  const daysRemaining = endDate ? Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Current Lease Information
            </CardTitle>
            <CardDescription>Your active rental agreement details</CardDescription>
          </div>
          <Badge variant={lease.status === 'active' ? 'default' : 'secondary'} className="capitalize">
            {lease.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Property & Unit Information */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Home className="h-4 w-4" />
            Property & Unit
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Property</p>
              <p className="font-medium">{lease.units?.properties?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unit Number</p>
              <p className="font-medium">{lease.units?.unit_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {lease.units?.properties?.address || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unit Type</p>
              <p className="font-medium capitalize">{lease.units?.type || 'Residential'}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Lease Terms */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Lease Terms
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{startDate ? format(startDate, 'MMMM dd, yyyy') : 'N/A'}</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="font-medium">{endDate ? format(endDate, 'MMMM dd, yyyy') : 'N/A'}</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Lease Duration</p>
              <p className="font-medium">
                {startDate && endDate 
                  ? `${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))} Months`
                  : 'N/A'
                }
              </p>
            </div>
            <div className={`p-4 rounded-lg ${daysRemaining < 30 ? 'bg-warning/10' : 'bg-muted/50'}`}>
              <p className="text-sm text-muted-foreground">Days Remaining</p>
              <p className={`font-medium ${daysRemaining < 30 ? 'text-warning' : ''}`}>
                {daysRemaining > 0 ? `${daysRemaining} Days` : 'Expired'}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Financial Information */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial Terms
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">Monthly Rent</p>
              <p className="font-bold text-lg text-primary">
                KES {lease.rent_amount?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Security Deposit</p>
              <p className="font-medium">
                KES {(lease.security_deposit || lease.deposit_amount || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Payment Due Date</p>
              <p className="font-medium">
                {lease.payment_due_date ? `Day ${lease.payment_due_date} of each month` : '1st of each month'}
              </p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Late Fee</p>
              <p className="font-medium">
                {lease.late_fee_amount ? `KES ${lease.late_fee_amount.toLocaleString()}` : 'As per agreement'}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Landlord Information */}
        {lease.units?.properties?.profiles && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Landlord Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {lease.units.properties.profiles.first_name} {lease.units.properties.profiles.last_name}
                </p>
              </div>
              {lease.units.properties.profiles.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {lease.units.properties.profiles.email}
                  </p>
                </div>
              )}
              {lease.units.properties.profiles.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {lease.units.properties.profiles.phone}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lease Document Actions */}
        <div className="flex gap-3 pt-4">
          <Button onClick={onViewDocument} className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            View Lease Document
          </Button>
          <Button variant="outline" onClick={onViewDocument} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Additional Terms */}
        {lease.terms && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Additional Terms & Conditions:</p>
            <p className="text-sm text-muted-foreground">{lease.terms}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

