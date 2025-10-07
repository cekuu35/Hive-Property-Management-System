import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { supabaseAdmin } from '../integrations/supabase/admin';

const SupabaseConnectionTest: React.FC = () => {
  const [clientTest, setClientTest] = useState<{ status: string; data?: any; error?: string } | null>(null);
  const [adminTest, setAdminTest] = useState<{ status: string; data?: any; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const testClientConnection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tenants').select('*').limit(5);
      
      if (error) {
        setClientTest({ status: 'error', error: error.message });
      } else {
        setClientTest({ status: 'success', data });
      }
    } catch (err) {
      setClientTest({ status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testAdminConnection = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin.from('tenants').select('*').limit(5);
      
      if (error) {
        setAdminTest({ status: 'error', error: error.message });
      } else {
        setAdminTest({ status: 'success', data });
      }
    } catch (err) {
      setAdminTest({ status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testBothConnections = async () => {
    await Promise.all([testClientConnection(), testAdminConnection()]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Supabase Connection Test</h2>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={testClientConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Client Connection
          </button>
          <button
            onClick={testAdminConnection}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Admin Connection
          </button>
          <button
            onClick={testBothConnections}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Test Both Connections
          </button>
        </div>

        {clientTest && (
          <div className={`p-4 rounded border ${
            clientTest.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h3 className="font-semibold">Client Connection Test</h3>
            <p className={`font-medium ${
              clientTest.status === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {clientTest.status === 'success' ? '✅ Success' : '❌ Failed'}
            </p>
            {clientTest.error && (
              <p className="text-red-600 text-sm mt-1">Error: {clientTest.error}</p>
            )}
            {clientTest.data && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Found {clientTest.data.length} tenant records
                </p>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                  {JSON.stringify(clientTest.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {adminTest && (
          <div className={`p-4 rounded border ${
            adminTest.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <h3 className="font-semibold">Admin Connection Test</h3>
            <p className={`font-medium ${
              adminTest.status === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {adminTest.status === 'success' ? '✅ Success' : '❌ Failed'}
            </p>
            {adminTest.error && (
              <p className="text-red-600 text-sm mt-1">Error: {adminTest.error}</p>
            )}
            {adminTest.data && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Found {adminTest.data.length} tenant records
                </p>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                  {JSON.stringify(adminTest.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupabaseConnectionTest;




