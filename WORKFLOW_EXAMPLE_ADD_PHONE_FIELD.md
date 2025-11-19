# Workflow Example: Adding Phone Number to Users

**This is a step-by-step walkthrough demonstrating the complete development workflow.**

We'll add a "Phone Number" field to the Users management feature, showing you exactly what to check at each step to avoid breaking existing functionality.

---

## STEP 1: Planning & Investigation

### 1.1 Define What We're Adding
**Goal:** Add a phone number field to user records

**Questions to answer:**
- Does the database column already exist?
- What other features use the User_ table?
- What files will we need to modify?

### 1.2 Check Database Schema

First, let's see if a phone column exists in the User_ table:

```sql
-- Run this in SQL Server Management Studio or your SQL client
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM COMMON.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'User_'
  AND TABLE_SCHEMA = 'dbo'
ORDER BY ORDINAL_POSITION;
```

**Expected columns we know about:**
- UserID (nvarchar(8)) - Maps to `username`
- UserName (nvarchar(50)) - Maps to `fullName`
- Password (nvarchar(8)) - Maps to `password`
- Email (nvarchar) - Maps to `email`
- SecurityLevel (int) - Maps to `securityLevel`
- etc...

**Looking for:** `Phone`, `PhoneNumber`, `Mobile`, `Telephone`, etc.

### 1.3 Search Existing Code

```bash
# Check if phone is mentioned anywhere
grep -ri "phone" src/ipc-handlers/global-settings.js
grep -ri "phone" frontend/src/components/Settings/UsersTab.vue

# Check what files handle users
grep -r "getUsers" src/
grep -r "saveUser" src/
```

### 1.4 Create Git Checkpoint

```bash
# Save current state before making changes
git status                    # See what's uncommitted
git add .                     # Stage everything
git commit -m "Before: Adding phone number field to Users"
```

**Why?** If something breaks, we can easily revert with `git reset --hard HEAD`

---

## STEP 2: Run Pre-Change Tests

### 2.1 Run Smoke Test

```bash
npm run test:smoke
```

**Expected output:**
```
✓ All smoke tests passed!
```

If this fails, **STOP** and fix those issues first before making changes.

### 2.2 Manual Verification

Start the app and verify Users tab works:

```bash
npm run dev
```

**Checklist:**
- [ ] App starts without console errors
- [ ] Database shows "Connected"
- [ ] Navigate to Settings → Users tab
- [ ] Users list loads
- [ ] Can add new user
- [ ] Can edit existing user
- [ ] Can delete user (not current)

**Take a screenshot or note:** "Users tab working before changes"

---

## STEP 3: Investigate Database Column

**Scenario A: Phone column exists**
Great! Just need to map it in code.

**Scenario B: Phone column doesn't exist**
We need to add it, but remember the constraint: **We can't modify database schemas**
because it requires manual changes on user databases.

**For this example, let's assume there's already a `Phone` column** (nvarchar(20))

---

## STEP 4: Make Backend Changes

### 4.1 Update getUsers() Query

**File:** `src/ipc-handlers/global-settings.js`

**Current code** (line ~388-403):
```javascript
const result = await pool.request().query(`
  SELECT
    UserID as username,
    UserName as fullName,
    Email as email,
    SecurityLevel as securityLevel,
    UsePassword as usePassword,
    BudLimit as budgetLimit,
    OrderLimit as orderLimit,
    VarLimit as variationLimit,
    ETSLimit as etsLimit,
    UserPermissions as permissions,
    CASE WHEN SecurityLevel > 0 THEN 1 ELSE 0 END as active
  FROM ${userTable}
  ORDER BY UserName
`);
```

**Add phone field:**
```javascript
const result = await pool.request().query(`
  SELECT
    UserID as username,
    UserName as fullName,
    Email as email,
    Phone as phone,                    // ← ADD THIS LINE
    SecurityLevel as securityLevel,
    UsePassword as usePassword,
    BudLimit as budgetLimit,
    OrderLimit as orderLimit,
    VarLimit as variationLimit,
    ETSLimit as etsLimit,
    UserPermissions as permissions,
    CASE WHEN SecurityLevel > 0 THEN 1 ELSE 0 END as active
  FROM ${userTable}
  ORDER BY UserName
`);
```

### 4.2 Update getUser() Query

**Same file** (line ~428-445):

**Add same line:**
```javascript
SELECT
  UserID as username,
  UserName as fullName,
  Email as email,
  Phone as phone,                    // ← ADD THIS LINE
  SecurityLevel as securityLevel,
  // ... rest of fields
```

### 4.3 Update saveUser() - UPDATE Statement

**Same file** (line ~510-536):

