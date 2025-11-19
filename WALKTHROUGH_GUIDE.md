# 👣 STEP-BY-STEP WALKTHROUGH: Where Everything Is

**This guide shows you EXACTLY where to find files and run commands.**

---

## 📁 Part 1: Finding Files in VS Code

### Where is the Backend Code?

1. In VS Code, look at the left sidebar (Explorer)
2. You'll see this structure:

```
DBX-BOQ/
├── src/                         ← Click here to expand
│   └── ipc-handlers/            ← Click here to expand
│       └── global-settings.js   ← YOU HAVE THIS OPEN!
```

**This file (`global-settings.js`) contains:**
- `getUsers()` - Loads users from database (line 376)
- `saveUser()` - Saves/updates users (line 471)
- `getCompanies()` - Loads companies (line 93)
- `saveCompany()` - Saves companies (line 192)

### Where is the Frontend Code?

```
DBX-BOQ/
├── frontend/                    ← Click here to expand
│   └── src/                     ← Click here
│       └── components/          ← Click here
│           └── Settings/        ← Click here
│               ├── UsersTab.vue         ← Users management UI
│               ├── CompaniesTab.vue     ← Companies management UI
│               └── SettingsView.vue     ← Settings page container
```

---

## 💻 Part 2: Using the Terminal

### Opening the Terminal in VS Code

**Method 1 (Menu):**
1. Click `View` in top menu
2. Click `Terminal`

**Method 2 (Keyboard):**
- Press: `Ctrl + ` ` (backtick key, below ESC)

**Method 3 (Icon):**
- Look for terminal icon in bottom panel

### Where Am I When Terminal Opens?

The terminal opens in your project root:
```
PS C:\Dev\dbx-BOQ>
```

This is correct! You're at the top level of your project.

---

## 🔍 Part 3: Running Search Commands

### Search Command Examples

**1. Search for "phone" in a specific file:**

```bash
grep -n "phone" src/ipc-handlers/global-settings.js
```

**What this does:**
- `grep` = search
- `-n` = show line numbers
- `"phone"` = what to search for
- `src/ipc-handlers/global-settings.js` = where to search

**2. Search for "phone" in ALL backend files:**

```bash
grep -r "phone" src/
```

**What this does:**
- `-r` = recursive (search in all subdirectories)
- `src/` = search in src folder and everything inside it

**3. Search case-insensitive:**

```bash
grep -ri "phone" src/
```

- `-i` = ignore case (finds "phone", "Phone", "PHONE")

**4. Search and show context (2 lines before and after):**

```bash
grep -n -C 2 "getUsers" src/ipc-handlers/global-settings.js
```

- `-C 2` = show 2 lines of context around each match

---

## 📝 Part 4: Making Changes - A Visual Guide

### SCENARIO: Adding Phone Field to Users

Let's walk through this together with exact line numbers and locations.

---

### STEP 1: Check Database (SQL)

**WHERE:** SQL Server Management Studio

**HOW:**
1. Open SQL Server Management Studio
2. Click `File` → `Open` → `File`
3. Navigate to: `C:\Dev\dbx-BOQ\scripts\check-user-columns.sql`
4. Press `F5` to execute

**OR copy/paste this:**
```sql
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM COMMON.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'User_'
ORDER BY ORDINAL_POSITION;
```

**LOOK FOR:** A column named `Phone`, `PhoneNumber`, `Mobile`, or `Telephone`

**IF YOU FIND IT:** Proceed to Step 2!
**IF NOT:** You'd need to add the column first (ask your DBA)

---

### STEP 2: Create Git Checkpoint

**WHERE:** VS Code terminal

**TYPE:**
```bash
git status
```

**THEN:**
```bash
git add .
git commit -m "Before: Adding phone field to Users"
```

**WHY:** This creates a savepoint you can return to if something breaks!

---

### STEP 3: Run Smoke Test (Before Changes)

**WHERE:** VS Code terminal

**TYPE:**
```bash
npm run test:smoke
```

**EXPECTED OUTPUT:**
```
=================================
DBx BOQ - Quick Smoke Test
=================================

✓ Checking critical files...
  ✓ All critical files present

✓ Checking for syntax errors...
  ✓ global-settings.js loads without errors

✓ Checking Vue component syntax...
  ✓ SettingsView.vue has valid structure

=================================
Test Summary:
=================================
✓ Critical Files
✓ global-settings.js syntax
✓ SettingsView.vue structure

Total: 3/3 passed

