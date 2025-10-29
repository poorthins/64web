# 碳足跡系統 2 週極速修復計劃

**建立日期**：2025-10-27
**執行期間**：2 週（80 小時全職）
**目標**：資安加固 + 為設計師準備 UI 架構 + 效能優化

---

## 📊 現況評估

### ✅ 已完成的好事
1. **前端重構完成**：14 個能源頁面已套用 Hook 架構（2025-10-09 完成）
2. **Hook 系統運作**：useEnergyData, useEnergySubmit, useEnergyClear 等核心 Hook 已建立
3. **測試架構存在**：有 Vitest + 27 個測試檔案
4. **功能完整**：使用者填報、管理員審核、檔案上傳都能運作

### 🔴 需要立即修復的災難

#### 1. 前端程式碼重複 85%
- **現狀**：17,655 行程式碼，14 個頁面複製貼上
- **問題**：改一個邏輯要改 14 次，維護地獄
- **目標**：減少到 4,500-6,000 行（-66% ~ -74%）

#### 2. 後端 N+1 Query
- **現狀**：100 個用戶 = 201 次資料庫查詢
- **問題**：Dashboard 載入 3-5 秒，用戶量大會炸
- **目標**：< 10 次查詢，載入 < 1 秒

#### 3. CORS 完全開放
- **現狀**：`origins: "*"` 任何網站都可呼叫 API
- **問題**：CSRF 攻擊風險
- **目標**：只允許自己的前端網域

#### 4. Git 狀態混亂
- **現狀**：200+ 已刪檔案未 commit（coverage/ 和 docs/）
- **問題**：污染版本控制，看不清變更
- **目標**：git status 乾淨

#### 5. 無 Input Validation
- **現狀**：API 不檢查輸入型別和範圍
- **問題**：注入攻擊風險
- **目標**：所有 API 有驗證

#### 6. 權限檢查複製貼上 7 次
- **現狀**：每個 admin API 都手動檢查 role
- **問題**：容易漏改或改錯
- **目標**：統一用 decorator

### 🟡 需要中期處理的問題

7. **POC/backup 程式碼殘留**：80+ 檔案沒用了
8. **沒有 README.md**：新人無法上手
9. **.gitignore 只有 3 行**：應該有 20+ 行
10. **測試覆蓋率未知**：需要補測試
11. **無 Design System**：設計師無法套用 Figma 設計

---

## 🎯 修復策略

**核心思路**：先堵資安漏洞 → 建立 Design System → 全面重構前端 → 補測試

**為什麼這樣排？**
1. **資安優先**：系統可以慢，但不能被打穿
2. **Design System 優先**：設計師需要元件庫才能工作
3. **重構是大工程**：需要連續時間，放中間
4. **測試最後補**：確保重構後的程式碼品質

---

## 📅 Week 1：資安 + 基礎建設（Day 1-5，40 小時）

### Day 1（8 小時）：緊急資安修復 + Git 清理

#### 上午（4 小時）- 資安緊急修補

**Task 1.1：修改 CORS 設定（10 分鐘）**
```python
# backend/app.py
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:5173",  # Vite dev server
            # TODO: 生產環境加你的網域
        ],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

**Task 1.2：建立權限 Decorator（1 小時）**
- [ ] 建立檔案 `backend/utils/decorators.py`
- [ ] 實作 `@require_admin` decorator
- [ ] 把 `request.current_user` 儲存到 request context

```python
from functools import wraps
from flask import request, jsonify
from utils.auth import get_user_from_token

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        user = get_user_from_token(auth_header)
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Admin access required"}), 403
        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function
```

**Task 1.3：套用到所有 7 個 admin API（30 分鐘）**
- [ ] `/api/admin/users`
- [ ] `/api/admin/users/<user_id>/entries`
- [ ] `/api/admin/entries`
- [ ] `/api/admin/users/bulk-update`
- [ ] `/api/admin/entries/<entry_id>/review`
- [ ] `/api/admin/create-user`
- [ ] 刪除每個函式內的重複檢查邏輯

**Task 1.4：刪除測試 API（5 分鐘）**
- [ ] 刪除 `/api/test-supabase`（或加上 `@require_admin`）
- [ ] 檢查有沒有其他測試用 API

**Task 1.5：加入基礎 Input Validation（1 小時）**
- [ ] `bulk_update_users`：檢查 user_ids 是 array、is_active 是 boolean
- [ ] `create_user`：檢查 email 格式、密碼強度
- [ ] 使用 Pydantic 或手動驗證

```python
# 範例
def bulk_update_users():
    data = request.get_json()

    # Validation
    if not isinstance(data.get('user_ids'), list):
        return jsonify({"error": "user_ids must be an array"}), 400
    if not isinstance(data.get('is_active'), bool):
        return jsonify({"error": "is_active must be boolean"}), 400
    if len(data['user_ids']) == 0:
        return jsonify({"error": "user_ids cannot be empty"}), 400
    if len(data['user_ids']) > 100:
        return jsonify({"error": "Cannot update more than 100 users at once"}), 400

    # 業務邏輯...
```

**Task 1.6：修改錯誤訊息（30 分鐘）**
- [ ] 所有 `except Exception as e` 改成記到 log
- [ ] 回傳通用訊息給客戶端：`{"error": "Internal server error"}`
- [ ] 加入 logger

```python
import logging
logger = logging.getLogger(__name__)

try:
    # ...
except Exception as e:
    logger.error(f"Error in get_all_users: {str(e)}", exc_info=True)
    return jsonify({"error": "Internal server error"}), 500
