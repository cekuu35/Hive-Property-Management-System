import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Gift,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SubscriptionStatusCard = () => {
  const navigate = useNavigate();
  const { status, loading, refreshSubscription } = useSubscription();
  const [startingTrial, setStartingTrial] = React.useState(false);
  const [starterPlanLimits, setStarterPlanLimits] = React.useState<any>(null);

  // Fetch Starter plan limits on mount
  React.useEffect(() => {
    const fetchStarterPlanLimits = async () => {
      const { data: starterPlan, error } = await supabase
        .from('subscription_plans')
        .select('limits')
        .eq('name', 'starter')
        .single();

      if (!error && starterPlan) {
        setStarterPlanLimits(starterPlan.limits);
      }
    };

    fetchStarterPlanLimits();
  }, []);

  const handleStartFreeTrial = async () => {
    setStartingTrial(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please login to start your free trial');
        return;
      }

      // Ensure user has a profile (required for foreign key constraint)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile not found:', profileError);
        toast.error('Unable to start trial. Please complete your profile setup first.');
        return;
      }

      // Only landlords can have subscriptions
      if (profile.role !== 'landlord') {
        toast.error('Only landlord accounts can subscribe to plans.');
        return;
      }

      // Get the Starter plan for the trial
      const { data: starterPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'starter')
        .single();

      if (planError || !starterPlan) {
        console.error('Error fetching starter plan:', planError);
        toast.error('Unable to start trial. Please try again.');
        return;
      }

      // Check if user already has a subscription
      const { data: existingSub } = await supabase
        .from('landlord_subscriptions')
        .select('id')
        .eq('landlord_id', user.id)
        .single();

      if (existingSub) {
        toast.error('You already have a subscription');
        return;
      }

      // Create 60-day free trial with Starter plan
      const trialDays = 60;
      const { error: insertError } = await supabase
        .from('landlord_subscriptions')
        .insert({
          landlord_id: profile.id,
          plan_id: starterPlan.id,
          status: 'trial',
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
        });

      if (insertError) {
        console.error('Error creating trial:', insertError);
        toast.error('Failed to start trial. Please try again.');
        return;
      }

      toast.success('🎉 60-Day Free Trial Started!', {
        description: 'You can now access all features. Start building your property portfolio!'
      });

      // Refresh subscription status
      refreshSubscription();
      
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error('Failed to start trial. Please try again.');
    } finally {
      setStartingTrial(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  // If no active subscription
  if (!status.hasActiveSubscription) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="h-5 w-5" />
            No Active Subscription
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-400">
            Start with a 60-day free trial or choose a paid plan to continue using Hive Property Management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleStartFreeTrial}
              disabled={startingTrial}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {startingTrial ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Trial...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Start 60-Day Free Trial
                </>
              )}
            </Button>
            <Button 
              onClick={() => navigate('/landlord/plans-billing')}
              variant="outline"
              className="flex-1 border-red-300 hover:bg-red-100"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View All Plans
            </Button>
          </div>
          <p className="text-xs text-red-600 dark:text-red-300 text-center">
            {starterPlanLimits ? (
              <>✨ 60-day trial includes: {starterPlanLimits.max_properties} {starterPlanLimits.max_properties === 1 ? 'property' : 'properties'}, {starterPlanLimits.max_units} units, {starterPlanLimits.max_tenants} tenants (Starter Plan) - No credit card required!</>
            ) : (
              <>✨ 60-day free trial with Starter Plan - No credit card required!</>
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (status.isTrial) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200';
    if (status.subscriptionStatus === 'active') return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200';
  };

  const getStatusIcon = () => {
    if (status.isTrial) return <Clock className="h-4 w-4" />;
    if (status.subscriptionStatus === 'active') return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <Card className={`${status.isTrial ? 'border-blue-200 dark:border-blue-800' : 'border-green-200 dark:border-green-800'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className={`h-4 w-4 ${status.isTrial ? 'text-blue-600' : 'text-green-600'}`} />
            {status.planDisplayName} Plan
          </CardTitle>
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-1 text-xs">{status.isTrial ? 'Trial' : 'Active'}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Days Remaining - Compact */}
        {status.daysRemaining > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className={`h-4 w-4 ${status.daysRemaining <= 3 ? 'text-red-600' : status.isTrial ? 'text-blue-600' : 'text-green-600'}`} />
              <span className={`text-sm ${status.daysRemaining <= 3 ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'}`}>
                {status.daysRemaining <= 3 ? 'Expiring Soon' : status.isTrial ? 'Trial ends in' : 'Renews in'}
              </span>
            </div>
            <span className={`text-lg font-bold ${status.daysRemaining <= 3 ? 'text-red-700 dark:text-red-300' : status.isTrial ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'}`}>
              {status.daysRemaining} {status.daysRemaining === 1 ? 'day' : 'days'}
            </span>
          </div>
        )}

        {/* Action Button - Compact */}
        <Button 
          onClick={() => navigate('/landlord/plans-billing')}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
};