**Add to UPDATE query:**
```javascript
const request = pool.request()
  .input('userId', user.username)
  .input('fullName', user.fullName || '')
  .input('email', user.email || null)
  .input('phone', user.phone || null)           // ← ADD THIS LINE
  .input('securityLevel', securityLevel)
  // ... rest of inputs

let updateQuery = `
  UPDATE ${userTable}
  SET
    UserName = @fullName,
    Email = @email,
    Phone = @phone,                              // ← ADD THIS LINE
    SecurityLevel = @securityLevel,
    // ... rest of SET clause
```

### 4.4 Update saveUser() - INSERT Statement

**Same file** (line ~549-577):

**Add to INSERT query:**
```javascript
await pool.request()
  .input('userId', user.username)
  .input('fullName', user.fullName || '')
  .input('email', user.email || null)
  .input('phone', user.phone || null)           // ← ADD THIS LINE
  .input('password', passwordToSave)
  // ... rest of inputs
  .query(`
    INSERT INTO ${userTable} (
      UserID, UserName, Email, Phone,           // ← ADD Phone HERE
      Password, SecurityLevel,
      UsePassword, BudLimit, OrderLimit, VarLimit, ETSLimit,
      UserPermissions
    ) VALUES (
      @userId, @fullName, @email, @phone,       // ← ADD @phone HERE
      @password, @securityLevel,
      @usePassword, @budLimit, @orderLimit, @varLimit, @etsLimit,
      @permissions
    )
  `);
```

**Save the file!**

---

## STEP 5: Test Backend Changes

### 5.1 Check for Syntax Errors

```bash
npm run test:smoke
```

**If it passes:** Backend code has no syntax errors ✓

**If it fails:** Review the error message, fix syntax, try again

### 5.2 Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Restart it
npm run dev
```

Watch the terminal for errors during startup.

---

## STEP 6: Make Frontend Changes

### 6.1 Update formData Structure

**File:** `frontend/src/components/Settings/UsersTab.vue`

**Find formData** (line ~411-432):

**Add phone field:**
```javascript
const formData = ref({
  username: '',
  fullName: '',
  email: '',
  phone: '',                    // ← ADD THIS LINE
  password: '',
  securityLevel: 2,
  active: true,
  // ... rest of fields
});
```

### 6.2 Add Phone Input to Form Template

**Same file**, find the Email section (line ~197-203):

**Add phone field after email:**
```vue
<!-- Email -->
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

### 6.3 Update showAddUser() Function

**Same file** (line ~469-497):

**Add phone to reset:**
```javascript
function showAddUser() {
  editMode.value = false;
  formData.value = {
    username: '',
    fullName: '',
    email: '',
    phone: '',              // ← ADD THIS LINE
    password: '',
    // ... rest
  };
  // ...
}
```

### 6.4 Update editUser() Function

**Same file** (line ~499-516):

**Add phone mapping:**
```javascript
function editUser(user) {
  editMode.value = true;
  formData.value = {
    username: user.username,
    fullName: user.fullName || '',
    email: user.email || '',
    phone: user.phone || '',              // ← ADD THIS LINE
    password: '',
    // ... rest of mappings
  };
  // ...
}
```

### 6.5 (Optional) Add Phone Column to Table Display

**Same file**, find the table headers (line ~32-37):

**Add Phone column:**
```vue
<thead class="table-light">
  <tr>
    <th style="width: 50px;"></th>
    <th>Username</th>
    <th>Full Name</th>
    <th>Email</th>
    <th>Phone</th>              <!-- ADD THIS -->
    <th>Security Level</th>
    <th>Status</th>
    <th style="width: 120px;">Actions</th>
  </tr>
</thead>
```

**Add phone data cell** (line ~60-74):

```vue
<td>{{ user.fullName || '-' }}</td>
<td>{{ user.email || '-' }}</td>
<td>{{ user.phone || '-' }}</td>    <!-- ADD THIS -->
<td>
  <span class="badge" :class="getSecurityLevelClass(user.securityLevel)">
