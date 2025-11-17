# BOQ System Project - Planning Summary

## Overview

**Project:** Bill of Quantities (BOQ) Module for Databuild Construction Estimating
**Status:** Planning Complete ✅
**Recommended Approach:** Integrate into existing Databuild-API-Vue project

---

## Documents Created

### 1. **DEVELOPMENT_PLAN.md** *(Original Standalone Plan)*
- **Location:** `C:\Dev\dbx-BOQ\DBX-BOQ\DEVELOPMENT_PLAN.md`
- **Content:** Comprehensive 17-week plan for standalone application
- **Status:** Reference only - superseded by integration strategy
- **Use Case:** Useful for understanding full BOQ requirements

### 2. **BOQ_INTEGRATION_STRATEGY.md** *(Recommended Approach)*
- **Location:** `C:\Dev\dbx-BOQ\DBX-BOQ\BOQ_INTEGRATION_STRATEGY.md`
- **Content:** Detailed plan for integrating BOQ into existing project
- **Status:** **ACTIVE - Recommended for implementation**
- **Timeline:** 7-8 weeks (vs 17 weeks standalone)
- **Benefit:** Leverages 90%+ existing infrastructure

### 3. **BOQ Requirements Specification**
- **Source:** User-provided specification document
- **Coverage:** All BOQ features, options, workflows, and constraints
- **Status:** Fully analyzed and mapped to database schema

### 4. **Database Schema Documentation**
- **Location:** `C:\Dev\Databuild-API-Vue\DATABUILD_DATABASE_SCHEMA.md`
- **Content:** Comprehensive SQL Server schema documentation
- **Status:** Already exists in target project

---

## Key Findings from Existing Project Review

