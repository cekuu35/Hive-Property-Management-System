import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [readAlerts, setReadAlerts] = useState<Set<string>>(new Set());

  const generatedAlerts = useMemo<LandlordAlert[]>(() => {
    if (profile?.role !== 'landlord') {
      return [];
    }

    if (financialLoading || maintenanceLoading || propertiesLoading) {
      return [];
    }

    const alerts: LandlordAlert[] = [];

    // 1. Maintenance Alerts
    const pendingMaintenance = requests?.filter(r => r.status === 'pending') || [];
    if (pendingMaintenance.length > 0) {
      alerts.push({
        id: 'maintenance-pending',
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
      alerts.push({
        id: 'maintenance-urgent',
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
      alerts.push({
        id: 'payment-overdue',
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
        alerts.push({
          id: 'occupancy-low',
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
      alerts.push({
        id: 'property-no-units',
        type: 'general',
        priority: 'low',
        title: 'Properties Without Units',
        message: `${propertiesWithoutUnits.length} propert${propertiesWithoutUnits.length > 1 ? 'ies' : 'y'} ha${propertiesWithoutUnits.length > 1 ? 've' : 's'} no units configured`,
        created_at: new Date().toISOString(),
        is_read: false,
      });
    }

    // 5. All good message
    if (alerts.length === 0) {
      alerts.push({
        id: 'all-good',
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
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Apply read status
    return alerts.map(alert => ({
      ...alert,
      is_read: readAlerts.has(alert.id) || alert.is_read
    }));
  }, [profile?.role, financialLoading, maintenanceLoading, propertiesLoading, requests, financialData, properties, readAlerts]);

  const loading = financialLoading || maintenanceLoading || propertiesLoading;

  const markAsRead = useCallback((alertId: string) => {
    setReadAlerts(prev => new Set([...prev, alertId]));
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadAlerts(new Set(generatedAlerts.map(alert => alert.id)));
  }, [generatedAlerts]);

  return {
    alerts: generatedAlerts,
    loading,
    markAsRead,
    markAllAsRead,
  };
};

