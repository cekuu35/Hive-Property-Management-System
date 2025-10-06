import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { TenantDashboardNew } from '@/components/dashboard/tenant/TenantDashboardNew';
import { LandlordDashboard } from '@/components/dashboard/landlord/LandlordDashboard';
import { CaretakerDashboard } from '@/components/dashboard/caretaker/CaretakerDashboard';
import { SecurityDashboard } from '@/components/dashboard/security/SecurityDashboard';
import { AdminDashboard } from '@/components/dashboard/admin/AdminDashboard';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children?: React.ReactNode;
}

export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const { userRole, loading, error } = useRoleBasedAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading dashboard: {error}</p>
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  // Check if user has multiple roles and show role switcher
  const hasMultipleRoles = userRole.isTenant && userRole.profileData?.role && 
    userRole.role !== userRole.profileData.role;

  if (hasMultipleRoles) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <RoleSwitcher 
            onRoleSelected={(role) => {
              console.log('Role selected:', role);
              // The role switching is handled by the useRoleBasedAuth hook
            }}
          />
        </div>
      </div>
    );
  }

  // Render appropriate dashboard based on role
  switch (userRole.role) {
    case 'tenant':
      return <TenantDashboardNew />;
    case 'landlord':
      return <LandlordDashboard />;
    case 'caretaker':
      return <CaretakerDashboard />;
    case 'security':
      return <SecurityDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Unknown role: {userRole.role}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>
      );
  }
};
