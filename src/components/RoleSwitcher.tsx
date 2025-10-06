import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Shield, 
  Home, 
  Wrench, 
  Settings,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';

interface RoleSwitcherProps {
  onRoleSelected?: (role: string) => void;
}

export const RoleSwitcher = ({ onRoleSelected }: RoleSwitcherProps) => {
  const { userRole, switchToTenantRole, switchToProfileRole } = useRoleBasedAuth();
  const [switching, setSwitching] = useState(false);

  if (!userRole) {
    return null;
  }

  const handleRoleSwitch = async (role: string) => {
    setSwitching(true);
    
    try {
      if (role === 'tenant') {
        const success = await switchToTenantRole();
        if (success) {
          onRoleSelected?.(role);
        }
      } else {
        const success = switchToProfileRole();
        if (success) {
          onRoleSelected?.(role);
        }
      }
    } catch (error) {
      console.error('Error switching role:', error);
    } finally {
      setSwitching(false);
    }
  };

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

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'tenant': return 'Access your rental information, payments, and maintenance requests';
      case 'landlord': return 'Manage properties, tenants, and rental operations';
      case 'caretaker': return 'Handle maintenance requests and property upkeep';
      case 'security': return 'Manage security operations and visitor access';
      case 'admin': return 'System administration and user management';
      default: return 'Access your account information';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'tenant': return 'bg-blue-100 text-blue-800';
      case 'landlord': return 'bg-green-100 text-green-800';
      case 'caretaker': return 'bg-orange-100 text-orange-800';
      case 'security': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // If user only has one role, don't show switcher
  const hasMultipleRoles = userRole.isTenant && userRole.profileData?.role;
  
  if (!hasMultipleRoles) {
    return null;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Choose Your Role
        </CardTitle>
        <CardDescription>
          You have access to multiple roles. Please select which role you want to use for this session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Role */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getRoleIcon(userRole.role)}
              <div>
                <h3 className="font-medium capitalize">{userRole.role}</h3>
                <p className="text-sm text-muted-foreground">
                  Currently active role
                </p>
              </div>
            </div>
            <Badge className={getRoleColor(userRole.role)}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>
        </div>

        {/* Available Roles */}
        <div className="space-y-3">
          <h4 className="font-medium">Available Roles:</h4>
          
          {/* Tenant Role */}
          {userRole.isTenant && userRole.role !== 'tenant' && (
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <Home className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-medium">Tenant</h4>
                  <p className="text-sm text-muted-foreground">
                    {getRoleDescription('tenant')}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRoleSwitch('tenant')}
                disabled={switching}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Switch
              </Button>
            </div>
          )}

          {/* Profile Role */}
          {userRole.profileData?.role && userRole.role !== userRole.profileData.role && (
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                {getRoleIcon(userRole.profileData.role)}
                <div>
                  <h4 className="font-medium capitalize">{userRole.profileData.role}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getRoleDescription(userRole.profileData.role)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRoleSwitch(userRole.profileData.role)}
                disabled={switching}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Switch
              </Button>
            </div>
          )}
        </div>

        {switching && (
          <div className="text-center text-sm text-muted-foreground">
            Switching role...
          </div>
        )}
      </CardContent>
    </Card>
  );
};
