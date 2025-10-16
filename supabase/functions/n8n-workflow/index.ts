import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, workflowId, data } = await req.json();
    const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
    const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL') || 'https://n8n.lovable.app/api/v1';

    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY is not configured');
    }

    console.log(`n8n action: ${action}`, { workflowId });

    const headers = {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    };

    let response;

    switch (action) {
      case 'list':
        // List all workflows
        response = await fetch(`${N8N_BASE_URL}/workflows`, {
          headers,
        });
        break;

      case 'execute':
        // Execute a workflow
        if (!workflowId) {
          throw new Error('workflowId is required for execute action');
        }
        response = await fetch(`${N8N_BASE_URL}/workflows/${workflowId}/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify(data || {}),
        });
        break;

      case 'get':
        // Get workflow details
        if (!workflowId) {
          throw new Error('workflowId is required for get action');
        }
        response = await fetch(`${N8N_BASE_URL}/workflows/${workflowId}`, {
          headers,
        });
        break;

      case 'executions':
        // Get workflow executions
        if (!workflowId) {
          throw new Error('workflowId is required for executions action');
        }
        response = await fetch(`${N8N_BASE_URL}/executions?workflowId=${workflowId}&limit=10`, {
          headers,
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n API error:', response.status, errorText);
      throw new Error(`n8n API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('n8n response:', { action, success: true });

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('n8n function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