```

**Task 1.7：測試所有 admin API（30 分鐘）**
- [ ] 用 Postman 或 curl 測試每個 API
- [ ] 測試沒 token → 403
- [ ] 測試 user role → 403
- [ ] 測試 admin role → 200

#### 下午（4 小時）- Git 清理 + 文件基礎

**Task 1.8：提交已刪除的檔案（10 分鐘）**
```bash
git add -u
git commit -m "chore: remove deleted coverage and docs files"
```

**Task 1.9：修正 .gitignore（20 分鐘）**
```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
.env
.env.local
.env.test

# Node
node_modules/
dist/
build/
coverage/

# IDEs
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Temp
*.tmp
*.bak
*.backup
```

**Task 1.10：刪除臨時檔案（30 分鐘）**
```bash
rm frontend/.env.swp
rm frontend/src/pages/Category1/DieselGeneratorRefuelPage_new.tsx
rm admin_interface_v3.html  # 或移到 docs/archive/
rm check_file_types.sql  # 移到 migrations/
```

**Task 1.11：確認並刪除 POC/backup 程式碼（1 小時）**
```bash
# 1. 確認沒有引用
grep -r "admin/poc" frontend/src/routes/
grep -r "admin.backup" frontend/src/routes/

# 2. 如果沒引用，刪除
rm -rf frontend/src/pages/admin/poc/
rm -rf frontend/src/pages/admin.backup/

# 3. 刪除測試頁面
rm frontend/src/pages/TestReviewAPI.tsx
rm frontend/src/pages/TestUserCheck.tsx
```

**Task 1.12：寫根目錄 README.md（1 小時）**
```markdown
# 碳足跡管理系統

## 快速開始

### 前置需求
- Node.js 18+
- Python 3.10+
- Supabase 帳號

### Frontend
cd frontend
npm install
cp .env.example .env
# 編輯 .env 填入 Supabase 憑證
npm run dev

### Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# 編輯 .env 填入 Supabase Admin 憑證
python app.py

## 架構
- **Frontend**: React + TypeScript + Vite
- **Backend**: Flask + Supabase Admin SDK
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage

## 文件
- [API 文件](docs/API.md)
- [架構說明](docs/ARCHITECTURE.md)
- [開發指南](recons_doc/REFACTORING_PLAN.md)
- [設計師指南](frontend/DESIGN_INTEGRATION.md)

## 專案結構
- `frontend/` - React 前端應用
- `backend/` - Flask API 服務
- `recons_doc/` - 重構文件和計畫
- `migrations/` - SQL 遷移腳本
```

**Task 1.13：寫 backend/README.md（1 小時）**
```markdown
# Backend API

## 環境變數

複製 `.env.example` 到 `.env` 並填入：

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key

## API 端點

### 公開端點
- `GET /api/health` - 健康檢查

### 管理員端點（需要 Admin 權限）
- `GET /api/admin/users` - 取得所有用戶
- `GET /api/admin/users/<user_id>/entries` - 取得用戶的填報記錄
- `GET /api/admin/entries` - 取得所有填報記錄
- `PUT /api/admin/users/bulk-update` - 批次更新用戶狀態
- `POST /api/admin/entries/<entry_id>/review` - 審核填報記錄
- `POST /api/admin/create-user` - 建立新用戶

## 開發

python app.py

## 測試

pytest
```

#### Day 1 晚上驗收（30 分鐘自我測試）

- [ ] ✅ CORS 限制生效（用非允許的 origin 測試 → 403）
- [ ] ✅ 所有 admin API 有權限檢查（無 token → 403）
- [ ] ✅ Input validation 運作（送錯誤型別 → 400）
- [ ] ✅ git status 乾淨（沒有 200+ deleted 檔案）
- [ ] ✅ 專案有 README（能看到快速開始指南）

---

### Day 2（8 小時）：效能優化 + Design Tokens

#### 上午（4 小時）- N+1 Query 修復

**Task 2.1：重寫 get_all_users()（2 小時）**

修改 `backend/app.py` 的 `get_all_users()` 函式：

```python
@app.route('/api/admin/users', methods=['GET'])
@require_admin
def get_all_users():
    try:
        supabase = get_supabase_admin()

        # 一次查詢拿到所有資料（包含 entry count）
        # 注意：Supabase 不支援 count aggregation，需要分開查
        profiles_result = supabase.table('profiles').select('*').execute()

        # 批次取得 entries count
        all_entries = supabase.table('energy_entries').select('id, owner_id').execute()
        entry_counts = {}
        for entry in all_entries.data:
            owner_id = entry['owner_id']
            entry_counts[owner_id] = entry_counts.get(owner_id, 0) + 1

        # 批次取得 email
        auth_users = supabase.auth.admin.list_users()
        email_map = {u.id: u.email for u in auth_users}

        # 組合資料
        users = [{
            'id': p['id'],
            'email': email_map.get(p['id'], 'N/A'),
            'display_name': p.get('display_name', 'N/A'),
            'role': p.get('role', 'user'),
            'is_active': p.get('is_active', True),
            'company': p.get('company', 'N/A'),
            'entries_count': entry_counts.get(p['id'], 0)
        } for p in profiles_result.data]

        return jsonify({"users": users})
    except Exception as e:
        logger.error(f"Error in get_all_users: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500
```

**Task 2.2：建立 /api/admin/dashboard 統一 API（2 小時）**

新增到 `backend/app.py`：

```python
@app.route('/api/admin/dashboard', methods=['GET'])
@require_admin
def get_dashboard_data():
    """一次返回 dashboard 需要的所有資料"""
    try:
        supabase = get_supabase_admin()

        # 取得所有 profiles
        profiles = supabase.table('profiles').select('*').execute()

        # 取得所有 entries（含審核狀態）
        entries = supabase.table('energy_entries').select('*').execute()

        # 計算統計
        total_users = len(profiles.data)
        active_users = len([u for u in profiles.data if u.get('is_active')])
        total_entries = len(entries.data)

        # 按狀態分類
        entries_by_status = {
            'submitted': 0,
            'approved': 0,
            'needs_fix': 0,
            'saved': 0
        }
        for entry in entries.data:
            status = entry.get('status', 'saved')
            entries_by_status[status] = entries_by_status.get(status, 0) + 1

        # 取得最近的提交（最後 10 筆）
        recent_submissions = sorted(
            [e for e in entries.data if e.get('status') == 'submitted'],
            key=lambda x: x.get('updated_at', ''),
            reverse=True
        )[:10]

        return jsonify({
            "stats": {
                "total_users": total_users,
                "active_users": active_users,
                "total_entries": total_entries,
                "submitted": entries_by_status['submitted'],
                "approved": entries_by_status['approved'],
                "needs_fix": entries_by_status['needs_fix']
            },
            "users": profiles.data,
            "recent_submissions": recent_submissions
        })
    except Exception as e:
        logger.error(f"Error in get_dashboard_data: {str(e)}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500
```

#### 下午（4 小時）- Design System 基礎

**Task 2.3：從設計師拿 Figma 檔案（30 分鐘）**
- [ ] 跟設計師確認有沒有 Figma 設計稿
- [ ] 如果有，請設計師提供 Design Tokens（顏色、字體、間距）
- [ ] 如果沒有，先用現有的設計建立基礎

**Task 2.4：建立 Design Tokens（1 小時）**

建立檔案 `frontend/src/design/tokens.ts`：

```typescript
// Design Tokens - 從 Figma 導出或根據現有設計定義

export const colors = {
  // Primary Colors
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',  // 主色
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },

  // Semantic Colors
  success: {
    50: '#e8f5e9',
    500: '#4caf50',
    700: '#388e3c',
  },
  warning: {
    50: '#fff3e0',
    500: '#ff9800',
    700: '#f57c00',
  },
  error: {
    50: '#ffebee',
    500: '#f44336',
    700: '#d32f2f',
  },
  info: {
    50: '#e3f2fd',
    500: '#2196f3',
    700: '#1976d2',
  },

  // Neutral Colors
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  white: '#ffffff',
  black: '#000000',
}

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
}

