# Move Large Files to G: Drive to Free Space on C:
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " MOVING LARGE FILES TO G: DRIVE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check current C: space
$driveC = Get-PSDrive C
$freeCBefore = [math]::Round($driveC.Free/1GB,2)
Write-Host "C: Drive Free Space (Before): $freeCBefore GB" -ForegroundColor Yellow
Write-Host ""

# Check G: drive
$driveG = Get-PSDrive G
$freeG = [math]::Round($driveG.Free/1GB,2)
Write-Host "G: Drive Free Space: $freeG GB" -ForegroundColor Green
Write-Host ""

# Create base folders on G: drive
Write-Host "Step 1: Creating folders on G: drive..." -ForegroundColor Green
Write-Host ""

$foldersToCreate = @("Downloads", "Documents", "Videos", "Pictures", "Music")
foreach ($folder in $foldersToCreate) {
    $path = "G:\$folder"
    if (-not (Test-Path $path)) {
        New-Item -Path $path -ItemType Directory -Force | Out-Null
        Write-Host "  Created: $folder" -ForegroundColor Gray
    } else {
        Write-Host "  Exists: $folder" -ForegroundColor Gray
    }
}

Write-Host ""

# Move Downloads folder (LARGEST - 12.45 GB!)
Write-Host "Step 2: Moving Downloads folder (12.45 GB)..." -ForegroundColor Green
Write-Host ""

$source = "C:\Users\Admin\Downloads"
$dest = "G:\Downloads"

if (Test-Path $source) {
    Write-Host "  Moving files from C:\Users\Admin\Downloads to G:\Downloads..." -ForegroundColor Yellow
    Write-Host "  This may take 5-10 minutes depending on file count..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        # Get file count
        $fileCount = (Get-ChildItem $source -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Host "  Total files to move: $fileCount" -ForegroundColor Cyan
        Write-Host ""
        
        # Move files with progress
        $moved = 0
        Get-ChildItem $source -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            $moved++
            if ($moved % 10 -eq 0) {
                $percent = [math]::Round(($moved / $fileCount) * 100, 1)
                Write-Host "  Progress: $moved / $fileCount files ($percent%)" -ForegroundColor Cyan
            }
            
            $destPath = $_.FullName.Replace("C:\Users\Admin\Downloads", "G:\Downloads")
            $destDir = Split-Path $destPath -Parent
            
            if (-not (Test-Path $destDir)) {
                New-Item -Path $destDir -ItemType Directory -Force | Out-Null
            }
            
            Move-Item -Path $_.FullName -Destination $destPath -Force -ErrorAction SilentlyContinue
        }
        
        Write-Host ""
        Write-Host "  SUCCESS! Downloads folder moved to G:\Downloads" -ForegroundColor Green
        
        # Update Windows to point Downloads to G: drive
        Write-Host "  Updating Windows Downloads location..." -ForegroundColor Yellow
        
        $shell = New-Object -ComObject WScript.Shell
        $downloadsPath = $shell.SpecialFolders("MyDocuments")
        
        # Set registry to point to G: drive
        Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders" -Name "{374DE290-123F-4565-9164-39C4925E467B}" -Value "G:\Downloads" -ErrorAction SilentlyContinue
        
        Write-Host "  Windows Downloads location updated" -ForegroundColor Green
        
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  Downloads folder not found or already moved" -ForegroundColor Gray
}

Write-Host ""

# Move other large folders if they exist
Write-Host "Step 3: Moving other large folders..." -ForegroundColor Green
Write-Host ""

# Move Videos
if (Test-Path "C:\Users\Admin\Videos") {
    Write-Host "  Moving Videos..." -ForegroundColor Yellow
    Move-Item -Path "C:\Users\Admin\Videos\*" -Destination "G:\Videos\" -Force -ErrorAction SilentlyContinue
    Write-Host "  Done" -ForegroundColor Green
}

# Move Pictures
if (Test-Path "C:\Users\Admin\Pictures") {
    Write-Host "  Moving Pictures..." -ForegroundColor Yellow
    Move-Item -Path "C:\Users\Admin\Pictures\*" -Destination "G:\Pictures\" -Force -ErrorAction SilentlyContinue
    Write-Host "  Done" -ForegroundColor Green
}

# Move Music
if (Test-Path "C:\Users\Admin\Music") {
    Write-Host "  Moving Music..." -ForegroundColor Yellow
    Move-Item -Path "C:\Users\Admin\Music\*" -Destination "G:\Music\" -Force -ErrorAction SilentlyContinue
    Write-Host "  Done" -ForegroundColor Green
}

Write-Host ""

# Final space check
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " MOVE COMPLETE!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$driveCAfter = Get-PSDrive C
$freeCAfter = [math]::Round($driveCAfter.Free/1GB,2)
$freedSpace = [math]::Round($freeCAfter - $freeCBefore, 2)

Write-Host "C: Drive Free Space (Before): $freeCBefore GB" -ForegroundColor Yellow
Write-Host "C: Drive Free Space (After):  $freeCAfter GB" -ForegroundColor Green
Write-Host "Space Freed:                  $freedSpace GB" -ForegroundColor Cyan
Write-Host ""

if ($freeCAfter -ge 4) {
    Write-Host "SUCCESS! You have plenty of space for Android Studio!" -ForegroundColor Green
    Write-Host "You can now:" -ForegroundColor White
    Write-Host "  1. Download Android Studio" -ForegroundColor Gray
    Write-Host "  2. Install with SDKs and emulators" -ForegroundColor Gray
    Write-Host "  3. Have room for projects" -ForegroundColor Gray
} elseif ($freeCAfter -ge 2.5) {
    Write-Host "GOOD! You have enough space for Android Studio!" -ForegroundColor Green
} else {
    Write-Host "WARNING: May need more cleanup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Your files are now on G: drive:" -ForegroundColor White
Write-Host "  G:\Downloads (12.45 GB moved)" -ForegroundColor Cyan
Write-Host "  G:\Documents" -ForegroundColor Cyan
Write-Host "  G:\Videos" -ForegroundColor Cyan
Write-Host "  G:\Pictures" -ForegroundColor Cyan
Write-Host "  G:\Music" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your Hive project is safe at:" -ForegroundColor Green
Write-Host "  C:\Users\Admin\Favorites\lovly-prop-ai-33" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


