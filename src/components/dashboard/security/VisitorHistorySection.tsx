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
  purpose: string;
  time_in: string;
  time_out?: string;
  status: string;
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

    try {
      setLoading(true);

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(filterDays));

      const { data, error } = await supabase
        .from('visitors')
        .select(`
          *,
          unit:units!visitors_visiting_unit_id_fkey(
            unit_number,
            property:properties(name)
          ),
          tenant:profiles!visitors_visiting_tenant_id_fkey(first_name, last_name)
        `)
        .eq('status', 'checked_out')
        .gte('time_out', daysAgo.toISOString())
        .order('time_out', { ascending: false });

      if (error) throw error;

      // Debug: Log first visitor to verify data structure
      if (data && data.length > 0) {
        console.log('[VisitorHistory] Sample visitor data:', {
          id: data[0].id,
          visitor_name: data[0].visitor_name,
          time_in: data[0].time_in,
          time_out: data[0].time_out,
          time_in_type: typeof data[0].time_in,
          time_out_type: typeof data[0].time_out,
          calculated_duration: data[0].time_in && data[0].time_out 
            ? differenceInMinutes(new Date(data[0].time_out), new Date(data[0].time_in))
            : 'N/A'
        });
      }

      setHistory(data || []);
    } catch (error) {
      console.error('[VisitorHistory] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, filterDays]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
    if (!timeOut || !timeIn) return 'N/A';
    
    try {
      const checkInDate = new Date(timeIn);
      const checkOutDate = new Date(timeOut);
      
      // Validate dates
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        console.error('Invalid date format:', { timeIn, timeOut });
        return 'Invalid Date';
      }
      
      // Ensure check-out is after check-in
      if (checkOutDate <= checkInDate) {
        console.error('Check-out time must be after check-in time:', { timeIn, timeOut });
        return 'N/A';
      }
      
      const minutes = differenceInMinutes(checkOutDate, checkInDate);
      
      if (minutes < 0) {
        console.error('Negative duration calculated:', { timeIn, timeOut, minutes });
        return 'N/A';
      }
      
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      } else if (mins === 0) {
        return '< 1m';
      } else {
        return `${mins}m`;
      }
    } catch (error) {
      console.error('Error calculating duration:', error, { timeIn, timeOut });
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Visitor History</h2>
          <p className="text-muted-foreground">View past visitor check-ins and check-outs</p>
        </div>
        <Button variant="outline" onClick={fetchHistory}>
          <Download className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search visitors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterDays} onValueChange={setFilterDays}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Checked Out Visitors ({filteredHistory.length})
          </CardTitle>
          <CardDescription>
            Showing visitors from the last {filterDays} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No visitor history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((visitor) => (
                <div
                  key={visitor.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-secondary/5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{visitor.visitor_name}</h4>
                      <Badge variant="outline">Checked Out</Badge>
                    </div>
                    {visitor.unit && (
                      <p className="text-sm font-medium mb-1">
                        Unit: {visitor.unit.unit_number}{visitor.unit.property?.name ? ` - ${visitor.unit.property.name}` : ''}
                        {visitor.tenant && ` (${visitor.tenant.first_name} ${visitor.tenant.last_name})`}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mb-1">
                      Purpose: {visitor.purpose}
                    </p>
                    {visitor.visitor_phone && (
                      <p className="text-sm text-muted-foreground">
                        Phone: {visitor.visitor_phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>In: {format(new Date(visitor.time_in), 'MMM d, h:mm a')}</span>
                    </div>
                    {visitor.time_out && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>Out: {format(new Date(visitor.time_out), 'MMM d, h:mm a')}</span>
                        </div>
                        <div 
                          className="text-sm font-medium text-primary"
                          title={`Check-in: ${new Date(visitor.time_in).toLocaleString()}\nCheck-out: ${new Date(visitor.time_out).toLocaleString()}\nRaw time_in: ${visitor.time_in}\nRaw time_out: ${visitor.time_out}`}
                        >
                          Duration: {calculateDuration(visitor.time_in, visitor.time_out)}
                        </div>
                      </>
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

