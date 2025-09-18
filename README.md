# 碳足跡盤查系統 (Carbon Footprint Tracking System)

一個基於 React + Supabase 的企業碳排放追蹤和管理系統，支援完整的數據填報、審核工作流程和管理功能。

## 📋 專案概述

本系統提供企業進行碳足跡盤查的完整解決方案：

- **14 種能源類別追蹤**：包含天然氣、電力、交通、工業氣體等各類碳排放源
- **月度數據填報**：支援按月填報使用量，自動計算碳排放量
- **完整審核工作流**：管理員審核、狀態追蹤、重新提交機制
- **統一檔案管理系統**：上傳 MSDS、使用證明等證據檔案，支援記憶體暫存和統一清除功能
- **用戶權限管理**：分級權限控制，管理員和一般用戶角色

## 🚀 快速開始

### 前置需求

- Node.js (v18 或以上)
- npm 或 yarn
- Supabase 帳戶和專案

### 安裝與設定

詳細的環境設定指南請參閱 [SETUP.md](docs/SETUP.md)

```bash
# 克隆專案
git clone <repository-url>
cd 64web

# 安裝前端依賴
cd frontend
npm install

# 設定環境變數
cp .env.example .env.local
# 編輯 .env.local 填入你的 Supabase 配置

# 啟動開發伺服器
npm run dev
```

## 📚 文檔目錄

### 核心文檔
- 📖 [系統架構](docs/ARCHITECTURE.md) - 整體架構設計說明
- 🔧 [API 文檔](docs/API_DOCUMENTATION.md) - 完整 API 端點說明
- 🗄️ [資料庫架構](docs/DATABASE_SCHEMA.md) - 數據模型和關聯設計

### 開發指南
- 💻 [前端開發指引](docs/FRONTEND_DEVELOPMENT_GUIDE.md) - 詳細開發規範和最佳實踐
- 🏗️ [前端架構文檔](docs/FRONTEND_ARCHITECTURE.md) - 元件架構和設計模式
- 📝 [實作指南](docs/IMPLEMENTATION_GUIDE.md) - 新功能開發指引

### 維護工具
- 🔍 [認證診斷使用說明](docs/AUTH_DIAGNOSTICS_USAGE.md) - 問題排除工具
- ✅ [文檔檢查清單](docs/DOCUMENTATION_CHECKLIST.md) - 品質檢查標準

## 🛠️ 技術棧

### 前端
- **React 18** - 使用者介面框架
- **TypeScript** - 型別安全的 JavaScript
- **Tailwind CSS** - 實用優先的 CSS 框架
- **Vite** - 快速的建置工具
- **React Router** - 前端路由管理
- **統一服務架構** - 文件處理、狀態管理等共用服務

### 後端服務
- **Supabase** - Backend-as-a-Service 平台
  - PostgreSQL 資料庫
  - 即時訂閱
  - 認證服務
  - 檔案儲存
  - Row Level Security (RLS)

### 開發工具
- **ESLint** - 程式碼品質檢查
- **Prettier** - 程式碼格式化
- **Vitest** - 測試框架

## 📊 功能特色

### 能源類別管理
支援 14 種主要能源類別的碳排放追蹤：

| 範疇 | 類別 | 說明 |
|------|------|------|
| 範疇一 | 天然氣、LPG、柴油等 | 直接排放源 |
| 範疇二 | 電力 | 間接排放源 |
| 範疇三 | 員工通勤 | 其他間接排放 |

### 數據填報流程
1. **月度數據輸入** - 按月填報各類能源使用量
2. **證據檔案上傳** - 支援 MSDS、發票、使用證明等
   - 記憶體暫存功能：編輯模式下檔案先暫存於記憶體
   - 統一清除功能：一鍵清除所有暫存和已上傳資料
   - 狀態權限控制：已審核通過的資料禁止清除
3. **數據驗證** - 自動檢查數據完整性和合理性
4. **提交審核** - 送交管理員進行審核

### 管理功能
- **用戶管理** - 建立、編輯、停用用戶帳戶
- **審核工作台** - 批量審核、狀態追蹤
- **數據統計** - 排放量統計、趨勢分析
- **統一檔案管理** - 證據檔案的組織和存取，支援記憶體暫存和批量清除

## 🔐 安全特性

- **Row Level Security** - 資料庫層級的存取控制
- **JWT 認證** - 安全的用戶認證機制
- **角色權限控制** - 細粒度的功能權限管理
- **API 存取控制** - 端點層級的安全檢查

## 📈 監控與診斷

系統內建多種診斷工具：

- **認證狀態診斷** - 檢查用戶登入和權限問題
- **資料庫連接測試** - 驗證 Supabase 連接狀態
- **RLS 政策診斷** - 排查權限相關問題
- **API 功能測試** - 各模組功能驗證

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📄 授權條款

本專案採用 MIT 授權條款。詳細內容請參閱 [LICENSE](LICENSE) 檔案。

## 🆘 技術支援

如果您遇到問題或需要協助：

1. 查閱 [文檔目錄](#-文檔目錄) 中的相關指南
2. 使用內建的 [診斷工具](docs/AUTH_DIAGNOSTICS_USAGE.md)
3. 查看 [故障排除指南](docs/SETUP.md#故障排除)
4. 在 Issues 頁面回報問題

---

**碳足跡盤查系統** - 協助企業實現永續發展目標 🌱