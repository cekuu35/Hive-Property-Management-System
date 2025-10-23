import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Users, Clock, Calendar, Download, Search, Filter } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, differenceInMinutes } from 'date-fns';

interface VisitorHistory {
  id: string;
  visitor_name: string;
  visitor_phone?: string;
  visiting_unit_id?: string;
  visiting_tenant_id?: string;
  purpose: string;
  time_in: string;
  time_out?: string;
  status: string;
  security_notes?: string;
  unit?: {
    unit_number: string;
    property?: {
      name: string;
    };
  };
  tenant?: {
    first_name: string;
    last_name: string;
  };
}

export const VisitorHistorySection = () => {
  const [history, setHistory] = useState<VisitorHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState('7');
  const [searchTerm, setSearchTerm] = useState('');
  const { profile } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (!profile?.id) return;

    console.log('[VisitorHistory] Fetching history, filterDays:', filterDays);

    try {
      setLoading(true);

      // Calculate date filter
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(filterDays));

      let query = supabase
        .from('visitors')
        .select(`
          *,
          unit:units(unit_number, property:properties(name)),
          tenant:profiles!visitors_visiting_tenant_id_fkey(first_name, last_name)
        `)
        .eq('status', 'checked_out')
        .gte('time_out', daysAgo.toISOString())
        .order('time_out', { ascending: false });

      // Filter by assigned properties for security guards
      if (profile.role === 'security') {
        try {
          const { data: assignments } = await supabase
            .from('staff_assignments')
            .select('property_id')
            .eq('staff_id', profile.id)
            .eq('role', 'security')
            .eq('is_active', true);

          if (assignments && assignments.length > 0) {
            const propertyIds = assignments.map(a => a.property_id);
            const { data: units } = await supabase
              .from('units')
              .select('id')
              .in('property_id', propertyIds);

            if (units && units.length > 0) {
              const unitIds = units.map(u => u.id);
              query = query.in('visiting_unit_id', unitIds);
            }
          }
        } catch (error) {
          console.warn('staff_assignments not found, showing all history');
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('[VisitorHistory] Fetched history:', data?.length || 0);
      setHistory(data || []);
    } catch (error) {
      console.error('[VisitorHistory] Error fetching visitor history:', error);
    } finally {
      setLoading(false);
    }
  }, [profile, filterDays]);

  useEffect(() => {
    console.log('[VisitorHistory] useEffect triggered');
    fetchHistory();

    // Set up real-time subscription for visitor history
    if (profile?.id) {
      console.log('[VisitorHistory] Setting up real-time subscription...');
      const channel = supabase
        .channel('visitor_history_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'visitors',
            filter: `status=eq.checked_out`
          },
          (payload) => {
            console.log('🔄 [REAL-TIME HISTORY] Change detected:', payload.eventType, payload.new || payload.old);
            // Refetch history when any checked-out visitor changes
            fetchHistory();
          }
        )
        .subscribe((status) => {
          console.log('[VisitorHistory] Subscription status:', status);
        });

      return () => {
        console.log('[VisitorHistory] Cleaning up subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id, fetchHistory]);

  const filteredHistory = history.filter(visitor => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      visitor.visitor_name.toLowerCase().includes(search) ||
      visitor.purpose.toLowerCase().includes(search) ||
      visitor.visitor_phone?.toLowerCase().includes(search)
    );
  });

  const calculateDuration = (timeIn: string, timeOut?: string) => {
    if (!timeOut) return 'N/A';
    const minutes = differenceInMinutes(new Date(timeOut), new Date(timeIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const exportHistory = () => {
    // TODO: Implement CSV export
    alert('Export functionality coming soon');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Visitor History</h1>
          <p className="text-muted-foreground">Checked out visitors (auto-deleted after 7 days)</p>
        </div>
        <Button onClick={exportHistory} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search visitors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterDays} onValueChange={setFilterDays}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="3">Last 3 days</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checked Out</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredHistory.length}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Visit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredHistory.length > 0
                ? Math.round(
                    filteredHistory.reduce((sum, v) => {
                      if (!v.time_out) return sum;
                      return sum + differenceInMinutes(new Date(v.time_out), new Date(v.time_in));
                    }, 0) / filteredHistory.length
                  ) + ' min'
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Duration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredHistory.filter(v =>
                v.time_out && new Date(v.time_out).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Checked out today</p>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle>Visitor Log</CardTitle>
          <CardDescription>Complete history of checked out visitors</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No visitor history found</p>
              <p className="text-xs text-muted-foreground mt-2">
                Checked out visitors will appear here (kept for 7 days)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((visitor) => (
                <div key={visitor.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{visitor.visitor_name}</h3>
                      <Badge variant="outline">Checked Out</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <p>
                        <strong>Purpose:</strong> {visitor.purpose}
                      </p>
                      {visitor.visitor_phone && (
                        <p>
                          <strong>Phone:</strong> {visitor.visitor_phone}
                        </p>
                      )}
                      {visitor.unit && (
                        <p>
                          <strong>Unit:</strong> {visitor.unit.unit_number}
                          {visitor.unit.property && ` - ${visitor.unit.property.name}`}
                        </p>
                      )}
                      {visitor.tenant && (
                        <p>
                          <strong>Visiting:</strong> {visitor.tenant.first_name} {visitor.tenant.last_name}
                        </p>
                      )}
                      <p>
                        <strong>Check In:</strong> {format(new Date(visitor.time_in), 'MMM d, yyyy h:mm a')}
                      </p>
                      {visitor.time_out && (
                        <p>
                          <strong>Check Out:</strong> {format(new Date(visitor.time_out), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                      <p>
                        <strong>Duration:</strong> {calculateDuration(visitor.time_in, visitor.time_out)}
                      </p>
                    </div>
                    
                    {visitor.security_notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>Notes:</strong> {visitor.security_notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


