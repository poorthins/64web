# 碳足跡盤查系統 - 完整優化執行計劃

## 📋 專案概述

**專案名稱**: 碳足跡盤查系統優化計劃  
**執行期間**: 2025-01-16 至 2025-02-06 (約3週)  
**專案位置**: `/64web`  
**技術棧**: React 18 + TypeScript + Vite + Supabase  

### 現況說明
系統已完成14個能源類別頁面的基本功能，包含填報、提交、審核流程。現需要進行三大優化：
1. 資料載入功能模組化（減少60%重複程式碼）
2. 年份動態連動（配合管理員設定）
3. 資安強化與後端優化

---

## 🎯 Phase 1: 資料載入模組化 (Day 1-6)

### 目標
將14個能源頁面中重複的資料載入邏輯抽取成可重用的Hook，統一維護點，提升程式碼品質。

### 1.1 建立核心Hook檔案

#### 檔案1: `frontend/src/hooks/useExistingEntry.ts`
```typescript
/**
 * 統一的資料載入Hook
 * 功能：載入既有的能源記錄和相關檔案
 * 
 * 實作要求：
 * 1. 根據pageKey和year查詢existing entry
 * 2. 如果有資料，載入entry和相關files
 * 3. 解析payload中的monthly data和notes
 * 4. 將檔案分類為MSDS和月度證明檔案
 * 5. 處理loading和error狀態
 */

import { useState, useEffect } from 'react'
import { getEntryByPageKeyAndYear } from '../api/entries'
import { getEntryFiles } from '../api/files'

interface UseExistingEntryResult {
  existingEntry: any | null
  monthlyData: Record<string, number>
  notes: string
  msdsFiles: any[]
  evidenceFiles: Record<number, any[]>
  loading: boolean
  error: Error | null
}

export const useExistingEntry = (
  pageKey: string, 
  year: number,
  enabled: boolean = true
): UseExistingEntryResult => {
  // 實作內容：
  // 1. 初始化狀態
  // 2. useEffect 載入資料
  // 3. 解析payload.monthly到monthlyData
  // 4. 解析payload.notes
  // 5. 分類檔案（根據month欄位）
  // 6. 回傳結構化的資料
}
```

#### 檔案2: `frontend/src/hooks/useMonthlyData.ts`
```typescript
/**
 * 月度資料處理Hook
 * 功能：管理12個月的資料輸入和計算
 * 
 * 實作要求：
 * 1. 初始化12個月的資料結構
 * 2. 提供updateMonthData函數
 * 3. 自動計算總使用量
 * 4. 支援從existingEntry還原資料
 */

export const useMonthlyData = (
  initialData?: Record<string, number>,
  unitCapacity?: number
) => {
  // 實作月度資料管理邏輯
}
```

#### 檔案3: `frontend/src/hooks/useFileManagement.ts`
```typescript
/**
 * 檔案管理Hook
 * 功能：統一處理檔案上傳、刪除、分類
 * 
 * 實作要求：
 * 1. 管理MSDS檔案列表
 * 2. 管理月度證明檔案（按月分類）
 * 3. 提供檔案上傳函數
 * 4. 提供檔案刪除函數
 * 5. 自動處理檔案與entry的關聯
 */

export const useFileManagement = (pageKey: string, entryId?: string) => {
  // 實作檔案管理邏輯
}
```

### 1.2 測試策略 - WD40為試點

#### Step 1: 測試準備
```bash
# 1. 備份現有WD40Page.tsx
cp frontend/src/pages/Category1/WD40Page.tsx frontend/src/pages/Category1/WD40Page.backup.tsx

# 2. 建立測試分支
git checkout -b feature/data-load-refactor
git commit -m "backup: 保存原始WD40Page"
```

