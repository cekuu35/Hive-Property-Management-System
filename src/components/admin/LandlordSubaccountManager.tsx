import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface Landlord {
  id: string;
  name: string;
  email: string;
  subaccount_code: string;
  profile_id: string | null;
}

export default function LandlordSubaccountManager() {
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLandlords();
  }, []);

  const fetchLandlords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin
        .from('landlords')
        .select('id, name, email, subaccount_code, profile_id')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching landlords:', error);
        console.log('Error details:', error);
        toast({
          title: "Error",
          description: "Failed to fetch landlords",
          variant: "destructive",
        });
        return;
      }

      console.log('🔍 LandlordSubaccountManager Debug:');
      console.log('Landlords data fetched:', data);
      console.log('Landlords count:', data?.length || 0);
      
      setLandlords(data || []);
    } catch (error) {
      console.error('Error fetching landlords:', error);
      toast({
        title: "Error",
        description: "Failed to fetch landlords",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubaccountChange = (landlordId: string, value: string) => {
    setUpdates(prev => ({
      ...prev,
      [landlordId]: value
    }));
  };

  const saveUpdates = async () => {
    try {
      setSaving(true);
      const updatePromises = Object.entries(updates).map(([landlordId, subaccountCode]) =>
        supabaseAdmin
          .from('landlords')
          .update({ subaccount_code: subaccountCode })
          .eq('id', landlordId)
      );

      const results = await Promise.all(updatePromises);
      
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Some updates failed:', errors);
        toast({
          title: "Partial Success",
          description: `Updated ${results.length - errors.length} landlords, ${errors.length} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "All subaccount codes updated successfully!",
        });
        setUpdates({});
        fetchLandlords();
      }
    } catch (error) {
      console.error('Error saving updates:', error);
      toast({
        title: "Error",
        description: "Failed to save updates",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isSubaccountValid = (code: string) => {
    // Basic validation for Paystack subaccount codes
    return code.startsWith('ACCT_') && code.length >= 10;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading landlords...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Landlord Subaccount Management</h2>
            <p className="text-muted-foreground">
              Update Paystack subaccount codes for split payment functionality
            </p>
          </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchLandlords}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={saveUpdates}
            disabled={saving || Object.keys(updates).length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {landlords.map((landlord) => {
          const currentValue = updates[landlord.id] ?? landlord.subaccount_code;
          const hasChanges = updates[landlord.id] !== undefined;
          const isValid = isSubaccountValid(currentValue);

          return (
        <Card key={landlord.id} className={hasChanges ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-foreground">{landlord.name}</CardTitle>
                <CardDescription>{landlord.email}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Badge variant="outline" className="text-blue-600 dark:text-blue-400">
                    Modified
                  </Badge>
                )}
                {isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
          </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Paystack Subaccount Code
                  </label>
                  <Input
                    value={currentValue}
                    onChange={(e) => handleSubaccountChange(landlord.id, e.target.value)}
                    placeholder="ACCT_1234567890abcdef"
                    className={!isValid && currentValue ? 'border-red-300 dark:border-red-600' : ''}
                  />
                  {!isValid && currentValue && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Subaccount code should start with "ACCT_" and be at least 10 characters
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Get this code from your Paystack dashboard under Subaccounts
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {Object.keys(updates).length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  {Object.keys(updates).length} landlord{Object.keys(updates).length > 1 ? 's' : ''} modified
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Click "Save Changes" to update the subaccount codes
                </p>
              </div>
              <Button
                onClick={saveUpdates}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>How Split Payments Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            When a tenant pays rent, the payment will be automatically split:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Payment goes to the landlord's Paystack subaccount</li>
            <li>• Landlord receives their share of the payment</li>
            <li>• Platform fee can be automatically deducted</li>
            <li>• All transactions are logged with the correct subaccount code</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
