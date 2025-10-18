import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, RefreshCw, Workflow } from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Execution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  status: string;
}

export const N8nWorkflowManager = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<{ [key: string]: Execution[] }>({});
  const [loading, setLoading] = useState(false);
  const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('n8n-workflow', {
        body: { action: 'list' }
      });

      if (error) throw error;

      if (data?.success && data?.data?.data) {
        setWorkflows(data.data.data);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch workflows',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    setExecutingWorkflow(workflowId);
    try {
      const { data, error } = await supabase.functions.invoke('n8n-workflow', {
        body: { 
          action: 'execute', 
          workflowId,
          data: {}
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Success',
          description: 'Workflow executed successfully',
        });
        fetchExecutions(workflowId);
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute workflow',
        variant: 'destructive',
      });
    } finally {
      setExecutingWorkflow(null);
    }
  };

  const fetchExecutions = async (workflowId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('n8n-workflow', {
        body: { 
          action: 'executions', 
          workflowId 
        }
      });

      if (error) throw error;

      if (data?.success && data?.data?.data) {
        setExecutions(prev => ({
          ...prev,
          [workflowId]: data.data.data
        }));
      }
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="h-6 w-6" />
          <h2 className="text-2xl font-bold">n8n Workflows</h2>
        </div>
        <Button 
          onClick={fetchWorkflows} 
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {loading && workflows.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No workflows found. Create workflows in your n8n instance.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <CardDescription>
                      {workflow.active ? (
                        <span className="text-green-600">Active</span>
                      ) : (
                        <span className="text-muted-foreground">Inactive</span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => executeWorkflow(workflow.id)}
                    disabled={executingWorkflow === workflow.id}
                  >
                    {executingWorkflow === workflow.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <div>Updated: {new Date(workflow.updatedAt).toLocaleDateString()}</div>
                  </div>
                  {executions[workflow.id] && executions[workflow.id].length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Recent Executions</h4>
                      {executions[workflow.id].slice(0, 3).map((exec) => (
                        <div key={exec.id} className="text-xs text-muted-foreground">
                          {exec.status} - {new Date(exec.startedAt).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
