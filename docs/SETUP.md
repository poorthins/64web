# 環境設置和部署指南

---
title: 環境設置和部署指南
version: 2.0
last_updated: 2025-09-15
author: DevOps Team
---

## 專案概述

這是一個基於 React + Supabase 的碳足跡盤查系統，提供企業碳排放追蹤和管理功能。

## 專案結構

```
64web/
├── frontend/                    # React + TypeScript + Vite 前端應用
│   ├── src/
│   │   ├── api/                 # API 層：與 Supabase 互動
│   │   ├── components/          # 可重用元件
│   │   ├── contexts/            # React Context (認證等)
│   │   ├── hooks/               # 自定義 React Hooks
│   │   ├── lib/                 # 核心工具庫
│   │   │   └── supabaseClient.ts
│   │   ├── pages/               # 頁面元件
│   │   │   ├── Category1/       # 範疇一能源類別頁面
│   │   │   ├── Category2/       # 範疇二能源類別頁面
│   │   │   ├── Category3/       # 範疇三能源類別頁面
│   │   │   └── admin/           # 管理後台頁面
│   │   ├── routes/              # 路由配置
│   │   ├── shared/              # 共享元件和工具
│   │   └── utils/               # 工具函數和診斷工具
│   ├── public/                  # 靜態資源
│   │   └── examples/            # 範例檔案
│   ├── .env.example             # 前端環境變數範例
│   └── package.json
├── docs/                        # 專案文檔
│   ├── API_DOCUMENTATION.md     # API 完整文檔
│   ├── ARCHITECTURE.md          # 系統架構說明
│   ├── DATABASE_SCHEMA.md       # 資料庫架構
│   └── FRONTEND_DEVELOPMENT_GUIDE.md
└── README.md                    # 專案主說明檔案
```

## 系統需求

### 基本需求
- **Node.js** v18.0.0 或以上
- **npm** v8.0.0 或以上 (或 yarn v1.22.0+)
- **Git** 版本控制
- **Supabase** 帳戶和專案

### 推薦開發環境
- **VS Code** 搭配推薦擴展：
  - TypeScript and JavaScript Language Features
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - Auto Rename Tag

## 快速開始

### 1. 克隆專案

```bash
git clone <repository-url>
cd 64web
```

### 2. 環境設定

```bash
cd frontend
npm install
cp .env.example .env.local
```

編輯 `frontend/.env.local` 檔案，填入你的 Supabase 專案資訊：

```env
# Supabase 配置 (必填)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# 可選配置
VITE_APP_TITLE=碳足跡盤查系統
VITE_ENABLE_DIAGNOSTICS=true  # 開啟認證診斷工具
```

### 3. Supabase 專案配置

#### 3.1 建立 Supabase 專案

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 建立新專案
3. 複製專案 URL 和 API Keys

#### 3.2 資料庫設定

執行以下 SQL 腳本建立必要的資料表和函數：

```sql
-- 建立 profiles 表
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 建立 energy_entries 表
CREATE TABLE energy_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  category TEXT NOT NULL,
  scope INTEGER DEFAULT 1,
  period_year INTEGER NOT NULL,
  unit TEXT NOT NULL,
  amount DECIMAL(10,5) NOT NULL CHECK (amount > 0),
  monthly JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, category, period_year)
);

-- 建立 entry_files 表
CREATE TABLE entry_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES energy_entries(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

詳細的資料庫架構請參考 [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)。

#### 3.3 Storage 設定

1. 在 Supabase Dashboard 中建立名為 `evidence` 的 Storage Bucket
2. 設定 Storage Policies 允許用戶上傳檔案

## 啟動開發伺服器

### 開發模式

```bash
cd frontend
npm run dev
```

應用程式將在 http://localhost:5173 啟動

### 建置生產版本

```bash
npm run build
npm run preview  # 預覽生產建置
```

## 部署選項

### 1. Vercel 部署 (推薦)

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 在專案根目錄執行
vercel

# 設定環境變數
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### 2. Netlify 部署

1. 將專案推送到 Git 倉庫
2. 連接 Netlify 到你的倉庫
3. 設定建置命令：
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/dist`
4. 在環境變數設定中加入 Supabase 配置

### 3. Docker 部署

建立 `Dockerfile`：

```dockerfile
# 多階段建置
FROM node:18-alpine AS builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# 生產階段
FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

建置和執行：

```bash
docker build -t carbon-tracker .
docker run -p 8080:80 carbon-tracker
```

### 4. 自主機部署

```bash
# 建置專案
npm run build