export const typography = {
  fontFamily: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace',
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem',// 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
}

export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',
}
```

**Task 2.5：建立元件庫資料夾結構（30 分鐘）**

```bash
mkdir -p frontend/src/components/ui
cd frontend/src/components/ui
touch Button.tsx Card.tsx Input.tsx Modal.tsx Select.tsx Table.tsx index.ts
```

**Task 2.6：實作 Button 元件（1 小時）**

建立 `frontend/src/components/ui/Button.tsx`：

```typescript
import React from 'react'
import { colors, spacing, borderRadius, shadows } from '../../design/tokens'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  children,
  type = 'button',
}: ButtonProps) {
  const baseStyles = {
    fontWeight: 600,
    borderRadius: borderRadius.md,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s',
    width: fullWidth ? '100%' : 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  }

  const variantStyles = {
    primary: {
      backgroundColor: colors.primary[500],
      color: colors.white,
      boxShadow: shadows.sm,
      ':hover': { backgroundColor: colors.primary[600] },
    },
    secondary: {
      backgroundColor: colors.gray[100],
      color: colors.gray[700],
      ':hover': { backgroundColor: colors.gray[200] },
    },
    danger: {
      backgroundColor: colors.error[500],
      color: colors.white,
      ':hover': { backgroundColor: colors.error[600] },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.gray[700],
      ':hover': { backgroundColor: colors.gray[100] },
    },
  }

  const sizeStyles = {
    sm: { padding: `${spacing.xs} ${spacing.sm}`, fontSize: '0.875rem' },
    md: { padding: `${spacing.sm} ${spacing.md}`, fontSize: '1rem' },
    lg: { padding: `${spacing.md} ${spacing.lg}`, fontSize: '1.125rem' },
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {loading && <span>Loading...</span>}
      {children}
    </button>
  )
}
```

**Task 2.7：實作 Card 元件（1 小時）**

建立 `frontend/src/components/ui/Card.tsx`：

```typescript
import React from 'react'
import { colors, spacing, borderRadius, shadows } from '../../design/tokens'

export interface CardProps {
  children: React.ReactNode
  padding?: 'sm' | 'md' | 'lg'
  shadow?: 'sm' | 'base' | 'md' | 'lg'
  hover?: boolean
  onClick?: () => void
}

export function Card({
  children,
  padding = 'md',
  shadow = 'base',
  hover = false,
  onClick,
}: CardProps) {
  const paddingStyles = {
    sm: spacing.md,
    md: spacing.lg,
    lg: spacing.xl,
  }

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        boxShadow: shadows[shadow],
        padding: paddingStyles[padding],
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        border: `1px solid ${colors.gray[200]}`,
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = shadows.lg
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = shadows[shadow]
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {children}
    </div>
  )
}
```

**Task 2.8：建立 index.ts 導出（30 分鐘）**

建立 `frontend/src/components/ui/index.ts`：

```typescript
export { Button, type ButtonProps } from './Button'
export { Card, type CardProps } from './Card'
// 未來會加入更多元件
// export { Input, type InputProps } from './Input'
// export { Modal, type ModalProps } from './Modal'
```

#### Day 2 晚上驗收

- [ ] ✅ Dashboard API 運作（回傳統計資料）
- [ ] ✅ 前端能呼叫新 API（載入時間測試）
- [ ] ✅ Design tokens 建立（colors, spacing, typography）
- [ ] ✅ Button 元件能渲染（3 種變體、3 種尺寸）
- [ ] ✅ Card 元件能渲染（hover 效果正常）

---

### Day 3（8 小時）：BaseEnergyPage 設計

#### 全天任務 - 核心重構架構

**Task 3.1：設計 EnergyPageConfig 介面（1 小時）**

建立 `frontend/src/types/energyPageConfig.ts`：

```typescript
export type InputMode = 'monthly' | 'equipment-list' | 'bill-list' | 'file-only'

