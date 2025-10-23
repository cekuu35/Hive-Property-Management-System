import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Users, DollarSign, TrendingUp, AlertTriangle, Plus, Loader2, Receipt, FileText } from 'lucide-react';
import { PropertiesSection } from './sections/PropertiesSection';
import { TenantsSection } from './sections/TenantsSection';
import { FinancialsSection } from './sections/FinancialsSection';
import { MaintenanceSection } from './sections/MaintenanceSection';
import { ReportsSection } from './sections/ReportsSection';
import { SettingsSection } from './sections/SettingsSection';
import { MessagesSection } from './sections/MessagesSection';
import { IncidentsSection } from './sections/IncidentsSection';
import { UtilityBillsManagement } from './UtilityBillsManagement';
import { UnitApplicationsSection } from './UnitApplicationsSection';
import { PropertyForm } from './PropertyForm';
import { StaffManagementSection } from './StaffManagementSection';
// import { TenantInfoCard } from '../tenant/TenantInfoCard';
import { useFinancials } from '@/hooks/useFinancials';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { MetricCard } from '../MetricCard';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { quickProfileIdCheck } from '@/utils/dataIntegrityCheck';

interface LandlordDashboardProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const LandlordDashboard = ({ activeSection = 'dashboard', onSectionChange }: LandlordDashboardProps) => {
  const renderSection = () => {
    switch (activeSection) {
      case 'properties': return <PropertiesSection />;
      case 'tenants': return <TenantsSection />;
      case 'applications': return <UnitApplicationsSection />;
      case 'staff': return <StaffManagementSection />;
      case 'financials': return <FinancialsSection />;
      case 'utility-bills': return <UtilityBillsManagement />;
      case 'maintenance': return <MaintenanceSection />;
      case 'incidents': return <IncidentsSection />;
      case 'messages': return <MessagesSection />;
      case 'reports': return <ReportsSection />;
      case 'settings': return <SettingsSection />;
      default: return <DashboardOverview onSectionChange={onSectionChange} />;
    }
  };

  if (activeSection !== 'dashboard') {
    return renderSection();
  }

    return <DashboardOverview onSectionChange={onSectionChange} />;
};

