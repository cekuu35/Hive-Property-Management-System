import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { checkAndFixAllProfileIds } from '@/utils/dataIntegrityCheck';
import { toast } from 'sonner';

export const DataIntegrityCheck = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    totalChecked: number;
    fixed: number;
    errors: number;
    details: Array<{
      tenantId: string;
      tenantName: string;
      email: string;
      originalProfileId: string;
      correctedProfileId: string | null;
      status: 'valid' | 'fixed' | 'error';
      error?: string;
    }>;
  } | null>(null);

  const runIntegrityCheck = async () => {
    setIsRunning(true);
    try {
      console.log('🔍 [DataIntegrityCheck] Starting manual integrity check...');
      const result = await checkAndFixAllProfileIds();
      setLastResult(result);
      
      if (result.errors > 0) {
        toast.error(`Data integrity check completed with ${result.errors} errors`);
      } else if (result.fixed > 0) {
        toast.success(`Data integrity check completed - fixed ${result.fixed} issues`);
      } else {
        toast.success('Data integrity check completed - all data is valid');
      }
    } catch (error) {
      console.error('❌ [DataIntegrityCheck] Error during manual check:', error);
      toast.error('Failed to run data integrity check');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Data Integrity Check
        </CardTitle>
        <CardDescription>
          Verify and fix any profile ID mismatches in the database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runIntegrityCheck} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Check...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Run Integrity Check
            </>
          )}
        </Button>

        {lastResult && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Check completed: {lastResult.totalChecked} tenants checked, {lastResult.fixed} fixed, {lastResult.errors} errors
              </AlertDescription>
            </Alert>

            {lastResult.details.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Details:</h4>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {lastResult.details.map((detail, index) => (
                    <div 
                      key={index}
                      className={`p-2 rounded text-sm ${
                        detail.status === 'valid' 
                          ? 'bg-green-50 text-green-700' 
                          : detail.status === 'fixed'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <div className="font-medium">{detail.tenantName}</div>
                      <div className="text-xs">
                        {detail.status === 'valid' && '✅ Profile ID is valid'}
                        {detail.status === 'fixed' && `🔧 Fixed: ${detail.originalProfileId} → ${detail.correctedProfileId}`}
                        {detail.status === 'error' && `❌ Error: ${detail.error}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool automatically detects and fixes profile ID mismatches where the tenant_info.profile_id 
            points to an auth user ID instead of the actual profile ID. This prevents "No profile found" errors.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};