#### Step 2: WD40測試場景清單
```typescript
// frontend/src/utils/testing/wd40TestScenarios.ts
export const WD40_TEST_SCENARIOS = {
  // 場景1: 全新用戶首次填報
  'NEW_USER': {
    setup: '清空該用戶WD40的2025年資料',
    actions: [
      '進入WD40頁面',
      '確認所有欄位為空',
      '填寫單位容量: 500',
      '填寫含碳率: 85',
      '填寫1月使用量: 10瓶',
      '上傳MSDS檔案',
      '上傳1月使用證明',
      '提交'
    ],
    verify: [
      '提交成功訊息出現',
      '資料庫有新記錄',
      'status = submitted'
    ]
  },

  // 場景2: 編輯已提交資料
  'EDIT_SUBMITTED': {
    setup: '確保有一筆status=submitted的WD40記錄',
    actions: [
      '進入WD40頁面',
      '等待資料載入完成'
    ],
    verify: [
      '單位容量顯示: 500',
      '含碳率顯示: 85',
      '1月使用量顯示: 10',
      'MSDS檔案列表正確',
      '1月證明檔案顯示',
      '可以修改數值',
      '可以新增/刪除檔案'
    ]
  },

  // 場景3: 查看已通過資料（唯讀）
  'VIEW_APPROVED': {
    setup: '將記錄status改為approved',
    actions: ['進入WD40頁面'],
    verify: [
      '所有資料正確顯示',
      '輸入欄位disabled',
      '無法上傳檔案',
      '顯示"已通過"狀態'
    ]
  },

  // 場景4: 修正被退回資料
  'EDIT_REJECTED': {
    setup: '將記錄status改為rejected',
    actions: ['進入WD40頁面', '修改資料', '重新提交'],
    verify: [
      '顯示退回原因',
      '可以編輯',
      '重新提交後status變回submitted'
    ]
  }
}
```

#### Step 3: 測試執行與驗證
```javascript
// 在瀏覽器Console執行的測試輔助函數
window.testWD40DataLoad = async function() {
  console.log('=== WD40 資料載入測試 ===');
  
  const tests = {
    '資料庫連接': false,
    '載入既有記錄': false,
    'Payload解析': false,
    '檔案載入': false,
    '欄位填充': false
  };
  
  try {
    // 測試1: 資料庫連接
    const { data: profile } = await window.supabase.from('profiles').select('id').single();
    tests['資料庫連接'] = !!profile;
    
    // 測試2: 載入記錄
    const entry = await window.getEntryByPageKeyAndYear('wd40', 2025);
    tests['載入既有記錄'] = !!entry;
    
    if (entry) {
      // 測試3: Payload解析
      tests['Payload解析'] = !!(entry.payload?.monthly);
      
      // 測試4: 檔案載入
      const files = await window.getEntryFiles(entry.id);
      tests['檔案載入'] = Array.isArray(files);
      
      // 測試5: UI欄位（需手動檢查）
      console.log('請手動檢查以下欄位：');
      console.log('- 單位容量:', entry.payload?.notes?.includes('單位容量'));
      console.log('- 月度資料:', entry.payload?.monthly);
    }
  } catch (error) {
    console.error('測試失敗:', error);
  }
  
  // 顯示結果
  console.table(tests);
  const passed = Object.values(tests).filter(t => t).length;
  console.log(`測試結果: ${passed}/${Object.keys(tests).length} 通過`);
  
  return tests;
};
```

### 1.3 逐步推廣計劃

#### 推廣順序（風險由低到高）
```
第一批（Day 3）- 結構最簡單：
□ WD40Page.tsx (已完成測試)
□ AcetylenePage.tsx (乙炔)
□ RefrigerantPage.tsx (冷媒)

第二批（Day 4）- 結構標準：
□ NaturalGasPage.tsx (天然氣)
□ GasolinePage.tsx (汽油) 
□ DieselPage.tsx (柴油)
□ LPGPage.tsx (液化石油氣)

第三批（Day 5）- 有特殊邏輯：
□ DieselGeneratorPage.tsx (柴油發電機-有兩種模式)
□ FireExtinguisherPage.tsx (滅火器-有維護記錄)
□ SepticTankPage.tsx (化糞池-單位特殊)
□ UreaPage.tsx (尿素)
□ WeldingRodPage.tsx (焊條)

第四批（Day 6）- 其他範疇：
□ ElectricityBillPage.tsx (範疇二)
□ CommuteePage.tsx (範疇三)
```

