# 能源類別 Key 不一致問題修復報告

## 📋 問題背景

在 React + Supabase 系統中發現能源類別 key 不一致的問題：

### 🔍 問題描述
- **前端使用的 key**: `septictank`, `electricity_bill`
- **資料庫儲存的 key**: `septic_tank`, `electricity`
- **結果**: 編輯使用者時，化糞池和外購電力沒有顯示勾選

## ✅ 修復方案

### 📁 修改檔案
`frontend/src/api/adminUsers.ts`

### 🔧 實作內容

#### 1. 添加 Key 映射常數
```typescript
// 前端 key 轉資料庫 key
const FRONTEND_TO_DB_MAP: Record<string, string> = {
  'septictank': 'septic_tank',
  'electricity_bill': 'electricity'
};

// 資料庫 key 轉前端 key
const DB_TO_FRONTEND_MAP: Record<string, string> = {
  'septic_tank': 'septictank',
  'electricity': 'electricity_bill'
};
```

#### 2. 創建轉換輔助函數
```typescript
/**
 * 將前端格式的能源類別轉換為資料庫格式
 */
function convertFrontendKeysToDb(categories: string[]): string[] {
  return categories.map(key => FRONTEND_TO_DB_MAP[key] || key);
}

/**
 * 將資料庫格式的能源類別轉換為前端格式
 */
function convertDbKeysToFrontend(categories: string[]): string[] {
  return categories.map(key => DB_TO_FRONTEND_MAP[key] || key);
}
```

#### 3. 修改 `createUser` 函數
- 在建立 `profileData` 之前轉換能源類別 key
- 使用 `convertFrontendKeysToDb` 轉換成資料庫格式

#### 4. 修改 `updateUser` 函數
- 在更新 `filling_config` 時轉換能源類別 key
- 確保資料庫儲存的是標準格式

#### 5. 修改 `getUserWithPermissions` 函數
- 在返回資料前轉換能源類別 key
- 使用 `convertDbKeysToFrontend` 轉換回前端格式

## 🧪 測試結果

### 測試涵蓋範圍
✅ **前端 → 資料庫格式轉換**
- `septictank` → `septic_tank`
- `electricity_bill` → `electricity`

✅ **資料庫 → 前端格式轉換**
- `septic_tank` → `septictank`
- `electricity` → `electricity_bill`

✅ **雙向轉換一致性**
- 原始格式 → 轉換 → 轉回 = 原始格式

✅ **邊界情況處理**
- 空陣列正確處理
- 未知 key 保持不變
- 其他 key 不受影響

### 測試結果
```
📊 測試總結: ✅ 所有測試通過

🎉 能源類別 key 轉換功能運作正常！
✓ 前端 → 資料庫格式轉換正確
✓ 資料庫 → 前端格式轉換正確
✓ 雙向轉換保持一致性
✓ 邊界情況處理正確
```

## 🎯 修復效果

### ✅ 問題解決
1. **建立使用者**: 前端的 `septictank`, `electricity_bill` 正確轉換為資料庫的 `septic_tank`, `electricity`
2. **編輯使用者**: 資料庫的 `septic_tank`, `electricity` 正確轉換為前端的 `septictank`, `electricity_bill`
3. **顯示勾選**: 化糞池和外購電力在編輯頁面正確顯示勾選狀態
4. **資料一致性**: 確保前後端資料格式的一致性轉換

### 🔒 安全性保證
- ❌ **未修改** API keys 或認證設定
- ❌ **未修改** 資料庫 schema
- ❌ **未修改** 安全性相關代碼
- ✅ **純字串轉換**，不涉及敏感資料

### 📈 向後兼容性
- 未知的 key 保持原樣，不影響其他功能
- 現有資料不會受到影響
- 轉換是可逆的，確保資料完整性

## 📝 技術細節

### Key 轉換對應表
| 前端格式 | 資料庫格式 | 說明 |
|---------|-----------|------|
| `septictank` | `septic_tank` | 化糞池 |
| `electricity_bill` | `electricity_bill` | 外購電力 |

### 轉換時機
1. **存入資料庫時**: 前端格式 → 資料庫格式
2. **從資料庫讀取時**: 資料庫格式 → 前端格式
3. **更新資料時**: 前端格式 → 資料庫格式

## 🚀 部署狀態

- ✅ 修復完成並測試通過
- ✅ 開發服務器運行正常
- ✅ 沒有引入任何錯誤
- ✅ Hot Module Replacement 正常運作

## 📞 後續維護

如果需要添加更多 key 轉換：
1. 在 `FRONTEND_TO_DB_MAP` 添加前端→資料庫映射
2. 在 `DB_TO_FRONTEND_MAP` 添加資料庫→前端映射
3. 確保雙向映射的一致性
4. 執行測試驗證功能正常

---

**修復完成時間**: 2025-09-24
**修復結果**: ✅ 成功解決能源類別 key 不一致問題