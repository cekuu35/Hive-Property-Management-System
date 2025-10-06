# Supabase Database Management Scripts

This directory contains scripts for managing your Supabase database with elevated permissions using the service role key.

## Setup

### 1. Environment Variables

Create a `.env.local` file in the project root with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important:** The service role key should only be used in backend scripts and never exposed to client-side code.

### 2. Install Dependencies

The required `@supabase/supabase-js` package is already installed.

## Available Scripts

### Test Admin Connection
```bash
npm run test:admin
# or
npm run db:test
```

### Run Database Setup
```bash
node scripts/setupDatabase.js
```

## Script Files

### `supabaseAdmin.js`
- **Purpose**: Creates an admin client with service role permissions
- **Exports**: 
  - `supabaseAdmin` - Admin client for database operations
  - `testAdminConnection()` - Test basic connection
  - `fetchAllTenants()` - Fetch all tenant data

### `databaseManager.js`
- **Purpose**: Comprehensive database management functions
- **Exports**:
  - `createUtilityBillsTable()` - Create utility_bills table
  - `addUtilityBillsPolicies()` - Add RLS policies
  - `addUtilityBillsIndexes()` - Add performance indexes
  - `insertMockUtilityBills()` - Insert test data
  - `setupUtilityBillsTable()` - Complete table setup
  - `listAllTables()` - List all database tables

### `testAdminConnection.js`
- **Purpose**: Test script to verify admin setup
- **Usage**: `node scripts/testAdminConnection.js`

### `setupDatabase.js`
- **Purpose**: Interactive setup and testing script
- **Usage**: `node scripts/setupDatabase.js`

## Usage Examples

### Basic Connection Test
```javascript
import { testAdminConnection } from './scripts/supabaseAdmin.js';

const isConnected = await testAdminConnection();
console.log('Connected:', isConnected);
```

### Create a New Table
```javascript
import { supabaseAdmin } from './scripts/supabaseAdmin.js';

// Create a new table
const { data, error } = await supabaseAdmin
  .rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS my_new_table (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `
  });
```

### Add Foreign Key Relationships
```javascript
import { supabaseAdmin } from './scripts/supabaseAdmin.js';

// Add foreign key relationship
const { data, error } = await supabaseAdmin
  .rpc('exec_sql', {
    sql: `
      ALTER TABLE my_table 
      ADD COLUMN tenant_id UUID REFERENCES tenant_info(id) ON DELETE CASCADE;
    `
  });
```

### Insert Mock Data
```javascript
import { supabaseAdmin } from './scripts/supabaseAdmin.js';

// Insert test data
const { data, error } = await supabaseAdmin
  .from('my_table')
  .insert([
    { name: 'Test Item 1' },
    { name: 'Test Item 2' }
  ]);
```

## Security Notes

1. **Service Role Key**: Only use in backend scripts, never in client-side code
2. **RLS Policies**: Always create proper Row Level Security policies
3. **Environment Variables**: Keep `.env.local` in `.gitignore`
4. **Permissions**: The service role key bypasses RLS, use with caution

## Common Operations

### Create Table with Relationships
```javascript
const { data, error } = await supabaseAdmin
  .rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS utility_bills (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tenant_id UUID NOT NULL REFERENCES tenant_info(id) ON DELETE CASCADE,
        landlord_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        due_date DATE NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `
  });
```

### Add RLS Policies
```javascript
const { data, error } = await supabaseAdmin
  .rpc('exec_sql', {
    sql: `
      ALTER TABLE utility_bills ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Landlords can manage utility bills" 
      ON utility_bills 
      FOR ALL 
      USING (landlord_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      ));
    `
  });
```

### Add Indexes for Performance
```javascript
const { data, error } = await supabaseAdmin
  .rpc('exec_sql', {
    sql: `
      CREATE INDEX idx_utility_bills_tenant_id ON utility_bills(tenant_id);
      CREATE INDEX idx_utility_bills_status ON utility_bills(status);
    `
  });
```

## Troubleshooting

### Connection Issues
- Verify your `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check that your Supabase project is active
- Ensure the service role key has proper permissions

### RLS Policy Issues
- Policies are created with the service role key
- Test policies with regular user accounts
- Check policy syntax and table references

### Permission Issues
- Service role key bypasses RLS
- Use regular anon key for client-side operations
- Test with both admin and user contexts
