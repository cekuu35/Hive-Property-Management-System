import React, { useState, useEffect } from 'react';
import { supabaseAdmin } from '@/integrations/supabase/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Save, RefreshCw, CheckCircle, AlertCircle, Smartphone, Building } from 'lucide-react';

interface Landlord {
  id: string;
  name: string;
  email: string;
  paybill_number: string;
  account_reference: string;
  profile_id: string | null;
}

interface MpesaUpdates {
  paybill_number: string;
  account_reference: string;
}

export default function LandlordMpesaManager() {
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState<Record<string, MpesaUpdates>>({});

  useEffect(() => {
    fetchLandlords();
  }, []);

  const fetchLandlords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin
        .from('landlords')
        .select('id, name, email, paybill_number, account_reference, profile_id')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching landlords:', error);
        toast({
          title: "Error",
          description: "Failed to fetch landlords",
          variant: "destructive",
        });
        return;
      }

      console.log('🔍 LandlordMpesaManager Debug:');
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

  const handleMpesaChange = (landlordId: string, field: keyof MpesaUpdates, value: string) => {
    setUpdates(prev => ({
      ...prev,
      [landlordId]: {
        ...prev[landlordId],
        [field]: value
      }
    }));
  };

  const saveUpdates = async () => {
    try {
      setSaving(true);
      const updatePromises = Object.entries(updates).map(([landlordId, mpesaData]) =>
        supabaseAdmin
          .from('landlords')
          .update({ 
            paybill_number: mpesaData.paybill_number,
            account_reference: mpesaData.account_reference
          })
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
          description: "All M-Pesa configurations updated successfully!",
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

  const isPaybillValid = (paybill: string) => {
    // M-Pesa paybill numbers are typically 5-7 digits
    return /^\d{5,7}$/.test(paybill);
  };

  const isAccountReferenceValid = (accountRef: string) => {
    // Account reference should be 1-20 characters, alphanumeric
    return /^[A-Za-z0-9_-]{1,20}$/.test(accountRef);
  };

  const getValidationStatus = (landlordId: string) => {
    const currentData = updates[landlordId];
    if (!currentData) return { isValid: true, errors: [] };

    const errors = [];
    if (currentData.paybill_number && !isPaybillValid(currentData.paybill_number)) {
      errors.push('Invalid paybill number format');
    }
    if (currentData.account_reference && !isAccountReferenceValid(currentData.account_reference)) {
      errors.push('Invalid account reference format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
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
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            Landlord M-Pesa Configuration
          </h2>
          <p className="text-muted-foreground">
            Configure M-Pesa paybill numbers and account references for STK Push payments
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
          const currentPaybill = updates[landlord.id]?.paybill_number ?? landlord.paybill_number;
          const currentAccountRef = updates[landlord.id]?.account_reference ?? landlord.account_reference;
          const hasChanges = updates[landlord.id] !== undefined;
          const validation = getValidationStatus(landlord.id);

          return (
            <Card key={landlord.id} className={hasChanges ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      {landlord.name}
                    </CardTitle>
                    <CardDescription>{landlord.email}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <Badge variant="outline" className="text-blue-600 dark:text-blue-400">
                        Modified
                      </Badge>
                    )}
                    {validation.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`paybill-${landlord.id}`} className="text-sm font-medium text-foreground">
                      M-Pesa Paybill Number
                    </Label>
                    <Input
                      id={`paybill-${landlord.id}`}
                      value={currentPaybill}
                      onChange={(e) => handleMpesaChange(landlord.id, 'paybill_number', e.target.value)}
                      placeholder="174379"
                      className={!isPaybillValid(currentPaybill) && currentPaybill ? 'border-red-300 dark:border-red-600' : ''}
                    />
                    {!isPaybillValid(currentPaybill) && currentPaybill && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Paybill number should be 5-7 digits
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Get this from your M-Pesa Business account
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`account-${landlord.id}`} className="text-sm font-medium text-foreground">
                      Account Reference
                    </Label>
                    <Input
                      id={`account-${landlord.id}`}
                      value={currentAccountRef}
                      onChange={(e) => handleMpesaChange(landlord.id, 'account_reference', e.target.value)}
                      placeholder="RENT_PAYMENT"
                      className={!isAccountReferenceValid(currentAccountRef) && currentAccountRef ? 'border-red-300 dark:border-red-600' : ''}
                    />
                    {!isAccountReferenceValid(currentAccountRef) && currentAccountRef && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Account reference should be 1-20 characters, alphanumeric
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Used to identify payments in M-Pesa statements
                    </p>
                  </div>
                </div>

                {validation.errors.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Validation Errors:</p>
                    <ul className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
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
                  Click "Save Changes" to update the M-Pesa configurations
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
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            How M-Pesa STK Push Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              When a tenant pays rent or utility bills, the M-Pesa STK Push process works as follows:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 ml-4">
              <li>• <strong>STK Push Sent:</strong> Tenant receives a push notification on their phone</li>
              <li>• <strong>Payment Authorization:</strong> Tenant enters their M-Pesa PIN to authorize payment</li>
              <li>• <strong>Payment Processing:</strong> M-Pesa processes the payment to the landlord's paybill</li>
              <li>• <strong>Callback Notification:</strong> System receives confirmation and updates payment status</li>
              <li>• <strong>Account Reference:</strong> Payment appears in M-Pesa statements with the specified reference</li>
            </ul>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Configuration Requirements:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Paybill Number:</strong> 5-7 digit M-Pesa Business paybill number</li>
              <li>• <strong>Account Reference:</strong> 1-20 character identifier for payment tracking</li>
              <li>• <strong>Daraja API:</strong> Configured with valid consumer key and secret</li>
              <li>• <strong>Callback URL:</strong> Publicly accessible endpoint for payment confirmations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