```

**Save the file!**

---

## STEP 7: Test Your Changes

### 7.1 Check Browser Console

Open DevTools (F12), check for:
- Red errors in Console tab
- Any warnings about missing properties

### 7.2 Test Adding New User

1. Click "Add User"
2. Fill in all fields INCLUDING phone number
3. Click "Save"
4. **Check console logs** - should show:
   ```
   Saving user data: { username: '...', fullName: '...', phone: '...' }
   ```
5. **Verify** user appears in list with phone number

### 7.3 Test Editing Existing User

1. Click Edit on an existing user
2. Change the phone number
3. Save
4. **Verify** phone number updated in list
5. **Check database** (optional):
   ```sql
   SELECT UserID, UserName, Phone FROM COMMON.dbo.User_
   WHERE UserID = 'testuser'
   ```

### 7.4 Test Edge Cases

- [ ] Leave phone blank - should save as NULL
- [ ] Enter long phone number - should be limited by maxlength
- [ ] Edit user without changing phone - should keep existing value

---

## STEP 8: Test Related Features

**THIS IS CRITICAL!** Make sure you didn't break anything else.

### 8.1 Quick Regression Check

- [ ] Navigate to Settings → Companies tab - still works?
- [ ] Navigate to Settings → UI Preferences - still works?
- [ ] Can still log in as a user (if login feature exists)?
- [ ] No console errors anywhere?

### 8.2 Run Full Smoke Test

```bash
npm run test:smoke
```

Should still pass!

---

## STEP 9: Update Documentation

### 9.1 Update Field Mapping Reference

**File:** `TESTING_CHECKLIST.md`

**Find the Users field mapping section**, add:

```
USERS:
UserID             → username (8 char login ID)
UserName           → fullName (person's actual name)
Phone              → phone (20 chars)          ← ADD THIS
Email              → email
...
```

**File:** `DEVELOPMENT_WORKFLOW.md`

Update the same section there too.

---

## STEP 10: Commit Your Changes

### 10.1 Review What Changed

```bash
git diff
```

**Should see changes in:**
- `src/ipc-handlers/global-settings.js` (3 places: SELECT, UPDATE, INSERT)
- `frontend/src/components/Settings/UsersTab.vue` (form, formData, functions, table)
- `TESTING_CHECKLIST.md` (documentation)
- `DEVELOPMENT_WORKFLOW.md` (documentation)

### 10.2 Stage and Commit

```bash
git add .
git commit -m "Feature: Add phone number field to Users management

- Add Phone column to Users backend queries (SELECT, INSERT, UPDATE)
- Add phone input field to Users form in frontend
- Add phone column to Users table display
- Update formData, showAddUser(), editUser() to include phone
- Update field mapping documentation
- Tested: Add user with phone, edit user phone, phone displays in list"
```

### 10.3 (Optional) Push to Remote

```bash
git push origin main
```

---

## STEP 11: Final Verification

### 11.1 Fresh Start Test

1. Stop dev server (Ctrl+C)
2. Restart: `npm run dev`
3. Navigate directly to Users tab
4. Verify phone field works
5. Check no errors in console

### 11.2 Update Checklist

Open `TESTING_CHECKLIST.md` and add a checkmark:

```
Users Management:
☑ Add new user with phone number
☑ Edit existing user phone number
☑ Phone displays in users list
```

---

## STEP 12: Celebrate! 🎉

You successfully:
1. ✅ Added a feature without breaking existing code
2. ✅ Tested thoroughly at each step
3. ✅ Committed with a clear message
4. ✅ Updated documentation

---

## What We Learned

### Key Takeaways:

1. **Always check database schema first** - Know what columns exist
2. **Update ALL queries** - SELECT, INSERT, UPDATE must all include the new field
3. **Frontend follows backend** - Field names should match
4. **Test at each step** - Backend changes → test, Frontend changes → test
5. **Test related features** - Settings tabs share code, test all tabs
6. **Document as you go** - Update field mappings immediately
7. **Commit frequently** - Easy to revert if something breaks

### Common Mistakes We Avoided:

❌ **Forgetting to update INSERT query** - New users wouldn't have phone saved
❌ **Forgetting to update editUser()** - Editing would lose phone number
❌ **Not testing edit mode** - Only testing "add new" isn't enough
❌ **Not checking other tabs** - Companies tab could have broken
❌ **Poor commit message** - "update" tells us nothing

---

## Troubleshooting

### Problem: Phone saves but doesn't display

**Check:**
1. Did you add `Phone as phone` to SELECT query?
2. Did you add `{{ user.phone }}` to table template?
3. Check browser console for undefined errors

### Problem: Phone displays but doesn't save

**Check:**
1. Did you add `.input('phone', user.phone || null)` to UPDATE?
2. Did you add Phone to UPDATE SET clause?
3. Did you add phone to INSERT VALUES?
4. Check backend console logs

### Problem: Editing user loses phone number

**Check:**
1. Did you add `phone: user.phone || ''` to editUser()?
2. Is `v-model="formData.phone"` correct in template?

---

## Next Steps

Now that you've mastered this workflow, you can apply it to:

- Adding other fields (Department, Title, etc.)
- Adding fields to Companies
- Creating entirely new features
- Refactoring existing code safely

**Always remember:**
1. Test before changing
2. Change one thing at a time
3. Test after changing
4. Commit frequently

---

**This workflow prevents regressions and makes development predictable and safe.**
