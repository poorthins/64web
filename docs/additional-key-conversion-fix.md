# 額外的 Key 轉換修復 - getUserById & getUserDetails

## 📋 修復內容

### 🎯 目標
確保所有取得使用者資料的函數都能正確轉換 `filling_config.energy_categories` 格式。

## 🔧 修改項目

### 1. `getUserDetails` 函數
**位置**: `adminUsers.ts` 第 508 行

**修改內容**:
```typescript
// 在返回資料前轉換 energy_categories 格式（資料庫格式 → 前端格式）
if (user?.filling_config?.energy_categories) {
  user.filling_config.energy_categories = convertDbKeysToFrontend(user.filling_config.energy_categories);
}
```

### 2. `getUserById` 函數
**位置**: `adminUsers.ts` 第 186 行

**修改內容**:
1. **擴展選取欄位**:
```typescript
// 原本
.select('id, display_name, role, is_active')

// 修改後
.select('id, display_name, role, is_active, email, company, job_title, phone, filling_config')
```

2. **加入格式轉換**:
```typescript
// 在返回資料前轉換 energy_categories 格式（資料庫格式 → 前端格式）
if (user?.filling_config?.energy_categories) {
  user.filling_config.energy_categories = convertDbKeysToFrontend(user.filling_config.energy_categories);
}
```

## ✅ 修復效果

### 📊 測試結果
```
📊 測試總結: ✅ 所有測試通過

🎉 getUserById 和 getUserDetails 函數的轉換邏輯正常！
✓ 資料庫格式正確轉換為前端格式
✓ 化糞池: septic_tank → septictank
✓ 外購電力: electricity → electricity_bill
✓ 邊界情況處理正確
```

### 🎯 現在完整支援的函數
1. ✅ `createUser` - 前端 → 資料庫格式
2. ✅ `updateUser` - 前端 → 資料庫格式
3. ✅ `getUserWithPermissions` - 資料庫 → 前端格式
4. ✅ `getUserDetails` - 資料庫 → 前端格式 **（新增）**
5. ✅ `getUserById` - 資料庫 → 前端格式 **（新增）**

## 🔄 完整的轉換流程

### 寫入資料庫時 (Create/Update)
```
前端格式 → 轉換函數 → 資料庫格式
septictank → convertFrontendKeysToDb → septic_tank
electricity_bill → convertFrontendKeysToDb → electricity
```

### 從資料庫讀取時 (Read)
```
資料庫格式 → 轉換函數 → 前端格式
septic_tank → convertDbKeysToFrontend → septictank
electricity → convertDbKeysToFrontend → electricity_bill
```

## 🚀 部署狀態

- ✅ 所有修改完成
- ✅ 測試全部通過
- ✅ 開發服務器運行正常
- ✅ 沒有引入任何錯誤

**現在不管使用哪個函數取得使用者資料，能源類別都會正確轉換為前端格式！**