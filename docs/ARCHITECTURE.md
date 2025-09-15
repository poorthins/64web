# 碳足跡盤查系統 - 實際架構文檔

---
title: 系統實際架構
version: 2.0
last_updated: 2025-09-12
author: System Architecture
---

## 專案概述
基於 React + Supabase 的碳排放追蹤系統，採用現代化 JAMstack 架構，支援企業級碳足跡盤查業務。

## 系統特色
1. **現代化架構**：React 18 + TypeScript + Supabase 全端解決方案
2. **分層設計**：前端元件化，後端 RLS 政策控制
3. **類型安全**：完整的 TypeScript 覆蓋
4. **安全性**：Row Level Security 確保資料安全
5. **測試框架**：Vitest + Playwright 完整測試覆蓋
6. **監控機制**：認證診斷工具和錯誤追蹤
7. **文檔完整**：API 文檔、架構文檔、開發指引
8. **模組化設計**：14個能源類別獨立管理

## 實際系統架構

### 1. 整體架構圖

```
Frontend (React + TypeScript)
├── UI Components (14 Energy Categories)
├── State Management (Context API + Local State)
├── API Layer (Supabase Client)
└── Routing (React Router + Protection)
              ↓ HTTP/WebSocket
Supabase Backend
├── Authentication (Supabase Auth)
├── Database (PostgreSQL + RLS)
├── Storage (File Management)
└── Edge Functions (Business Logic)
              ↓ SQL Queries
PostgreSQL Database
├── profiles (Users & Roles)
├── energy_entries (Energy Data)  
├── entry_files (Evidence Files)
└── review_history (Audit Trail)
```

### 2. 前端架構 (實際實作)

```
frontend/src/
├── api/                        # Supabase API 整合層
│   ├── entries.ts              # 能源記錄 CRUD
│   ├── files.ts                # 檔案管理（含編輯功能）
│   ├── adminUsers.ts           # 用戶管理
│   ├── adminSubmissions.ts     # 提交管理
│   └── adminMetrics.ts         # 統計資料
│
├── components/                 # 共用元件庫
│   ├── EvidenceUpload.tsx      # 檔案上傳元件
│   ├── StatusIndicator.tsx     # 狀態顯示元件
│   ├── BottomActionBar.tsx     # 底部操作欄
│   ├── Sidebar.tsx             # 主導航
│   └── Toast.tsx               # 通知系統
│
├── pages/                      # 頁面元件
│   ├── Category1/              # 範疇一（12個能源類別）
│   ├── Category2/              # 範疇二（1個能源類別）
│   ├── Category3/              # 範疇三（1個能源類別）
│   ├── admin/                  # 管理頁面
│   └── Dashboard.tsx           # 用戶儀表板
│
├── contexts/                   # 全域狀態管理
│   ├── AuthContext.tsx         # 認證狀態
│   └── NavigationContext.tsx   # 導航狀態
│
├── hooks/                      # 自訂 Hooks
│   ├── useEditPermissions.ts   # 編輯權限
│   ├── useUserProfile.ts       # 用戶資料
│   └── useStatusManager.ts     # 狀態管理
│
├── utils/                      # 工具函數
│   ├── authHelpers.ts          # 認證工具
│   ├── authDiagnostics.ts      # 診斷工具
│   ├── categoryConstants.ts    # 類別定義
│   └── designTokens.ts         # 設計系統
│
└── lib/                        # 外部服務配置
    └── supabaseClient.ts       # Supabase 用戶端
```

### 3. 後端架構 (Supabase)

```
Supabase Services
├── Authentication Service
│   ├── User Registration & Login
│   ├── Role-Based Access Control
│   └── Session Management
│
├── Database Service (PostgreSQL)
│   ├── Row Level Security Policies
│   ├── Triggers (Status Tracking)
│   └── Functions (Business Logic)
│
├── Storage Service
│   ├── Evidence File Storage
│   ├── Access Control Policies
│   └── File Metadata Management
│
└── Edge Functions (Minimal)
    └── Advanced Business Logic
```

## 當前技術棧