✓ All smoke tests passed!
```

**IF THIS FAILS:** Fix the errors before continuing!

---

### STEP 4: Edit Backend - getUsers() Function

**FILE:** `src/ipc-handlers/global-settings.js` (YOU HAVE THIS OPEN!)

**FIND:** Line 388 (Use `Ctrl+G` and type `388`)

You'll see this:
```javascript
const result = await pool.request().query(`
  SELECT
    UserID as username,
    UserName as fullName,
    Email as email,
    SecurityLevel as securityLevel,
    // ... more fields
  FROM ${userTable}
  ORDER BY UserName
`);
```

**CHANGE TO:**
```javascript
const result = await pool.request().query(`
  SELECT
    UserID as username,
    UserName as fullName,
    Email as email,
    Phone as phone,                    // ← ADD THIS LINE
    SecurityLevel as securityLevel,
    // ... more fields
  FROM ${userTable}
  ORDER BY UserName
`);
```

**HOW TO ADD IT:**
1. Click at the end of line 392 (after `Email as email,`)
2. Press `Enter` to create new line
3. Type: `    Phone as phone,` (4 spaces, then the text)

**SAVE:** `Ctrl+S`

---

### STEP 5: Edit Backend - getUser() Function

**SAME FILE** (global-settings.js)

**FIND:** Line 428 (Use `Ctrl+G` and type `428`)

**ADD THE SAME LINE:**
After `Email as email,`, add:
```javascript
    Phone as phone,
```

**SAVE:** `Ctrl+S`

---

### STEP 6: Edit Backend - saveUser() UPDATE Query

**SAME FILE** (global-settings.js)

**FIND:** Line 512-535 (the UPDATE section)

You'll see:
```javascript
const request = pool.request()
  .input('userId', user.username)
  .input('fullName', user.fullName || '')
  .input('email', user.email || null)
  // ...
```

**ADD AFTER email line:**
```javascript
  .input('phone', user.phone || null)
```

**THEN FIND:** The UPDATE query below (around line 524):
```javascript
let updateQuery = `
  UPDATE ${userTable}
  SET
    UserName = @fullName,
    Email = @email,
    // ...
```

**ADD AFTER Email:**
```javascript
    Phone = @phone,
```

**SAVE:** `Ctrl+S`

---

### STEP 7: Edit Backend - saveUser() INSERT Query

**SAME FILE** (global-settings.js)

**FIND:** Line 555-577 (the INSERT section)

You'll see:
```javascript
await pool.request()
  .input('userId', user.username)
  .input('fullName', user.fullName || '')
  .input('email', user.email || null)
  // ...
  .query(`
    INSERT INTO ${userTable} (
      UserID, UserName, Email, Password,
      // ...
    ) VALUES (
      @userId, @fullName, @email, @password,
      // ...
    )
  `);
```

**ADD `phone` in THREE places:**

1. **In .input() section:**
```javascript
  .input('email', user.email || null)
  .input('phone', user.phone || null)    // ← ADD THIS
  .input('password', passwordToSave)
```

2. **In column list:**
```javascript
INSERT INTO ${userTable} (
  UserID, UserName, Email, Phone, Password,  // ← ADD Phone
  // ...
```

3. **In VALUES list:**
```javascript
VALUES (
  @userId, @fullName, @email, @phone, @password,  // ← ADD @phone
  // ...
```

**SAVE:** `Ctrl+S`

---

### STEP 8: Test Backend Changes

**WHERE:** VS Code terminal

**TYPE:**
```bash
npm run test:smoke
```

**EXPECTED:** Should still pass!

**IF IT FAILS:** Check for syntax errors (missing comma, typo, etc.)

---

### STEP 9: Edit Frontend - FormData

**FILE:** `frontend/src/components/Settings/UsersTab.vue`

**HOW TO OPEN:**
1. In VS Code Explorer (left sidebar)
2. Navigate to: `frontend` → `src` → `components` → `Settings`
3. Click `UsersTab.vue`

**OR use Quick Open:**
- Press `Ctrl+P`
- Type: `UsersTab.vue`
- Press `Enter`

**FIND:** Line 411 (the formData ref)

You'll see:
```javascript
const formData = ref({
  username: '',
  fullName: '',
  email: '',
  password: '',
  // ...
});
```

**ADD AFTER email:**
```javascript
  email: '',
  phone: '',              // ← ADD THIS LINE
  password: '',
```

**SAVE:** `Ctrl+S`

---

### STEP 10: Edit Frontend - Add Input Field

**SAME FILE** (UsersTab.vue)

**FIND:** Line 197-203 (the Email section in the template)

