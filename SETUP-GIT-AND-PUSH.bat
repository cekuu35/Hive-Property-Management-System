@echo off
echo ====================================
echo CONFIGURE GIT AND PUSH TO GITHUB
echo ====================================
echo.

cd /d "%~dp0"

echo Please enter your GitHub email address:
set /p GIT_EMAIL="Email: "

echo.
echo Please enter your name (for commits):
set /p GIT_NAME="Name: "

echo.
echo Configuring Git...
git config user.email "%GIT_EMAIL%"
git config user.name "%GIT_NAME%"

echo.
echo ====================================
echo Git Configuration Complete!
echo ====================================
echo Email: %GIT_EMAIL%
echo Name: %GIT_NAME%
echo.

echo.
echo Checking current branch status...
git status

echo.
echo ====================================
echo CLEANING UP FOR WEB APP
echo ====================================
echo.
echo Removing Android build system...

REM Create backup first
git branch backup-before-webapp-cleanup 2>nul

REM Reset to origin/main to remove problematic commits
echo Resetting to clean state from GitHub...
git reset --hard origin/main

REM Delete Android and JDK folders
if exist android (
    echo Deleting android folder...
    rmdir /s /q android
)

if exist openJdk-25 (
    echo Deleting openJdk-25 folder...
    rmdir /s /q openJdk-25
)

REM Update gitignore
echo. >> .gitignore
echo # Web app only - Android removed >> .gitignore
echo android/ >> .gitignore

echo.
echo Staging changes...
git add -A

echo.
echo Committing cleanup...
git commit -m "chore: remove Android build system, switch to web app only"

echo.
echo ====================================
echo READY TO PUSH!
echo ====================================
echo.
echo Your repository is now clean and ready.
echo.
set /p PUSH="Push to GitHub now? (y/n): "

if /i "%PUSH%"=="y" (
    echo.
    echo Pushing to GitHub...
    git push origin main
    echo.
    echo ====================================
    echo SUCCESS! Code pushed to GitHub!
    echo ====================================
) else (
    echo.
    echo Skipping push. When ready, run:
    echo   git push origin main
)

echo.
pause

