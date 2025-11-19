# PowerShell Commands for DBx BOQ Development

**You're using PowerShell in VS Code - here are the equivalent commands!**

---

## 🔍 Searching for Text (grep equivalent)

### Basic Search in One File

**PowerShell:**
```powershell
Select-String -Pattern "text to find" -Path "path/to/file.js"
```

**Example:**
```powershell
Select-String -Pattern "getUsers" -Path "src/ipc-handlers/global-settings.js"
```

### Search with Line Numbers

```powershell
Select-String -Pattern "getUsers" -Path "src/ipc-handlers/global-settings.js" | Select-Object LineNumber, Line
```

**Output:**
```
LineNumber Line
---------- ----
       376 async function getUsers() {
       990   getUsers,
```

### Search in Multiple Files (Recursive)

```powershell
Get-ChildItem -Path src/ -Recurse -Include *.js | Select-String -Pattern "getUsers"
```

**Shorter version:**
```powershell
ls src/ -r -i *.js | sls "getUsers"
```

### Case-Insensitive Search (Default in PowerShell!)

```powershell
Select-String -Pattern "phone" -Path "src/ipc-handlers/global-settings.js"
```

### Case-Sensitive Search

```powershell
Select-String -Pattern "Phone" -Path "src/ipc-handlers/global-settings.js" -CaseSensitive
```

### Search with Context (lines before/after)

```powershell
Select-String -Pattern "getUsers" -Path "src/ipc-handlers/global-settings.js" -Context 2
```

This shows 2 lines before and after each match.

---

## 📁 File Operations

### List Files

```powershell
# List files in current directory
ls

# List files in specific directory
ls src/ipc-handlers/

# List only .js files
ls src/ -Filter *.js

# List recursively
ls src/ -Recurse -Filter *.js
```

### Check if File Exists

```powershell
Test-Path "src/ipc-handlers/global-settings.js"
```

Returns `True` or `False`

### Read File Content

```powershell
# Show entire file
Get-Content "src/ipc-handlers/global-settings.js"

# Show first 20 lines
Get-Content "src/ipc-handlers/global-settings.js" | Select-Object -First 20

# Show last 30 lines
Get-Content "src/ipc-handlers/global-settings.js" | Select-Object -Last 30

# Show specific lines (e.g., lines 380-400)
Get-Content "src/ipc-handlers/global-settings.js" | Select-Object -Skip 379 -First 21
```

---

## 🔧 Common Development Commands

### npm Commands (These work the same!)

```powershell
npm run test:smoke       # Run smoke test
npm run dev              # Start development server
npm install              # Install dependencies
npm run build            # Build the app
```

### Git Commands (These work the same!)

```powershell
git status               # See what changed
git add .                # Stage all changes
git commit -m "message"  # Commit changes
git log --oneline -10    # See recent commits
git diff                 # See what changed
```

---

## 📊 Practical Examples for This Project

### 1. Find all User-related functions

```powershell
Select-String -Pattern "function.*User" -Path "src/ipc-handlers/global-settings.js" | Select-Object LineNumber, Line
```

### 2. Search for "phone" in all backend files

```powershell
Get-ChildItem -Path src/ -Recurse -Filter *.js | Select-String -Pattern "phone" -CaseSensitive
```

**Shorter:**
```powershell
ls src/ -r -i *.js | sls "phone" -ca
```

### 3. Search for "email" in frontend

```powershell
ls frontend/src/ -r -i *.vue | sls "email"
```

### 4. Find all SELECT queries

```powershell
Select-String -Pattern "SELECT" -Path "src/ipc-handlers/global-settings.js" -CaseSensitive
```

### 5. Count lines in a file

```powershell
(Get-Content "src/ipc-handlers/global-settings.js").Count
```

### 6. Find TODOs in code

```powershell
ls src/ -r -i *.js | sls "TODO"
```

---

## 🎯 Quick Reference Card

