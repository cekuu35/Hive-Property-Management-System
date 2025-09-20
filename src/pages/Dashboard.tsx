import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TenantDashboard } from '@/components/dashboard/tenant/TenantDashboard';
import { LandlordDashboard } from '@/components/dashboard/landlord/LandlordDashboard';
import { CaretakerDashboard } from '@/components/dashboard/caretaker/CaretakerDashboard';
import { SecurityDashboard } from '@/components/dashboard/security/SecurityDashboard';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const Dashboard = () => {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSection, setActiveSection] = useState<string>("dashboard");

  useEffect(() => {
    if (!profile) return;
    switch (profile.role) {
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
  }, [profile?.role]);

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

  if (!profile) {
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

  const renderDashboard = () => {
    switch (profile.role) {
      case 'tenant':
        return <TenantDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
      case 'landlord':
        return <LandlordDashboard activeSection={activeSection} onSectionChange={setActiveSection} />;
      case 'caretaker':
        return <CaretakerDashboard activeSection={activeSection} onSectionChange={setActiveSection} />;
      case 'security':
        return <SecurityDashboard activeSection={activeSection} onSectionChange={setActiveSection} />;
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
    userRole={profile.role} 
    activeTab={activeTab} 
    onTabChange={setActiveTab}
    activeSection={activeSection}
    onSectionChange={setActiveSection}
  >
    {renderDashboard()}
  </DashboardLayout>
);
};

export default Dashboard;