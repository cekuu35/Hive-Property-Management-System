import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCard, 
  Check, 
  TrendingUp,
  Calendar,
  Receipt,
  AlertCircle,
  Smartphone,
  Loader2,
  Building,
  Home,
  Users,
  Wrench,
  Star,
  Zap
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price: number;
  trial_days: number;
  limits: any;
  features: any;
  is_active: boolean;
  sort_order: number;
}

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  paid_at: string;
  period_start: string;
  period_end: string;
  transaction_reference: string;
}

export default function PlansBilling() {
  const { status, limits, usage, loading: subLoading, refreshSubscription } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchPaymentHistory();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription plans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const handleUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !phoneNumber || !user) return;

    setProcessing(true);
    try {
      // Get user's profile to use profile.id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Profile not found. Please complete your profile setup.');
      }

      // Format phone number
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
      }
      if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
      }

      // Validate phone number
      if (formattedPhone.length !== 12) {
        throw new Error('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      }

      console.log('🚀 [Subscription Payment] Initiating Daraja payment...', {
        planId: selectedPlan.id,
        phoneNumber: formattedPhone,
        landlordId: profile.id
      });

      // Call subscription payment edge function using fetch directly to get better error handling
      // Get auth token from current session
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kozhlejudselgtmohdfm.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/subscription-payment-daraja`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || supabaseKey}`,
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          phoneNumber: formattedPhone,
          landlordId: profile.id
        })
      });

      // Get response body content (can only read once)
      const contentType = response.headers.get('content-type') || '';
      let responseData: any = null;
      let errorMessage = `Payment failed: ${response.status} ${response.statusText}`;
      
      try {
        if (contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          const text = await response.text();
          // Try to parse as JSON even if content-type doesn't say so
          try {
            responseData = JSON.parse(text);
          } catch {
            responseData = text;
          }
        }
      } catch (parseError) {
        console.error('❌ [Subscription Payment] Failed to parse response:', parseError);
        // Continue with default error message
      }

      // Handle non-2xx responses
      if (!response.ok) {
        // Log full error details for debugging
        console.group('❌ [Subscription Payment] Error Details');
        console.error('Status:', response.status, response.statusText);
        console.error('Content-Type:', contentType);
        console.error('Response Data:', responseData);
        console.error('Full Response:', response);
        console.groupEnd();
        
        // Extract error message from various possible fields
        if (responseData) {
          if (typeof responseData === 'string') {
            errorMessage = responseData;
          } else if (typeof responseData === 'object') {
            errorMessage = responseData?.error || 
                          responseData?.message || 
                          responseData?.error_description ||
                          responseData?.ResultDesc ||
                          (responseData?.details ? JSON.stringify(responseData.details) : null) ||
                          JSON.stringify(responseData) ||
                          errorMessage;
          }
        }
        
        // Log the extracted error message
        console.error('❌ [Subscription Payment] Extracted Error Message:', errorMessage);
        
        throw new Error(errorMessage);
      }

      // Parse successful response
      const data = responseData;

      // Check if response indicates failure
      if (!data || !data.success) {
        const errorMsg = data?.error || data?.message || 'Failed to process payment';
        throw new Error(errorMsg);
      }

      console.log('✅ [Subscription Payment] STK Push sent:', data.data);

      toast({
        title: 'Payment Request Sent! 📱',
        description: 'Please check your phone and enter your M-Pesa PIN to complete the payment.'
      });

      setShowUpgradeModal(false);
      setPhoneNumber('');
      
      // Refresh subscription after a delay
      setTimeout(() => {
        refreshSubscription();
        fetchPaymentHistory();
      }, 5000);
      
    } catch (error: any) {
      console.error('❌ [Subscription Payment] Error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getPlanIcon = (planName: string) => {
    if (planName === 'free') return <Star className="h-6 w-6" />;
    if (planName === 'enterprise') return <Zap className="h-6 w-6" />;
    return <CreditCard className="h-6 w-6" />;
  };

  const isCurrentPlan = (planName: string) => {
    return status.planName === planName;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading || subLoading) {
    return (
      <DashboardLayout userRole="landlord">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="landlord">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plans & Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and view billing history
        </p>
      </div>

      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subscription">My Subscription</TabsTrigger>
          <TabsTrigger value="plans">Available Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        {/* Current Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Subscription
              </CardTitle>
              <CardDescription>
                Your active plan and usage details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {status.hasActiveSubscription ? (
                <>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h3 className="text-2xl font-bold">{status.planDisplayName}</h3>
                      <p className="text-muted-foreground">
                        {status.isTrial ? 'Free Trial' : 'Paid Subscription'}
                      </p>
                    </div>
                    <Badge className={status.isTrial ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                      {status.subscriptionStatus}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">
                          {status.isTrial ? 'Trial Ends' : 'Next Billing'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">
                        {status.daysRemaining} days
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {status.isTrial && status.trialEndDate ? formatDate(status.trialEndDate) : 
                         status.currentPeriodEnd ? formatDate(status.currentPeriodEnd) : 'N/A'}
                      </p>
                    </div>

                    <div className="col-span-full p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <span className="font-semibold">Resource Usage</span>
                      </div>
                      <div className="space-y-4">
                        {/* Properties Usage */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Properties</span>
                            </div>
                            <span className={usage.properties >= limits.max_properties && limits.max_properties !== -1 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                              {usage.properties} of {limits.max_properties === -1 ? '∞' : limits.max_properties}
                            </span>
                          </div>
                          {limits.max_properties !== -1 && (
                            <Progress 
                              value={Math.min(100, (usage.properties / limits.max_properties) * 100)} 
                              className="h-2"
                            />
                          )}
                        </div>

                        {/* Units Usage */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-green-600" />
                              <span className="font-medium">Units/Apartments</span>
                            </div>
                            <span className={usage.units >= limits.max_units && limits.max_units !== -1 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                              {usage.units} of {limits.max_units === -1 ? '∞' : limits.max_units}
                            </span>
                          </div>
                          {limits.max_units !== -1 && (
                            <Progress 
                              value={Math.min(100, (usage.units / limits.max_units) * 100)} 
                              className="h-2"
                            />
                          )}
                        </div>

                        {/* Tenants Usage */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-600" />
                              <span className="font-medium">Active Tenants</span>
                            </div>
                            <span className={usage.tenants >= limits.max_tenants && limits.max_tenants !== -1 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                              {usage.tenants} of {limits.max_tenants === -1 ? '∞' : limits.max_tenants}
                            </span>
                          </div>
                          {limits.max_tenants !== -1 && (
                            <Progress 
                              value={Math.min(100, (usage.tenants / limits.max_tenants) * 100)} 
                              className="h-2"
                            />
                          )}
                        </div>

                        {/* Maintenance Requests */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-orange-600" />
                              <span className="font-medium">Maintenance (30 days)</span>
                            </div>
                            <span className={usage.maintenanceRequests >= limits.max_maintenance_requests && limits.max_maintenance_requests !== -1 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                              {usage.maintenanceRequests} of {limits.max_maintenance_requests === -1 ? '∞' : limits.max_maintenance_requests}
                            </span>
                          </div>
                          {limits.max_maintenance_requests !== -1 && (
                            <Progress 
                              value={Math.min(100, (usage.maintenanceRequests / limits.max_maintenance_requests) * 100)} 
                              className="h-2"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {status.isTrial && status.daysRemaining <= 7 && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-orange-900 dark:text-orange-100">
                            Trial Ending Soon
                          </p>
                          <p className="text-sm text-orange-700 dark:text-orange-200">
                            Your free trial ends in {status.daysRemaining} days. Upgrade now to continue using all features.
                          </p>
                          <Button 
                            size="sm" 
                            className="mt-2 bg-orange-600 hover:bg-orange-700"
                            onClick={() => {
                              const tabElement = document.querySelector('[value="plans"]') as HTMLElement;
                              tabElement?.click();
                            }}
                          >
                            View Plans
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Active Subscription</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a plan to continue using Hive Property Management
                  </p>
                  <Button onClick={() => {
                    const tabElement = document.querySelector('[value="plans"]') as HTMLElement;
                    tabElement?.click();
                  }}>
                    View Available Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Available Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative ${isCurrentPlan(plan.name) ? 'border-2 border-primary' : ''} ${plan.name === 'professional' ? 'border-2 border-purple-500' : ''}`}
              >
                {plan.name === 'professional' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-600">Most Popular</Badge>
                  </div>
                )}
                {isCurrentPlan(plan.name) && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-600">Current Plan</Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {getPlanIcon(plan.name)}
                    </div>
                  </div>
                  <CardTitle>{plan.display_name}</CardTitle>
                  <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                  <div className="pt-4">
                    <div className="text-4xl font-bold">
                      KES {plan.price.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">per month</p>
                    {plan.trial_days > 0 && !isCurrentPlan(plan.name) && (
                      <p className="text-sm text-green-600 mt-1">
                        {plan.trial_days}-day free trial
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.limits.max_properties === -1 ? 'Unlimited' : plan.limits.max_properties} {plan.limits.max_properties === 1 ? 'Property' : 'Properties'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.limits.max_units === -1 ? 'Unlimited' : plan.limits.max_units} {plan.limits.max_units === 1 ? 'Unit' : 'Units'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.limits.max_tenants === -1 ? 'Unlimited' : plan.limits.max_tenants} {plan.limits.max_tenants === 1 ? 'Tenant' : 'Tenants'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Payment Processing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Maintenance Tracking</span>
                    </div>
                    {(plan.name === 'professional' || plan.name === 'enterprise') && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Advanced Reports</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Bulk Operations</span>
                        </div>
                      </>
                    )}
                    {plan.name === 'enterprise' && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>API Access</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Priority Support</span>
                        </div>
                      </>
                    )}
                  </div>

                  <Button 
                    className="w-full"
                    variant={isCurrentPlan(plan.name) ? 'outline' : 'default'}
                    disabled={isCurrentPlan(plan.name)}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {isCurrentPlan(plan.name) ? 'Current Plan' : plan.price === 0 ? 'Start Free Trial' : 'Upgrade Now'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                View all your subscription payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div 
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Subscription Payment</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                          </p>
                          {payment.transaction_reference && (
                            <p className="text-xs text-muted-foreground font-mono">
                              Ref: {payment.transaction_reference}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          KES {payment.amount.toLocaleString()}
                        </p>
                        <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                        {payment.paid_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(payment.paid_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment history yet</p>
                  <p className="text-sm">Payments will appear here once you subscribe to a paid plan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade/Subscribe Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedPlan?.display_name}</DialogTitle>
            <DialogDescription>
              Complete payment via M-Pesa to activate your subscription
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Plan:</span>
                <span>{selectedPlan?.display_name}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Amount:</span>
                <span className="text-2xl font-bold">
                  KES {selectedPlan?.price.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Billing:</span>
                <span>Monthly</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">M-Pesa Phone Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678 or 254712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="pl-10"
                  disabled={processing}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your M-Pesa registered phone number
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubscribe}
                className="flex-1"
                disabled={!phoneNumber || processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
}

