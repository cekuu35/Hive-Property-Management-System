@echo off
echo ====================================
echo Cleaning up Android files for Web App Only
echo ====================================
echo.

cd /d "%~dp0"

echo Step 1: Removing android folder...
if exist android (
    rmdir /s /q android
    echo Android folder deleted!
) else (
    echo Android folder already removed.
)

echo.
echo Step 2: Removing openJdk-25 folder (if exists)...
if exist openJdk-25 (
    rmdir /s /q openJdk-25
    echo OpenJDK folder deleted!
) else (
    echo OpenJDK folder already removed.
)

echo.
echo Step 3: Checking git status...
git status

echo.
echo ====================================
echo Cleanup complete!
echo ====================================
echo.
echo Next steps:
echo 1. Review the git status above
echo 2. Commit these deletions: git add -A
echo 3. Commit: git commit -m "chore: remove Android build system, using web app only"
echo 4. Force push to clean history: git push origin main --force
echo.
pause

