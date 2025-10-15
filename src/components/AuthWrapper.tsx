import { useRoleBasedAuth } from '@/hooks/useRoleBasedAuth';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TenantDashboard } from '@/components/dashboard/tenant/TenantDashboard';
import { MobileTenantDashboard } from '@/components/dashboard/tenant/MobileTenantDashboard';
import { LandlordDashboard } from '@/components/dashboard/landlord/LandlordDashboard';
import { CaretakerDashboard } from '@/components/dashboard/caretaker/CaretakerDashboard';
import { SecurityDashboard } from '@/components/dashboard/security/SecurityDashboard';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AuthWrapperProps {
  children?: React.ReactNode;
}

export const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const { userRole, loading, error } = useRoleBasedAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!userRole) return;
    switch (userRole.role) {
      case "landlord":
        setActiveSection("dashboard");
        break;
      case "caretaker":
        setActiveSection("dashboard");
        break;
      case "security":
        setActiveSection("overview");
        break;
      default:
        break;
    }
  }, [userRole?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Setting up your profile...</h2>
          <p className="text-muted-foreground">This will only take a moment.</p>
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

  const renderDashboard = () => {
    switch (userRole.role) {
      case 'tenant':
        return isMobile ? 
          <MobileTenantDashboard onTabChange={setActiveTab} /> : 
          <TenantDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
      case 'landlord':
        return <LandlordDashboard activeSection={activeSection} onSectionChange={setActiveSection} />;
      case 'caretaker':
        return <CaretakerDashboard activeSection={activeSection} onSectionChange={setActiveSection} />;
      case 'security':
        return <SecurityDashboard activeSection={activeSection} onSectionChange={setActiveSection} />;
      case 'admin':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-2">Admin Dashboard</h2>
            <p className="text-muted-foreground mb-4">Admin functionality is coming soon.</p>
            <p className="text-sm text-muted-foreground">
              For now, you can use the landlord dashboard for property management.
            </p>
          </div>
        );
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Unknown Role</h2>
            <p className="text-muted-foreground">Your role is not recognized. Please contact support.</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout 
      userRole={userRole.role === 'admin' ? 'landlord' : userRole.role as "landlord" | "tenant" | "caretaker" | "security"} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {renderDashboard()}
    </DashboardLayout>
  );
};
