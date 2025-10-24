import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calculator, AlertCircle, Info, DollarSign, Percent } from 'lucide-react';

interface LateFeeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  unitNumber: string;
  currentConfig?: {
    late_fee_type: 'percentage' | 'flat' | 'none';
    late_fee_value: number;
    late_fee_max_percentage: number;
    late_fee_grace_period_days: number;
  };
  onSave?: () => void;
}

export const LateFeeConfigModal: React.FC<LateFeeConfigModalProps> = ({
  open,
  onOpenChange,
  unitId,
  unitNumber,
  currentConfig,
  onSave
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [feeType, setFeeType] = useState<'percentage' | 'flat' | 'none'>(
    currentConfig?.late_fee_type || 'percentage'
  );
  const [feeValue, setFeeValue] = useState<string>(
    currentConfig?.late_fee_value?.toString() || '2.00'
  );
  const [maxPercentage, setMaxPercentage] = useState<string>(
    currentConfig?.late_fee_max_percentage?.toString() || '10.00'
  );
  const [gracePeriod, setGracePeriod] = useState<string>(
    currentConfig?.late_fee_grace_period_days?.toString() || '0'
  );

  // Example rent for calculation preview
  const [exampleRent, setExampleRent] = useState<string>('25000');
  const [daysOverdue, setDaysOverdue] = useState<string>('5');

  useEffect(() => {
    if (currentConfig) {
      setFeeType(currentConfig.late_fee_type);
      setFeeValue(currentConfig.late_fee_value.toString());
      setMaxPercentage(currentConfig.late_fee_max_percentage.toString());
      setGracePeriod(currentConfig.late_fee_grace_period_days.toString());
    }
  }, [currentConfig]);

  const calculateExampleLateFee = (): number => {
    const rent = parseFloat(exampleRent) || 0;
    const value = parseFloat(feeValue) || 0;
    const maxPercent = parseFloat(maxPercentage) || 0;
    const days = parseInt(daysOverdue) || 0;
    const grace = parseInt(gracePeriod) || 0;
    const daysAfterGrace = Math.max(0, days - grace);

    if (feeType === 'none' || daysAfterGrace === 0) return 0;
    
    if (feeType === 'flat') {
      return value;
    }
    
    // Percentage
    const percentage = Math.min(value * daysAfterGrace, maxPercent);
    return Math.round((rent * percentage / 100) * 100) / 100;
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('units')
        .update({
          late_fee_type: feeType,
          late_fee_value: parseFloat(feeValue) || 0,
          late_fee_max_percentage: parseFloat(maxPercentage) || 0,
          late_fee_grace_period_days: parseInt(gracePeriod) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', unitId);

      if (error) throw error;

      toast({
        title: 'Late Fee Policy Updated',
        description: `Late fee settings for Unit ${unitNumber} have been saved successfully.`,
      });

      onSave?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving late fee config:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save late fee settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exampleLateFee = calculateExampleLateFee();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Late Fee Policy - Unit {unitNumber}
          </DialogTitle>
          <DialogDescription>
            Configure how late fees are calculated for this unit. These settings will be included in new lease contracts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Late Fee Type */}
          <div className="space-y-3">
            <Label>Late Fee Type</Label>
            <RadioGroup value={feeType} onValueChange={(value: any) => setFeeType(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="percentage" id="percentage" />
                <div className="flex-1">
                  <Label htmlFor="percentage" className="cursor-pointer font-medium">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Percentage (Per Day)
                    </div>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Charge a percentage of rent per day overdue (e.g., 2% per day, max 10%)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="flat" id="flat" />
                <div className="flex-1">
                  <Label htmlFor="flat" className="cursor-pointer font-medium">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Flat Fee (One-Time)
                    </div>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Charge a fixed amount once payment becomes overdue (e.g., KES 500)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="none" id="none" />
                <div className="flex-1">
                  <Label htmlFor="none" className="cursor-pointer font-medium">
                    No Late Fees
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Don't charge late fees for this unit
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Percentage Configuration */}
          {feeType === 'percentage' && (
            <div className="space-y-4 p-4 bg-accent/50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="feeValue">Percentage Per Day (%)</Label>
                  <Input
                    id="feeValue"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={feeValue}
                    onChange={(e) => setFeeValue(e.target.value)}
                    placeholder="2.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Daily percentage (e.g., 2.00 = 2% per day)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxPercentage">Maximum Cap (%)</Label>
                  <Input
                    id="maxPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={maxPercentage}
                    onChange={(e) => setMaxPercentage(e.target.value)}
                    placeholder="10.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum total percentage (e.g., 10.00 = 10% max)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Flat Fee Configuration */}
          {feeType === 'flat' && (
            <div className="space-y-4 p-4 bg-accent/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="flatValue">Flat Fee Amount (KES)</Label>
                <Input
                  id="flatValue"
                  type="number"
                  step="100"
                  min="0"
                  value={feeValue}
                  onChange={(e) => setFeeValue(e.target.value)}
                  placeholder="500"
                />
                <p className="text-xs text-muted-foreground">
                  Fixed amount charged once when payment becomes overdue
                </p>
              </div>
            </div>
          )}

          {/* Grace Period */}
          {feeType !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="gracePeriod">Grace Period (Days)</Label>
              <Input
                id="gracePeriod"
                type="number"
                min="0"
                max="30"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(e.target.value)}
                placeholder="0"
              />
              <p className="text-sm text-muted-foreground">
                Number of days after due date before late fees start (0 = no grace period)
              </p>
            </div>
          )}

          {/* Calculation Preview */}
          {feeType !== 'none' && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Info className="h-4 w-4" />
                    Preview Calculation
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="exampleRent" className="text-xs">Example Rent (KES)</Label>
                      <Input
                        id="exampleRent"
                        type="number"
                        value={exampleRent}
                        onChange={(e) => setExampleRent(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daysOverdue" className="text-xs">Days Overdue</Label>
                      <Input
                        id="daysOverdue"
                        type="number"
                        value={daysOverdue}
                        onChange={(e) => setDaysOverdue(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Late Fee</div>
                    <div className="text-2xl font-bold text-primary">
                      KES {exampleLateFee.toLocaleString()}
                    </div>
                    {feeType === 'percentage' && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Calculation: {Math.min(
                          parseFloat(feeValue) * Math.max(0, parseInt(daysOverdue) - parseInt(gracePeriod)),
                          parseFloat(maxPercentage)
                        ).toFixed(2)}% of KES {parseFloat(exampleRent).toLocaleString()}
                        {parseInt(gracePeriod) > 0 && ` (after ${gracePeriod} day grace period)`}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> This late fee policy will be included in all <strong>new</strong> lease contracts for this unit. 
              Existing leases will keep their original late fee terms.
            </AlertDescription>
          </Alert>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Late Fee Policy'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

