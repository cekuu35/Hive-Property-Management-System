# Fix n8n Workflow Errors

## Current Issues
1. "Cannot read properties of undefined (reading 'status')" error
2. Workflows not properly connected to Supabase
3. Webhook errors

## Step-by-Step Fix

### Step 1: Open n8n Interface
1. Go to http://localhost:5678 in your browser
2. You should see the n8n interface

### Step 2: Create Supabase Credentials
1. Click on **Settings** (gear icon) in the left sidebar
2. Click on **Credentials**
3. Click **Add Credential**
4. Search for "HTTP Request" or "Header Auth"
5. Create a new credential:

**Name:** `Supabase API`
**Type:** `Header Auth`
**Header Name:** `Authorization`
**Header Value:** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`

**Additional Headers:**
- `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`
- `Content-Type`: `application/json`

### Step 3: Test the Connection
1. Create a new workflow
2. Add an **HTTP Request** node
3. Configure it:
   - **Method:** GET
   - **URL:** `https://kozhlejudselgtmohdfm.supabase.co/rest/v1/tenants?limit=1`
   - **Authentication:** Select your "Supabase API" credential
4. Click **Execute Node** to test

### Step 4: Fix the Rent Reminder Workflow
1. Open the "Rent Reminder Automation" workflow
2. Click on the "Get Tenants with Rent Due" node
3. In the **Authentication** section, select your "Supabase API" credential
4. Remove the hardcoded headers
5. Save the workflow

### Step 5: Add Error Handling
The "Cannot read properties of undefined (reading 'status')" error suggests the workflow is trying to process data that doesn't exist. Add a **Code** node before the data processing:

1. Add a **Code** node after the "Get Tenants with Rent Due" node
2. Use this code:

```javascript
// Check if data exists and has the expected structure
const items = $input.all();

if (!items || items.length === 0) {
  console.log('No tenants found');
  return [];
}

const processedItems = items.filter(item => {
  const data = item.json;
  
  // Check if the data has the required structure
  if (!data || !data.tenant_info || !data.units || !data.status) {
    console.log('Invalid data structure:', data);
    return false;
  }
  
  return true;
});

console.log(`Processing ${processedItems.length} valid tenants`);
return processedItems;
```

### Step 6: Activate Workflows
1. Open each workflow
2. Toggle the **Active** switch in the top right
3. Save the workflow

### Step 7: Test the Fixed Workflow
1. Go to the "Rent Reminder Automation" workflow
2. Click **Execute Workflow** (play button)
3. Check the execution log for any errors

## Alternative: Use the Test Workflow
1. Import the `supabase-test-workflow.json` file
2. Execute it to verify the connection works
3. Use it as a template for other workflows

## Troubleshooting

### If you still get "Cannot read properties of undefined (reading 'status')":
1. Check that the Supabase query returns data
2. Verify the data structure matches what the workflow expects
3. Add error handling nodes

### If webhooks don't work:
1. Make sure the workflow is active
2. Check that the webhook URL is correct
3. Verify the webhook is registered in n8n

## Your Supabase Details
- **URL:** https://kozhlejudselgtmohdfm.supabase.co
- **Service Role Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g