#### 每個頁面的改造步驟
```bash
# 1. 備份原始檔案
cp [原始頁面] [原始頁面].backup

# 2. 引入新的Hook
import { useExistingEntry } from '../../hooks/useExistingEntry'

# 3. 替換原有載入邏輯
const { existingEntry, monthlyData, notes, msdsFiles, evidenceFiles, loading } = 
  useExistingEntry(pageKey, year);

# 4. 移除重複的載入程式碼

# 5. 測試該頁面所有功能

# 6. 提交變更
git add [頁面檔案]
git commit -m "refactor: [頁面名稱] 使用統一的資料載入Hook"
```

### 1.4 監控與回滾機制

```javascript
// frontend/src/utils/monitoring/dataLoadMonitor.js
const monitoringConfig = {
  enabled: true,
  logLevel: 'debug',
  alertOnError: true
};

export function monitorDataLoad(pageKey, operation) {
  if (!monitoringConfig.enabled) return;
  
  const startTime = performance.now();
  const context = {
    pageKey,
    operation,
    timestamp: new Date().toISOString(),
    user: getCurrentUser()
  };
  
  try {
    console.group(`📊 監控: ${pageKey} - ${operation}`);
    console.log('Context:', context);
    
    // 執行操作
    const result = operation();
    
    const duration = performance.now() - startTime;
    console.log(`✅ 成功 (${duration.toFixed(2)}ms)`);
    
    return result;
  } catch (error) {
    console.error('❌ 失敗:', error);
    
    if (monitoringConfig.alertOnError) {
      alert(`載入失敗: ${pageKey}\n錯誤: ${error.message}`);
    }
    
    // 記錄到錯誤日誌
    logError(context, error);
    throw error;
  } finally {
    console.groupEnd();
  }
}
```

---

## 🎯 Phase 2: 年份動態連動 (Day 7-10)

### 目標
實現用戶填報年份與管理員設定的report_start_date和report_end_date連動。

### 2.1 資料庫確認
```sql
-- 確認profiles表有以下欄位
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS report_start_date DATE DEFAULT '2024-01-01',
ADD COLUMN IF NOT EXISTS report_end_date DATE DEFAULT '2025-12-31';

-- 為測試用戶設定區間
UPDATE profiles 
SET report_start_date = '2024-01-01',
    report_end_date = '2025-12-31'
WHERE email = 'user@test.com';
```

### 2.2 建立年份管理Hook

#### 檔案: `frontend/src/hooks/useReportingPeriod.ts`
```typescript
/**
 * 年份區間管理Hook
 * 功能：從資料庫讀取用戶可填報的年份區間
 * 
 * 實作要求：
 * 1. 從profiles表讀取report_start_date和report_end_date
 * 2. 計算可用年份列表
 * 3. 提供年份選擇和驗證
 * 4. 處理年份切換邏輯
 */

export const useReportingPeriod = () => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // 載入用戶的填報區間
    // 計算可用年份
    // 設定預設年份
  }, []);
  
  return {
    availableYears,
    selectedYear,
    setSelectedYear,
    isYearValid: (year: number) => availableYears.includes(year),
    loading
  };
};
```

#### 檔案: `frontend/src/components/YearSelector.tsx`
```typescript
/**
 * 年份選擇器元件
 * 
 * 實作要求：
 * 1. 顯示可選年份下拉選單
 * 2. 顯示當前選擇的年份
 * 3. 切換年份時的確認（如有未儲存資料）
 * 4. 顯示填報區間提示
 */

interface YearSelectorProps {
  availableYears: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  hasUnsavedChanges?: boolean;
}

export const YearSelector: React.FC<YearSelectorProps> = ({...}) => {
  // 實作年份選擇UI
};
```

### 2.3 整合到現有頁面

```typescript
// 在每個能源頁面加入
const { availableYears, selectedYear, setSelectedYear } = useReportingPeriod();

// 替換原本寫死的year
const { existingEntry, ... } = useExistingEntry(pageKey, selectedYear);

// 在頁面頂部加入年份選擇器
<YearSelector 
  availableYears={availableYears}
  selectedYear={selectedYear}
  onYearChange={handleYearChange}
  hasUnsavedChanges={hasChanges}
/>
```

