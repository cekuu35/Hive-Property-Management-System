@echo off
echo ========================================
echo Deploying Subscription Payment Function
echo ========================================
echo.

echo Step 1: Checking Supabase CLI...
supabase --version
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Supabase CLI not found!
    echo Please install it first: npm install -g supabase
    pause
    exit /b 1
)

echo.
echo Step 2: Checking if logged in...
supabase projects list
if %errorlevel% neq 0 (
    echo.
    echo You need to login first...
    supabase login
)

echo.
echo Step 3: Deploying subscription-payment-daraja function...
echo This may take a minute...
echo.

supabase functions deploy subscription-payment-daraja --project-ref kozhlejudselgtmohdfm

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Function deployed!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Set environment variables in Supabase dashboard
    echo 2. Test the function
    echo.
) else (
    echo.
    echo ========================================
    echo DEPLOYMENT FAILED!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause

