# Manual Credential Fix Guide

## 🎯 The Problem
Your workflows have `Header Auth: undefined` which causes the "Cannot read properties of undefined (reading 'status')" error.

## 🔧 Solution: Manual Fix

### Step 1: Import Working Test Workflow
1. **Import** `n8n-workflows/supabase-working-test.json` into n8n
2. **Execute it** to verify the fix works
3. **This workflow has proper credentials configured**

### Step 2: Fix Your Existing Workflows

For each workflow that has Supabase HTTP Request nodes:

#### **Option A: Use the Working Test as Template**
1. **Copy the HTTP Request node** from the working test
2. **Paste it** into your existing workflows
3. **Replace the broken nodes** with the working ones

#### **Option B: Fix Each Node Manually**

For every HTTP Request node that calls `kozhlejudselgtmohdfm.supabase.co`:

1. **Click on the HTTP Request node**
2. **In the Authentication section:**
   - Change from "None" to "Header Auth"
   - **Header Name:** `Authorization`
   - **Header Value:** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`

3. **In Additional Headers, add:**
   - **Name:** `apikey`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvemhsZWp1ZHNlbGd0bW9oZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQwNDI5OCwiZXhwIjoyMDcyOTgwMjk4fQ.LWosNpPJO_clOXXYa5pqGM36S-FLANk71F8BvcsJf2g`
   - **Name:** `Content-Type`
   - **Value:** `application/json`

4. **Save the workflow**
5. **Test it** by clicking "Execute Workflow"

### Step 3: Verify the Fix

After fixing each workflow:
1. **Execute the workflow manually**
2. **Check the execution log** - you should see:
   - ✅ No "Cannot read properties of undefined" errors
   - ✅ Successful HTTP requests to Supabase
   - ✅ Tenant data in the output

## 🚀 Quick Test

1. **Import** `supabase-working-test.json`
2. **Execute it** - this should work without errors
3. **Use this as a template** for your other workflows

## 📋 Workflows to Fix

Based on the API analysis, you need to fix these workflows:
- **Debug Supabase Response** (26 Supabase nodes)
- **Utility Billing Automation** (4 Supabase nodes)

## ✅ Expected Result

Once fixed, your workflows should:
- ✅ Connect to Supabase successfully
- ✅ Retrieve tenant data properly
- ✅ Process the data without errors
- ✅ No more "Cannot read properties of undefined" errors

The key is that each HTTP Request node needs proper authentication headers configured, not just the credentials created in n8n.