export interface FormField {
  name: string
  type: 'number' | 'text' | 'select' | 'date' | 'textarea'
  label: string
  unit?: string
  placeholder?: string
  required?: boolean
  validation?: (value: any) => string | null
  options?: { value: string; label: string }[]  // 用於 select
}

export interface FileConfig {
  type: 'msds' | 'monthly' | 'annual' | 'equipment'
  maxFiles: number
  required: boolean
  label: string
  accept?: string  // 例如：'.pdf,.jpg,.png'
}

export interface EnergyPageConfig {
  // 基本資訊
  pageKey: string
  pageTitle: string
  categoryName: string

  // 輸入模式
  inputMode: InputMode

  // 表單欄位（用於 monthly 模式）
  fields?: FormField[]

  // 設備清單欄位（用於 equipment-list 模式）
  equipmentFields?: FormField[]

  // 檔案配置
  files: FileConfig[]

  // 計算邏輯（可選）
  calculate?: (formData: any) => number

  // 資料轉換（可選）
  transformPayload?: (formData: any) => any

  // 驗證邏輯（可選）
  validate?: (formData: any) => string[]
}
```

**Task 3.2：分析 14 個頁面的共同模式（1 小時）**

在紙上或 Markdown 列出：
- [ ] 哪些狀態是所有頁面都有的？
- [ ] 哪些 useEffect 是重複的？
- [ ] 審核邏輯是否完全相同？
- [ ] 檔案上傳流程是否一致？

記錄到 `recons_doc/BASE_ENERGY_PAGE_ANALYSIS.md`

**Task 3.3：建立 BaseEnergyPage.tsx 骨架（2 小時）**

建立 `frontend/src/components/BaseEnergyPage.tsx`：

```typescript
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EnergyPageConfig } from '../types/energyPageConfig'
import { useEnergyData } from '../hooks/useEnergyData'
import { useEnergySubmit } from '../hooks/useEnergySubmit'
import { useEnergyClear } from '../hooks/useEnergyClear'
import { useApprovalStatus } from '../hooks/useApprovalStatus'
import { useStatusBanner } from '../hooks/useStatusBanner'

interface BaseEnergyPageProps {
  config: EnergyPageConfig
  renderForm: (props: {
    formData: any
    setFormData: (data: any) => void
    disabled: boolean
  }) => React.ReactNode
}

export function BaseEnergyPage({ config, renderForm }: BaseEnergyPageProps) {
  const [searchParams] = useSearchParams()
  const year = new Date().getFullYear()

  // 審核模式
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')

  // 核心 Hooks
  const { loadedEntry, loadedFiles, dataLoading, reload } = useEnergyData(
    config.pageKey,
    year,
    isReviewMode ? reviewEntryId : undefined
  )

  const { currentStatus, reloadApprovalStatus } = useApprovalStatus(
    config.pageKey,
    year
  )

  const banner = useStatusBanner(currentStatus, loadedEntry?.review_notes)

  // 狀態
  const [formData, setFormData] = useState<any>({})
  const [memoryFiles, setMemoryFiles] = useState<any>({})

  // 計算是否可編輯
  const canEdit = currentStatus !== 'approved' && !isReviewMode

  // 載入資料到表單
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      setFormData(loadedEntry.payload || {})
    }
  }, [loadedEntry, dataLoading])

  // 提交邏輯
  const handleSubmit = async () => {
    // 驗證
    const errors = config.validate ? config.validate(formData) : []
    if (errors.length > 0) {
      alert(errors.join('\n'))
      return
    }

    // 計算總量
    const total = config.calculate ? config.calculate(formData) : 0

    // 準備 payload
    const payload = config.transformPayload
      ? config.transformPayload(formData)
      : formData

    // 提交（使用 useEnergySubmit Hook）
    // ...
  }

  // 渲染
  if (dataLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      {/* 審核狀態橫幅 */}
      {banner && <StatusBanner {...banner} />}

      {/* 表單區域 */}
      <div>
        {renderForm({
          formData,
          setFormData,
          disabled: !canEdit,
        })}
      </div>

      {/* 檔案上傳區域 */}
      <div>
        {/* 根據 config.files 動態渲染 */}
      </div>

      {/* 底部操作欄 */}
      {canEdit && (
        <div>
          <button onClick={handleSubmit}>提交</button>
          <button onClick={() => {}}>清除</button>
        </div>
      )}
    </div>
  )
}
```

**Task 3.4：實作共用狀態管理（1 小時）**

在 BaseEnergyPage 內整合：
- [ ] 所有共用 useState（currentStatus, hasSubmittedBefore 等）
- [ ] 所有共用的 Modal state（showSuccessModal 等）
- [ ] Error/Success 訊息管理

**Task 3.5：實作動態表單渲染邏輯（2 小時）**

根據 `config.inputMode` 動態渲染：
- [ ] `monthly`：渲染 12 個月份輸入框
- [ ] `equipment-list`：渲染設備清單
- [ ] `bill-list`：渲染帳單列表
- [ ] `file-only`：只有檔案上傳，無表單

**Task 3.6：單元測試 BaseEnergyPage（1 小時）**

建立 `frontend/src/components/__tests__/BaseEnergyPage.test.tsx`

#### Day 3 晚上驗收

- [ ] ✅ BaseEnergyPage 元件存在
- [ ] ✅ 接受 config 參數
- [ ] ✅ 能渲染基本 UI（標題、表單區、按鈕）
- [ ] ✅ 測試通過

---

### Day 4（8 小時）：共用 UI 元件 + 配置系統

#### 上午（4 小時）- 統一 UI 元件

**Task 4.1：抽取 StatusBanner 元件（1 小時）**

建立 `frontend/src/components/StatusBanner.tsx`：

```typescript
import React from 'react'

