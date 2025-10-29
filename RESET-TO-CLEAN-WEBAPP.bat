@echo off
echo ====================================
echo RESET TO CLEAN WEB APP ONLY VERSION
echo ====================================
echo.
echo This will:
echo   1. Reset your local branch to match GitHub (origin/main)
echo   2. Remove Android and JDK folders completely
echo   3. Give you a clean state to work with the web app only
echo.
echo WARNING: This will discard your last 4 local commits!
echo Press Ctrl+C to cancel, or
pause

cd /d "%~dp0"

echo.
echo Step 1: Creating backup branch...
git branch backup-before-webapp-cleanup
echo Backup created at: backup-before-webapp-cleanup

echo.
echo Step 2: Resetting to origin/main (removing problematic commits)...
git reset --hard origin/main

echo.
echo Step 3: Deleting Android folder...
if exist android (
    rmdir /s /q android
    echo Android folder deleted!
)

echo.
echo Step 4: Deleting openJdk-25 folder...
if exist openJdk-25 (
    rmdir /s /q openJdk-25
    echo OpenJDK folder deleted!
)

echo.
echo Step 5: Updating .gitignore...
echo # Android (removed - web app only) >> .gitignore
echo android/ >> .gitignore

echo.
echo Step 6: Committing changes...
git add -A
git commit -m "chore: remove Android build system, using web app only"

echo.
echo Step 7: Checking status...
git status

echo.
echo ====================================
echo SUCCESS! Repository is clean!
echo ====================================
echo.
echo Your repository is now:
echo   - Clean of JDK files
echo   - Clean of Android build system  
echo   - Ready to push to GitHub
echo.
echo To push to GitHub, run:
echo   git push origin main
echo.
echo If you need to recover your old commits:
echo   git checkout backup-before-webapp-cleanup
echo.
pause

