# Supabase 整合設定指南

## 專案結構

```
64web/
├── frontend/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabaseClient.ts    # Supabase client
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # 認證狀態管理
│   │   └── pages/
│   │       └── PingPage.tsx         # /ping 頁面
│   ├── .env.example             # 前端環境變數範例
│   └── package.json
└── backend/                     # Flask
    ├── utils/
    │   ├── supabase_admin.py    # Admin client (僅後端)
    │   └── auth.py              # 認證工具函式
    ├── .env.example             # 後端環境變數範例
    ├── app.py                   # Flask 主應用
    └── requirements.txt
```

## 安裝與設定

### 1. 後端設定

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

編輯 `.env` 檔案，填入你的 Supabase 專案資訊：
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ALLOW_ORIGIN=http://localhost:5173
```

### 2. 前端設定

```bash
cd frontend
npm install
cp .env.example .env
```

編輯 `.env` 檔案：
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 啟動應用程式

### 啟動後端 (Flask)
```bash
cd backend
python app.py
```
後端將在 http://localhost:5000 運行

### 啟動前端 (Vite)
```bash
cd frontend
npm run dev
```
前端將在 http://localhost:5173 運行

## 測試端點

### 測試後端健康檢查
```bash
curl http://localhost:5000/api/health
```
預期回應：`{"ok": true}`

### 測試前端認證狀態
瀏覽器訪問：http://localhost:5173/ping

- 未登入時顯示：`guest`
- 已登入時顯示：`logged in: user@example.com`

## 功能說明

### 前端
- ✅ Supabase client 設定 (使用環境變數)
- ✅ AuthContext 提供全域認證狀態
- ✅ /ping 頁面顯示登入狀態
- ✅ 自動監聽認證狀態變化

### 後端
- ✅ Flask + CORS 設定
- ✅ /api/health 端點
- ✅ Supabase admin client (僅後端使用)
- ✅ get_user_from_token 認證工具函式

## 安全注意事項

- ✅ service_role_key 僅存在後端
- ✅ 前端只使用 anon_key
- ✅ CORS 正確設定來源
- ✅ 環境變數正確分離

## Checklist

- ☑️ 前端 /ping 能顯示 guest / logged in
- ☑️ 後端 /api/health 回傳 { ok: true }
- ☑️ 後端能成功 import admin client（未暴露 service_role）
- ☑️ CORS 設定 OK（前端可呼叫後端）