### 2.4 測試場景

```javascript
// 年份功能測試
window.testYearFunctionality = async function() {
  const tests = {
    '讀取填報區間': false,
    '計算可用年份': false,
    '年份切換': false,
    '資料正確載入': false
  };
  
  // 測試實作...
  
  return tests;
};
```

---

## 🎯 Phase 3: 資安強化與後端優化 (Day 11-15)

### 目標
加強前端輸入驗證，將敏感業務邏輯移至後端Edge Functions。

### 3.1 前端安全強化

#### 檔案: `frontend/src/utils/security/inputValidator.ts`
```typescript
/**
 * 輸入驗證工具
 * 
 * 實作要求：
 * 1. XSS防護（使用DOMPurify）
 * 2. 數值範圍檢查
 * 3. 檔案類型和大小驗證
 * 4. SQL注入防護
 */

import DOMPurify from 'dompurify';

export const validateInput = {
  // 清理文字輸入
  sanitizeText: (input: string): string => {
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [] 
    });
  },
  
  // 驗證數值範圍
  validateNumber: (value: number, min: number, max: number): boolean => {
    return !isNaN(value) && value >= min && value <= max;
  },
  
  // 驗證檔案
  validateFile: (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    
    if (file.size > maxSize) {
      return { valid: false, error: '檔案大小超過10MB' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: '不支援的檔案類型' };
    }
    
    return { valid: true };
  }
};
```

#### 檔案: `frontend/src/utils/security/apiSecurity.ts`
```typescript
/**
 * API安全層
 * 
 * 實作要求：
 * 1. 請求頻率限制
 * 2. CSRF token（如需要）
 * 3. 請求簽名
 */

const rateLimiter = new Map();

export const secureAPI = {
  // 頻率限制
  checkRateLimit: (endpoint: string, userId: string): boolean => {
    const key = `${endpoint}-${userId}`;
    const now = Date.now();
    const limit = 10; // 每分鐘10次
    const window = 60000; // 1分鐘
    
    // 實作頻率限制邏輯
    return true;
  },
  
  // 安全的API呼叫
  secureCall: async (endpoint: string, data: any) => {
    // 加入安全檢查
    // 呼叫API
  }
};
```

### 3.2 Supabase Edge Functions

#### Function 1: `supabase/functions/calculate-emissions/index.ts`
```typescript
/**
 * 碳排放計算
 * 將計算邏輯移到後端保護商業機密
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { category, amount, parameters } = await req.json();
  
  // 根據類別查詢排放係數（從資料庫或設定檔）
  const emissionFactor = getEmissionFactor(category);
  
  // 計算碳排放量
  const emissions = calculateEmissions(amount, emissionFactor, parameters);
  
  return new Response(
    JSON.stringify({ emissions }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

#### Function 2: `supabase/functions/validate-entry/index.ts`
```typescript
/**
 * 資料驗證
 * 後端驗證確保資料完整性
 */

serve(async (req) => {
  const entryData = await req.json();
  
  // 業務規則驗證
  const validationResult = validateBusinessRules(entryData);
  
  if (!validationResult.valid) {
    return new Response(
      JSON.stringify({ error: validationResult.errors }),
      { status: 400 }
    );
  }
  
  return new Response(JSON.stringify({ valid: true }));
});
```

### 3.3 部署Edge Functions

```bash
# 1. 安裝Supabase CLI
npm install -g supabase

# 2. 登入
supabase login

# 3. 連接專案
supabase link --project-ref [your-project-ref]

# 4. 部署Functions
supabase functions deploy calculate-emissions
supabase functions deploy validate-entry

