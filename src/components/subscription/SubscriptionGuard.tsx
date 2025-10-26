import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Lock, Check, Gift, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  feature?: 'properties' | 'units' | 'tenants' | 'maintenance';
  limitKey?: 'max_properties' | 'max_units' | 'max_tenants' | 'max_maintenance_requests';
  fallback?: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  feature,
  limitKey,
  fallback
}) => {
  const navigate = useNavigate();
  const { status, checkLimit, loading, refreshSubscription } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [startingTrial, setStartingTrial] = React.useState(false);
  const [starterPlanLimits, setStarterPlanLimits] = React.useState<any>(null);
  const [limitInfo, setLimitInfo] = React.useState<{
    canAdd: boolean;
    current: number;
    limit: number;
    remaining: number;
  } | null>(null);

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

  React.useEffect(() => {
    if (limitKey && !loading) {
      const info = checkLimit(limitKey);
      setLimitInfo(info);
    }
  }, [limitKey, loading, checkLimit]);

  const handleStartFreeTrial = async () => {
    setStartingTrial(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please login to start your free trial');
        return;
      }

      // Get user's profile first
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
        .eq('landlord_id', profile.id)
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

  // No active subscription
  if (!loading && !status.hasActiveSubscription) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Subscription Required
              </h3>
              <p className="text-red-700 dark:text-red-200 mb-4">
                You need an active subscription to access this feature. Start with a 60-day free trial or choose a paid plan.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleStartFreeTrial}
                  disabled={startingTrial}
                  className="bg-green-600 hover:bg-green-700 text-white"
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
                  className="border-red-300 hover:bg-red-100"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View All Plans
                </Button>
              </div>
              <p className="text-xs text-red-600 dark:text-red-300 mt-3">
                {starterPlanLimits ? (
                  <>✨ 60-day trial includes: {starterPlanLimits.max_properties} {starterPlanLimits.max_properties === 1 ? 'property' : 'properties'}, {starterPlanLimits.max_units} units, {starterPlanLimits.max_tenants} tenants (Starter Plan) - No credit card required!</>
                ) : (
                  <>✨ 60-day free trial with Starter Plan - No credit card required!</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Limit reached
  if (limitKey && limitInfo && !limitInfo.canAdd && !limitInfo.isUnlimited) {
    return (
      <>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  {feature ? `${feature.charAt(0).toUpperCase() + feature.slice(1)} Limit Reached` : 'Limit Reached'}
                </h3>
                <p className="text-orange-700 dark:text-orange-200 mb-2">
                  You've reached your plan limit of <strong>{limitInfo.limit}</strong> {feature || 'items'}.
                  Currently using: <strong>{limitInfo.current}</strong>
                </p>
                <p className="text-orange-700 dark:text-orange-200 mb-4">
                  Upgrade your plan to add more {feature || 'items'} and unlock additional features.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                  {fallback && (
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard')}
                    >
                      Go to Dashboard
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <UpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature={feature}
          currentPlan={status.planDisplayName}
        />
      </>
    );
  }

  // All good - render children
  return <>{children}</>;
};

// Upgrade Modal Component
interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
  currentPlan?: string | null;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ open, onClose, feature, currentPlan }) => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Starter',
      price: 2999,
      properties: 2,
      units: 10,
      tenants: 10,
      features: ['Payment Processing', 'Utility Billing', 'Email Notifications']
    },
    {
      name: 'Professional',
      price: 5999,
      properties: 5,
      units: 50,
      tenants: 50,
      features: ['Advanced Reports', 'Bulk Operations', 'SMS Notifications', 'Priority Support'],
      popular: true
    },
    {
      name: 'Enterprise',
      price: 14999,
      properties: -1,
      units: -1,
      tenants: -1,
      features: ['Unlimited Everything', 'API Access', 'White Label', 'Dedicated Support']
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            {feature && `Add more ${feature} by upgrading to a higher tier plan`}
            {currentPlan && ` (Currently on ${currentPlan})`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.popular ? 'border-2 border-purple-500 relative' : ''}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-purple-600">Most Popular</Badge>
                </div>
              )}
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-1">
                    KES {plan.price.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{plan.properties === -1 ? 'Unlimited' : plan.properties} Properties</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{plan.units === -1 ? 'Unlimited' : plan.units} Units</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{plan.tenants === -1 ? 'Unlimited' : plan.tenants} Tenants</span>
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => {
                    navigate('/landlord/plans-billing');
                    onClose();
                  }}
                >
                  Select {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={onClose}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to check if action is allowed
export const useCanAddResource = (limitKey: 'max_properties' | 'max_units' | 'max_tenants' | 'max_maintenance_requests') => {
  const { checkLimit, status } = useSubscription();
  
  const check = React.useCallback(() => {
    if (!status.hasActiveSubscription) {
      return {
        allowed: false,
        reason: 'no_subscription',
        message: 'You need an active subscription to perform this action'
      };
    }

    const limitInfo = checkLimit(limitKey);
    
    if (!limitInfo.canAdd && !limitInfo.isUnlimited) {
      return {
        allowed: false,
        reason: 'limit_reached',
        message: `You've reached your plan limit of ${limitInfo.limit}`,
        current: limitInfo.current,
        limit: limitInfo.limit
      };
    }

    return {
      allowed: true,
      reason: null,
      message: null
    };
  }, [checkLimit, limitKey, status.hasActiveSubscription]);

  return check;
};

