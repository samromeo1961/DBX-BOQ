# Development Workflow Guide

**How to make changes without breaking existing features**

## Quick Reference

```bash
# Before making changes
npm run test:smoke              # Run quick syntax check

# After making changes
npm run test:smoke              # Verify no syntax errors
npm run dev                     # Start app and manually test
npm run test:checklist          # View full testing checklist

# Commit changes
git add .
git commit -m "Clear description of what changed"
git push
```

---

## The Problem

When you make a change to fix one thing, it can break something else because:

1. **Shared Code** - Many features use the same files (preload.js, connection.js, etc.)
2. **Field Name Changes** - Renaming a database field breaks everywhere it's used
3. **Database Schema** - Changes to how we query the database affect multiple features
4. **IPC Handler Changes** - Backend changes affect frontend components

## The Solution: Follow This Workflow

### STEP 1: Before You Start (Plan)

**Ask yourself:**
- What exactly am I trying to fix or add?
- Which files will I need to change?
- What other features might use these files?

**Check dependencies:**
```bash
# Search for where a function/field is used
grep -r "functionName" src/
grep -r "fieldName" frontend/src/
```

**Create a git checkpoint:**
```bash
git add .
git commit -m "Before: [what you're about to change]"
```

This lets you easily revert if something breaks!

### STEP 2: Make Changes (One Feature at a Time)

**IMPORTANT RULES:**

1. **Change ONE feature at a time**
   - Don't jump around to multiple unrelated features
   - Finish and test one thing before moving to the next

2. **Be consistent with field names**
   - If you change a database field mapping, update EVERYWHERE:
     - Backend SELECT query
     - Backend INSERT/UPDATE query
     - Frontend component that displays it
     - Frontend component that saves it

3. **Don't rename fields unless absolutely necessary**
   - Renaming is a common source of breaks
   - If you must rename, search for ALL occurrences first

4. **Use the same field names in frontend and backend**
   - Example: If backend returns `fullName`, frontend should use `fullName`
   - Avoid mapping like `fullName` → `surname` → `name` (confusing!)

### STEP 3: Test Your Changes

**Run the smoke test:**
```bash
npm run test:smoke
```

**Start the app:**
```bash
npm run dev
```

**Test your specific change:**
1. Navigate to the feature you changed
2. Verify it works
3. Try edge cases (empty fields, max length, etc.)

**Test related features:**
- If you changed Users tab, also test Companies tab (both use Settings)
- If you changed database queries, test all features that use that table
- If you changed preload.js, test ALL tabs (it affects everything)

**Quick smoke test checklist:**
- [ ] App starts without console errors
- [ ] Database connection shows "Connected"
- [ ] All tabs load (Jobs, BOQ, Catalogue, Purchase Orders, Templates, Settings)
- [ ] The feature I changed works
- [ ] Related features still work

### STEP 4: Commit Your Changes

**Good commit message format:**
```
[Type]: [Feature] - [What changed]

Examples:
Fix: Users tab - Map fullName to UserName database column
Feature: Add password confirmation to Users tab
Refactor: Update Companies to use ATO-prefixed fields
```

**Commit:**
```bash
git add .
git commit -m "Fix: Users tab - Full name now saves correctly to UserName column"
git push
```

### STEP 5: If Something Breaks

**Don't panic! Here's what to do:**

1. **Check the console for errors:**
   - Main process errors show in terminal
   - Renderer errors show in DevTools (F12)

2. **Check what changed:**
   ```bash
   git diff
   ```

3. **Common issues and fixes:**

   | Error | Likely Cause | Fix |
   |-------|--------------|-----|
   | "Invalid column name X" | Field name mismatch | Check database vs code field names |
   | "Cannot read property of undefined" | Field doesn't exist on object | Check backend is returning the field |
   | "Function not found" | IPC handler not registered | Check main.js and preload.js |
   | "Object could not be cloned" | Trying to send Vue ref over IPC | Convert to plain object first |

4. **Revert if needed:**
   ```bash
   git diff > my_changes.patch    # Save your changes
   git reset --hard HEAD          # Revert to last commit
   ```

   Then you can review your changes in `my_changes.patch` and re-apply carefully.