You'll see:
```vue
<!-- Email -->
<div class="row mb-3">
  <div class="col-md-6">
    <label class="form-label">Email</label>
    <input v-model="formData.email" type="email" class="form-control" />
  </div>
</div>
```

**CHANGE TO:**
```vue
<!-- Email and Phone -->
<div class="row mb-3">
  <div class="col-md-6">
    <label class="form-label">Email</label>
    <input v-model="formData.email" type="email" class="form-control" />
  </div>
  <div class="col-md-6">
    <label class="form-label">Phone Number</label>
    <input
      v-model="formData.phone"
      type="tel"
      class="form-control"
      maxlength="20"
      placeholder="e.g., 0412 345 678"
    />
  </div>
</div>
```

**SAVE:** `Ctrl+S`

---

### STEP 11: Edit Frontend - showAddUser() Function

**SAME FILE** (UsersTab.vue)

**FIND:** Line 469-497 (showAddUser function)

**ADD phone to the reset:**
```javascript
formData.value = {
  username: '',
  fullName: '',
  email: '',
  phone: '',              // ← ADD THIS LINE
  password: '',
  // ...
};
```

**SAVE:** `Ctrl+S`

---

### STEP 12: Edit Frontend - editUser() Function

**SAME FILE** (UsersTab.vue)

**FIND:** Line 499-516 (editUser function)

**ADD phone mapping:**
```javascript
formData.value = {
  username: user.username,
  fullName: user.fullName || '',
  email: user.email || '',
  phone: user.phone || '',              // ← ADD THIS LINE
  password: '',
  // ...
};
```

**SAVE:** `Ctrl+S`

---

### STEP 13: Test Your Changes!

**WHERE:** VS Code terminal

**START THE APP:**
```bash
npm run dev
```

**WAIT FOR:**
```
VITE v... ready in ...ms
Local: http://localhost:5173/
```

**THEN:**
- App should open automatically
- Navigate to Settings → Users
- Click "Add User"
- **CHECK:** Do you see the Phone Number field? ✅
- Fill in all fields including phone
- Click Save
- **CHECK:** Does the user save? ✅
- **CHECK:** Console for errors? (Press F12)

---

### STEP 14: Commit Your Changes

**WHERE:** VS Code terminal

**TYPE:**
```bash
git status
```

**YOU SHOULD SEE:**
```
modified:   src/ipc-handlers/global-settings.js
modified:   frontend/src/components/Settings/UsersTab.vue
```

**COMMIT:**
```bash
git add .
git commit -m "Feature: Add phone number field to Users

- Add Phone column to getUsers() SELECT query
- Add Phone to saveUser() INSERT and UPDATE queries
- Add phone input field to Users form
- Add phone to formData, showAddUser(), editUser()"
```

---

## 🎉 DONE!

You've successfully:
✅ Added a field to the backend
✅ Added a field to the frontend
✅ Tested it works
✅ Committed with a clear message

---

## 🆘 Troubleshooting

### "I can't find line 388!"

**HOW TO GO TO A SPECIFIC LINE:**
1. Press `Ctrl+G`
2. Type the line number (e.g., `388`)
3. Press `Enter`

### "Terminal says command not found!"

**CHECK:**
- Are you in the project root? (`C:\Dev\dbx-BOQ>`)
- Did you run `npm install` first?

**TO GET BACK TO PROJECT ROOT:**
```bash
cd C:\Dev\dbx-BOQ
```

### "Smoke test fails!"

**READ THE ERROR MESSAGE** - it tells you exactly what's wrong!

Common issues:
- Syntax error (missing comma, typo)
- File not saved (`Ctrl+S` to save)

### "App won't start!"

**CHECK:**
1. Terminal for error messages
2. Did you save all files? (`File` → `Save All` or `Ctrl+K S`)
3. Try: `Ctrl+C` to stop, then `npm run dev` again

---

## 📚 Command Reference Card

| Command | What It Does | Where to Run |
|---------|-------------|--------------|
| `npm run test:smoke` | Quick syntax check | VS Code terminal |
| `npm run dev` | Start the app | VS Code terminal |
| `git status` | See what changed | VS Code terminal |
| `git add .` | Stage all changes | VS Code terminal |
| `git commit -m "message"` | Save a checkpoint | VS Code terminal |
| `grep -r "text" src/` | Search for text | VS Code terminal |
| `Ctrl+G` | Go to line number | VS Code |
| `Ctrl+P` | Quick open file | VS Code |
| `Ctrl+F` | Find in current file | VS Code |
| `Ctrl+Shift+F` | Find in all files | VS Code |

---

**Now you know WHERE everything is and HOW to run commands!**