export interface StatusBannerProps {
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message?: string
  reason?: string  // 退回原因
  icon?: string
}

export function StatusBanner({ type, title, message, reason, icon }: StatusBannerProps) {
  const colorClasses = {
    success: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-800' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-800' },
    error: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800' },
    info: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-800' },
  }

  const colors = colorClasses[type]

  return (
    <div className={`border-l-4 ${colors.border} ${colors.bg} p-4 mb-6 rounded-r-lg`}>
      <div className="flex items-center">
        {icon && <div className="text-2xl mr-3">{icon}</div>}
        <div className="flex-1">
          <p className={`font-bold text-lg ${colors.text}`}>{title}</p>
          {message && <p className="text-sm mt-1">{message}</p>}
          {reason && (
            <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
              <p className="text-base font-bold text-red-800 mb-1">退回原因：</p>
              <p className="text-lg font-semibold text-red-900">{reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Task 4.2：抽取 SubmitSuccessModal（1 小時）**
**Task 4.3：抽取 ClearConfirmModal（1 小時）**
**Task 4.4：抽取 BottomActionBar（1 小時）**

#### 下午（4 小時）- 配置系統建立

**Task 4.5：建立 configs/ 資料夾（10 分鐘）**

```bash
mkdir -p frontend/src/configs
cd frontend/src/configs
touch index.ts diesel.config.ts wd40.config.ts gasoline.config.ts
```

**Task 4.6：為 DieselPage 寫配置檔（1 小時）**

建立 `frontend/src/configs/diesel.config.ts`：

```typescript
import { EnergyPageConfig } from '../types/energyPageConfig'

export const dieselConfig: EnergyPageConfig = {
  pageKey: 'diesel',
  pageTitle: '柴油使用量填報',
  categoryName: '柴油',
  inputMode: 'monthly',

  fields: [
    {
      name: 'heatValue',
      type: 'number',
      label: '熱值 (MJ/L)',
      required: true,
      validation: (value) => {
        if (!value || value <= 0) return '熱值必須大於 0'
        return null
      }
    }
  ],

  files: [
    {
      type: 'msds',
      maxFiles: 3,
      required: true,
      label: 'MSDS 或產品規格文件',
      accept: '.pdf,.jpg,.jpeg,.png'
    },
    {
      type: 'monthly',
      maxFiles: 3,
      required: false,
      label: '每月佐證資料',
      accept: '.pdf,.jpg,.jpeg,.png'
    }
  ],

  calculate: (formData) => {
    // 計算年度總使用量
    const monthly = formData.monthly || {}
    return Object.values(monthly).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0)
  },

  validate: (formData) => {
    const errors: string[] = []

    // 檢查熱值
    if (!formData.heatValue || formData.heatValue <= 0) {
      errors.push('請輸入有效的熱值')
    }

    // 檢查至少有一個月份有資料
    const monthly = formData.monthly || {}
    const hasData = Object.values(monthly).some(val => Number(val) > 0)
    if (!hasData) {
      errors.push('至少需要填寫一個月份的使用量')
    }

    return errors
  }
}
```

**Task 4.7：為 WD40Page 寫配置檔（1 小時）**
**Task 4.8：建立配置驗證邏輯（1 小時）**
**Task 4.9：測試配置系統（50 分鐘）**

#### Day 4 晚上驗收

- [ ] ✅ 4 個共用 UI 元件完成
- [ ] ✅ StatusBanner 能渲染 4 種狀態
- [ ] ✅ 配置系統能載入配置檔
- [ ] ✅ 2 個頁面有配置檔（diesel, wd40）

---

### Day 5（8 小時）：第一個頁面完整重構

#### 全天任務 - DieselPage 重構

**Task 5.1：用 BaseEnergyPage 重寫 DieselPage（4 小時）**

修改 `frontend/src/pages/Category1/DieselPage.tsx`：

```typescript
import React from 'react'
import { BaseEnergyPage } from '../../components/BaseEnergyPage'
import { dieselConfig } from '../../configs/diesel.config'

export function DieselPage() {
  return (
    <BaseEnergyPage
      config={dieselConfig}
      renderForm={({ formData, setFormData, disabled }) => (
        <div>
          {/* 熱值輸入 */}
          <div className="mb-4">
            <label>熱值 (MJ/L)</label>
            <input
              type="number"
              value={formData.heatValue || ''}
              onChange={(e) => setFormData({ ...formData, heatValue: e.target.value })}
              disabled={disabled}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* 12 個月份輸入 */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
              <div key={month}>
                <label>{month} 月</label>
                <input
                  type="number"
                  value={formData.monthly?.[month] || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    monthly: { ...formData.monthly, [month]: e.target.value }
                  })}
                  disabled={disabled}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    />
  )
}
```

**Task 5.2：完整測試 DieselPage（2 小時）**

測試清單：
- [ ] 首次填報 → 提交成功
- [ ] 重新進入頁面 → 載入舊資料
- [ ] 修改後提交 → 更新成功
- [ ] 檔案上傳 → 即時顯示
- [ ] 檔案刪除 → 從列表移除
- [ ] 清除功能 → 資料清空
- [ ] 管理員退回 → 顯示退回原因
- [ ] 重新編輯提交 → status 變 submitted
- [ ] Approved 狀態 → 唯讀模式

**Task 5.3：修正發現的 Bug（1 小時）**

記錄所有發現的問題並修正

**Task 5.4：程式碼對比（舊 vs 新）（30 分鐘）**

```bash
wc -l frontend/src/pages/Category1/DieselPage.tsx.old
wc -l frontend/src/pages/Category1/DieselPage.tsx
# 計算減少的行數
```

**Task 5.5：寫 MIGRATION_GUIDE.md（30 分鐘）**

建立 `recons_doc/MIGRATION_GUIDE.md`，記錄如何將舊頁面遷移到新架構

#### Day 5 晚上驗收

- [ ] ✅ DieselPage 重構完成
- [ ] ✅ 所有測試流程通過
- [ ] ✅ 程式碼減少 60%+ （例如：1400 行 → 500 行）
- [ ] ✅ 有遷移指南文件

---

## 📅 Week 2：全面重構 + 設計師對接（Day 6-10，40 小時）

### Day 6-7（16 小時）：批次重構 12 個簡單頁面

#### 策略：流水線作業

每個頁面的步驟：
1. 寫配置檔（30-45 分鐘）
2. 改用 BaseEnergyPage（15-30 分鐘）
3. 快速測試（15 分鐘）

#### Day 6 上午（4 小時）- 4 個頁面

**Task 6.1：GasolinePage（1 小時）**
- [ ] 寫 gasoline.config.ts
- [ ] 修改 GasolinePage.tsx
- [ ] 測試提交流程

**Task 6.2：WD40Page（1 小時）**
**Task 6.3：AcetylenePage（1 小時）**
**Task 6.4：LPGPage（1 小時）**

#### Day 6 下午（4 小時）- 4 個頁面

**Task 6.5：NaturalGasPage（1 小時）**
**Task 6.6：UreaPage（1 小時）**
**Task 6.7：WeldingRodPage（1 小時）**
**Task 6.8：FireExtinguisherPage（1 小時）**

#### Day 7 上午（4 小時）- 4 個頁面 + 測試

**Task 7.1：SepticTankPage（1 小時）**
**Task 7.2：DieselGeneratorPage（1.5 小時）** - 較複雜
**Task 7.3：RefrigerantPage（1.5 小時）** - 設備清單模式

#### Day 7 下午（4 小時）- 完整回歸測試

**Task 7.4：每個重構頁面測試一遍（2.5 小時）**

建立測試清單：
- [ ] DieselPage
- [ ] GasolinePage
- [ ] WD40Page
- [ ] AcetylenePage
- [ ] LPGPage
- [ ] NaturalGasPage
- [ ] UreaPage
- [ ] WeldingRodPage
- [ ] FireExtinguisherPage
- [ ] SepticTankPage
- [ ] DieselGeneratorPage
- [ ] RefrigerantPage

每個頁面測試：
- [ ] 能載入
- [ ] 能填報
- [ ] 能提交
- [ ] 能清除

**Task 7.5：修復發現的 Bug（1.5 小時）**

#### Day 6-7 晚上驗收

- [ ] ✅ 12 個頁面重構完成
- [ ] ✅ 所有測試通過
- [ ] ✅ 程式碼總行數從 17,655 → < 8,000

---

### Day 8（8 小時）：特殊頁面 + Design System 完成

#### 上午（4 小時）- 特殊頁面處理

**Task 8.1：ElectricityPage 評估（1 小時）**
- [ ] 分析電費單結構是否能套 BaseEnergyPage
- [ ] 決策：重構 or 保持原狀
- [ ] 如果重構，寫 electricity.config.ts

**Task 8.2：CommuteePage 評估（1 小時）**
- [ ] 分析員工通勤是否能套 BaseEnergyPage
- [ ] 決策：重構 or 保持原狀

**Task 8.3：實際重構特殊頁面（2 小時）**
- [ ] 執行重構或優化

#### 下午（4 小時）- Design System 補完

**Task 8.4：完成所有基礎元件（2 小時）**

- [ ] Input 元件（30 分鐘）
- [ ] Select 元件（30 分鐘）
- [ ] Modal 元件（30 分鐘）
- [ ] Table 元件（30 分鐘）

**Task 8.5：寫 DESIGN_INTEGRATION.md（1 小時）**

建立 `frontend/DESIGN_INTEGRATION.md`：

```markdown
# 設計師整合指南

## 如何套用 Figma 設計

### Step 1：導出 Design Tokens

從 Figma 插件導出：
- Colors (src/design/tokens.ts 的 colors 物件)
- Typography (fontSize, fontWeight)
- Spacing (間距系統)

### Step 2：更新元件庫

更新 src/components/ui/ 下的元件樣式

### Step 3：元件對照表

| Figma Component | 程式碼路徑 | Props |
|----------------|----------|-------|
| Button/Primary | ui/Button.tsx | variant="primary" |
| Card | ui/Card.tsx | padding, shadow |
| Input | ui/Input.tsx | size, error |

### Step 4：範例頁面

參考 DieselPage 的實作：
frontend/src/pages/Category1/DieselPage.tsx
```

**Task 8.6：準備設計師對接資料（1 小時）**

整理：
- [ ] 元件清單（Button, Card, Input...）
- [ ] Figma 對照表（哪個元件對應哪個 Component）
- [ ] 範例程式碼（如何使用元件）
- [ ] Design Tokens 文件

#### Day 8 晚上驗收

- [ ] ✅ 14 個頁面全部處理完成
- [ ] ✅ Design System 文件完整
- [ ] ✅ 設計師可以開始工作

---

### Day 9（8 小時）：資安加固 + 測試補完

#### 上午（4 小時）- 完整資安 Audit

**Task 9.1：加入 Rate Limiting（1 小時）**

```bash
pip install flask-limiter
```

修改 `backend/app.py`：

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/api/admin/create-user', methods=['POST'])
@limiter.limit("10 per minute")
@require_admin
def create_user():
    # ...
```

**Task 9.2：建立 Audit Log 系統（1.5 小時）**

建立 Supabase table：
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

建立 `backend/utils/audit.py`：

```python
def log_audit(user_id, action, resource_type=None, resource_id=None, details=None):
    supabase = get_supabase_admin()
    supabase.table('audit_logs').insert({
        'user_id': user_id,
        'action': action,
        'resource_type': resource_type,
        'resource_id': resource_id,
        'details': details,
        'ip_address': request.remote_addr
    }).execute()

# 使用範例
@app.route('/api/admin/users/bulk-update', methods=['PUT'])
@require_admin
def bulk_update_users():
    # 業務邏輯...
    log_audit(
        user_id=request.current_user['id'],
        action='bulk_update_users',
        resource_type='users',
        details={'user_ids': user_ids, 'is_active': is_active}
    )
    # ...
```

**Task 9.3：所有 API 補 Input Validation（1 小時）**

檢查每個 API：
- [ ] `/api/admin/users/<user_id>/entries` - 驗證 user_id 格式
- [ ] `/api/admin/entries/<entry_id>/review` - 驗證 status、note
- [ ] `/api/admin/create-user` - 驗證 email、display_name

**Task 9.4：檢查 RLS Policy（30 分鐘）**

登入 Supabase Dashboard，檢查：
- [ ] energy_entries 的 RLS policy
- [ ] profiles 的 RLS policy
- [ ] entry_files 的 RLS policy

確保：
- 使用者只能看到自己的資料
- Admin 能看到所有資料

#### 下午（4 小時）- 測試補完

**Task 9.5：BaseEnergyPage 單元測試（2 小時）**

建立 `frontend/src/components/__tests__/BaseEnergyPage.test.tsx`：

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BaseEnergyPage } from '../BaseEnergyPage'

describe('BaseEnergyPage', () => {
  it('應該渲染基本 UI', () => {
    const mockConfig = {
      pageKey: 'test',
      pageTitle: '測試頁面',
      categoryName: '測試',
      inputMode: 'monthly' as const,
      files: []
    }

    render(
      <BaseEnergyPage
        config={mockConfig}
        renderForm={() => <div>Test Form</div>}
      />
    )

    expect(screen.getByText('Test Form')).toBeInTheDocument()
  })

  // 更多測試...
})
```

**Task 9.6：配置系統測試（1 小時）**

測試配置檔的 validate 和 calculate 函式

**Task 9.7：後端 API 整合測試（1 小時）**

建立 `backend/tests/test_admin_api.py`：

```python
import pytest
from app import app

def test_admin_dashboard_requires_auth():
    client = app.test_client()
    response = client.get('/api/admin/dashboard')
    assert response.status_code == 403

def test_admin_dashboard_returns_data():
    client = app.test_client()
    # 模擬 admin token
    response = client.get(
        '/api/admin/dashboard',
        headers={'Authorization': 'Bearer <admin_token>'}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert 'stats' in data
    assert 'users' in data
```

#### Day 9 晚上驗收

- [ ] ✅ Rate limiting 生效（測試超過限制 → 429）
- [ ] ✅ Audit log 記錄關鍵操作（查看 audit_logs 表）
- [ ] ✅ 所有 API 有 Input Validation
- [ ] ✅ 測試覆蓋率 > 60%

---

### Day 10（8 小時）：文件整理 + 部署準備

#### 上午（4 小時）- 文件整理

**Task 10.1：完善 README.md（1 小時）**

更新根目錄 README.md，加入：
- [ ] 專案簡介
- [ ] 功能列表
- [ ] 技術棧
- [ ] 快速開始（前後端啟動）
- [ ] 專案結構
- [ ] 部署指南連結
- [ ] 貢獻指南

**Task 10.2：寫 docs/API.md（1 小時）**

建立 `docs/API.md`：

```markdown
# API 文件

## 認證

所有 Admin API 需要在 Header 帶上：
Authorization: Bearer <supabase_access_token>

## Admin Endpoints

### GET /api/admin/dashboard

取得 Dashboard 統計資料

Response:
{
  "stats": {
    "total_users": 100,
    "active_users": 80,
    "total_entries": 500
  },
  "users": [...],
  "recent_submissions": [...]
}

### POST /api/admin/create-user

建立新用戶

Request Body:
{
  "email": "user@example.com",
  "displayName": "使用者名稱",
  "password": "SecurePass123!",
  "role": "user",
  "company": "公司名稱"
}

Response:
{
  "success": true,
  "user": {...}
}
```

**Task 10.3：寫 docs/ARCHITECTURE.md（1 小時）**

建立 `docs/ARCHITECTURE.md`，包含：
- [ ] 系統架構圖
- [ ] 資料流圖
- [ ] 前端架構（BaseEnergyPage + Config）
- [ ] 後端架構（Flask + Supabase）
- [ ] 資料庫 Schema

**Task 10.4：寫 docs/DEPLOYMENT.md（1 小時）**

建立 `docs/DEPLOYMENT.md`，包含：
- [ ] 環境需求
- [ ] 部署步驟（Vercel/Railway/自架）
- [ ] 環境變數設定
- [ ] 資料庫 Migration
- [ ] 常見問題排解

#### 下午（4 小時）- 部署準備 + 最終驗收

**Task 10.5：建立 .env.example（30 分鐘）**

建立 `frontend/.env.example`：
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

建立 `backend/.env.example`：
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
FLASK_ENV=production
```

**Task 10.6：檢查 .gitignore（30 分鐘）**

確認不該被追蹤的檔案都在 .gitignore 裡

**Task 10.7：完整系統測試（2 小時）**

從頭到尾測試整個系統：
- [ ] 用戶註冊/登入
- [ ] 14 個能源頁面的填報流程
- [ ] 管理員審核流程
- [ ] 檔案上傳/下載
- [ ] Dashboard 統計

**Task 10.8：效能測試（30 分鐘）**

測試：
- [ ] Dashboard 載入時間（目標 < 1 秒）
- [ ] 頁面切換速度
- [ ] 檔案上傳速度

**Task 10.9：寫交接文件（30 分鐘）**

建立 `HANDOVER.md`，包含：
- [ ] 完成的項目清單
- [ ] 已知問題（如果有）
- [ ] 後續建議（下一步該做什麼）
- [ ] 聯絡方式

#### Day 10 晚上驗收

- [ ] ✅ 所有文件完整（README, API, ARCHITECTURE, DEPLOYMENT）
- [ ] ✅ .env.example 存在
- [ ] ✅ 系統能正常運作
- [ ] ✅ 效能達標（Dashboard < 1 秒）
- [ ] ✅ 有交接文件

---

## 📊 預期成果（2 週後）

### 程式碼品質

**前端**：
- 程式碼從 17,655 行 → 6,000 行（-66%）
- 14 個頁面統一用 BaseEnergyPage + Config
- 新增頁面只需 50 行配置檔

**後端**：
- 權限檢查從 7 次重複 → 1 個 @require_admin decorator
- N+1 query 修復（201 次 → < 10 次）
- 統一 Dashboard API（3 次呼叫 → 1 次）

### 效能

- Dashboard 載入從 3-5 秒 → < 1 秒
- 資料庫查詢優化 95%
- 前端程式碼體積減少 66%

### 資安

- ✅ CORS 限制（只允許自己的網域）
- ✅ 所有 admin API 有權限檢查
- ✅ Rate limiting（每分鐘最多 10 次敏感操作）
- ✅ Input validation（所有 API 驗證輸入）
- ✅ Audit log（記錄關鍵操作）
- ✅ 錯誤訊息不洩漏資訊

### 設計師對接

- ✅ Design System 建立（tokens + 元件庫）
- ✅ 8+ 個基礎元件（Button, Card, Input, Select, Modal, Table...）
- ✅ DESIGN_INTEGRATION.md 文件
- ✅ Figma 對照表
- ✅ 範例程式碼
- ✅ 設計師可以獨立套用設計

### 文件

- ✅ README.md（專案入口）
- ✅ API 文件（所有 endpoint 說明）
- ✅ 架構文件（系統設計圖）
- ✅ 部署指南（如何上線）
- ✅ 設計師指南（如何套用設計）
- ✅ 交接文件（後續工作）

### Git 狀態

- ✅ git status 乾淨（沒有 200+ deleted 檔案）
- ✅ .gitignore 完整（20+ 行）
- ✅ 沒有 POC/backup 殘留程式碼
- ✅ 沒有臨時檔案

---

## 💡 風險管理

### 可能的阻礙

1. **設計師還沒準備好 Figma**
   - 解決：先用現有設計建立 Design System，之後再更新

2. **重構時發現 Hook 不夠彈性**
   - 解決：立即調整 BaseEnergyPage，不要硬套

3. **測試時發現重大 Bug**
   - 解決：優先修復，調整時程

4. **時間不夠**
   - 解決：優先完成 P0（資安）和 Design System，重構可以分批做

### 應變計劃

**如果 2 週不夠**：
- Week 1：專注資安 + Design System（必做）
- Week 2：重構 6 個最重要的頁面（其他後續再做）

**如果發現架構有問題**：
- 立即停止推廣
- 回到 DieselPage 修正設計
- 確認可行再繼續

---

## ✅ Daily Checklist 模板

每天結束前檢查：
- [ ] 今天的所有 Task 完成
- [ ] 沒有 Breaking Changes（舊功能都還能用）
- [ ] Git commit 有意義的訊息
- [ ] 沒有 console.error 或警告
- [ ] 驗收標準達成

---

## 📞 需要幫助時

**卡住了怎麼辦？**
1. 檢查 recons_doc/ 下的文件（HOOKS.md, REFACTORING_PLAN.md）
2. 參考已完成的範例（DieselPage）
3. 檢查 TODO.md 的「經驗教訓」章節

**發現設計問題怎麼辦？**
1. 立即記錄到 ISSUES.md
2. 評估影響範圍
3. 決定現在修還是後續修

---

## 🎯 成功標準

**2 週後，你應該能自信地說**：
- ✅ 系統不會被輕易打穿（資安加固完成）
- ✅ 設計師能開始工作（Design System 建立）
- ✅ 新增頁面很簡單（只需 50 行配置）
- ✅ 系統很快（Dashboard < 1 秒）
- ✅ 程式碼好維護（改一個地方，所有頁面受益）
- ✅ 有完整文件（新人能上手）

---

**準備好了嗎？從 Day 1 開始！** 🚀

記住 Linus 的話：
> "Talk is cheap. Show me the code."
> （空談沒用，給我看程式碼。）

現在就開始行動！
