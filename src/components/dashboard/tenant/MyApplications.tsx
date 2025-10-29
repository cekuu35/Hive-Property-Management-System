import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, MapPin, DollarSign, FileText, Clock, 
  CheckCircle, XCircle, AlertCircle, Home, Eye, CreditCard, Building2, Trash2
} from 'lucide-react';
import { useUnitApplications } from '@/hooks/useUnitApplications';
import { format } from 'date-fns';
import { DepositPaymentModal } from './DepositPaymentModal';
import { ApplicationDetailsModal } from './ApplicationDetailsModal';
import { useState } from 'react';

interface MyApplicationsProps {
  onTabChange?: (tab: string) => void;
}

export const MyApplications = ({ onTabChange }: MyApplicationsProps) => {
  const { applications, loading, withdrawApplication, deleteApplication, paySecurityDeposit } = useUnitApplications();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);

  const handlePayDeposit = (application: any) => {
    setSelectedApplication(application);
    setPaymentModalOpen(true);
  };

  const handleViewDetails = (application: any) => {
    setSelectedApplication(application);
    setDetailsModalOpen(true);
  };

  const handlePaymentComplete = async (applicationId: string, paymentReference: string) => {
    await paySecurityDeposit(applicationId, paymentReference);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'withdrawn':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your applications...</p>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
          <p className="text-muted-foreground mb-4">
            You haven't submitted any unit applications yet. Browse available units to get started.
          </p>
          <Button onClick={() => onTabChange?.('browse-units')}>
            <Building2 className="h-4 w-4 mr-2" />
            Browse Units
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">My Applications</h2>
        <p className="text-muted-foreground">
          Track the status of your unit applications
        </p>
      </div>

      <div className="space-y-4">
        {applications.map((application: any) => (
          <Card key={application.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Unit {application.units?.unit_number} - {application.properties?.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <MapPin className="h-4 w-4" />
                    {application.properties?.address}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(application.status)}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(application.status)}
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </span>
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Application Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unit Type:</span>
                  <span className="font-medium">{application.units?.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Monthly Rent:</span>
                  <span className="font-medium">KES {application.units?.rent_amount?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Applied On:</span>
                  <span className="font-medium">
                    {format(new Date(application.created_at), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Application Message */}
              {application.application_message && (
                <div>
                  <p className="text-sm font-medium mb-1">Application Message:</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {application.application_message}
                  </p>
                </div>
              )}

              {/* Preferred Move-in Date */}
              {application.preferred_move_in_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Preferred move-in:</span>
                  <span className="font-medium">
                    {format(new Date(application.preferred_move_in_date), 'MMMM dd, yyyy')}
                  </span>
                </div>
              )}

              {/* Status-specific information */}
              {application.status === 'approved' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-center gap-2 text-green-800 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Application Approved!</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    Congratulations! Your application has been approved. The landlord will contact you soon 
                    to proceed with the lease agreement and move-in process.
                  </p>
                  {application.reviewed_at && (
                    <p className="text-green-600 text-xs mt-1">
                      Approved on {format(new Date(application.reviewed_at), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              )}

              {application.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">Application Not Approved</span>
                  </div>
                  <p className="text-red-700 text-sm">
                    Unfortunately, your application was not approved at this time. 
                    You may apply for other available units.
                  </p>
                  {application.reviewed_at && (
                    <p className="text-red-600 text-xs mt-1">
                      Reviewed on {format(new Date(application.reviewed_at), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              )}

              {application.status === 'pending' && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <div className="flex items-center gap-2 text-orange-800 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Under Review</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-orange-700 text-sm">
                      Your application is currently being reviewed by the landlord.
                    </p>
                    {!application.deposit_paid ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
                        <div className="flex items-center gap-2 text-yellow-800 mb-1">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium text-xs">Security Deposit Required</span>
                        </div>
                        <p className="text-yellow-700 text-xs">
                          You need to pay the security deposit before your application can be approved.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-md p-2">
                        <div className="flex items-center gap-2 text-green-800 mb-1">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium text-xs">Security Deposit Paid</span>
                        </div>
                        <p className="text-green-700 text-xs">
                          Your security deposit has been paid. Waiting for landlord approval.
                        </p>
                        {application.deposit_paid_at && (
                          <p className="text-green-600 text-xs">
                            Paid on {format(new Date(application.deposit_paid_at), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewDetails(application)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                
                {application.status === 'pending' && !application.deposit_paid && (
                  <Button 
                    size="sm"
                    onClick={() => handlePayDeposit(application)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Security Deposit
                  </Button>
                )}
                
                {application.status === 'pending' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => withdrawApplication(application.id)}
                  >
                    Withdraw Application
                  </Button>
                )}

                {application.status === 'rejected' && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
                        deleteApplication(application.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Application
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deposit Payment Modal */}
      <DepositPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        application={selectedApplication}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Application Details Modal */}
      <ApplicationDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        application={selectedApplication}
      />
    </div>
  );
};