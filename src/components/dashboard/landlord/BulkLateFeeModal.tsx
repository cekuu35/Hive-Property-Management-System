import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calculator, AlertCircle, Building2, Percent, DollarSign } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BulkLateFeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyName: string;
  unitCount: number;
  onComplete?: () => void;
}

export const BulkLateFeeModal: React.FC<BulkLateFeeModalProps> = ({
  open,
  onOpenChange,
  propertyId,
  propertyName,
  unitCount,
  onComplete
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [feeType, setFeeType] = useState<'percentage' | 'flat' | 'none'>('percentage');
  const [feeValue, setFeeValue] = useState<string>('2.00');
  const [maxPercentage, setMaxPercentage] = useState<string>('10.00');
  const [gracePeriod, setGracePeriod] = useState<string>('0');

  const handleBulkUpdate = async () => {
    setLoading(true);
    setProgress(0);
    
    try {
      // Fetch all units for this property
      const { data: units, error: fetchError } = await supabase
        .from('units')
        .select('id, unit_number')
        .eq('property_id', propertyId);

      if (fetchError) throw fetchError;
      if (!units || units.length === 0) {
        throw new Error('No units found for this property');
      }

      const totalUnits = units.length;
      let updatedCount = 0;

      // Update each unit
      for (const unit of units) {
        const { error: updateError } = await supabase
          .from('units')
          .update({
            late_fee_type: feeType,
            late_fee_value: parseFloat(feeValue) || 0,
            late_fee_max_percentage: parseFloat(maxPercentage) || 0,
            late_fee_grace_period_days: parseInt(gracePeriod) || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', unit.id);

        if (updateError) {
          console.error(`Error updating unit ${unit.unit_number}:`, updateError);
        } else {
          updatedCount++;
        }

        // Update progress
        setProgress(Math.round((updatedCount / totalUnits) * 100));
      }

      toast({
        title: 'Bulk Update Complete',
        description: `Updated late fee policy for ${updatedCount} of ${totalUnits} units in ${propertyName}.`,
      });

      onComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error in bulk update:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update late fee settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bulk Late Fee Policy - {propertyName}
          </DialogTitle>
          <DialogDescription>
            Apply the same late fee policy to all {unitCount} units in this property
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Warning Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will update late fee settings for <strong>all {unitCount} units</strong> in {propertyName}. 
              Existing leases will keep their current terms, but new leases will use these settings.
            </AlertDescription>
          </Alert>

          {/* Late Fee Type */}
          <div className="space-y-3">
            <Label>Late Fee Type</Label>
            <RadioGroup value={feeType} onValueChange={(value: any) => setFeeType(value)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="percentage" id="bulk-percentage" />
                <div className="flex-1">
                  <Label htmlFor="bulk-percentage" className="cursor-pointer font-medium">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Percentage (Per Day)
                    </div>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Most common: 2% per day, max 10%
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="flat" id="bulk-flat" />
                <div className="flex-1">
                  <Label htmlFor="bulk-flat" className="cursor-pointer font-medium">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Flat Fee (One-Time)
                    </div>
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fixed amount once when overdue
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="none" id="bulk-none" />
                <div className="flex-1">
                  <Label htmlFor="bulk-none" className="cursor-pointer font-medium">
                    No Late Fees
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    No late fees for any unit
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
                  <Label htmlFor="bulk-feeValue">Percentage Per Day (%)</Label>
                  <Input
                    id="bulk-feeValue"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={feeValue}
                    onChange={(e) => setFeeValue(e.target.value)}
                    placeholder="2.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-maxPercentage">Maximum Cap (%)</Label>
                  <Input
                    id="bulk-maxPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={maxPercentage}
                    onChange={(e) => setMaxPercentage(e.target.value)}
                    placeholder="10.00"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Flat Fee Configuration */}
          {feeType === 'flat' && (
            <div className="space-y-4 p-4 bg-accent/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="bulk-flatValue">Flat Fee Amount (KES)</Label>
                <Input
                  id="bulk-flatValue"
                  type="number"
                  step="100"
                  min="0"
                  value={feeValue}
                  onChange={(e) => setFeeValue(e.target.value)}
                  placeholder="500"
                />
              </div>
            </div>
          )}

          {/* Grace Period */}
          {feeType !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="bulk-gracePeriod">Grace Period (Days)</Label>
              <Input
                id="bulk-gracePeriod"
                type="number"
                min="0"
                max="30"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(e.target.value)}
                placeholder="0"
              />
              <p className="text-sm text-muted-foreground">
                Days after due date before late fees start
              </p>
            </div>
          )}

          {/* Preview */}
          <Card className="bg-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-sm font-medium">Preview Policy:</div>
                <div className="text-sm text-muted-foreground">
                  {feeType === 'percentage' 
                    ? `${feeValue}% per day (max ${maxPercentage}%)${gracePeriod !== '0' ? ` after ${gracePeriod} day grace period` : ''}`
                    : feeType === 'flat'
                    ? `KES ${feeValue} flat fee${gracePeriod !== '0' ? ` after ${gracePeriod} day grace period` : ''}`
                    : 'No late fees'}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Will apply to all {unitCount} units in {propertyName}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar and Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 space-y-4 pt-4 border-t mt-4">
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Updating units...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={loading}>
              {loading ? 'Updating...' : `Update All ${unitCount} Units`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

