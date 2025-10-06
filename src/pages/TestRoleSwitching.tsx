import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Home, Wrench, Shield, Settings } from 'lucide-react';

const TestRoleSwitching = () => {
  const { userRole, loading, error, switchToTenantRole, switchToProfileRole } = useRoleBasedAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading role information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to test role switching</p>
        </div>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'tenant': return <Home className="h-5 w-5" />;
      case 'landlord': return <User className="h-5 w-5" />;
      case 'caretaker': return <Wrench className="h-5 w-5" />;
      case 'security': return <Shield className="h-5 w-5" />;
      case 'admin': return <Settings className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const hasMultipleRoles = userRole.isTenant && userRole.profileData?.role && 
    userRole.role !== userRole.profileData.role;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Role Switching Test</h1>
          <p className="text-gray-600">Test the role-based authentication system</p>
        </div>

        {/* Current Role Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getRoleIcon(userRole.role)}
              Current Role Status
            </CardTitle>
            <CardDescription>
              Your current authentication state and available roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getRoleIcon(userRole.role)}
                <div>
                  <h3 className="font-medium capitalize">{userRole.role}</h3>
                  <p className="text-sm text-muted-foreground">
                    Currently active role
                  </p>
                </div>
              </div>
              <Badge variant="default">
                Active
              </Badge>
            </div>

            {userRole.isTenant && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Tenant Information</h4>
                <p className="text-sm text-blue-800">
                  Name: {userRole.tenantData?.first_name} {userRole.tenantData?.last_name}
                </p>
                <p className="text-sm text-blue-800">
                  Email: {userRole.tenantData?.email}
                </p>
                <p className="text-sm text-blue-800">
                  Status: {userRole.tenantData?.tenant_status}
                </p>
              </div>
            )}

            {userRole.profileData && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Profile Information</h4>
                <p className="text-sm text-green-800">
                  Role: {userRole.profileData.role}
                </p>
                <p className="text-sm text-green-800">
                  Name: {userRole.profileData.first_name} {userRole.profileData.last_name}
                </p>
                <p className="text-sm text-green-800">
                  Phone: {userRole.profileData.phone || 'Not set'}
                </p>
              </div>
            )}

            {hasMultipleRoles && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Multiple Roles Detected</h4>
                <p className="text-sm text-yellow-800">
                  You have access to both {userRole.profileData?.role} and tenant roles.
                  Use the role switcher below to change your active role.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Switcher */}
        {hasMultipleRoles ? (
          <RoleSwitcher 
            onRoleSelected={(role) => {
              console.log('Role selected:', role);
            }}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Single Role Account</CardTitle>
              <CardDescription>
                You only have one role assigned to this account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No role switching is needed. You can access your dashboard directly.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Debug Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>
              Technical details for debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify({
                userRole: userRole.role,
                isTenant: userRole.isTenant,
                hasTenantData: !!userRole.tenantData,
                hasProfileData: !!userRole.profileData,
                profileRole: userRole.profileData?.role,
                hasMultipleRoles,
                tenantData: userRole.tenantData ? {
                  name: `${userRole.tenantData.first_name} ${userRole.tenantData.last_name}`,
                  email: userRole.tenantData.email,
                  status: userRole.tenantData.tenant_status
                } : null,
                profileData: userRole.profileData ? {
                  role: userRole.profileData.role,
                  name: `${userRole.profileData.first_name} ${userRole.profileData.last_name}`
                } : null
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestRoleSwitching;
