import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Users,
  Search,
  Edit,
  Ban,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Calendar,
  Building,
  Home,
  TrendingUp
} from 'lucide-react';

interface LandlordSubscription {
  id: string;
  landlord_id: string;
  plan_id: string;
  status: string;
  trial_start_date: string | null;
  trial_end_date: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
  landlord: {
    first_name: string;
    last_name: string;
    email: string;
  };
  plan: {
    display_name: string;
    price: number;
    limits: any;
  };
}

interface SubscriptionUsage {
  properties: number;
  units: number;
  tenants: number;
}

export default function LandlordSubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<LandlordSubscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<LandlordSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<LandlordSubscription | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [usage, setUsage] = useState<SubscriptionUsage>({ properties: 0, units: 0, tenants: 0 });
  const [plans, setPlans] = useState<any[]>([]);
  const { toast } = useToast();

  // Edit form state
  const [editForm, setEditForm] = useState({
    plan_id: '',
    status: '',
    trial_end_date: '',
    current_period_end: '',
    notes: ''
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, []);

  useEffect(() => {
    filterSubscriptions();
  }, [subscriptions, searchTerm, statusFilter]);

  const fetchPlans = async () => {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (!error && data) {
      setPlans(data);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabaseAdmin
        .from('landlord_subscriptions')
        .select(`
          *,
          landlord:profiles!landlord_id(first_name, last_name, email),
          plan:subscription_plans(display_name, price, limits)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load subscriptions',
          variant: 'destructive'
        });
        return;
      }

      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageForLandlord = async (landlordId: string) => {
    // Fetch properties
    const { data: properties } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('landlord_id', landlordId);

    // Fetch units
    const { data: units } = await supabaseAdmin
      .from('units')
      .select('id, property_id')
      .in('property_id', properties?.map(p => p.id) || []);

    // Fetch tenants
    const { data: tenants } = await supabaseAdmin
      .from('leases')
      .select('id, tenant_id')
      .eq('status', 'active')
      .in('unit_id', units?.map(u => u.id) || []);

    setUsage({
      properties: properties?.length || 0,
      units: units?.length || 0,
      tenants: tenants?.length || 0
    });
  };

  const filterSubscriptions = () => {
    let filtered = subscriptions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.landlord?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.landlord?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.landlord?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    setFilteredSubscriptions(filtered);
  };

  const handleEditSubscription = async (subscription: LandlordSubscription) => {
    setSelectedSub(subscription);
    setEditForm({
      plan_id: subscription.plan_id,
      status: subscription.status,
      trial_end_date: subscription.trial_end_date || '',
      current_period_end: subscription.current_period_end,
      notes: ''
    });
    await fetchUsageForLandlord(subscription.landlord_id);
    setShowEditModal(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedSub) return;

    try {
      const { error } = await supabaseAdmin
        .from('landlord_subscriptions')
        .update({
          plan_id: editForm.plan_id,
          status: editForm.status,
          trial_end_date: editForm.trial_end_date || null,
          current_period_end: editForm.current_period_end,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSub.id);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabaseAdmin.auth.getUser();
      if (user) {
        await supabaseAdmin.from('admin_actions').insert({
          admin_id: user.id,
          action_type: 'subscription_update',
          target_type: 'subscription',
          target_id: selectedSub.id,
          description: `Updated subscription for ${selectedSub.landlord.first_name} ${selectedSub.landlord.last_name}`,
          metadata: { notes: editForm.notes, changes: editForm }
        });
      }

      toast({
        title: 'Success',
        description: 'Subscription updated successfully'
      });

      setShowEditModal(false);
      fetchSubscriptions();
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update subscription',
        variant: 'destructive'
      });
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      const { error } = await supabaseAdmin
        .from('landlord_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_at_period_end: false
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Subscription cancelled'
      });

      fetchSubscriptions();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive'
      });
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading subscriptions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Landlord Subscriptions
        </CardTitle>
        <CardDescription>
          Manage all landlord subscriptions and plans
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subscriptions Table */}
        <div className="space-y-4">
          {filteredSubscriptions.map((sub) => {
            const daysRemaining = getDaysRemaining(
              sub.status === 'trial' ? (sub.trial_end_date || sub.current_period_end) : sub.current_period_end
            );

            return (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getStatusIcon(sub.status)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">
                        {sub.landlord?.first_name} {sub.landlord?.last_name}
                      </p>
                      <Badge className={getStatusColor(sub.status)}>
                        {sub.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{sub.landlord?.email}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{sub.plan?.display_name} - KES {sub.plan?.price}/mo</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSubscription(sub)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {sub.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelSubscription(sub.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredSubscriptions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subscriptions found</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Edit Subscription Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Manage subscription for {selectedSub?.landlord?.first_name} {selectedSub?.landlord?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Usage */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <Building className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{usage.properties}</p>
                <p className="text-xs text-muted-foreground">Properties</p>
              </div>
              <div className="text-center">
                <Home className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{usage.units}</p>
                <p className="text-xs text-muted-foreground">Units</p>
              </div>
              <div className="text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold">{usage.tenants}</p>
                <p className="text-xs text-muted-foreground">Tenants</p>
              </div>
            </div>

            {/* Edit Form */}
            <div className="space-y-4">
              <div>
                <Label>Plan</Label>
                <Select value={editForm.plan_id} onValueChange={(value) => setEditForm({...editForm, plan_id: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.display_name} - KES {plan.price}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm({...editForm, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editForm.status === 'trial' && (
                <div>
                  <Label>Trial End Date</Label>
                  <Input
                    type="date"
                    value={editForm.trial_end_date}
                    onChange={(e) => setEditForm({...editForm, trial_end_date: e.target.value})}
                  />
                </div>
              )}

              <div>
                <Label>Current Period End</Label>
                <Input
                  type="date"
                  value={editForm.current_period_end?.split('T')[0]}
                  onChange={(e) => setEditForm({...editForm, current_period_end: e.target.value})}
                />
              </div>

              <div>
                <Label>Admin Notes (for audit log)</Label>
                <Textarea
                  placeholder="Reason for change..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSubscription}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

