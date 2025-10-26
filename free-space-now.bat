@echo off
echo ========================================
echo   FREE UP SPACE - Quick Solution
echo ========================================
echo.

echo Current Status:
echo - C: drive has ~330 MB free (CRITICAL!)
echo - node_modules takes 234 MB
echo.

echo OPTION 1: Delete node_modules (Recommended)
echo ========================================
echo.
set /p choice="Delete node_modules to free 234 MB? (y/n): "

if /i "%choice%"=="y" (
    echo.
    echo Deleting node_modules...
    rmdir /s /q node_modules
    echo ✅ node_modules deleted - 234 MB freed!
    echo.
    echo To reinstall later:
    echo   npm install
    echo.
    echo Now you have enough space for Android build!
) else (
    echo.
    echo OPTION 2: Move to G drive
    echo ========================================
    echo.
    set /p move="Move entire project to G drive? (y/n): "
    
    if /i "%move%"=="y" (
        echo.
        echo Moving project to G:\lovly-prop-ai-33...
        move "%~dp0" "G:\lovly-prop-ai-33"
        echo ✅ Project moved to G drive!
        echo.
        echo New location: G:\lovly-prop-ai-33
    ) else (
        echo.
        echo ❌ No changes made.
        echo Please free up space manually or choose one of the options above.
    )
)

echo.
echo ========================================
pause

