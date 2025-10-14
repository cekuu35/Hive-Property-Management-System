import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Shield, 
  Wrench, 
  Building, 
  MoreVertical, 
  Trash2, 
  Eye,
  Users,
  Calendar,
  Key,
  Copy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StaffCreationForm } from './StaffCreationForm';
import { useStaffMembers, StaffMember } from '@/hooks/useStaffMembers';
import { useToast } from '@/hooks/use-toast';

export const StaffManagementSection: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetPassword, setResetPassword] = useState<string>('');
  const [resetLoading, setResetLoading] = useState(false);
  const { staffMembers, loading, deactivateStaffMember, resetStaffPassword } = useStaffMembers();
  const { toast } = useToast();

  const handleDeactivateStaff = async (staffId: string) => {
    if (window.confirm('Are you sure you want to deactivate this staff member? This action cannot be undone.')) {
      await deactivateStaffMember(staffId);
    }
  };

  const handleResetPassword = async (staffId: string) => {
    setResetLoading(true);
    try {
      const result = await resetStaffPassword(staffId);
      if (result.success && result.password) {
        setResetPassword(result.password);
        setShowPasswordReset(true);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    } finally {
      setResetLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Password copied to clipboard',
    });
  };

  const getRoleIcon = (role: string) => {
    return role === 'security' ? <Shield className="w-4 h-4" /> : <Wrench className="w-4 h-4" />;
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'security' ? 'default' : 'secondary';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (showCreateForm) {
    return (
      <StaffCreationForm
        onSuccess={() => setShowCreateForm(false)}
        onCancel={() => setShowCreateForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground">
            Manage security personnel and caretakers for your properties
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Personnel</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffMembers.filter(s => s.role === 'security').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Security staff
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Caretakers</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {staffMembers.filter(s => s.role === 'caretaker').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Caretaker staff
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
          <CardDescription>
            View and manage your security personnel and caretakers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading staff members...</p>
              </div>
            </div>
          ) : staffMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No staff members yet</h3>
              <p className="text-muted-foreground mb-4">
                Create accounts for security personnel and caretakers to manage your properties.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Staff Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {staffMembers.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {getRoleIcon(staff.role)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">
                          {staff.first_name} {staff.last_name}
                        </h3>
                        <Badge variant={getRoleBadgeVariant(staff.role)}>
                          {staff.role === 'security' ? 'Security' : 'Caretaker'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{staff.email}</p>
                      <p className="text-sm text-muted-foreground">{staff.phone}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building className="w-3 h-3" />
                          <span>{staff.assignments.length} propert{staff.assignments.length === 1 ? 'y' : 'ies'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Joined {formatDate(staff.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedStaff(staff)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleResetPassword(staff.id)}
                          disabled={resetLoading}
                        >
                          <Key className="w-4 h-4 mr-2" />
                          {resetLoading ? 'Resetting...' : 'Reset Password'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeactivateStaff(staff.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Staff Details Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getRoleIcon(selectedStaff.role)}
                {selectedStaff.first_name} {selectedStaff.last_name}
              </CardTitle>
              <CardDescription>
                {selectedStaff.role === 'security' ? 'Security Personnel' : 'Caretaker'} Details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{selectedStaff.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-sm">{selectedStaff.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <Badge variant={getRoleBadgeVariant(selectedStaff.role)}>
                    {selectedStaff.role === 'security' ? 'Security Personnel' : 'Caretaker'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Joined</label>
                  <p className="text-sm">{formatDate(selectedStaff.created_at)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned Properties</label>
                <div className="mt-2 space-y-2">
                  {selectedStaff.assignments.map((assignment, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{assignment.property_name}</p>
                        <p className="text-sm text-muted-foreground">{assignment.property_address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedStaff(null)}>
                  Close
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    handleDeactivateStaff(selectedStaff.id);
                    setSelectedStaff(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-green-600" />
                Password Reset Successfully
              </CardTitle>
              <CardDescription>
                New password has been generated for the staff member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800 mb-2">
                  <strong>New Password:</strong>
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-3 py-2 rounded text-sm font-mono flex-1">
                    {resetPassword}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(resetPassword)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Important:</strong> Please share this password with the staff member. 
                  They should change it after their first login.
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => setShowPasswordReset(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
