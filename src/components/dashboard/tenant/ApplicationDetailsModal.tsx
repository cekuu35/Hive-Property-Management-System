import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, MapPin, DollarSign, FileText, Clock, 
  CheckCircle, XCircle, AlertCircle, Home, User, Phone, Mail,
  Building, CreditCard, CalendarDays
} from 'lucide-react';
import { format } from 'date-fns';

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any;
}

export const ApplicationDetailsModal = ({ isOpen, onClose, application }: ApplicationDetailsModalProps) => {
  if (!application) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Application Details
          </DialogTitle>
          <DialogDescription>
            Complete information about your unit application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Status */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold">
                Unit {application.units?.unit_number} - {application.properties?.name}
              </h3>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4" />
                {application.properties?.address}
              </p>
            </div>
            <Badge className={getStatusColor(application.status)}>
              <span className="flex items-center gap-1">
                {getStatusIcon(application.status)}
                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
              </span>
            </Badge>
          </div>

          <Separator />

          {/* Unit Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium flex items-center gap-2">
              <Building className="h-5 w-5" />
              Unit Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unit Type:</span>
                  <span className="font-medium">{application.units?.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Rent:</span>
                  <span className="font-medium">KES {application.units?.rent_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Security Deposit:</span>
                  <span className="font-medium">KES {application.units?.deposit_amount?.toLocaleString()}</span>
                </div>
                {application.units?.square_feet && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Square Feet:</span>
                    <span className="font-medium">{application.units.square_feet} sq ft</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applied On:</span>
                  <span className="font-medium">
                    {format(new Date(application.created_at), 'MMM dd, yyyy')}
                  </span>
                </div>
                {application.preferred_move_in_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preferred Move-in:</span>
                    <span className="font-medium">
                      {format(new Date(application.preferred_move_in_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                {application.reviewed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviewed On:</span>
                    <span className="font-medium">
                      {format(new Date(application.reviewed_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Application Message */}
          {application.application_message && (
            <div className="space-y-2">
              <h4 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Application Message
              </h4>
              <div className="bg-muted/50 p-4 rounded-md">
                <p className="text-sm">{application.application_message}</p>
              </div>
            </div>
          )}

          {/* Employment Information */}
          {application.employment_info && (
            <div className="space-y-2">
              <h4 className="text-lg font-medium flex items-center gap-2">
                <User className="h-5 w-5" />
                Employment Information
              </h4>
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {application.employment_info.employer && (
                    <div>
                      <span className="text-muted-foreground">Employer:</span>
                      <p className="font-medium">{application.employment_info.employer}</p>
                    </div>
                  )}
                  {application.employment_info.position && (
                    <div>
                      <span className="text-muted-foreground">Position:</span>
                      <p className="font-medium">{application.employment_info.position}</p>
                    </div>
                  )}
                  {application.employment_info.salary && (
                    <div>
                      <span className="text-muted-foreground">Salary:</span>
                      <p className="font-medium">KES {application.employment_info.salary?.toLocaleString()}</p>
                    </div>
                  )}
                  {application.employment_info.employment_length && (
                    <div>
                      <span className="text-muted-foreground">Employment Length:</span>
                      <p className="font-medium">{application.employment_info.employment_length}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal References */}
          {application.personal_references && application.personal_references.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-lg font-medium flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Personal References
              </h4>
              <div className="space-y-3">
                {application.personal_references.map((ref: any, index: number) => (
                  <div key={index} className="bg-muted/50 p-4 rounded-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium">{ref.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <p className="font-medium">{ref.phone}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Relationship:</span>
                        <p className="font-medium">{ref.relationship}</p>
                      </div>
                      {ref.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium">{ref.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {application.documents && application.documents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-lg font-medium flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </h4>
              <div className="space-y-2">
                {application.documents.map((doc: any, index: number) => (
                  <div key={index} className="bg-muted/50 p-3 rounded-md">
                    <p className="font-medium text-sm">{doc.name || `Document ${index + 1}`}</p>
                    {doc.url && (
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        View Document
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Status */}
          <div className="space-y-2">
            <h4 className="text-lg font-medium flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Status
            </h4>
            <div className="bg-muted/50 p-4 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Security Deposit:</span>
                <div className="flex items-center gap-2">
                  {application.deposit_paid ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Paid</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Pending</span>
                    </div>
                  )}
                </div>
              </div>
              {application.deposit_paid_at && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">Paid On:</span>
                  <span className="font-medium">
                    {format(new Date(application.deposit_paid_at), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
              {application.deposit_payment_reference && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-muted-foreground">Payment Reference:</span>
                  <span className="font-medium text-sm">{application.deposit_payment_reference}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status-specific information */}
          {application.status === 'approved' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium text-lg">Application Approved!</span>
              </div>
              <p className="text-green-700">
                Congratulations! Your application has been approved. The landlord will contact you soon 
                to proceed with the lease agreement and move-in process.
              </p>
            </div>
          )}

          {application.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <XCircle className="h-5 w-5" />
                <span className="font-medium text-lg">Application Not Approved</span>
              </div>
              <p className="text-red-700">
                Unfortunately, your application was not approved at this time. 
                You may apply for other available units.
              </p>
            </div>
          )}

          {application.status === 'pending' && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
              <div className="flex items-center gap-2 text-orange-800 mb-2">
                <Clock className="h-5 w-5" />
                <span className="font-medium text-lg">Under Review</span>
              </div>
              <p className="text-orange-700">
                Your application is currently being reviewed by the landlord.
              </p>
            </div>
          )}

          {application.status === 'withdrawn' && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex items-center gap-2 text-gray-800 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium text-lg">Application Withdrawn</span>
              </div>
              <p className="text-gray-700">
                You have withdrawn this application. You can apply for other available units.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
