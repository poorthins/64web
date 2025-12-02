# Orphan Files Report

**Generated:** 2025-12-02
**Directory:** `c:/Users/Tim/Desktop/python/64web/frontend/src`

---

## Summary

- **Total Files:** 240
- **Orphan Files:** 5 (2%)
- **Total Size:** 25.1 KB

---

## 100% Orphan Files (No imports, safe to delete)

### 1. `utils/progressUtils.ts` (8.0 KB)
**Description:** Progress calculation utilities (monthly distribution, progress indicators, etc.)

**Usage:** Provides helper functions for:
- Row color classes based on completion percentage
- Monthly progress calculations
- Progress bar color classes
- Bill monthly allocation (natural gas, electricity)
- Month status analysis

**Status:** No imports found in codebase
**Recommendation:** DELETE - Functionality likely replaced by newer implementations


### 2. `utils/databaseStats.ts` (7.0 KB)
**Description:** Database statistics query utilities (user count, submission count, etc.)

**Usage:** Provides functions for:
- Table row counts (profiles, energy_entries, review_history, etc.)
- User statistics (total users, active users, admin users)
- Submission statistics (drafts, submitted, approved, rejected)
- Database report generation

**Status:** No imports found in codebase
**Recommendation:** DELETE - Likely used for manual debugging/console queries only


### 3. `utils/roleDebug.ts` (6.3 KB)
**Description:** Role diagnostic tools (browser Console diagnostics)

**Usage:** Browser console debugging utilities:
- `window.diagnoseRole()` - Full role diagnostics
- `window.clearAllCache()` - Clear cache
- `window.testAdminLogin()` - Test admin login

**Status:** ⚠️ **IMPORTED** by `routes/AppRouter.tsx:43` as side-effect import
```typescript
import '../utils/roleDebug' // 載入診斷工具
```

**Recommendation:** KEEP (currently loaded) OR convert to conditional import for development only


### 4. `utils/createProfilesManually.ts` (3.0 KB)
**Description:** Manual profile creation tools (browser Console use)

**Usage:** Browser console utilities:
- `window.createCurrentUserProfile()` - Create profile for current user
- `window.testProfilesTable()` - Test profiles table access
- `window.createProfileManually()` - Manual profile creation

**Status:** No imports found in codebase
**Recommendation:** DELETE - Manual debugging utility only


### 5. `utils/logger.ts` (832 bytes)
**Description:** Development environment logger wrapper

**Usage:** Safe logger that only logs in development:
- `logger.log()`, `logger.error()`, `logger.warn()`, etc.
- Auto-disables in production

**Status:** No imports found in codebase
**Recommendation:** DELETE - Not used, replaced by direct console.* calls


---

## Verification Method

Confirmed orphan status via:

1. ✅ Searched all `.ts/.tsx` files for `import`/`export` statements
2. ✅ Checked `AppRouter.tsx` (no dynamic imports except roleDebug)
3. ✅ Excluded test files, entry files, page components
4. ✅ Verified with `grep` - no references found (except roleDebug)

---

## Exceptions

- **`utils/roleDebug.ts`** is imported as a side-effect in `AppRouter.tsx:43`
  - Currently loaded in production (comment suggests debugging tool)
  - Recommendation: Convert to conditional import or remove

---

## Recommended Actions

### Immediate Deletion (4 files, ~19 KB):
```bash
rm frontend/src/utils/progressUtils.ts
rm frontend/src/utils/databaseStats.ts
rm frontend/src/utils/createProfilesManually.ts
rm frontend/src/utils/logger.ts
```

### Review & Decide (1 file):
- `frontend/src/utils/roleDebug.ts` - Currently loaded, decide if needed for production

---

## Notes

- All files appear to be debugging/development utilities
- No business logic dependencies found
- `progressUtils.ts` has extensive functionality but zero usage - likely superseded
- `roleDebug.ts` is the only one actively loaded (via side-effect import)
