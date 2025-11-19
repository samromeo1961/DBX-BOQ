# PowerShell Practice Commands
# Copy these one-by-one into your VS Code PowerShell terminal

# 1. Where am I?
Write-Host "`n=== 1. Current Location ===" -ForegroundColor Green
pwd

# 2. Find getUsers function
Write-Host "`n=== 2. Find getUsers Function ===" -ForegroundColor Green
Select-String "async function getUsers" src/ipc-handlers/global-settings.js | Select-Object LineNumber, Line

# 3. Find all User functions
Write-Host "`n=== 3. All User Functions ===" -ForegroundColor Green
Select-String "function.*User" src/ipc-handlers/global-settings.js | Select-Object LineNumber, Line

# 4. Count lines in global-settings.js
Write-Host "`n=== 4. Line Count ===" -ForegroundColor Green
Write-Host "global-settings.js has $((Get-Content src/ipc-handlers/global-settings.js).Count) lines"

# 5. List all IPC handlers
Write-Host "`n=== 5. All IPC Handler Files ===" -ForegroundColor Green
Get-ChildItem src/ipc-handlers/ -Filter *.js | Select-Object Name

# 6. Search for "phone" in all files
Write-Host "`n=== 6. Search for 'phone' ===" -ForegroundColor Green
Get-ChildItem src/ -Recurse -Filter *.js | Select-String "phone" -CaseSensitive | Select-Object Filename, LineNumber, Line -First 10

Write-Host "`n✅ All commands completed!" -ForegroundColor Green
Write-Host "Now try running: npm run test:smoke" -ForegroundColor Yellow
