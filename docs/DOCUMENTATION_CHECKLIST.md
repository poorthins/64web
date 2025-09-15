# 文檔更新執行檢查清單

---
title: 文檔系統性更新檢查清單
version: 1.0
last_updated: 2025-09-12
author: System Update
---

## 執行前準備
- [x] 備份現有文檔
- [x] 確認程式碼最新版本
- [x] 列出所有近期功能變更
  - 移除草稿功能 (draft status)
  - 新增檔案編輯功能 (edit existing files)
  - 簡化狀態流程 (submitted → approved/rejected)
  - 增強錯誤恢復機制 (Promise.allSettled)
  - RLS 政策修正 (review_history INSERT policies)

## Phase 1: 關鍵修正（Day 1）
### DATABASE_SCHEMA.md
- [ ] 更新 review_history RLS 政策章節
- [ ] 移除 draft 狀態說明
- [ ] 更新狀態流程圖 (submitted → approved/rejected)
- [ ] 確認觸發器說明正確
- [ ] 加入檔案編輯功能的資料庫影響
- [ ] 更新 entry_files 表關聯說明

### memorandum.md
- [ ] 移除所有 draft 相關內容
- [ ] 更新狀態指示器說明 (移除 'draft' 和 'under_review')
- [ ] 確認與當前實作一致
- [ ] 更新 EntryStatus 類型定義
- [ ] 修正 API 接口設計範例

## Phase 2: 核心文檔建立（Day 2-3）
### API_DOCUMENTATION.md (新建)
- [ ] 建立文檔結構和標準格式
- [ ] 記錄 Authentication APIs
  - [ ] validateAuth() 函數
  - [ ] isUserAuthenticated() 函數
  - [ ] isAdmin() 函數
- [ ] 記錄 Energy Entry APIs (entries.ts)
  - [ ] upsertEnergyEntry() 函數
  - [ ] getUserEntries() 函數
  - [ ] getEntryByPageKeyAndYear() 函數
  - [ ] updateEntryStatus() 函數
  - [ ] deleteEnergyEntry() 函數
- [ ] 記錄 File Management APIs (files.ts)
  - [ ] uploadEvidence() 函數
  - [ ] getEntryFiles() 函數 (新增)
  - [ ] deleteEvidenceFile() 函數 (新增)
  - [ ] updateFileEntryAssociation() 函數 (新增)
- [ ] 記錄 Admin APIs
  - [ ] adminUsers.ts 所有函數
  - [ ] adminSubmissions.ts 所有函數
  - [ ] adminMetrics.ts 所有函數
- [ ] 加入認證流程說明
- [ ] 加入錯誤處理範例 (RLS errors, network errors)
- [ ] 加入 categoryConstants.ts 說明

### FRONTEND_ARCHITECTURE.md (新建)
- [ ] 建立系統概覽圖
- [ ] 列出所有 14 個能源類別頁面
  - [ ] Scope 1 (12個): WD40, 乙炔, 冷媒, 化糞池, 天然氣, 尿素, 柴油發電機, 柴油, 汽油, LPG, 滅火器, 焊條
  - [ ] Scope 2 (1個): 外購電力
  - [ ] Scope 3 (1個): 員工通勤
- [ ] 記錄元件關係和階層
  - [ ] 共用元件清單 (EvidenceUpload, StatusIndicator, BottomActionBar 等)
  - [ ] 路由保護機制 (AdminRoute, UserRoute)
  - [ ] Layout 結構
- [ ] 說明資料流 (UI → API → Supabase → RLS)
- [ ] 記錄狀態管理策略 (Context + Local State)
- [ ] 記錄最近的架構變更
  - [ ] 移除草稿功能
  - [ ] 檔案編輯功能實現
  - [ ] 錯誤恢復機制

## Phase 3: 一般更新（Day 4-5）
### ARCHITECTURE.md
- [ ] 移除理論企業架構設計
- [ ] 改為實際 React + Supabase 架構
- [ ] 更新為當前技術棧
  - [ ] React 18.2.0
  - [ ] TypeScript 5.2.2
  - [ ] Vite 5.2.0
  - [ ] Supabase 2.38.0
- [ ] 加入實際資料夾結構
- [ ] 移除不存在的後端架構描述

### IMPLEMENTATION_GUIDE.md
- [ ] 移除理論後端重構內容
- [ ] 更新為實際功能實作步驟
- [ ] 加入檔案編輯功能實作指南
- [ ] 更新錯誤處理最佳實踐
- [ ] 加入 RLS 政策除錯指南

### SETUP.md
- [ ] 更新技術棧版本號
- [ ] 加入新的環境變數說明
- [ ] 更新開發workflow
- [ ] 加入診斷工具使用說明

### FRONTEND_DEVELOPMENT_GUIDE.md
- [ ] 確認 pageKey 對應表仍然正確
- [ ] 更新狀態管理說明 (移除 draft)
- [ ] 確認 API 使用範例正確
- [ ] 加入檔案編輯功能開發指引

## Phase 4: 品質檢查（Day 6）
### 一致性檢查
- [ ] 所有文檔使用相同術語
  - [ ] "submitted" 而非 "pending"
  - [ ] "approved/rejected" 而非 "accepted/declined"
  - [ ] "evidence files" 而非 "attachments"
- [ ] 交叉引用連結正確
- [ ] 版本號和日期統一（2025-09-12）
- [ ] Markdown 格式一致
- [ ] 標題層次結構一致

### 完整性檢查
- [ ] 所有新功能都有文檔
  - [ ] 檔案編輯功能
  - [ ] 錯誤恢復機制
  - [ ] 認證診斷工具
- [ ] 所有 API 函數都有說明
- [ ] 所有 14 個能源類別頁面都有記錄
- [ ] 移除功能標記為已棄用
  - [ ] Draft 狀態功能
  - [ ] Under_review 狀態

### 準確性檢查
- [ ] 與程式碼對照無誤
  - [ ] API 函數簽名正確
  - [ ] 類型定義正確
  - [ ] 檔案路徑正確
- [ ] 技術細節正確
- [ ] 範例程式碼可執行
- [ ] 環境變數名稱正確

## 完成標準
- [ ] 7 個既有文檔全部更新完成
- [ ] 2 個新文檔建立完成
- [ ] 檢查清單全部項目打勾
- [ ] 所有交叉引用測試通過
- [ ] 文檔結構和格式一致
- [ ] 團隊 Review 通過

## 維護計劃
- [ ] 建立文檔更新 SOP
- [ ] 每次重大功能更新後更新文檔
- [ ] 每月檢查文檔準確性
- [ ] 保持版本歷史記錄
- [ ] 設置文檔review提醒

## 執行時程
| Phase | 時間 | 主要任務 | 負責人 |
|-------|------|----------|--------|
| Phase 1 | Day 1 | 關鍵錯誤修正 | System |
| Phase 2 | Day 2-3 | 新文檔建立 | System |
| Phase 3 | Day 4-5 | 一般文檔更新 | System |
| Phase 4 | Day 6 | 品質檢查 | System |

## 風險與緩解
| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| 程式碼變更未同步 | 文檔不準確 | 執行前確認最新版本 |
| 交叉引用失效 | 導航困難 | 統一檢查所有連結 |
| 術語不一致 | 理解混亂 | 建立術語表 |

## 成功指標
- 文檔覆蓋率 100%
- 準確性 100%
- 新人onboarding時間減少 50%
- 開發者查找API時間減少 70%

---
**建立日期**: 2025-09-12  
**狀態**: 執行中  
**下次檢查**: 完成後