### 前端技術棧
```json
{
  "核心框架": {
    "React": "^18.2.0",
    "TypeScript": "^5.2.2", 
    "Vite": "^5.2.0"
  },
  "狀態管理": {
    "@tanstack/react-query": "^5.12.2",
    "zustand": "^4.4.7"
  },
  "表單處理": {
    "react-hook-form": "^7.48.2",
    "zod": "^3.22.4"
  },
  "UI/樣式": {
    "tailwindcss": "^3.4.3",
    "lucide-react": "^0.542.0",
    "recharts": "^2.10.3"
  },
  "測試框架": {
    "vitest": "^1.0.4",
    "@playwright/test": "^1.40.0",
    "storybook": "^7.6.3"
  }
}
```

### 後端服務 (Supabase)
```json
{
  "認證服務": "Supabase Auth",
  "資料庫": "PostgreSQL 15 + Row Level Security",
  "儲存服務": "Supabase Storage",
  "即時通訊": "Supabase Realtime",
  "邊緣函數": "Supabase Edge Functions",
  "API": "PostgREST (Auto-generated)"
}
```

### 開發工具
```json
{
  "代碼品質": ["ESLint", "Prettier", "TypeScript"],
  "版本控制": "Git",
  "CI/CD": "GitHub Actions",
  "監控": "Supabase Dashboard + 自訂診斷工具",
  "文檔": "Markdown + JSDoc"
}
```

## 已實現功能

### ✅ 核心功能完成
1. **認證系統**：完整的用戶認證與角色管理
2. **能源記錄管理**：14個能源類別的完整 CRUD 功能
3. **檔案管理系統**：上傳、刪除、編輯佐證檔案
4. **審核工作流**：管理員審核、狀態追蹤
5. **權限控制**：基於 RLS 的資料安全機制

### ✅ 架構優化完成
1. **模組化設計**：元件化、API 層分離
2. **錯誤處理**：統一的錯誤處理和恢復機制
3. **診斷工具**：認證狀態監控和 RLS 錯誤分析
4. **測試框架**：單元測試、集成測試、E2E 測試
5. **文檔系統**：完整的 API 文檔和架構文檔

### ✅ 最新功能更新
1. **移除草稿功能**：簡化狀態流程
2. **檔案編輯功能**：已提交記錄的檔案管理
3. **錯誤恢復機制**：Promise.allSettled 批量操作
4. **狀態簡化**：submitted → approved/rejected

## 系統優勢

### 1. 技術優勢
- **現代化技術棧**：React 18 + TypeScript + Supabase 的完美組合
- **類型安全**：端到端的 TypeScript 覆蓋，減少運行時錯誤
- **即時同步**：Supabase Realtime 支援即時資料更新
- **自動化 API**：PostgREST 自動生成 RESTful API

### 2. 安全優勢
- **Row Level Security**：資料庫層級的安全控制
- **角色基礎權限**：細粒度的權限管理
- **認證診斷工具**：快速定位認證問題
- **審計追蹤**：完整的操作記錄

### 3. 開發優勢
- **模組化架構**：14個能源類別獨立管理
- **元件重用**：統一的 UI 元件庫
- **錯誤恢復**：Promise.allSettled 模式處理批量操作
- **診斷工具**：開發階段的詳細調試資訊

### 4. 維護優勢
- **文檔完整**：API、架構、開發指引一應俱全
- **測試覆蓋**：單元測試、整合測試、E2E 測試
- **監控機制**：系統健康度監控
- **版本控制**：清晰的變更歷史追蹤

## 相關文檔

- [API 文檔](./API_DOCUMENTATION.md) - 完整的 API 函數說明
- [前端架構文檔](./FRONTEND_ARCHITECTURE.md) - 前端系統架構詳解  
- [資料庫架構文檔](./DATABASE_SCHEMA.md) - 資料庫結構和 RLS 政策
- [前端開發指引](./FRONTEND_DEVELOPMENT_GUIDE.md) - 開發最佳實踐
- [認證診斷工具](./AUTH_DIAGNOSTICS_USAGE.md) - 認證問題診斷工具
- [設置指南](./SETUP.md) - 環境設置和部署指南

## 版本歷史

| 版本 | 日期 | 變更內容 | 作者 |
|------|------|----------|------|
| 2.0 | 2025-09-12 | 更新為實際架構，移除理論設計 | System |
| 1.0 | 2025-09-09 | 初始企業架構設計 | System |

---
**最後更新**: 2025-09-12  
**架構狀態**: 穩定運行  
**維護團隊**: 全端開發組