# 將 dist/ 目錄內容複製到網頁伺服器
cp -r frontend/dist/* /var/www/html/

# 設定 nginx (範例)
sudo nano /etc/nginx/sites-available/carbon-tracker
```

nginx 配置範例：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理 (如果需要)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 測試和驗證

### 基本功能測試

1. **認證系統測試**
   ```
   訪問: http://localhost:5173
   - 應該重定向到登入頁面 (未登入)
   - 使用測試帳戶登入
   - 檢查儀表板是否正確載入
   ```

2. **權限測試**
   ```
   管理員帳戶: 應該能存取 /admin 路由
   一般用戶: 應該被拒絕存取管理功能
   ```

3. **功能測試**
   ```
   - 建立新的能源填報記錄
   - 上傳檔案證據
   - 提交記錄審核
   - (管理員) 審核記錄
   ```

### 內建診斷工具

系統提供多種診斷工具協助故障排除：

```javascript
// 在瀏覽器 Console 中執行
window.testDatabaseConnection()  // 測試資料庫連接
window.runUserCheck()           // 檢查用戶資料
window.diagnoseSystem()         // 完整系統診斷
```

詳細使用說明請參考 [認證診斷使用說明](AUTH_DIAGNOSTICS_USAGE.md)。

## 故障排除

### 常見問題

#### 1. 環境變數問題

**問題**: `VITE_SUPABASE_URL is not defined`

**解決方案**:
```bash
# 確認檔案名稱正確
ls -la frontend/.env*

# 應該是 .env.local 而不是 .env
# 確認環境變數格式
cat frontend/.env.local
```

#### 2. Supabase 連接問題

**問題**: `Failed to fetch` 或連接超時

**解決方案**:
1. 檢查 Supabase 專案狀態
2. 確認 URL 和 Key 正確
3. 檢查網路連接
4. 使用診斷工具：`window.testDatabaseConnection()`

#### 3. 認證問題

**問題**: 登入後立即登出或權限錯誤

**解決方案**:
1. 檢查 RLS 政策設定
2. 確認 profiles 表有對應記錄
3. 使用診斷工具：`window.diagnoseSystem()`

#### 4. 檔案上傳問題

**問題**: 檔案上傳失敗

**解決方案**:
1. 檢查 Storage Bucket `evidence` 是否存在
2. 確認 Storage Policies 設定正確
3. 檢查檔案大小限制 (預設 10MB)

### 除錯模式

啟用詳細日誌：

```env
# 在 .env.local 中添加
VITE_ENABLE_DIAGNOSTICS=true
VITE_LOG_LEVEL=debug
```

### 效能問題

如果遇到載入緩慢：

1. **檢查網路**：使用 Browser DevTools Network tab
2. **資料庫查詢**：檢查是否有 N+1 查詢問題
3. **快取**：確認瀏覽器快取設定
4. **建置最佳化**：使用 `npm run build` 建置最佳化版本

## 安全注意事項

### 環境變數安全

- ✅ **僅使用 anon_key**：前端永遠不應該包含 service_role_key
- ✅ **環境變數隔離**：生產和開發環境使用不同的 Supabase 專案
- ✅ **敏感資料**：永遠不要將 `.env.local` 加入版本控制

### Supabase 安全

- ✅ **Row Level Security (RLS)**：所有資料表都啟用 RLS 保護
- ✅ **API 權限**：使用 Supabase Policies 控制資料存取
- ✅ **檔案存取**：Storage Bucket 設定適當的存取權限

### 前端安全

- ✅ **路由保護**：未授權用戶無法存取受保護路由
- ✅ **資料驗證**：所有用戶輸入都經過驗證
- ✅ **XSS 保護**：使用 React 內建的 XSS 保護

### 部署安全

```bash
# 生產環境檢查清單

# 1. 環境變數
✓ 確認所有敏感資訊都通過環境變數設定
✓ 生產環境使用不同的 Supabase 專案

# 2. HTTPS
✓ 確保部署環境啟用 HTTPS
✓ 設定 HSTS headers

# 3. 網域安全
✓ 設定正確的 CORS 來源
✓ 使用 Content Security Policy (CSP)
```

## 開發檢查清單

### 初次設定

- [ ] 克隆專案並安裝依賴
- [ ] 複製並設定 `.env.local`
- [ ] 建立 Supabase 專案
- [ ] 執行資料庫遷移腳本
- [ ] 建立 Storage Bucket
- [ ] 測試認證功能

### 功能開發

- [ ] 能夠正常登入/登出
- [ ] 儀表板正確載入
- [ ] 能夠建立和編輯能源記錄
- [ ] 檔案上傳功能正常
- [ ] 管理員功能 (如果適用) 正常運作

### 部署前檢查

- [ ] 所有測試通過
- [ ] 建置成功無錯誤
- [ ] 環境變數正確設定
- [ ] 安全檢查通過
- [ ] 效能測試滿足需求

## 參考資源

- 📖 [完整 API 文檔](API_DOCUMENTATION.md)
- 🏗️ [系統架構說明](ARCHITECTURE.md)
- 🗄️ [資料庫架構](DATABASE_SCHEMA.md)
- 💻 [前端開發指引](FRONTEND_DEVELOPMENT_GUIDE.md)
- 🔍 [認證診斷工具](AUTH_DIAGNOSTICS_USAGE.md)

## 技術支援

如果遇到問題：

1. **查閱文檔**：首先查看相關的技術文檔
2. **使用診斷工具**：利用內建的診斷功能定位問題
3. **檢查日誌**：查看瀏覽器 Console 和網路請求
4. **社群支援**：在專案 Issues 中尋找解答或回報問題

---

**碳足跡盤查系統** - 快速、安全、易用的企業碳排放管理解決方案 🌱