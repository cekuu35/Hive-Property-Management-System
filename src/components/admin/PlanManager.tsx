import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Package, Edit, Plus, ToggleLeft, ToggleRight } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price: number;
  billing_period: string;
  trial_days: number;
  features: any;
  limits: any;
  is_active: boolean;
  sort_order: number;
}

export default function PlanManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    price: 0,
    trial_days: 14,
    max_properties: 1,
    max_units: 5,
    max_tenants: 5,
    max_maintenance_requests: 10,
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load plans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      display_name: plan.display_name,
      description: plan.description || '',
      price: plan.price,
      trial_days: plan.trial_days,
      max_properties: plan.limits?.max_properties || 1,
      max_units: plan.limits?.max_units || 5,
      max_tenants: plan.limits?.max_tenants || 5,
      max_maintenance_requests: plan.limits?.max_maintenance_requests || 10,
      is_active: plan.is_active,
      sort_order: plan.sort_order
    });
    setShowEditModal(true);
  };

  const handleSavePlan = async () => {
    try {
      if (!editingPlan) return;

      const updateData = {
        display_name: formData.display_name,
        description: formData.description,
        price: formData.price,
        trial_days: formData.trial_days,
        limits: {
          max_properties: formData.max_properties,
          max_units: formData.max_units,
          max_tenants: formData.max_tenants,
          max_maintenance_requests: formData.max_maintenance_requests
        },
        is_active: formData.is_active,
        sort_order: formData.sort_order,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseAdmin
        .from('subscription_plans')
        .update(updateData)
        .eq('id', editingPlan.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Plan updated successfully'
      });

      setShowEditModal(false);
      fetchPlans();
    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update plan',
        variant: 'destructive'
      });
    }
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabaseAdmin
        .from('subscription_plans')
        .update({ is_active: !currentStatus })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Plan ${!currentStatus ? 'enabled' : 'disabled'}`
      });

      fetchPlans();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update plan status',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div>Loading plans...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Subscription Plans
        </CardTitle>
        <CardDescription>
          Manage pricing, limits, and features for each plan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg">{plan.display_name}</CardTitle>
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-primary">
                  KES {plan.price.toLocaleString()}
                  <span className="text-sm text-muted-foreground font-normal">/month</span>
                </div>
                {plan.trial_days > 0 && (
                  <p className="text-sm text-muted-foreground">{plan.trial_days}-day free trial</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{plan.description}</p>
                  
                  <div className="border-t pt-3 space-y-1">
                    <p className="font-medium mb-2">Limits:</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Properties:</span>
                        <span className="font-medium">
                          {plan.limits?.max_properties === -1 ? 'Unlimited' : plan.limits?.max_properties}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Units:</span>
                        <span className="font-medium">
                          {plan.limits?.max_units === -1 ? 'Unlimited' : plan.limits?.max_units}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tenants:</span>
                        <span className="font-medium">
                          {plan.limits?.max_tenants === -1 ? 'Unlimited' : plan.limits?.max_tenants}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPlan(plan)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                  >
                    {plan.is_active ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>

      {/* Edit Plan Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan: {editingPlan?.display_name}</DialogTitle>
            <DialogDescription>
              Update pricing, limits, and features for this plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Display Name</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Price (KES/month)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <div>
              <Label>Trial Days</Label>
              <Input
                type="number"
                value={formData.trial_days}
                onChange={(e) => setFormData({...formData, trial_days: parseInt(e.target.value)})}
              />
            </div>

            {/* Limits */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Plan Limits</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Use -1 for unlimited. Set 0 to disable feature.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Max Properties</Label>
                  <Input
                    type="number"
                    value={formData.max_properties}
                    onChange={(e) => setFormData({...formData, max_properties: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Max Units</Label>
                  <Input
                    type="number"
                    value={formData.max_units}
                    onChange={(e) => setFormData({...formData, max_units: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Max Tenants</Label>
                  <Input
                    type="number"
                    value={formData.max_tenants}
                    onChange={(e) => setFormData({...formData, max_tenants: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Max Maintenance Requests</Label>
                  <Input
                    type="number"
                    value={formData.max_maintenance_requests}
                    onChange={(e) => setFormData({...formData, max_maintenance_requests: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Status & Order */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label>Plan is active</Label>
              </div>

              <div className="flex items-center gap-2">
                <Label>Sort Order:</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                  className="w-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePlan}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

