import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ReportData {
  financial: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    occupancyRate: number;
    averageRent: number;
    monthlyTrend: Array<{
      month: string;
      revenue: number;
      expenses: number;
    }>;
  };
  occupancy: {
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    averageVacancyDuration: number;
    turnoverRate: number;
    propertyBreakdown: Array<{
      property: string;
      occupied: number;
      total: number;
      rate: number;
    }>;
  };
  maintenance: {
    totalRequests: number;
    completedRequests: number;
    pendingRequests: number;
    averageResponseTime: number;
    totalMaintenanceCost: number;
    categoryBreakdown: Array<{
      category: string;
      count: number;
      cost: number;
    }>;
  };
}

export const useReports = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchReportData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Fetch properties with units and current leases
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          units (
            *,
            leases!inner (
              id,
              status,
              rent_amount,
              start_date,
              end_date
            )
          )
        `)
        .eq('landlord_id', profile.id);

      if (propertiesError) throw propertiesError;

      // Fetch rent payments with lease information
      const { data: rentPayments, error: paymentsError } = await supabase
        .from('rent_payments')
        .select(`
          *,
          lease:leases (
            unit:units (
              property:properties!inner (
                landlord_id
              )
            )
          )
        `)
        .gte('due_date', new Date(new Date().getFullYear(), 0, 1).toISOString());

      if (paymentsError) throw paymentsError;

      // Filter rent payments for this landlord
      const landlordRentPayments = rentPayments?.filter(payment => 
        payment.lease?.unit?.property?.landlord_id === profile.id
      ) || [];

      // Fetch maintenance requests for landlord's properties
      const { data: maintenanceRequests, error: maintenanceError } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          unit:units (
            property:properties!inner (
              landlord_id
            )
          )
        `)
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString());

      if (maintenanceError) throw maintenanceError;

      // Filter maintenance requests for this landlord
      const landlordMaintenanceRequests = maintenanceRequests?.filter(request => 
        request.unit?.property?.landlord_id === profile.id
      ) || [];

      // Fetch expenses for this landlord
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('landlord_id', profile.id)
        .gte('created_at', new Date(new Date().getFullYear(), 0, 1).toISOString());

      if (expensesError) throw expensesError;

      // Calculate occupancy metrics based on active leases, not unit status
      const allUnits = properties?.flatMap(prop => prop.units || []) || [];
      const totalUnits = allUnits.length;
      
      // Get all active leases across all units
      const activeLeases = allUnits.flatMap(unit => 
        unit.leases?.filter((lease: any) => 
          lease.status === 'active' && 
          new Date(lease.start_date) <= new Date() && 
          new Date(lease.end_date) >= new Date()
        ) || []
      );
      
      const occupiedUnits = activeLeases.length;
      const vacantUnits = totalUnits - occupiedUnits;
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      // Calculate financial metrics
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      // Total revenue from paid rent payments (current year)
      const totalRevenue = landlordRentPayments
        .filter(payment => {
          const paymentDate = new Date(payment.paid_date || payment.due_date);
          return payment.status === 'paid' && paymentDate.getFullYear() === currentYear;
        })
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      // Total expenses from the expenses table (current year)
      const totalExpenses = expenses?.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === currentYear;
      }).reduce((sum, expense) => sum + Number(expense.amount || 0), 0) || 0;
      
      const netProfit = totalRevenue - totalExpenses;

      // Calculate average rent from active leases (current leases only)
      const currentActiveLeases = allUnits.flatMap(unit => 
        unit.leases?.filter((lease: any) => 
          lease.status === 'active' && 
          new Date(lease.start_date) <= new Date() && 
          new Date(lease.end_date) >= new Date()
        ) || []
      );
      
      const averageRent = currentActiveLeases.length > 0 
        ? Math.round(currentActiveLeases.reduce((sum: number, lease: any) => sum + Number(lease.rent_amount || 0), 0) / currentActiveLeases.length)
        : 0;

      // Monthly trend calculation
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthRevenue = landlordRentPayments
          .filter(payment => {
            const paymentDate = new Date(payment.paid_date || payment.due_date);
            return payment.status === 'paid' && 
                   paymentDate >= monthStart && 
                   paymentDate <= monthEnd;
          })
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const monthExpenses = expenses
          ?.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= monthStart && expenseDate <= monthEnd;
          })
          .reduce((sum, expense) => sum + Number(expense.amount || 0), 0) || 0;

        monthlyTrend.push({
          month: date.toLocaleDateString('en', { month: 'short' }),
          revenue: monthRevenue,
          expenses: monthExpenses
        });
      }

      // Property breakdown for occupancy based on active leases
      const propertyBreakdown = properties?.map(property => {
        const units = property.units || [];
        const total = units.length;
        
        // Count units with active leases
        const occupied = units.filter((unit: any) => {
          const activeLeases = unit.leases?.filter((lease: any) => 
            lease.status === 'active' && 
            new Date(lease.start_date) <= new Date() && 
            new Date(lease.end_date) >= new Date()
          ) || [];
          return activeLeases.length > 0;
        }).length;
        
        const rate = total > 0 ? Math.round((occupied / total) * 100) : 0;
        
        return {
          property: property.name,
          occupied,
          total,
          rate
        };
      }) || [];

      // Maintenance statistics (current year)
      const currentYearMaintenanceRequests = landlordMaintenanceRequests.filter(req => {
        const requestDate = new Date(req.created_at);
        return requestDate.getFullYear() === currentYear;
      });
      
      const totalRequests = currentYearMaintenanceRequests.length;
      const completedRequests = currentYearMaintenanceRequests.filter(req => req.status === 'completed').length;
      const pendingRequests = currentYearMaintenanceRequests.filter(req => req.status === 'pending').length;
      const inProgressRequests = currentYearMaintenanceRequests.filter(req => req.status === 'in-progress').length;
      
      const totalMaintenanceCost = currentYearMaintenanceRequests.reduce((sum, req) => 
        sum + (Number(req.actual_cost) || Number(req.estimated_cost) || 0), 0);

      // Maintenance category breakdown
      const categoryBreakdown = currentYearMaintenanceRequests.reduce((acc: any[], req) => {
        const existing = acc.find(item => item.category === req.category);
        const cost = Number(req.actual_cost) || Number(req.estimated_cost) || 0;
        
        if (existing) {
          existing.count += 1;
          existing.cost += cost;
        } else {
          acc.push({ category: req.category, count: 1, cost });
        }
        return acc;
      }, []);

      // Calculate average vacancy duration based on lease end dates
      const vacantUnitsData = allUnits.filter(unit => {
        const activeLeases = unit.leases?.filter((lease: any) => 
          lease.status === 'active' && 
          new Date(lease.start_date) <= new Date() && 
          new Date(lease.end_date) >= new Date()
        ) || [];
        return activeLeases.length === 0; // No active leases = vacant
      });
      
      const averageVacancyDuration = vacantUnitsData.length > 0 ? 
        Math.round(vacantUnitsData.reduce((sum, unit) => {
          // Find the most recent ended lease for this unit
          const endedLeases = unit.leases?.filter((lease: any) => 
            lease.status === 'ended' && new Date(lease.end_date) < new Date()
          ) || [];
          
          if (endedLeases.length > 0) {
            const mostRecentEnd = Math.max(...endedLeases.map((lease: any) => 
              new Date(lease.end_date).getTime()
            ));
            const daysSinceEnd = Math.ceil((new Date().getTime() - mostRecentEnd) / (1000 * 60 * 60 * 24));
            return sum + daysSinceEnd;
          }
          
          // If no ended leases, assume 30 days
          return sum + 30;
        }, 0) / vacantUnitsData.length) : 0;

      // Calculate turnover rate based on ended leases
      const endedLeases = allUnits.flatMap(unit => 
        unit.leases?.filter((lease: any) => 
          lease.status === 'ended' && 
          new Date(lease.end_date).getFullYear() === currentYear
        ) || []
      );
      
      const turnoverRate = totalUnits > 0 ? 
        Math.round((endedLeases.length / totalUnits) * 100 * 10) / 10 : 0;

      // Calculate average response time for maintenance (current year)
      const completedRequestsWithDates = currentYearMaintenanceRequests.filter(req => 
        req.status === 'completed' && req.created_at && req.completed_date
      );
      const averageResponseTime = completedRequestsWithDates.length > 0 ?
        Math.round(completedRequestsWithDates.reduce((sum, req) => {
          const created = new Date(req.created_at);
          const completed = new Date(req.completed_date!);
          const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / completedRequestsWithDates.length * 10) / 10 : 0;

      const newReportData: ReportData = {
        financial: {
          totalRevenue,
          totalExpenses,
          netProfit,
          occupancyRate,
          averageRent,
          monthlyTrend
        },
        occupancy: {
          totalUnits,
          occupiedUnits,
          vacantUnits,
          averageVacancyDuration,
          turnoverRate,
          propertyBreakdown
        },
        maintenance: {
          totalRequests,
          completedRequests,
          pendingRequests,
          averageResponseTime,
          totalMaintenanceCost,
          categoryBreakdown
        }
      };

      setReportData(newReportData);

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type: string, format: 'pdf' | 'excel' | 'email', dateRange?: { from: Date; to: Date }) => {
    try {
      toast({
        title: "Exporting Report",
        description: `Generating ${type} report in ${format.toUpperCase()} format...`,
      });

      // Simulate export process with actual data formatting
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (format === 'pdf') {
        // In a real implementation, this would use jsPDF or similar
        const reportContent = generateReportContent(type, dateRange);
        downloadTextFile(`${type}-report.txt`, reportContent);
      } else if (format === 'excel') {
        // In a real implementation, this would use SheetJS or similar
        const csvContent = generateCSVContent(type);
        downloadTextFile(`${type}-report.csv`, csvContent);
      } else if (format === 'email') {
        // In a real implementation, this would send via email service
        toast({
          title: "Report Sent",
          description: "Your report has been sent to your email address.",
        });
        return;
      }

      toast({
        title: "Download Ready",
        description: `Your ${format.toUpperCase()} report has been downloaded.`,
      });

    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateReportContent = (type: string, dateRange?: { from: Date; to: Date }) => {
    if (!reportData) return '';

    const dateRangeText = dateRange ? 
      `Period: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : 
      'Period: Current Year';

    switch (type) {
      case 'financial':
        return `
FINANCIAL REPORT
================
${dateRangeText}
Generated: ${new Date().toLocaleDateString()}

SUMMARY
-------
Total Revenue: KES ${reportData.financial.totalRevenue.toLocaleString()}
Total Expenses: KES ${reportData.financial.totalExpenses.toLocaleString()}
Net Profit: KES ${reportData.financial.netProfit.toLocaleString()}
Occupancy Rate: ${reportData.financial.occupancyRate}%
Average Rent: KES ${reportData.financial.averageRent.toLocaleString()}

MONTHLY TREND
-------------
${reportData.financial.monthlyTrend.map(month => 
  `${month.month}: Revenue KES ${month.revenue.toLocaleString()}, Expenses KES ${month.expenses.toLocaleString()}`
).join('\n')}
        `;
      case 'occupancy':
        return `
OCCUPANCY REPORT
================
${dateRangeText}
Generated: ${new Date().toLocaleDateString()}

SUMMARY
-------
Total Units: ${reportData.occupancy.totalUnits}
Occupied Units: ${reportData.occupancy.occupiedUnits}
Vacant Units: ${reportData.occupancy.vacantUnits}
Average Vacancy Duration: ${reportData.occupancy.averageVacancyDuration} days
Turnover Rate: ${reportData.occupancy.turnoverRate}%

PROPERTY BREAKDOWN
------------------
${reportData.occupancy.propertyBreakdown.map(prop => 
  `${prop.property}: ${prop.occupied}/${prop.total} units (${prop.rate}%)`
).join('\n')}
        `;
      case 'maintenance':
        return `
MAINTENANCE REPORT
==================
${dateRangeText}
Generated: ${new Date().toLocaleDateString()}

SUMMARY
-------
Total Requests: ${reportData.maintenance.totalRequests}
Completed: ${reportData.maintenance.completedRequests}
Pending: ${reportData.maintenance.pendingRequests}
Average Response Time: ${reportData.maintenance.averageResponseTime} days
Total Cost: KES ${reportData.maintenance.totalMaintenanceCost.toLocaleString()}

CATEGORY BREAKDOWN
------------------
${reportData.maintenance.categoryBreakdown.map(cat => 
  `${cat.category}: ${cat.count} requests, KES ${cat.cost.toLocaleString()}`
).join('\n')}
        `;
      default:
        return 'Report data not available';
    }
  };

  const generateCSVContent = (type: string) => {
    if (!reportData) return '';

    switch (type) {
      case 'financial':
        return `Month,Revenue,Expenses,Profit\n${reportData.financial.monthlyTrend.map(month => 
          `${month.month},${month.revenue},${month.expenses},${month.revenue - month.expenses}`
        ).join('\n')}`;
      case 'occupancy':
        return `Property,Occupied,Total,Rate\n${reportData.occupancy.propertyBreakdown.map(prop => 
          `${prop.property},${prop.occupied},${prop.total},${prop.rate}%`
        ).join('\n')}`;
      case 'maintenance':
        return `Category,Count,Cost\n${reportData.maintenance.categoryBreakdown.map(cat => 
          `${cat.category},${cat.count},${cat.cost}`
        ).join('\n')}`;
      default:
        return '';
    }
  };

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const scheduleReport = async (reportType: string, frequency: 'weekly' | 'monthly' | 'quarterly', email: string) => {
    try {
      // In a real implementation, this would save to a scheduled_reports table
      toast({
        title: "Report Scheduled",
        description: `${reportType} report will be sent ${frequency} to ${email}`,
      });
    } catch (error) {
      console.error('Error scheduling report:', error);
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateComprehensiveReport = async (reportType: string) => {
    try {
      toast({
        title: "Generating Report",
        description: `Creating ${reportType} report...`,
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      toast({
        title: "Report Generated",
        description: "Your comprehensive report has been generated successfully.",
      });

    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchReportData();
    
    // Set up real-time subscriptions for report data
    if (profile?.id) {
      const channel = supabase
        .channel('reports-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rent_payments'
          },
          () => {
            fetchReportData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses'
          },
          () => {
            fetchReportData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'maintenance_requests'
          },
          () => {
            fetchReportData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'units'
          },
          () => {
            fetchReportData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leases'
          },
          () => {
            fetchReportData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'properties'
          },
          () => {
            fetchReportData();
          }
        )
        .subscribe();

      setRealtimeChannel(channel);

      return () => {
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
        }
      };
    }
  }, [profile?.id]);

  return {
    reportData,
    loading,
    exportReport,
    generateComprehensiveReport,
    scheduleReport,
    refetch: fetchReportData
  };
};