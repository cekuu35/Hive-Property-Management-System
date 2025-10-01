import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { useMonthlyRent } from '@/hooks/useMonthlyRent';
import { useState } from 'react';
import { toast } from 'sonner';

export const MonthlyRentGenerator = () => {
  const { generateMonthlyRentForAllTenants } = useMonthlyRent();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const handleGenerateMonthlyRent = async () => {
    try {
      setIsGenerating(true);
      const result = await generateMonthlyRentForAllTenants();
      setLastGenerated(new Date().toLocaleString());
      toast.success(`Generated ${result.payments?.length || 0} monthly rent payments`);
    } catch (error) {
      console.error('Error generating monthly rent:', error);
      toast.error('Failed to generate monthly rent payments');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCurrentMonthInfo = () => {
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return {
      month: monthNames[now.getMonth()],
      year: now.getFullYear(),
      firstDay: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString()
    };
  };

  const monthInfo = getCurrentMonthInfo();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Monthly Rent Generator
        </CardTitle>
        <CardDescription>
          Generate monthly rent payments for all active tenants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4" />
            <span className="font-medium">Current Month: {monthInfo.month} {monthInfo.year}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Due Date: {monthInfo.firstDay}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Important Notes:</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6">
            <li>• This will create rent payments for all active leases</li>
            <li>• Only creates payments if they don't already exist for the current month</li>
            <li>• Payments will be set to 'pending' status initially</li>
            <li>• Run this on the 1st of each month for best results</li>
          </ul>
        </div>

        {lastGenerated && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Last Generated</p>
              <p className="text-xs text-green-600">{lastGenerated}</p>
            </div>
          </div>
        )}

        <Button 
          onClick={handleGenerateMonthlyRent}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? 'Generating...' : 'Generate Monthly Rent Payments'}
        </Button>
      </CardContent>
    </Card>
  );
};