### Existing Project: **Databuild-API-Vue**
**Location:** `C:\Dev\Databuild-API-Vue\`
**Version:** 1.4.0
**Tech Stack:** Electron + Vue 3 + AG Grid + SQL Server + Bootstrap 5

### Infrastructure Already Built (90%+ Reusable)

| Component | Status | Reusability | Location |
|-----------|--------|-------------|----------|
| **Database Connection** | ✅ Complete | 100% | `src/database/connection.js` |
| **Cross-DB Query Builder** | ✅ Complete | 100% | `src/database/query-builder.js` |
| **IPC Architecture** | ✅ Complete | 100% | `preload.js` + `main.js` |
| **Jobs Handler** | ✅ Partial | 90% | `src/ipc-handlers/jobs.js` |
| **Purchase Orders Module** | ✅ Complete | 80% | `src/ipc-handlers/purchase-orders.js` |
| **PO Templates System** | ✅ Complete | 100% | Templates + jsreport |
| **PO Printing/PDF** | ✅ Complete | 100% | PDF generation with jsreport |
| **Catalogue Management** | ✅ Complete | 70% | `src/ipc-handlers/catalogue.js` |
| **Cost Centres Handler** | ✅ Complete | 100% | `src/ipc-handlers/cost-centres.js` |
| **Suppliers Handler** | ✅ Complete | 90% | `src/ipc-handlers/suppliers.js` |
| **AG Grid Components** | ✅ Complete | 100% | All tab components |
| **electron-store Pattern** | ✅ Complete | 100% | `src/database/*-store.js` |
| **Vue 3 Composition API** | ✅ Complete | 100% | All components |

### What Needs to Be Built (Only BOQ-Specific Logic)

| Component | Effort | Status |
|-----------|--------|--------|
| **BOQ IPC Handler** | Medium | To Build |
| **BOQ Tab Component** | Medium | To Build |
| **BOQ Toolbar** | Low | To Build |
| **BOQ Grid** | Low | To Build (copy AG Grid pattern) |
| **BOQ Options Modal** | Medium | To Build |
| **BOQ Options Store** | Low | To Build (copy store pattern) |
| **Recipe Explosion** | Medium | To Build |
| **Repricing Logic** | Medium | To Build |
| **Load Management** | Low | To Build |
| **BOQ Reports** | Medium | To Build |
| **Drag & Drop Attributes** | High | To Build |

---

## Recommended Implementation Approach

### Option A: Integration into Databuild-API-Vue ✅ **RECOMMENDED**

**Pros:**
- ✅ 50-60% faster development (7-8 weeks vs 17 weeks)
- ✅ Leverages all existing infrastructure
- ✅ Unified codebase - easier maintenance
- ✅ Consistent UI/UX with existing features
- ✅ Purchase Orders module already complete
- ✅ Database connection already handles System + Job DB
- ✅ No code duplication

**Cons:**
- ⚠️ Must work within existing project structure
- ⚠️ Need to ensure backward compatibility
- ⚠️ Requires testing to avoid breaking existing features

**Development Timeline:** 7-8 weeks

### Option B: Standalone Application ❌ **NOT RECOMMENDED**

**Pros:**
- ✅ Complete control over architecture
- ✅ No risk to existing features

**Cons:**
- ❌ 17 weeks development time
- ❌ Duplicate 90% of existing infrastructure
- ❌ Two codebases to maintain
- ❌ Inconsistent UI/UX
- ❌ Need to rebuild PO module
- ❌ Need to rebuild database layer

**Development Timeline:** 17 weeks

---

## Integration Architecture Overview

### File Structure (Files to Add)

```
C:\Dev\Databuild-API-Vue\          [EXISTING PROJECT]
├── src/
│   ├── database/
│   │   └── boq-options-store.js   [NEW] BOQ options persistence
│   └── ipc-handlers/
│       └── boq.js                 [NEW] BOQ operations
├── frontend/
│   └── src/
│       └── components/
│           └── BOQ/               [NEW FOLDER]
│               ├── BillOfQuantitiesTab.vue        [NEW]
│               ├── BOQToolbar.vue                 [NEW]
│               ├── BOQGrid.vue                    [NEW]
│               ├── BOQCatalogueSearch.vue         [NEW]
│               ├── BOQOptionsModal.vue            [NEW]
│               ├── RecipeExplosionModal.vue       [NEW]
│               └── BOQReports.vue                 [NEW]
└── [All other files remain unchanged]
```

### Integration Points

1. **preload.js** - Add `boq` and `boqOptions` to `window.electronAPI`
2. **main.js** - Register BOQ IPC handlers
3. **useElectronAPI.js** - Add BOQ API methods
4. **router/index.js** - Add `/boq` route
5. **App.vue** - Add BOQ tab button

---

## Database Schema Mapping

### Tables Used by BOQ Module

**Job Database (CROWNEJOB):**
- `Bill` - BOQ line items
- `Orders` - Purchase order headers
- `OrderDetails` - Alternative item descriptions
- `Jobs` - Job master records

**System Database (CROWNESYS):**
- `PriceList` - Catalogue items and recipes
- `CostCentres` - Cost centre hierarchy (always Tier=1)
- `Prices` - Price history by level and date
- `PerCodes` - Units of measure
- `Recipe` - Recipe sub-items
- `Supplier` - Supplier master data
- `CCSuppliers` - Preferred suppliers per cost centre
- `SuppliersPrices` - Supplier-specific pricing
- `Contacts` - Client information
- `StandardNotes` - Reusable order notes
- `GlobalNotes` - Auto-applied order notes

### Key Queries Already Implemented

✅ **Jobs with Client Details** - `jobs.js:searchJob()`
✅ **Bill Items with Orders** - `jobs.js:searchJob()` (includes Bill, Orders, OrderDetails)
✅ **Cost Centres with Tier=1** - `cost-centres.js:getList()`
✅ **Suppliers for Cost Centre** - `purchase-orders.js:getPreferredSuppliers()`
✅ **Catalogue Items with Prices** - `catalogue.js:getCatalogueItems()`

---

## Development Phases (Integration Approach)

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1:** Foundation | 3 days | BOQ IPC handler + Options store |
| **Phase 2:** Basic UI | 5 days | BOQ tab + toolbar + grid |
| **Phase 3:** Catalogue Integration | 3 days | Catalogue search panel |
| **Phase 4:** Options Screen | 4 days | Full options modal with all settings |
| **Phase 5:** Add/Edit Items | 3 days | Add items from catalogue, inline editing |
| **Phase 6:** Price Management | 4 days | Price levels, repricing, manual prices |
| **Phase 7:** Recipe Explosion | 5 days | Recipe explosion with options |
| **Phase 8:** Load Management | 2 days | Multiple loads per cost centre |
| **Phase 9:** Reports | 5 days | F6/F7/F8 reports (single CC, full, summary) |
| **Phase 10:** PO Integration | 3 days | Link BOQ to existing PO module |
| **Phase 11:** Drag & Drop | 5 days | Drag & drop attribute changes |
| **Phase 12:** Testing & Polish | 7 days | Bug fixes, UX improvements, testing |

**Total Duration:** ~7-8 weeks

---

## Purchase Orders Module (Already Complete!)

The existing project already has a **fully functional Purchase Orders module** that includes:

### Existing PO Features ✅

- **PO Rendering:** HTML templates with Handlebars
- **PDF Generation:** jsreport integration
- **Batch Operations:** Print/email/save multiple POs
- **Template System:** Built-in and custom templates
- **Assets Library:** Logo and image management
- **Partials System:** Reusable template components
- **GST Handling:** Multiple GST display modes
- **Supplier Integration:** Preferred suppliers per cost centre
- **Order Logging:** Track logged vs to-order status
- **Email Functionality:** Send POs directly from app

### PO Files Already in Project

- `src/ipc-handlers/purchase-orders.js` - PO operations
- `src/ipc-handlers/po-templates.js` - Template management
- `src/ipc-handlers/po-print.js` - Printing/PDF
- `src/services/jsreport.js` - PDF rendering service
- `frontend/src/components/PurchaseOrders/` - PO UI components

### Integration with BOQ

The BOQ module can directly use the existing PO system by:
1. Creating Order records in the Orders table
2. Calling `purchaseOrders.renderPDF()` to generate POs
3. Using existing PO templates and settings
4. Leveraging batch operations for multiple orders

**No need to rebuild PO functionality!**

---

## Critical Business Rules (From Specification)

### Must-Implement Constraints

1. **CostCentres.Tier = 1** - Always filter in JOIN, not WHERE
2. **Percentage Units (%)** - LineTotal = UnitPrice × (Qty ÷ 100)
3. **CCSuppliers Constraint** - Only suppliers in CCSuppliers can be selected
4. **Order Number Format** - Must be `{JobNo}/{CostCentre}.{BLoad}`
5. **Logged Orders Immutable** - Cannot edit orders in Orders table
6. **Hidden Workup** - If XDescription starts with `[Hide]`, don't print
7. **Options SAVE Required** - Changes must be saved via SAVE button
8. **Bold Cost Centres** - Show BOLD if quantities entered
9. **Manual Prices in RED** - Visual indicator for manual pricing
10. **Recipe Explosion Options** - Honor remove/explode-zero settings

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| **Breaking existing features** | Use feature branch, test thoroughly, incremental integration |
| **Database query conflicts** | Use `query-builder.js` consistently, test cross-DB queries |
| **IPC handler collisions** | Use `boq:` prefix for all handlers, no naming conflicts |
| **Store data conflicts** | Separate `boq-options-store.js`, isolated from other stores |
| **Performance with large datasets** | Implement AG Grid virtual scrolling, pagination for 1000+ items |
| **User confusion** | Maintain consistent UI/UX with existing tabs, clear labeling |

---

## Testing Strategy

### 1. Unit Testing
- Test `boq.js` handler functions with mock data
- Test percentage calculation logic
- Test price level selection
- Test recipe explosion logic

### 2. Integration Testing
- Test IPC communication flow end-to-end
- Test cross-database queries with real Databuild database
- Test option persistence (save/load/reset)
- Test integration with existing PO module

### 3. User Acceptance Testing
- Complete workflow: Job → BOQ → Order → Print
- Test with multiple price levels
- Test with different bill dates (repricing)
- Verify calculations (especially % units)
- Test recipe explosion with various options
- Test drag & drop attribute changes

### 4. Performance Testing
- Load BOQ with 1000+ items
- Test AG Grid scrolling performance
- Test repricing large bills
- Test report generation speed

---

## Next Steps - Action Plan

### Step 1: Create Feature Branch ✅
```bash
cd C:\Dev\Databuild-API-Vue
git checkout -b feature/boq-module
git push -u origin feature/boq-module
```

### Step 2: Review Documentation ✅
- ✅ BOQ_INTEGRATION_STRATEGY.md
- ✅ DEVELOPMENT_PLAN.md (requirements reference)
- ✅ DATABUILD_DATABASE_SCHEMA.md

### Step 3: Begin Implementation 🚀

**Week 1 - Phase 1 (Foundation):**
1. Create `src/ipc-handlers/boq.js`
2. Implement `getJobBill()` handler
3. Create `src/database/boq-options-store.js`
4. Register IPC handlers in `main.js`
5. Add BOQ API to `preload.js`
6. Update `useElectronAPI.js`
7. Test database queries with real data

**Week 2 - Phase 2 (Basic UI):**
1. Create `frontend/src/components/BOQ/` folder
2. Create `BillOfQuantitiesTab.vue` (main component)
3. Create `BOQToolbar.vue` (job/price/load selectors)
4. Create `BOQGrid.vue` (AG Grid for bill items)
5. Add `/boq` route to router
6. Add BOQ tab to `App.vue`
7. Test basic UI flow

**Week 3-8:** Continue through remaining phases...

### Step 4: Continuous Testing
- Test after each phase completion
- Validate against BOQ specification
- Check database integrity
- Verify calculations

### Step 5: Documentation
- Update README with BOQ features
- Create user guide for BOQ tab
- Document API additions
- Update CHANGELOG

---

## Success Criteria

### Functional Requirements ✅
- [ ] Can create BOQ from catalogue items
- [ ] Can manage multiple loads per cost centre
- [ ] Can select price levels and reprice
- [ ] Can explode recipes with options
- [ ] Can generate reports (F6/F7/F8)
- [ ] Can create purchase orders from BOQ
- [ ] Options screen controls all specified behaviors
- [ ] Drag & drop attribute changes work
- [ ] Manual pricing with visual indicators
- [ ] Cost centres show BOLD when populated

### Technical Requirements ✅
- [ ] Database queries optimized and correct
- [ ] IPC communication stable and performant
- [ ] No memory leaks
- [ ] Cross-database queries working
- [ ] Percentage unit calculations accurate
- [ ] Load time < 2s for 1000 items
- [ ] No breaking changes to existing features

### User Experience ✅
- [ ] Consistent UI with existing tabs
- [ ] Responsive and intuitive interface
- [ ] Clear error messages
- [ ] Keyboard shortcuts work (F6/F7/F8)
- [ ] Auto-save prevents data loss
- [ ] Screen size persists between sessions

---

## Project Comparison Summary

| Aspect | Standalone App | Integration | Winner |
|--------|----------------|-------------|---------|
| **Development Time** | 17 weeks | 7-8 weeks | ✅ Integration |
| **Infrastructure Reuse** | 0% | 90%+ | ✅ Integration |
| **Maintenance Effort** | High (2 codebases) | Low (1 codebase) | ✅ Integration |
| **UI Consistency** | Manual | Automatic | ✅ Integration |
| **PO Module** | Rebuild from scratch | Already complete | ✅ Integration |
| **Database Layer** | Rebuild | Already complete | ✅ Integration |
| **Risk Level** | Low | Medium | ⚠️ Standalone |
| **Cost** | High | Low | ✅ Integration |
| **User Experience** | New app to learn | Familiar interface | ✅ Integration |

**Recommended Approach:** **Integration into Databuild-API-Vue** ✅

---

## Conclusion

After comprehensive analysis of:
- ✅ BOQ requirements specification
- ✅ Databuild database schema
- ✅ Existing Databuild-API-Vue project
- ✅ Technical architecture and patterns

**The optimal approach is to integrate the BOQ module into the existing Databuild-API-Vue project.**

This strategy provides:
- **50-60% faster development** (7-8 weeks vs 17 weeks)
- **90%+ infrastructure reuse**
- **Complete PO module already built**
- **Unified, maintainable codebase**
- **Consistent user experience**

All planning documentation has been prepared and the project is **ready for implementation**.

---

**Document Version:** 1.0
**Created:** November 16, 2025
**Status:** Planning Complete ✅
**Next Action:** Create feature branch and begin Phase 1