| Task | PowerShell Command | Notes |
|------|-------------------|-------|
| **Search in file** | `sls "text" file.js` | `sls` = `Select-String` |
| **Search with line numbers** | `sls "text" file.js \| select LineNumber,Line` | Shows line #s |
| **Search in all files** | `ls folder/ -r -i *.js \| sls "text"` | Recursive search |
| **List files** | `ls` or `dir` | Same as Windows |
| **Read file** | `cat file.js` | `cat` = `Get-Content` |
| **First 20 lines** | `cat file.js \| select -First 20` | Like `head` |
| **Last 30 lines** | `cat file.js \| select -Last 30` | Like `tail` |
| **Check file exists** | `Test-Path file.js` | Returns True/False |
| **Current directory** | `pwd` | Print Working Directory |
| **Change directory** | `cd folder/` | Same as bash |

---

## 🆚 Comparison: grep vs PowerShell

| grep (Git Bash) | PowerShell | What it does |
|----------------|------------|--------------|
| `grep "text" file` | `sls "text" file` | Search in file |
| `grep -n "text" file` | `sls "text" file \| select LineNumber,Line` | Show line numbers |
| `grep -r "text" folder/` | `ls folder/ -r \| sls "text"` | Search recursively |
| `grep -i "text" file` | `sls "text" file` | Case-insensitive (PowerShell default) |
| `grep -C 2 "text" file` | `sls "text" file -Context 2` | Show context |
| `cat file` | `cat file` | Read file (same!) |
| `head -20 file` | `cat file \| select -First 20` | First lines |
| `tail -30 file` | `cat file \| select -Last 30` | Last lines |

---

## 💡 Pro Tips

### 1. Use Aliases (Shorter Commands)

PowerShell has built-in aliases:
- `ls` = `Get-ChildItem`
- `cat` = `Get-Content`
- `sls` = `Select-String`
- `select` = `Select-Object`
- `pwd` = `Get-Location`
- `cd` = `Set-Location`

### 2. Tab Completion

Type the first few letters and press `Tab`:
```powershell
Select-Str[Tab]  # Completes to Select-String
```

### 3. Command History

- Press `↑` (up arrow) to see previous commands
- Press `Ctrl+R` to search command history

### 4. Copy Output

```powershell
# Copy to clipboard
sls "text" file.js | Set-Clipboard

# Save to file
sls "text" file.js > results.txt
```

### 5. Multiple Patterns

```powershell
Select-String -Pattern "getUsers|saveUser|deleteUser" -Path file.js
```

---

## 🔀 Alternative: Switch to Git Bash

If you prefer using `grep` commands as written in the guides:

### Option 1: Open Git Bash in VS Code

1. In VS Code, click the `+` dropdown in terminal panel
2. Select "Git Bash"

### Option 2: Set Git Bash as Default

1. Press `Ctrl+Shift+P`
2. Type: "Terminal: Select Default Profile"
3. Choose "Git Bash"
4. Open new terminal (`Ctrl+Shift+` `)

### Option 3: Use Both

Keep PowerShell for some commands, open Git Bash for `grep`:
- Click `+` in terminal to add a new terminal
- Choose Git Bash
- Now you have both open in tabs!

---

## ✅ Test Your Setup

Try these commands in your PowerShell terminal:

```powershell
# 1. Check you're in the right place
pwd
# Should show: C:\Dev\dbx-BOQ

# 2. Search for a function
sls "getUsers" src/ipc-handlers/global-settings.js | select LineNumber,Line

# 3. List JavaScript files
ls src/ipc-handlers/ -Filter *.js

# 4. Read first 10 lines of a file
cat src/ipc-handlers/global-settings.js | select -First 10
```

---

## 📚 Updated Guides

I'll update the guides to show **both** PowerShell and Git Bash commands!

For now, whenever you see `grep` in the guides, use this conversion:

```
grep -n "text" file.js
→
Select-String "text" file.js | Select-Object LineNumber, Line
```

Or shorter:
```
sls "text" file.js | select LineNumber,Line
```

---

**You're all set to use PowerShell for development!** 🚀
