import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useFinancials } from './useFinancials';
import { useMaintenanceRequests } from './useMaintenanceRequests';
import { useProperties } from './useProperties';

export interface LandlordAlert {
  id: string;
  type: 'maintenance' | 'payment' | 'occupancy' | 'general';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  amount?: number;
  created_at: string;
  is_read: boolean;
}

export const useLandlordAlerts = () => {
  const { profile } = useAuth();
  const { financialData, loading: financialLoading } = useFinancials();
  const { requests, loading: maintenanceLoading } = useMaintenanceRequests();
  const { properties, loading: propertiesLoading } = useProperties();
  const [alerts, setAlerts] = useState<LandlordAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'landlord') {
      setLoading(false);
      return;
    }

    if (!financialLoading && !maintenanceLoading && !propertiesLoading) {
      generateAlerts();
    }
  }, [profile, financialLoading, maintenanceLoading, propertiesLoading, financialData, requests, properties]);

  const generateAlerts = () => {
    const generatedAlerts: LandlordAlert[] = [];

    // 1. Maintenance Alerts
    const pendingMaintenance = requests?.filter(r => r.status === 'pending') || [];
    if (pendingMaintenance.length > 0) {
      generatedAlerts.push({
        id: `maintenance-pending-${Date.now()}`,
        type: 'maintenance',
        priority: pendingMaintenance.length > 10 ? 'urgent' : pendingMaintenance.length > 5 ? 'high' : 'medium',
        title: 'Pending Maintenance Requests',
        message: `${pendingMaintenance.length} maintenance request${pendingMaintenance.length > 1 ? 's' : ''} requiring attention`,
        created_at: new Date().toISOString(),
        is_read: false,
      });
    }

    // Check for urgent maintenance
    const urgentMaintenance = requests?.filter(r => r.priority === 'urgent' && r.status !== 'completed') || [];
    if (urgentMaintenance.length > 0) {
      generatedAlerts.push({
        id: `maintenance-urgent-${Date.now()}`,
        type: 'maintenance',
        priority: 'urgent',
        title: 'Urgent Maintenance Issues',
        message: `${urgentMaintenance.length} urgent maintenance issue${urgentMaintenance.length > 1 ? 's' : ''} need immediate attention`,
        created_at: new Date().toISOString(),
        is_read: false,
      });
    }

    // 2. Payment/Financial Alerts
    if (financialData?.overdue && financialData.overdue > 0) {
      generatedAlerts.push({
        id: `payment-overdue-${Date.now()}`,
        type: 'payment',
        priority: financialData.overdue > 100000 ? 'urgent' : financialData.overdue > 50000 ? 'high' : 'medium',
        title: 'Overdue Rent Payments',
        message: `KES ${financialData.overdue.toLocaleString()} in overdue payments need collection`,
        amount: financialData.overdue,
        created_at: new Date().toISOString(),
        is_read: false,
      });
    }

    // 3. Occupancy Alerts
    if (properties && properties.length > 0) {
      const totalUnits = properties.reduce((sum, p) => sum + (p.units?.length || 0), 0);
      const occupiedUnits = properties.reduce((sum, p) => 
        sum + (p.units?.filter(u => u.leases?.some(l => l.status === 'active')).length || 0), 0
      );
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      if (occupancyRate < 85 && totalUnits > 0) {
        generatedAlerts.push({
          id: `occupancy-low-${Date.now()}`,
          type: 'occupancy',
          priority: occupancyRate < 70 ? 'high' : 'medium',
          title: 'Low Occupancy Rate',
          message: `Occupancy rate is ${occupancyRate}% - consider marketing strategies to attract tenants`,
          created_at: new Date().toISOString(),
          is_read: false,
        });
      }
    }

    // 4. Check for properties with no units
    const propertiesWithoutUnits = properties?.filter(p => !p.units || p.units.length === 0) || [];
    if (propertiesWithoutUnits.length > 0) {
      generatedAlerts.push({
        id: `property-no-units-${Date.now()}`,
        type: 'general',
        priority: 'low',
        title: 'Properties Without Units',
        message: `${propertiesWithoutUnits.length} propert${propertiesWithoutUnits.length > 1 ? 'ies' : 'y'} ha${propertiesWithoutUnits.length > 1 ? 've' : 's'} no units configured`,
        created_at: new Date().toISOString(),
        is_read: false,
      });
    }

    // 5. All good message
    if (generatedAlerts.length === 0) {
      generatedAlerts.push({
        id: `all-good-${Date.now()}`,
        type: 'general',
        priority: 'low',
        title: 'All Systems Operating Normally',
        message: 'No alerts at this time - your portfolio is performing well!',
        created_at: new Date().toISOString(),
        is_read: true, // Mark as read so it doesn't show as notification
      });
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    generatedAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    setAlerts(generatedAlerts);
    setLoading(false);
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, is_read: true } : alert
    ));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, is_read: true })));
  };

  return {
    alerts,
    loading,
    markAsRead,
    markAllAsRead,
  };
};

