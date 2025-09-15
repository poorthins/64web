# 認證狀態診斷工具使用說明

---
title: 認證診斷工具使用說明
version: 1.0
last_updated: 2025-09-12
author: Development Tools Team
---

## 概述

已實作的認證狀態診斷功能可以幫助開發者精確找出 RLS (Row Level Security) 錯誤的根本原因，特別是 `auth.uid()` 回傳 null 的問題。

## 功能特色

### 1. 自動診斷模式
- **開發環境**：自動啟用詳細診斷日誌
- **生產環境**：可透過環境變數或 localStorage 手動啟用
- **條件式輸出**：避免在生產環境產生過多日誌

### 2. 全域認證狀態監控
- 監控所有認證狀態變化事件 (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
- 偵測異常的 session 消失
- 預警即將過期的 token

### 3. RLS 操作包裝
- 自動包裝可能觸發 RLS 的資料庫操作
- 操作前後的認證狀態比較
- 詳細的錯誤分析和建議

## 使用方式

### 啟用診斷模式

#### 方法 1：開發環境（自動啟用）
```bash
npm run dev
```

#### 方法 2：環境變數
```bash
VITE_AUTH_DIAGNOSTIC=true
```

#### 方法 3：瀏覽器控制台
```javascript
localStorage.setItem('auth_diagnostic_mode', 'true')
// 重新載入頁面生效
```

### 主要診斷函數

#### 1. 完整認證狀態診斷
```javascript
import { diagnoseAuthState } from './utils/authDiagnostics'

const diagnosis = await diagnoseAuthState()
console.log('認證診斷結果:', diagnosis)
```

#### 2. RLS 操作包裝
```javascript
import { debugRLSOperation } from './utils/authDiagnostics'

const result = await debugRLSOperation(
  '操作描述',
  async () => {
    // 你的資料庫操作
    return await supabase.from('table').select('*')
  }
)
```

#### 3. 詳細認證狀態日誌
```javascript
import { logDetailedAuthStatus } from './utils/authHelpers'

await logDetailedAuthStatus()
```

## 診斷輸出說明

### 認證狀態診斷輸出範例
```
=== 認證狀態診斷開始 ===
getUser() 結果: { userId: "abc123", email: "user@example.com", error: null }
getSession() 結果: { userId: "abc123", accessToken: "存在", refreshToken: "存在", expiresAt: 1640995200, error: null }
Token 時間狀態: { 
  expires: "2024-01-01 12:00:00",
  now: "2024-01-01 11:30:00", 
  isExpired: false,
  timeToExpiryMinutes: 30
}
LocalStorage 認證狀態: { key: "sb-project-auth-token", exists: true, dataLength: 1234 }
=== 認證狀態診斷結束 ===
```

### RLS 錯誤診斷輸出範例
```
=== 新增或更新能源填報記錄 操作開始 ===
執行 新增或更新能源填報記錄...
新增或更新能源填報記錄 執行失敗: Error: RLS policy violation
=== 失敗後的認證狀態檢查 ===
認證狀態比較: {
  操作前: { userId: "abc123", hasError: false, isAuthenticated: true, tokenExpired: false },
  操作後: { userId: null, hasError: true, isAuthenticated: false, tokenExpired: true },
  狀態是否改變: true
}
🚨 檢測到 RLS 相關錯誤！
錯誤分析: {
  errorType: "RLS_ERROR",
  message: "RLS policy violation",
  authStateValid: false,
  userIdExists: false,
  sessionExists: false,
  tokenExpired: true,
  suggestion: "建議檢查 auth.uid() 是否為 null 以及相關 RLS 政策"
}
=== 新增或更新能源填報記錄 操作結束 ===
```

## 已整合的頁面和 API

### 前端頁面
- **WD40Page.tsx**：完整整合診斷功能到提交流程
- **App.tsx**：全域認證狀態監控

### API 函數
- **upsertEnergyEntry**：新增/更新能源記錄
- **updateEntryStatus**：更新記錄狀態
- **getEntryByPageKeyAndYear**：查詢特定記錄
- **validateAuth**：認證檢查（增強版）

## 診斷結果分析指南

### 常見問題模式

#### 1. Token 過期問題
```
認證狀態比較: {
  操作前: { tokenExpired: false },
  操作後: { tokenExpired: true },
  狀態是否改變: true
}
```
**解決方案**：在操作前檢查 token 有效性，必要時先刷新

#### 2. Session 突然消失
```
❌ Session 意外消失，事件: USER_UPDATED
```
**解決方案**：檢查是否有其他地方清除了 session

#### 3. RLS 政策問題
```
🚨 檢測到 RLS 權限錯誤！
authStateValid: false
userIdExists: false
```
**解決方案**：檢查資料庫 RLS 政策是否正確設定

## 效能考量

- 診斷功能只在診斷模式下啟用，不影響生產效能
- 可透過環境變數完全關閉
- 日誌輸出經過優化，避免過度詳細

## 注意事項

1. **敏感資料保護**：診斷日誌不會輸出完整的 token 內容
2. **生產環境**：建議診斷完成後關閉詳細日誌
3. **瀏覽器控制台**：診斷資訊主要輸出到瀏覽器控制台
4. **清理功能**：應用關閉時會自動清理監控器

## 故障排除步驟

1. **啟用診斷模式**
2. **重現問題**
3. **檢查控制台輸出**
4. **分析認證狀態變化**
5. **根據建議修復問題**

這個診斷工具將大幅提高 RLS 錯誤的除錯效率，幫助快速定位和解決認證相關問題。