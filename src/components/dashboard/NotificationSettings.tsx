import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, Smartphone, Mail, MessageSquare, CheckCircle2, XCircle, Loader2, TestTube2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  rent_reminders: boolean;
  payment_confirmations: boolean;
  maintenance_updates: boolean;
  visitor_notifications: boolean;
  security_alerts: boolean;
  messages: boolean;
  lease_updates: boolean;
  application_updates: boolean;
}

export const NotificationSettings = () => {
  const { profile } = useAuth();
  const {
    supported,
    permission,
    isSubscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe,
    requestPermission,
    testNotification,
  } = usePushNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    rent_reminders: true,
    payment_confirmations: true,
    maintenance_updates: true,
    visitor_notifications: true,
    security_alerts: true,
    messages: true,
    lease_updates: true,
    application_updates: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchPreferences();
    }
  }, [profile]);

  const fetchPreferences = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          email_enabled: data.email_enabled,
          push_enabled: data.push_enabled,
          sms_enabled: data.sms_enabled,
          rent_reminders: data.rent_reminders,
          payment_confirmations: data.payment_confirmations,
          maintenance_updates: data.maintenance_updates,
          visitor_notifications: data.visitor_notifications,
          security_alerts: data.security_alerts,
          messages: data.messages,
          lease_updates: data.lease_updates,
          application_updates: data.application_updates,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!profile) return;

    try {
      setSaving(true);
      const newPreferences = { ...preferences, ...updates };

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          profile_id: profile.id,
          ...newPreferences,
        }, {
          onConflict: 'profile_id'
        });

      if (error) throw error;

      setPreferences(newPreferences);
      toast.success('Preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      if (permission === 'denied') {
        toast.error('Notifications are blocked. Please enable them in your browser settings.');
        return;
      }

      const success = await subscribe();
      if (success) {
        await savePreferences({ push_enabled: true });
      }
    } else {
      await unsubscribe();
      await savePreferences({ push_enabled: false });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Manage how you receive notifications and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Push Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Receive real-time notifications on this device
              </p>
            </div>

            {!supported && (
              <Alert>
                <AlertDescription className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Push notifications are not supported in this browser
                </AlertDescription>
              </Alert>
            )}

            {supported && permission === 'denied' && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Notifications are blocked. Please enable them in your browser settings.
                </AlertDescription>
              </Alert>
            )}

            {supported && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <Label htmlFor="push-enabled">Push Notifications</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isSubscribed ? 'Enabled on this device' : 'Not enabled'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSubscribed && (
                      <span className="text-xs flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    )}
                    <Switch
                      id="push-enabled"
                      checked={isSubscribed}
                      onCheckedChange={handlePushToggle}
                      disabled={pushLoading || !supported || permission === 'denied'}
                    />
                  </div>
                </div>

                {supported && permission === 'default' && !isSubscribed && (
                  <Button
                    onClick={requestPermission}
                    variant="outline"
                    className="w-full"
                    disabled={pushLoading}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Enable Push Notifications
                  </Button>
                )}

                {isSubscribed && (
                  <Button
                    onClick={testNotification}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <TestTube2 className="h-4 w-4 mr-2" />
                    Send Test Notification
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Email Notifications */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label htmlFor="email-enabled">Email Notifications</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => savePreferences({ email_enabled: checked })}
              disabled={saving}
            />
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Types</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="rent-reminders">Rent Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about upcoming rent payments
                  </p>
                </div>
                <Switch
                  id="rent-reminders"
                  checked={preferences.rent_reminders}
                  onCheckedChange={(checked) => savePreferences({ rent_reminders: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="payment-confirmations">Payment Confirmations</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive payment success/failure notifications
                  </p>
                </div>
                <Switch
                  id="payment-confirmations"
                  checked={preferences.payment_confirmations}
                  onCheckedChange={(checked) => savePreferences({ payment_confirmations: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenance-updates">Maintenance Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get updates on maintenance requests
                  </p>
                </div>
                <Switch
                  id="maintenance-updates"
                  checked={preferences.maintenance_updates}
                  onCheckedChange={(checked) => savePreferences({ maintenance_updates: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="visitor-notifications">Visitor Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerts for visitor requests and approvals
                  </p>
                </div>
                <Switch
                  id="visitor-notifications"
                  checked={preferences.visitor_notifications}
                  onCheckedChange={(checked) => savePreferences({ visitor_notifications: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="security-alerts">Security Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Important security and incident notifications
                  </p>
                </div>
                <Switch
                  id="security-alerts"
                  checked={preferences.security_alerts}
                  onCheckedChange={(checked) => savePreferences({ security_alerts: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="messages">Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    New message notifications
                  </p>
                </div>
                <Switch
                  id="messages"
                  checked={preferences.messages}
                  onCheckedChange={(checked) => savePreferences({ messages: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="lease-updates">Lease Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications about lease renewals and changes
                  </p>
                </div>
                <Switch
                  id="lease-updates"
                  checked={preferences.lease_updates}
                  onCheckedChange={(checked) => savePreferences({ lease_updates: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="application-updates">Application Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Status updates on unit applications
                  </p>
                </div>
                <Switch
                  id="application-updates"
                  checked={preferences.application_updates}
                  onCheckedChange={(checked) => savePreferences({ application_updates: checked })}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

