import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban
} from 'lucide-react';

interface SubscriptionStats {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  totalLandlords: number;
  conversionRate: number;
  churnRate: number;
  averageRevenuePerUser: number;
  recentSubscriptions: any[];
  planDistribution: { [key: string]: number };
}

export default function SubscriptionDashboard() {
  const [stats, setStats] = useState<SubscriptionStats>({
    totalRevenue: 0,
    monthlyRecurringRevenue: 0,
    activeSubscriptions: 0,
    trialSubscriptions: 0,
    cancelledSubscriptions: 0,
    expiredSubscriptions: 0,
    totalLandlords: 0,
    conversionRate: 0,
    churnRate: 0,
    averageRevenuePerUser: 0,
    recentSubscriptions: [],
    planDistribution: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStats();
  }, []);

  const fetchSubscriptionStats = async () => {
    try {
      setLoading(true);

      // Fetch all subscriptions
      const { data: subscriptions, error: subsError } = await supabaseAdmin
        .from('landlord_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*),
          landlord:profiles(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        return;
      }

      // Fetch all payments
      const { data: payments, error: paymentsError } = await supabaseAdmin
        .from('subscription_payments')
        .select('*')
        .eq('status', 'paid');

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
      }

      // Calculate stats
      const totalRevenue = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
      
      const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0;
      const trialSubscriptions = subscriptions?.filter(s => s.status === 'trial').length || 0;
      const cancelledSubscriptions = subscriptions?.filter(s => s.status === 'cancelled').length || 0;
      const expiredSubscriptions = subscriptions?.filter(s => s.status === 'expired').length || 0;

      // Calculate MRR (Monthly Recurring Revenue) - only from active paid subscriptions
      const mrr = subscriptions
        ?.filter(s => s.status === 'active')
        .reduce((sum, s) => sum + parseFloat(s.plan?.price || 0), 0) || 0;

      // Get total unique landlords
      const uniqueLandlords = new Set(subscriptions?.map(s => s.landlord_id)).size;

      // Calculate conversion rate (trial to paid)
      const totalTrials = subscriptions?.filter(s => 
        s.status === 'trial' || s.status === 'active' || s.status === 'cancelled'
      ).length || 1;
      const convertedToActive = subscriptions?.filter(s => 
        s.status === 'active' && s.trial_end_date
      ).length || 0;
      const conversionRate = (convertedToActive / totalTrials) * 100;

      // Calculate churn rate
      const totalPaidSubs = activeSubscriptions + cancelledSubscriptions || 1;
      const churnRate = (cancelledSubscriptions / totalPaidSubs) * 100;

      // Calculate ARPU (Average Revenue Per User)
      const arpu = uniqueLandlords > 0 ? mrr / uniqueLandlords : 0;

      // Plan distribution
      const planDist: { [key: string]: number } = {};
      subscriptions?.forEach(s => {
        const planName = s.plan?.display_name || 'Unknown';
        planDist[planName] = (planDist[planName] || 0) + 1;
      });

      setStats({
        totalRevenue,
        monthlyRecurringRevenue: mrr,
        activeSubscriptions,
        trialSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        totalLandlords: uniqueLandlords,
        conversionRate,
        churnRate,
        averageRevenuePerUser: arpu,
        recentSubscriptions: subscriptions?.slice(0, 10) || [],
        planDistribution: planDist
      });

    } catch (error) {
      console.error('Error fetching subscription stats:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'trial':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <Ban className="h-4 w-4" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Revenue</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  KES {stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">All-time earnings</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">MRR</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  KES {stats.monthlyRecurringRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Monthly recurring</p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">ARPU</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  KES {stats.averageRevenuePerUser.toLocaleString()}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Per landlord/month</p>
              </div>
              <CreditCard className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Total Landlords</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {stats.totalLandlords}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {stats.activeSubscriptions} paying
                </p>
              </div>
              <Users className="h-10 w-10 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeSubscriptions}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trials</p>
                <p className="text-2xl font-bold text-foreground">{stats.trialSubscriptions}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-foreground">{stats.conversionRate.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Churn Rate</p>
                <p className="text-2xl font-bold text-foreground">{stats.churnRate.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution & Recent Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Breakdown of subscriptions by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.planDistribution).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span className="font-medium">{plan}</span>
                  </div>
                  <Badge variant="secondary">{count} landlords</Badge>
                </div>
              ))}
              {Object.keys(stats.planDistribution).length === 0 && (
                <p className="text-center text-muted-foreground py-8">No subscriptions yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Subscriptions</CardTitle>
            <CardDescription>Latest subscription activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {stats.recentSubscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(sub.status)}
                    <div>
                      <p className="font-medium text-sm">
                        {sub.landlord?.first_name} {sub.landlord?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{sub.plan?.display_name}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(sub.status)}>
                    {sub.status}
                  </Badge>
                </div>
              ))}
              {stats.recentSubscriptions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No subscriptions yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

