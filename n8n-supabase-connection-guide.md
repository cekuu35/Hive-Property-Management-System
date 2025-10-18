# n8n Supabase Connection Guide

## Step 1: Access n8n Interface

1. Open your browser and go to: http://localhost:5678
2. You should see the n8n interface

## Step 2: Create Supabase Credentials

### Method 1: Using n8n Credentials (Recommended)

1. In n8n, go to **Settings** → **Credentials**
2. Click **Add Credential**
3. Search for "HTTP Request" or "Header Auth"
4. Create a new credential with these settings:

**Credential Name:** `Supabase API`

**Authentication Type:** `Header Auth`

**Header Name:** `Authorization`
**Header Value:** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`

**Additional Headers:**
- `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`
- `Content-Type`: `application/json`
- `Prefer`: `return=minimal` (for updates/inserts)

## Step 3: Test the Connection

1. Create a new workflow
2. Add an **HTTP Request** node
3. Configure it with:
   - **Method:** GET
   - **URL:** `https://kozhlejudselgtmohdfm.supabase.co/rest/v1/tenants?limit=1`
   - **Authentication:** Select your "Supabase API" credential
4. Execute the node to test the connection

## Step 4: Fix Existing Workflows

The current workflows have the credentials hardcoded. To use the credential system:

1. Open each workflow
2. In the HTTP Request nodes, change from "Header Auth" to use your "Supabase API" credential
3. Remove the hardcoded headers

## Step 5: Common Issues and Solutions

### Issue: "Cannot read properties of undefined (reading 'status')"
**Solution:** This happens when the Supabase query doesn't return data in the expected format. Make sure:
- The query is correct
- The tenant has the required related data (units, tenant_info)
- The workflow handles empty results

### Issue: "Received request for unknown webhook"
**Solution:** The workflow needs to be activated in n8n:
1. Open the workflow
2. Toggle the "Active" switch in the top right
3. Save the workflow

## Step 6: Verify Connection

Test with this simple query:
```
GET https://kozhlejudselgtmohdfm.supabase.co/rest/v1/tenants?select=*,units(*,properties(*)),tenant_info(*)&status=eq.active
```

Expected response should include tenant data with nested units and tenant_info objects.

## Your Supabase Details

- **URL:** https://kozhlejudselgtmohdfm.supabase.co
- **Service Role Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDQyOTgsImV4cCI6MjA3Mjk4MDI5OH0.10h-c8_GLM3aQd_AbNVXNDt2Pvr4DbQm7VjgvmyiG-M

## Next Steps

1. Set up the Supabase credentials in n8n
2. Test the connection
3. Import and activate the workflows
4. Configure Daraja API credentials for M-Pesa integration



