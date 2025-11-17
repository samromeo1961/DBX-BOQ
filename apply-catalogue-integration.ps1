# Catalogue Enhancements Integration Script (PowerShell)
#
# This script automatically applies all necessary code changes for:
# 1. Supplier Pricing
# 2. Templates (Workup)
# 3. Specifications
#
# IMPORTANT: Stop the Electron application before running this script!
#
# Usage: .\apply-catalogue-integration.ps1

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Catalogue Enhancements Integration Script" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

Write-Host "This script will automatically integrate:" -ForegroundColor Yellow
Write-Host "  1. Supplier Pricing"
Write-Host "  2. Templates (Workup)"
Write-Host "  3. Specifications`n"

Write-Host "IMPORTANT: The Electron application MUST be stopped!`n" -ForegroundColor Red

$confirmation = Read-Host "Have you stopped the application? (yes/no)"
if ($confirmation -ne 'yes') {
    Write-Host "`nPlease stop the application and run this script again." -ForegroundColor Red
    exit 1
}

Write-Host "`nProceeding with integration...`n" -ForegroundColor Green

# Function to check if process is running
function Test-ProcessRunning {
    param($ProcessName)
    return (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue) -ne $null
}

# Check if Electron is running
if (Test-ProcessRunning "electron") {
    Write-Host "ERROR: Electron process is still running!" -ForegroundColor Red
    Write-Host "Please close the application completely and try again." -ForegroundColor Red
    exit 1
}

# Run the Node.js script
Write-Host "Running integration script...`n" -ForegroundColor Cyan

try {
    node apply-catalogue-integration.js

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Integration completed successfully!" -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Yellow
        Write-Host "  1. Check the CATALOGUE_ENHANCEMENTS_INTEGRATION.md guide"
        Write-Host "  2. Manually integrate UI components (see Part 3 in the guide)"
        Write-Host "  3. Check database schema for Template/Specification columns"
        Write-Host "  4. Start the application and test`n"
    } else {
        Write-Host "`n❌ Integration failed. Please check the errors above." -ForegroundColor Red
    }
} catch {
    Write-Host "`nERROR: Failed to run integration script" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Read-Host "`nPress Enter to exit"