---

## Common Change Scenarios

### Scenario 1: Adding a New Field to Users

**Steps:**
1. ✓ Check if database column exists
2. ✓ Update backend getUsers() SELECT query
3. ✓ Update backend getUser() SELECT query
4. ✓ Update backend saveUser() INSERT query
5. ✓ Update backend saveUser() UPDATE query
6. ✓ Add field to frontend formData
7. ✓ Add input field to frontend template
8. ✓ Test: Add new user (INSERT)
9. ✓ Test: Edit existing user (UPDATE)

### Scenario 2: Changing How a Field is Named

**Example: Changing `surname` to `fullName`**

**Steps:**
1. ✓ Search for all occurrences:
   ```bash
   grep -r "surname" src/
   grep -r "surname" frontend/src/
   ```
2. ✓ Update backend queries (SELECT, INSERT, UPDATE)
3. ✓ Update frontend formData
4. ✓ Update frontend template (v-model="formData.fullName")
5. ✓ Update any computed properties or methods
6. ✓ Test thoroughly

### Scenario 3: Adding a New Feature (New Tab)

**Steps:**
1. ✓ Create backend IPC handler (src/ipc-handlers/newfeature.js)
2. ✓ Register handlers in main.js
3. ✓ Expose handlers in preload.js
4. ✓ Create frontend component
5. ✓ Add route to router
6. ✓ Add nav link to App.vue
7. ✓ Test: Does it load?
8. ✓ Test: Does it save?
9. ✓ Test: Do other tabs still work?

---

## Field Mapping Reference

**Keep this updated when you change mappings!**

### Users (COMMON.User_)
```
Database Column    Frontend Field    Type           Notes
================== ================= ============== ===================
UserID             username          string(8)      Login ID (primary key)
UserName           fullName          string(50)     Person's actual name
Password           password          string(8)      Plain text
Email              email             string
SecurityLevel      securityLevel     int            0 = inactive
UsePassword        usePassword       boolean
BudLimit           budgetLimit       decimal
OrderLimit         orderLimit        decimal
VarLimit           variationLimit    decimal
ETSLimit           etsLimit          decimal
UserPermissions    permissions       string
```

### Companies (COMMON.Company)
```
Database Column    Frontend Field    Type           Notes
================== ================= ============== ===================
CompanyNumber      id                int            Primary key
Company            name              string
SystemDBase        systemDatabase    string         e.g., CROWNESYS
JobDBase           jobDatabase       string         e.g., CROWNEJOB
ACN                abn               string
ATOAddress         address1          string
ATOAddress2        address2          string
ATOCity            city              string
ATOState           state             string(3)
ATOPostCode        postCode          string(4)
ATOPhone           phone             string
ATOFax             fax               string
ATOEmail           email             string
ReportLogo         logoPath          string         File path
```

---

## Emergency Contacts / Resources

**Getting Help:**
- Check CLAUDE.md for project architecture
- Check DATABUILD_DATABASE_SCHEMA.md for database structure
- Check TESTING_CHECKLIST.md for regression tests
- Search GitHub issues (if applicable)

**Key Documentation Files:**
- `CLAUDE.md` - Project architecture and patterns
- `DATABUILD_DATABASE_SCHEMA.md` - Database schema reference
- `TESTING_CHECKLIST.md` - Full regression test checklist
- `DEVELOPMENT_WORKFLOW.md` - This file

**When All Else Fails:**
```bash
# Create a new branch to preserve your work
git checkout -b backup-branch

# Go back to last known working state
git checkout main
git pull

# Cherry-pick specific commits if needed
git cherry-pick <commit-hash>
```

---

## Summary: The Golden Rules

1. **Test before you change** - Know what works now
2. **Change one thing at a time** - Don't mix unrelated changes
3. **Be consistent with names** - Use same field names everywhere
4. **Test after you change** - Verify it works and didn't break anything
5. **Commit frequently** - Small commits are easier to debug/revert
6. **Use descriptive commit messages** - Future you will thank you
7. **When in doubt, ask** - Better to ask than to break production

Remember: **It's okay to make mistakes! Just commit often so you can easily undo them.**
