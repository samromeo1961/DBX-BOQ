# Testing Checklist for DBx BOQ

**Use this checklist BEFORE and AFTER making changes to ensure nothing breaks**

## Quick Smoke Test (Run after every change)

### Database Connection
- [ ] App starts without errors
- [ ] Database connection indicator shows "Connected"
- [ ] No console errors on startup

### Navigation (All tabs load)
- [ ] Jobs tab loads
- [ ] BOQ tab loads
- [ ] Catalogue tab loads
- [ ] Purchase Orders tab loads
- [ ] Templates tab loads
- [ ] Settings tab loads

### Settings Tab - Critical Features
- [ ] **Companies**: List loads, can view company details
- [ ] **Users**: List loads, shows current user badge
- [ ] **UI Preferences**: Form loads with current values

## Full Regression Test (Run before committing major changes)

### Companies Management
| Test | Status | Notes |
|------|--------|-------|
| Load companies from COMMON database | ⬜ | Should show all companies |
| Display active company with badge | ⬜ | Active company highlighted |
| Add new company | ⬜ | All fields save (especially ATOAddress, ATOPhone, etc.) |
| Edit company - Name changes | ⬜ | |
| Edit company - Address changes | ⬜ | ATO fields update correctly |
| Edit company - Database names | ⬜ | SystemDBase, JobDBase update |
| Switch to different company | ⬜ | Updates active company |
| Delete inactive company | ⬜ | Successfully removes |
| Cannot delete active company | ⬜ | Delete button disabled |

### Users Management
| Test | Status | Notes |
|------|--------|-------|
| Load users from COMMON database | ⬜ | All users display |
| Display current user badge | ⬜ | Current user highlighted |
| **Add New User** | | |
| - Username field (8 char limit) | ⬜ | Max length enforced |
| - Full Name field | ⬜ | Saves to UserName column |
| - Password field (8 char limit) | ⬜ | Saves as plain text |
| - Password confirmation | ⬜ | Validates match |
| - Show/hide password toggles | ⬜ | Eye icons work |
| - Email saves | ⬜ | |
| - Security Level saves | ⬜ | |
| - Active toggle ON | ⬜ | Sets SecurityLevel as selected |
| - Active toggle OFF | ⬜ | Sets SecurityLevel to 0 |
| **Edit Existing User** | | |
| - Username disabled | ⬜ | Cannot change UserID |
| - Full Name updates | ⬜ | Changes save to UserName |
| - Password blank = no change | ⬜ | Existing password kept |
| - New password saves | ⬜ | Password updates |
| - Email updates | ⬜ | |
| - Security Level changes | ⬜ | |
| - Active toggle works | ⬜ | Updates SecurityLevel |
| Delete user (not current) | ⬜ | Successfully removes |
| Cannot delete current user | ⬜ | Delete button disabled |

### UI Preferences
| Test | Status | Notes |
|------|--------|-------|
| Load current preferences | ⬜ | Form populates correctly |
| Grid row height changes | ⬜ | Preview updates |
| Font size changes | ⬜ | Preview updates |
| Default startup tab saves | ⬜ | |
| Confirm dialogs toggle | ⬜ | |
| Save without serialization error | ⬜ | No "object could not be cloned" error |

### BOQ Features (Core functionality)
| Test | Status | Notes |
|------|--------|-------|
| Load job list | ⬜ | Jobs display in grid |
| Select job | ⬜ | Bill items load |
| Add new bill item | ⬜ | Saves to database |
| Edit bill item | ⬜ | Changes save |
| Delete bill item | ⬜ | Removes from database |
| Recipe explosion | ⬜ | Sub-items expand correctly |
| Supplier field works | ⬜ | If column exists, dropdown works |

### Catalogue Features
| Test | Status | Notes |
|------|--------|-------|
| Load catalogue items | ⬜ | PriceList items display |
| Search/filter works | ⬜ | |
| View item details | ⬜ | Slide-up panel shows |
| Import catalogue | ⬜ | CSV import works |
| Delete catalogue items | ⬜ | Bulk delete works |

### Purchase Orders
| Test | Status | Notes |
|------|--------|-------|
| Load orders | ⬜ | Orders display |
| Create new order | ⬜ | Saves correctly |
| Edit order | ⬜ | Changes save |

## Known Issues / Caveats

1. **Database Schema Constraints**:
   - UserID (username) is max 8 characters (nvarchar(8))
   - Password is max 8 characters (nvarchar(8))
   - Cannot alter table structures without manual database changes

2. **Field Mappings** (DO NOT CHANGE without updating both backend and frontend):
   ```
   Database Column    → Frontend Field
   ==================   ===============
   COMPANIES:
   CompanyNumber      → id
   Company            → name
   ATOAddress         → address1
   ATOAddress2        → address2
   ATOCity            → city
   ATOState           → state
   ATOPostCode        → postCode
   ATOPhone           → phone
   ATOFax             → fax
   ATOEmail           → email
   SystemDBase        → systemDatabase
   JobDBase           → jobDatabase

   USERS:
   UserID             → username (8 char login ID)
   UserName           → fullName (person's actual name)
   Password           → password (plain text, 8 chars)
   SecurityLevel      → securityLevel (0 = inactive)
   UsePassword        → usePassword
   BudLimit           → budgetLimit
   OrderLimit         → orderLimit
   VarLimit           → variationLimit
   ETSLimit           → etsLimit
   ```

3. **Critical Files** (Changes here may affect multiple features):
   - `src/ipc-handlers/global-settings.js` - Backend for Settings tab
   - `src/database/connection.js` - Database connection pool
   - `preload.js` - IPC bridge (affects ALL features)
   - `frontend/src/composables/useElectronAPI.js` - Frontend API access

## Before Making Changes

1. Run Quick Smoke Test
2. Note which features are working
3. Make changes
4. Run Quick Smoke Test again
5. Test the feature you changed
6. Test related features
7. If time permits, run Full Regression Test

## After Finding a Break

1. Check git diff to see what changed
2. Look for field name changes, database queries, IPC handler changes
3. Check console for errors
4. Use console.log debugging
5. Revert if necessary

## Git Commit Best Practices

When committing, use descriptive messages:

**Good commit messages:**
- `Fix: Users tab - map fullName to UserName database column`
- `Feature: Add password confirmation to Users tab`
- `Refactor: Update Companies tab to use ATO-prefixed fields`

**Bad commit messages:**
- `fix bug`
- `update`
- `changes`

This makes it easier to find what broke and when.
