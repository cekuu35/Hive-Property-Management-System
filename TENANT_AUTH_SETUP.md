# Tenant Authentication Setup Guide

## The Issue
The tenant creation process generates a password but doesn't create the actual Supabase auth user account, which is why you see "no account created yet" when trying to log in.

## Solution
You need to add the Supabase service role key to your environment variables to enable automatic auth user creation.

## Step 1: Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `lovly-prop-ai-33`
3. Go to **Settings** → **API**
4. Find the **service_role** key (it starts with `eyJ...`)
5. Copy this key

## Step 2: Add the Service Role Key

1. Open your `.env.local` file in the project root
2. Add the following line:
   ```
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
3. Replace `your_service_role_key_here` with the actual key from step 1
4. Save the file

## Step 3: Restart the Development Server

1. Stop the current dev server (Ctrl+C)
2. Run `npm run dev` again
3. The server will pick up the new environment variable

## What This Enables

Once the service role key is added:
- ✅ **Automatic Auth User Creation**: Tenants get real login accounts
- ✅ **Working Passwords**: The displayed password will actually work
- ✅ **Immediate Login**: Tenants can log in right away
- ✅ **No Manual Setup**: Everything is automated

## Current Behavior (Without Service Role Key)

- ✅ **Tenant Record Created**: Tenant data is saved to the database
- ✅ **Password Generated**: A secure password is created
- ⚠️ **Manual Account Creation**: You'll see a warning that manual setup is required
- ⚠️ **No Immediate Login**: The tenant can't log in until the account is created manually

## Security Note

The service role key has elevated permissions and should only be used in backend/server-side code. In this case, it's used in the client-side service but only for creating auth users, which is a common pattern for admin operations.

## Testing

After adding the service role key:
1. Create a new tenant
2. You should see the credentials screen with a working password
3. The tenant should be able to log in immediately using those credentials
4. No more "no account created yet" messages!

## Troubleshooting

If you still see issues:
1. Make sure the service role key is correct (starts with `eyJ`)
2. Restart the dev server after adding the key
3. Check the browser console for any error messages
4. Verify the key has the correct permissions in Supabase dashboard
