# Comprehensive Cleanup Script
# Removes all temporary files, test scripts, and guide documents

Write-Host "Starting cleanup..." -ForegroundColor Green

# Remove test scripts
Write-Host "Removing test scripts..." -ForegroundColor Yellow
Remove-Item -Path "check-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "create-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "verify-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "debug-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "fix-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "deploy-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "import-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "clean-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "update-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "search-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "setup-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "apply-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "buni-*.js" -Force -ErrorAction SilentlyContinue

# Remove temporary SQL files
Write-Host "Removing temporary SQL files..." -ForegroundColor Yellow
Remove-Item -Path "setup-step-by-step.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "security-deposit-setup-simple.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "complete-security-deposit-setup.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "supabase-utility-billing-setup.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "supabase-database-modifications.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "add-*.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "apply-*.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "create-*.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "fix-*.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "test-*.sql" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "quick-*.sql" -Force -ErrorAction SilentlyContinue

# Remove guide/documentation files (keep README.md)
Write-Host "Removing guide files..." -ForegroundColor Yellow
Get-ChildItem -Path . -Filter "*.md" -File | Where-Object { 
    $_.Name -ne "README.md" -and 
    $_.Name -match "^(HOW|TENANT|FIX|VISITOR|UTILITY|PWA|PAYSTACK|NOTIFICATION|N8N|MPESA|MANUAL|LANDLORD|INTEGRATION|FINAL|ADMIN)" 
} | Remove-Item -Force -ErrorAction SilentlyContinue

Remove-Item -Path "fix-*.md" -Force -ErrorAction SilentlyContinue

# Remove config files
Write-Host "Removing temporary config files..." -ForegroundColor Yellow
Remove-Item -Path "n8n.config.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "server.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "n8n-supabase-credentials.json" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "sample-workflows.json" -Force -ErrorAction SilentlyContinue

# Remove HTML test files
Write-Host "Removing HTML test files..." -ForegroundColor Yellow
Remove-Item -Path "test-*.html" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "n8n-*.html" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "payment-provider-switcher.html" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "payment-provider-switcher.js" -Force -ErrorAction SilentlyContinue

# Remove package-minimal.json (keep package.json)
Write-Host "Removing minimal package file..." -ForegroundColor Yellow
Remove-Item -Path "package-minimal.json" -Force -ErrorAction SilentlyContinue

# Clean up scripts folder
Write-Host "Cleaning scripts folder..." -ForegroundColor Yellow
if (Test-Path "scripts") {
    Get-ChildItem -Path "scripts" -Filter "test-*.js" -File | Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Path "scripts" -Filter "check-*.js" -File | Remove-Item -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Path "scripts" -Filter "create-*.js" -File | Remove-Item -Force -ErrorAction SilentlyContinue
}

Write-Host "`nCleanup complete! ✨" -ForegroundColor Green
Write-Host "Remaining files:" -ForegroundColor Cyan
Get-ChildItem -Path . -File | Where-Object { 
    $_.Name -match "\.(js|sql|md|html)$" -and 
    $_.Name -notmatch "^(vite|tailwind|postcss|eslint|components|tsconfig|vercel|package)" 
} | Select-Object Name | Format-Table -AutoSize

