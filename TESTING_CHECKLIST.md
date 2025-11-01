# Tenant Portal Testing Checklist

## Pre-Testing Setup
1. ✅ **Clear Browser Cache**
   - Open DevTools (F12)
   - Go to Application → Clear storage
   - Click "Clear site data"
   - Unregister any service workers

2. ✅ **Verify Preview Server**
   - Server running on http://localhost:4173/
   - No service worker errors in console

## Testing Workflow

### 1. Authentication Flow
- [ ] **Login**
  - Navigate to http://localhost:4173/
  - Enter tenant email and password
  - Verify successful login redirects to /dashboard
  - Check console for any errors

- [ ] **Session Persistence**
  - Refresh page (F5)
  - Verify user stays logged in
  - Check that dashboard loads correctly

### 2. Dashboard Loading
- [ ] **Initial Load**
  - Dashboard should load without "Something went wrong" error
  - No crashes in browser console
  - All sections render properly

- [ ] **Overview Tab** (Default tab)
  - Rent Balance card displays
  - Maintenance Requests count shows
  - Recent Payments list displays
  - Messages count displays
  - No empty arrays causing errors

### 3. Data Loading
- [ ] **Hooks Load Successfully**
  - Check browser console for hook errors
  - Verify no 406 errors from Supabase
  - No "Cannot read properties of undefined" errors
  - All data loads with safe defaults (empty arrays, 0 values)

- [ ] **Real-time Updates**
  - Data should refresh automatically
  - No infinite loops in useEffect hooks

### 4. Key Features
- [ ] **Payment Section**
  - Click "Make Payment" button
  - Payment modal opens
  - No crashes when accessing payment form

- [ ] **Maintenance Requests**
  - View active maintenance requests
  - Create new maintenance request
  - Filter by status works

- [ ] **Lease Document**
  - View lease document
  - Template loads correctly
  - No "failed to load leasing template" error

### 5. Navigation
- [ ] **Tab Navigation**
  - Switch between Overview, Payments, Maintenance, Documents, Messages, Profile
  - Each tab loads without errors
  - Active tab highlights correctly

### 6. Error Handling
- [ ] **Error Boundary**
  - Should NOT see "Something went wrong" error
  - Any errors should be logged to console, not crash the app
  - App should gracefully handle missing data

### 7. Mobile Responsiveness
- [ ] **Mobile View**
  - Test on mobile viewport (< 768px width)
  - MobileTenantDashboard should load
  - All features work on mobile

## Common Issues to Watch For

1. **Service Worker Errors**
   - Should be disabled in preview mode
   - No "Failed to fetch" errors from sw.js

2. **Undefined Data Errors**
   - No ".single()" causing 406 errors
   - All arrays have defaults
   - All object properties use optional chaining

3. **Hook Errors**
   - All hooks return safe defaults
   - No hooks throwing errors during initialization
   - Refetch functions are optional chained

4. **Supabase Query Errors**
   - No duplicate query parameters
   - All queries use .maybeSingle() instead of .single()
   - RLS policies allow access

## Expected Behavior After Fixes

✅ **Dashboard loads successfully**
✅ **No console errors**
✅ **All data displays (even if empty)**
✅ **No crashes when switching tabs**
✅ **Payment flow works**
✅ **Maintenance requests work**
✅ **All features accessible**

## If Issues Persist

1. Check browser console (F12) for exact error messages
2. Check Network tab for failed requests (especially Supabase)
3. Verify user has tenant_info record in database
4. Check RLS policies allow tenant to access their data
5. Share console errors for further debugging
