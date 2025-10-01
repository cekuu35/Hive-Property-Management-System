import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  User, MapPin, DollarSign, Calendar, Phone, Mail, 
  Building2, CheckCircle, XCircle, Clock, Eye, Filter, Search
} from 'lucide-react';
import { useUnitApplications } from '@/hooks/useUnitApplications';
import { format } from 'date-fns';

export const UnitApplicationsSection = () => {
  const { 
    applications, 
    loading, 
    updateApplicationStatus 
  } = useUnitApplications();
  
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredApplications = applications.filter((app: any) => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch = 
      app.properties?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.units?.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
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
      default:
        return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const handleStatusUpdate = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      console.log(`Landlord updating application ${applicationId} to ${status}`);
      await updateApplicationStatus(applicationId, status);
      console.log('Status update completed successfully');
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Unit Applications</h2>
        <p className="text-muted-foreground">
          Review and manage tenant applications for your properties
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by property, unit, or tenant name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">
                  {applications.filter(app => app.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  {applications.filter(app => app.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">
                  {applications.filter(app => app.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.map((application: any) => (
          <Card key={application.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={application.profiles?.avatar_url} />
                    <AvatarFallback>
                      {application.profiles?.first_name?.[0]}{application.profiles?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {application.profiles?.first_name} {application.profiles?.last_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Unit {application.units?.unit_number} - {application.properties?.name}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      Applied on {format(new Date(application.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
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
              {/* Quick Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unit Rent:</span>
                  <span className="font-medium">KES {application.units?.rent_amount?.toLocaleString()}/month</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Unit Type:</span>
                  <span className="font-medium">{application.units?.type}</span>
                </div>
                {application.preferred_move_in_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Move-in Date:</span>
                    <span className="font-medium">
                      {format(new Date(application.preferred_move_in_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>

              {/* Contact Info */}
              {application.profiles?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{application.profiles.phone}</span>
                </div>
              )}

              {/* Application Message */}
              {application.application_message && (
                <div>
                  <p className="text-sm font-medium mb-1">Application Message:</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md line-clamp-2">
                    {application.application_message}
                  </p>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedApplication(application)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        Application Details - {selectedApplication?.profiles?.first_name} {selectedApplication?.profiles?.last_name}
                      </DialogTitle>
                      <DialogDescription>
                        Unit {selectedApplication?.units?.unit_number} - {selectedApplication?.properties?.name}
                      </DialogDescription>
                    </DialogHeader>
                    
                    {selectedApplication && (
                      <div className="space-y-6">
                        {/* Employment Information */}
                        {selectedApplication.employment_info && Object.keys(selectedApplication.employment_info).length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Employment Information</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Employer:</span>
                                <p className="font-medium">{selectedApplication.employment_info.employer || 'Not provided'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Position:</span>
                                <p className="font-medium">{selectedApplication.employment_info.position || 'Not provided'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Monthly Income:</span>
                                <p className="font-medium">
                                  {selectedApplication.employment_info.monthly_income ? 
                                    `KES ${parseInt(selectedApplication.employment_info.monthly_income).toLocaleString()}` : 
                                    'Not provided'
                                  }
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Employment Duration:</span>
                                <p className="font-medium">{selectedApplication.employment_info.employment_duration || 'Not provided'}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* References */}
                        {selectedApplication.personal_references && selectedApplication.personal_references.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Personal References</h4>
                            {selectedApplication.personal_references.map((ref: any, idx: number) => (
                              <div key={idx} className="border rounded-lg p-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Name:</span>
                                    <p className="font-medium">{ref.name || 'Not provided'}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Relationship:</span>
                                    <p className="font-medium">{ref.relationship || 'Not provided'}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Phone:</span>
                                    <p className="font-medium">{ref.phone || 'Not provided'}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Email:</span>
                                    <p className="font-medium">{ref.email || 'Not provided'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Application Message */}
                        {selectedApplication.application_message && (
                          <div>
                            <h4 className="font-medium mb-2">Application Message</h4>
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                              {selectedApplication.application_message}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                
                {application.status === 'pending' && (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusUpdate(application.id, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleStatusUpdate(application.id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredApplications.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Applications Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterStatus !== 'all'
                ? "No applications match your current filters."
                : "No tenant applications have been submitted yet."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};