const DashboardOverview = ({ onSectionChange }: { onSectionChange?: (section: string) => void }) => {
  const { financialData, loading: financialLoading } = useFinancials();
  const { requests, getStats, loading: maintenanceLoading } = useMaintenanceRequests();
  const { properties, loading: propertiesLoading, createProperty } = useProperties();
  const { tenants, loading: tenantsLoading } = useTenants();
  const [propertyFormOpen, setPropertyFormOpen] = useState(false);

  // Run data integrity check on component mount
  useEffect(() => {
    const runIntegrityCheck = async () => {
      try {
        console.log('🔍 [DashboardOverview] Running data integrity check...');
        const isDataValid = await quickProfileIdCheck();
        
        if (!isDataValid) {
          console.warn('⚠️ [DashboardOverview] Data integrity issues detected and fixed automatically');
          toast.info('Data integrity check completed - any issues have been automatically fixed');
        } else {
          console.log('✅ [DashboardOverview] Data integrity check passed');
        }
      } catch (error) {
        console.error('❌ [DashboardOverview] Error during data integrity check:', error);
      }
    };

    runIntegrityCheck();
  }, []);

  const maintenanceStats = getStats();

  const handleCreateProperty = async (propertyData: any) => {
    try {
      await createProperty(propertyData);
      toast.success('Property created successfully!');
    } catch (error) {
      toast.error('Failed to create property');
      console.error('Create property error:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add-property':
        setPropertyFormOpen(true);
        break;
      case 'manage-tenants':
        onSectionChange?.('tenants');
        break;
      case 'view-applications':
        onSectionChange?.('applications');
        break;
      case 'view-financials':
        onSectionChange?.('financials');
        break;
      case 'utility-bills':
        onSectionChange?.('utility-bills');
        break;
      case 'analytics':
        onSectionChange?.('reports');
        break;
    }
  };
  
  // Calculate occupancy rate
  const totalUnits = properties?.reduce((sum, prop) => sum + prop.total_units, 0) ?? 0;
  const occupiedUnits = tenants?.filter(tenant => tenant.lease_status === 'active').length ?? 0;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  // Recent activity from actual data
  const recentActivity = [
    ...(requests?.slice(0, 2) || []).map(req => ({
      id: req.id,
      type: 'maintenance',
      description: `New maintenance request: ${req.title}`,
      time: new Date(req.createdDate).toLocaleString(),
    })),
    ...(tenants?.slice(0, 1) || []).map(tenant => ({
      id: tenant.id,
      type: 'lease',
      description: `Tenant ${tenant.first_name} ${tenant.last_name} - Active lease`,
      time: 'Today',
    }))
  ];

  if (financialLoading || maintenanceLoading || propertiesLoading || tenantsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Property Portfolio</h1>
          <p className="text-muted-foreground">Manage your properties and track performance</p>
        </div>
        <Button className="gap-2" onClick={() => setPropertyFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Monthly Revenue"
          value={`KES ${(financialData?.totalCollected ?? 0).toLocaleString()}`}
          description={`Net: KES ${(financialData?.netProfit ?? 0).toLocaleString()}`}
          icon={DollarSign}
          variant="success"
        />

        <MetricCard
          title="Occupancy Rate"
          value={`${occupancyRate}%`}
          description={`${occupiedUnits}/${totalUnits} units occupied`}
          icon={TrendingUp}
        />

        <MetricCard
          title="Properties"
          value={properties?.length ?? 0}
          description={`${totalUnits} total units`}
          icon={Building}
        />

        <MetricCard
          title="Maintenance"
          value={maintenanceStats.pending}
          description="Pending requests"
          icon={AlertTriangle}
          variant={maintenanceStats.pending > 5 ? "warning" : "default"}
        />
      </div>

      {/* Tenant Information */}
      {/* <TenantInfoCard showAll={false} /> */}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => handleQuickAction('add-property')}
            >
              <Building className="h-6 w-6" />
              <span>Add Property</span>
            </Button>
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => handleQuickAction('manage-tenants')}
            >
              <Users className="h-6 w-6" />
              <span>Manage Tenants</span>
            </Button>
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => handleQuickAction('view-applications')}
            >
              <FileText className="h-6 w-6" />
              <span>Applications</span>
            </Button>
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => handleQuickAction('view-financials')}
            >
              <DollarSign className="h-6 w-6" />
              <span>View Financials</span>
            </Button>
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => handleQuickAction('utility-bills')}
            >
              <Receipt className="h-6 w-6" />
              <span>Utility Bills</span>
            </Button>
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2" 
              variant="outline"
              onClick={() => handleQuickAction('analytics')}
            >
              <TrendingUp className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Property Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest property updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {financialData?.monthlyData?.map((month) => (
                <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{month.month} 2024</p>
                    <p className="text-sm text-muted-foreground">Monthly revenue</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">KES {(month.income ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Expenses: KES {(month.expenses ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Alerts */}
      <Card className="border-warning bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Performance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {maintenanceStats.pending > 0 && (
              <p className="text-sm">• {maintenanceStats.pending} pending maintenance requests requiring attention</p>
            )}
            {occupancyRate < 85 && (
              <p className="text-sm">• Low occupancy rate ({occupancyRate}%) - consider marketing strategies</p>
            )}
            {financialData?.overdue > 0 && (
              <p className="text-sm">• KES {(financialData?.overdue ?? 0).toLocaleString()} in overdue payments need collection</p>
            )}
            {maintenanceStats.pending === 0 && occupancyRate >= 85 && financialData?.overdue === 0 && (
              <p className="text-sm text-success">• All systems operating normally - no alerts</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Form Modal */}
      <PropertyForm
        open={propertyFormOpen}
        onOpenChange={setPropertyFormOpen}
        onSubmit={handleCreateProperty}
      />
    </div>
  );
};

export { LandlordDashboard };