# 5. 設定環境變數
supabase secrets set EMISSION_FACTORS='{"wd40": 0.85, ...}'
```

---

## 📊 執行時程總覽

| 階段 | 日期 | 任務 | 負責人 | 完成標準 |
|------|------|------|--------|----------|
| **Phase 1.1** | Day 1-2 | 建立Hooks + WD40測試 | Claude Code | WD40完整測試通過 |
| **Phase 1.2** | Day 3 | 第一批頁面(3個) | Claude Code | 乙炔、冷媒測試通過 |
| **Phase 1.3** | Day 4 | 第二批頁面(4個) | Claude Code | 標準結構頁面完成 |
| **Phase 1.4** | Day 5 | 第三批頁面(5個) | Claude Code | 特殊邏輯處理完成 |
| **Phase 1.5** | Day 6 | 第四批頁面(2個) | Claude Code | 所有頁面完成 |
| **Phase 2.1** | Day 7-8 | 年份Hook開發 | Claude Code | Hook功能完整 |
| **Phase 2.2** | Day 9-10 | 年份功能整合 | Claude Code | 全頁面整合測試 |
| **Phase 3.1** | Day 11-12 | 前端安全強化 | Claude Code | 驗證機制完成 |
| **Phase 3.2** | Day 13-14 | Edge Functions | Claude Code | 後端函數部署 |
| **Phase 3.3** | Day 15 | 整體測試與文檔 | Claude Code | 系統測試通過 |

---

## ✅ 成功標準

### Phase 1 完成標準
- [ ] 所有14個頁面使用統一的Hook
- [ ] 程式碼重複度降低60%以上
- [ ] 所有測試場景通過
- [ ] 無功能退化

### Phase 2 完成標準
- [ ] 年份動態從資料庫讀取
- [ ] 年份切換功能正常
- [ ] 管理員修改區間後立即生效
- [ ] 跨年度資料正確隔離

### Phase 3 完成標準
- [ ] 所有輸入都經過驗證
- [ ] Edge Functions成功部署
- [ ] API呼叫都有頻率限制
- [ ] 安全測試無重大漏洞

---

## 🚨 風險管理

### 風險識別與對策

| 風險 | 可能性 | 影響 | 對策 |
|------|--------|------|------|
| Hook整合導致功能異常 | 中 | 高 | 逐步推廣，每批測試 |
| 年份切換資料混亂 | 低 | 高 | 完整測試各種場景 |
| Edge Functions部署失敗 | 低 | 中 | 保留前端邏輯作為備案 |
| 測試不完整 | 中 | 高 | 建立測試檢查清單 |

### 回滾計劃
```bash
# 每個Phase開始前建立備份分支
git branch backup/before-phase-X

# 如需回滾
git checkout backup/before-phase-X
git checkout -b hotfix/phase-X-issues

# 修復後合併
git checkout main
git merge hotfix/phase-X-issues
```

---

## 📝 注意事項

### 給Claude Code的特別提醒

1. **測試優先**: 每個改動都要先在WD40測試，確認無誤後才推廣
2. **保留備份**: 改動任何檔案前都要先備份
3. **逐步執行**: 不要一次改動太多檔案，分批進行
4. **詳細日誌**: 在關鍵位置加入console.log協助除錯
5. **注意特殊邏輯**: 
   - 柴油發電機有兩種模式(refuel/test)
   - 滅火器有維護記錄
   - 化糞池單位是person而非重量/體積
6. **保持相容**: 確保改動不影響已提交的資料
7. **錯誤處理**: 所有async操作都要有try-catch
8. **使用TypeScript**: 保持類型安全，不使用any

### 檔案命名規範
- Hooks: use開頭，駝峰命名
- Components: 大寫開頭，駝峰命名
- Utils: 小寫開頭，駝峰命名
- Types: 大寫開頭，使用Interface或Type後綴

### Git提交規範
```bash
feat: 新功能
fix: 修復bug
refactor: 重構（不改變功能）
test: 測試相關
docs: 文檔更新
style: 格式調整
```

---

## 📞 問題處理流程

如果執行過程中遇到問題：

1. **先查看錯誤訊息**: 瀏覽器Console和Network tab
2. **使用診斷工具**: `window.diagnoseSystem()`
3. **檢查資料庫**: 確認資料表結構和資料正確
4. **查看測試結果**: 執行相關的測試函數
5. **回滾if需要**: 使用備份分支恢復

---

**文檔結束**  
**最後更新**: 2025-01-16  
**執行者**: Claude Code  
**審核者**: 專案負責人