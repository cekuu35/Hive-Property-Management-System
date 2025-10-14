import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Building, DollarSign, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

interface SystemStats {
  totalLandlords: number;
  totalProperties: number;
  totalTenants: number;
  totalPayments: number;
  recentPayments: any[];
  landlordsWithMpesaConfig: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats>({
    totalLandlords: 0,
    totalProperties: 0,
    totalTenants: 0,
    totalPayments: 0,
    recentPayments: [],
    landlordsWithMpesaConfig: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);

      // Fetch landlords
      const { data: landlords, error: landlordsError } = await supabaseAdmin
        .from('landlords')
        .select('id, paybill_number, account_reference');

      // Fetch properties
      const { data: properties, error: propertiesError } = await supabaseAdmin
        .from('properties')
        .select('id');

      // Fetch tenant info
      const { data: tenants, error: tenantsError } = await supabaseAdmin
        .from('tenant_info')
        .select('id');

      // Fetch recent payments
      const { data: payments, error: paymentsError } = await supabaseAdmin
        .from('rent_payments')
        .select('id, amount, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

      if (landlordsError) console.error('Error fetching landlords:', landlordsError);
      if (propertiesError) console.error('Error fetching properties:', propertiesError);
      if (tenantsError) console.error('Error fetching tenants:', tenantsError);
      if (paymentsError) console.error('Error fetching payments:', paymentsError);

      // Debug logging
      console.log('🔍 Admin Dashboard Debug:');
      console.log('Landlords fetched:', landlords);
      console.log('Landlords count:', landlords?.length || 0);
      
      const landlordsWithMpesaConfig = landlords?.filter(l => 
        l.paybill_number && l.paybill_number.length > 0 && 
        l.account_reference && l.account_reference.length > 0
      ).length || 0;
      
      console.log('Landlords with M-Pesa config:', landlordsWithMpesaConfig);

      setStats({
        totalLandlords: landlords?.length || 0,
        totalProperties: properties?.length || 0,
        totalTenants: tenants?.length || 0,
        totalPayments: payments?.length || 0,
        recentPayments: payments || [],
        landlordsWithMpesaConfig
      });

    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Landlords</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalLandlords}</p>
                <Badge variant={stats.landlordsWithMpesaConfig > 0 ? "default" : "destructive"} className="mt-1">
                  {stats.landlordsWithMpesaConfig} with M-Pesa config
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Properties</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalProperties}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalTenants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Recent Payments</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest system activity and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentPayments.length > 0 ? (
            <div className="space-y-3">
              {stats.recentPayments.map((payment, index) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Rent Payment</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">KES {payment.amount?.toLocaleString()}</p>
                    <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No recent payments found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">Manage Landlords</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Building className="h-6 w-6 mb-2" />
              <span className="text-sm">View Properties</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <CreditCard className="h-6 w-6 mb-2" />
              <span className="text-sm">Payment Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
