# 後端認證和驗證中間件使用指南

本文檔說明如何使用新實作的認證、權限驗證和輸入驗證功能。

## 目錄

1. [認證中間件](#認證中間件)
2. [權限驗證](#權限驗證)
3. [輸入驗證](#輸入驗證)
4. [完整範例](#完整範例)
5. [測試建議](#測試建議)

---

## 認證中間件

### 基本使用

#### @require_auth

保護需要登入的端點：

```python
from flask import Flask, jsonify
from src.api.middleware.auth import require_auth, get_current_user

app = Flask(__name__)

@app.route('/api/profile', methods=['GET'])
@require_auth
def get_profile():
    # 取得當前認證用戶
    user = get_current_user()

    return jsonify({
        "id": user['id'],
        "email": user['email'],
        "display_name": user.get('display_name')
    })
```

**工作原理：**
1. 從 `Authorization: Bearer <token>` header 中提取 token
2. 驗證 token 並取得用戶資料
3. 檢查用戶是否被停用 (`is_active`)
4. 將用戶資訊附加到 `request.user`

**錯誤響應：**

```json
// 401 - 缺少 Authorization header
{
  "error": {
    "code": "MISSING_AUTH_HEADER",
    "message": "Authorization header is required"
  }
}

// 401 - Token 無效或過期
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid or expired token"
  }
}

// 403 - 用戶已被停用
{
  "error": {
    "code": "USER_DEACTIVATED",
    "message": "User account has been deactivated"
  }
}
```

#### @optional_auth

允許匿名存取，但如果提供 token 則驗證：

```python
@app.route('/api/posts', methods=['GET'])
@optional_auth
def list_posts():
    user = get_current_user()

    if user:
        # 已登入：返回個性化內容
        return jsonify({"posts": get_personalized_posts(user['id'])})
    else:
        # 未登入：返回公開內容
        return jsonify({"posts": get_public_posts()})
```

---

## 權限驗證

### @require_permission

限制特定角色存取：

```python
from src.api.middleware.auth import require_auth, require_permission

# 只允許管理員
@app.route('/api/admin/users', methods=['GET'])
@require_auth
@require_permission('admin')
def list_users():
    return jsonify({"users": []})

# 允許多個角色
@app.route('/api/reports/dashboard', methods=['GET'])
@require_auth
@require_permission('admin', 'manager')
def dashboard():
    return jsonify({"stats": {}})
```

**重要：** `@require_permission` 必須在 `@require_auth` **之後**使用。

**錯誤響應：**

```json
// 403 - 權限不足
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "This action requires one of the following roles: admin, manager",
    "details": {
      "required_roles": ["admin", "manager"],
      "user_role": "user"
    }
  }
}
```

### @require_admin

管理員專用端點的語法糖：

```python
from src.api.middleware.auth import require_auth, require_admin

@app.route('/api/admin/settings', methods=['PUT'])
@require_auth
@require_admin
def update_settings():
    # 只有管理員可以存取
    return jsonify({"success": True})
```

### @require_ownership

確保用戶只能操作自己的資源：

```python
from src.api.middleware.auth import require_auth, require_ownership

def get_entry_by_id(entry_id):
    """從資料庫取得 entry"""
    supabase = get_supabase_admin()
    result = supabase.table('energy_entries').select('*').eq('id', entry_id).single().execute()
    return result.data

@app.route('/api/entries/<entry_id>', methods=['PUT'])
@require_auth
@require_ownership(get_entry_by_id, 'owner_id')
def update_entry(entry_id):
    # request.resource 包含 entry 資料（避免重複查詢）
    entry = request.resource

    # 更新 entry...
    return jsonify({"success": True})
```

**工作原理：**
1. 取得資源（使用提供的 `resource_getter` 函數）
2. 檢查資源的 `owner_id` 是否匹配當前用戶
3. 管理員可以存取所有資源
4. 將資源附加到 `request.resource`

---

## 輸入驗證

### @validate_request

驗證請求 body（JSON）：

```python
from src.api.middleware.validation import validate_request, get_validated_data
from src.api.schemas import UserCreateSchema

@app.route('/api/users', methods=['POST'])
@require_auth
@require_admin
@validate_request(UserCreateSchema)
def create_user():
    # 取得已驗證的數據
    data = get_validated_data()

    # data 是 UserCreateSchema 實例，所有欄位已驗證
    email = data.email
    password = data.password
    display_name = data.display_name

    # 創建用戶...
    return jsonify({"success": True})
```

**驗證失敗響應：**

```json
// 400 - 驗證錯誤
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "value is not a valid email address",
        "type": "value_error.email"
      },
      {
        "field": "password",
        "message": "ensure this value has at least 8 characters",
        "type": "value_error.any_str.min_length"
      }
    ]
  }
}
```

### 驗證查詢參數

```python
from src.api.schemas import PaginationParams

@app.route('/api/posts', methods=['GET'])
@validate_request(PaginationParams, location='query')
def list_posts():
    params = get_validated_data()

    page = params.page  # 已驗證：>= 1
    page_size = params.page_size  # 已驗證：1-100
    offset = params.offset  # 自動計算
    limit = params.limit  # 等於 page_size

    return jsonify({"posts": [], "pagination": {"page": page, "page_size": page_size}})
```

### 可用的 Schema

#### 用戶相關

```python
from src.api.schemas import (
    UserCreateSchema,        # 創建用戶
    UserUpdateSchema,        # 更新用戶
    ProfileUpdateSchema,     # 用戶自己更新資料
    PasswordChangeSchema,    # 修改密碼
    BulkUserUpdateSchema,    # 批量更新
)
```

#### 能源條目

```python
from src.api.schemas import (
    EnergyEntryCreateSchema,  # 創建條目
    EnergyEntryUpdateSchema,  # 更新條目
    MonthlyDataSchema,        # 月份數據
    EntryStatusUpdateSchema,  # 更新狀態
)
```

#### 審核

```python
from src.api.schemas import (
    ReviewCreateSchema,  # 創建審核
    ReviewUpdateSchema,  # 更新審核
    BatchReviewSchema,   # 批量審核
)
```

#### 通用

```python
from src.api.schemas import (
    PaginationParams,  # 分頁參數
    DateRangeParams,   # 日期範圍
    IDSchema,          # ID 驗證
    BulkIDSchema,      # 批量 ID
)
```

---

## 完整範例

### 範例 1：用戶管理端點

```python
from flask import Flask, jsonify, request
from src.api.middleware.auth import require_auth, require_admin, get_current_user
from src.api.middleware.validation import validate_request, get_validated_data
from src.api.schemas import UserCreateSchema, UserUpdateSchema, PaginationParams
from utils.supabase_admin import get_supabase_admin

app = Flask(__name__)

# 創建用戶（僅管理員）
@app.route('/api/admin/users', methods=['POST'])
@require_auth
@require_admin
@validate_request(UserCreateSchema)
def create_user():
    data = get_validated_data()
    supabase = get_supabase_admin()

    # 創建 Auth 用戶
    auth_result = supabase.auth.admin.create_user({
        "email": data.email,
        "password": data.password,
        "email_confirm": True
    })

    if auth_result.user:
        # 創建 Profile
        profile_data = {
            'id': auth_result.user.id,
            'display_name': data.display_name,
            'email': data.email,
            'role': data.role,
            'is_active': True,
            'company': data.company,
            'phone': data.phone,
            'job_title': data.job_title,
            'filling_config': {
                'energy_categories': data.energy_categories,
                'target_year': data.target_year,
                'diesel_generator_mode': data.diesel_generator_version
            }
        }

        profile_result = supabase.table('profiles').insert(profile_data).execute()

        return jsonify({
            "success": True,
            "user": profile_result.data[0]
        }), 201
    else:
        return jsonify({"error": "Failed to create user"}), 500

# 列出用戶（帶分頁）
@app.route('/api/admin/users', methods=['GET'])
@require_auth
@require_admin
@validate_request(PaginationParams, location='query')
def list_users():
    params = get_validated_data()
    supabase = get_supabase_admin()

    # 取得總數
    count_result = supabase.table('profiles').select('id', count='exact').execute()
    total = count_result.count

    # 取得分頁數據
    result = supabase.table('profiles').select('*').range(
        params.offset,
        params.offset + params.limit - 1
    ).execute()

    return jsonify({
        "success": True,
        "data": result.data,
        "pagination": {
            "page": params.page,
            "page_size": params.page_size,
            "total": total,
            "total_pages": (total + params.page_size - 1) // params.page_size
        }
    })

# 更新用戶（僅管理員）
@app.route('/api/admin/users/<user_id>', methods=['PUT'])
@require_auth
@require_admin
@validate_request(UserUpdateSchema)
def update_user(user_id):
    data = get_validated_data()
    supabase = get_supabase_admin()

    # 準備更新數據（只包含提供的欄位）
    updates = data.dict(exclude_unset=True)

    # 分離 auth 更新和 profile 更新
    auth_updates = {}
    profile_updates = {}

    if 'email' in updates:
        auth_updates['email'] = updates['email']
        profile_updates['email'] = updates['email']

    if 'password' in updates:
        auth_updates['password'] = updates['password']

    # 更新 auth.users
    if auth_updates:
        supabase.auth.admin.update_user_by_id(user_id, auth_updates)

    # 更新 profiles
    for key in ['display_name', 'company', 'phone', 'job_title', 'role', 'is_active']:
        if key in updates:
            profile_updates[key] = updates[key]

    if profile_updates:
        supabase.table('profiles').update(profile_updates).eq('id', user_id).execute()

    return jsonify({"success": True})
```

### 範例 2：能源條目端點

```python
from src.api.middleware.auth import require_auth, require_ownership
from src.api.schemas import EnergyEntryCreateSchema, EnergyEntryUpdateSchema

def get_entry(entry_id):
    supabase = get_supabase_admin()
    result = supabase.table('energy_entries').select('*').eq('id', entry_id).single().execute()
    return result.data

# 創建條目（任何認證用戶）
@app.route('/api/entries', methods=['POST'])
@require_auth
@validate_request(EnergyEntryCreateSchema)
def create_entry():
    data = get_validated_data()
    user = get_current_user()
    supabase = get_supabase_admin()

    entry_data = {
        'owner_id': user['id'],
        'page_key': data.page_key,
        'category': data.category,
        'period_year': data.period_year,
        'monthly_data': [item.dict() for item in data.monthly_data],
        'total_amount': data.total_amount,
        'status': data.status.value,
        'note': data.note
    }

    result = supabase.table('energy_entries').insert(entry_data).execute()

    return jsonify({
        "success": True,
        "entry": result.data[0]
    }), 201

# 更新條目（僅擁有者或管理員）
@app.route('/api/entries/<entry_id>', methods=['PUT'])
@require_auth
@require_ownership(get_entry, 'owner_id')
@validate_request(EnergyEntryUpdateSchema)
def update_entry(entry_id):
    data = get_validated_data()
    supabase = get_supabase_admin()

    updates = data.dict(exclude_unset=True)

    # 轉換 monthly_data
    if 'monthly_data' in updates:
        updates['monthly_data'] = [item.dict() for item in data.monthly_data]

    # 轉換 status enum
    if 'status' in updates:
        updates['status'] = data.status.value

    result = supabase.table('energy_entries').update(updates).eq('id', entry_id).execute()

    return jsonify({
        "success": True,
        "entry": result.data[0]
    })

# 刪除條目（僅擁有者或管理員）
@app.route('/api/entries/<entry_id>', methods=['DELETE'])
@require_auth
@require_ownership(get_entry, 'owner_id')
def delete_entry(entry_id):
    supabase = get_supabase_admin()

    supabase.table('energy_entries').delete().eq('id', entry_id).execute()

    return jsonify({"success": True}), 204
```

### 範例 3：審核流程

```python
from src.api.middleware.auth import require_auth, require_admin
from src.api.schemas import ReviewCreateSchema, BatchReviewSchema

# 創建審核（僅管理員）
@app.route('/api/admin/reviews', methods=['POST'])
@require_auth
@require_admin
@validate_request(ReviewCreateSchema)
def create_review():
    data = get_validated_data()
    user = get_current_user()
    supabase = get_supabase_admin()

    review_data = {
        'entry_id': data.entry_id,
        'reviewer_id': user['id'],
        'status': data.status.value,
        'note': data.note,
        'requested_changes': data.requested_changes,
        'reviewed_at': datetime.now().isoformat()
    }

    result = supabase.table('entry_reviews').insert(review_data).execute()

    # 同時更新 entry 狀態
    entry_status = 'approved' if data.status.value == 'approved' else 'submitted'
    supabase.table('energy_entries').update({
        'status': entry_status
    }).eq('id', data.entry_id).execute()

    return jsonify({
        "success": True,
        "review": result.data[0]
    }), 201

# 批量審核（僅管理員）
@app.route('/api/admin/reviews/batch', methods=['POST'])
@require_auth
@require_admin
@validate_request(BatchReviewSchema)
def batch_review():
    data = get_validated_data()
    user = get_current_user()
    supabase = get_supabase_admin()

    reviews = []
    for entry_id in data.entry_ids:
        review_data = {
            'entry_id': entry_id,
            'reviewer_id': user['id'],
            'status': data.status.value,
            'note': data.note,
            'reviewed_at': datetime.now().isoformat()
        }
        reviews.append(review_data)

    # 批量插入審核記錄
    result = supabase.table('entry_reviews').insert(reviews).execute()

    # 批量更新條目狀態
    entry_status = 'approved' if data.status.value == 'approved' else 'submitted'
    supabase.table('energy_entries').update({
        'status': entry_status
    }).in_('id', data.entry_ids).execute()

    return jsonify({
        "success": True,
        "reviews_created": len(result.data)
    })
```

---

## 測試建議

### 單元測試

```python
import pytest
from src.api.middleware.auth import require_auth, require_permission
from src.api.middleware.validation import validate_request
from src.api.schemas import UserCreateSchema

def test_require_auth_missing_header(client):
    """測試缺少 Authorization header"""
    response = client.get('/api/protected')
    assert response.status_code == 401
    assert response.json['error']['code'] == 'MISSING_AUTH_HEADER'

def test_require_auth_invalid_token(client):
    """測試無效 token"""
    headers = {'Authorization': 'Bearer invalid_token'}
    response = client.get('/api/protected', headers=headers)
    assert response.status_code == 401

def test_require_permission_insufficient(client, user_token):
    """測試權限不足"""
    headers = {'Authorization': f'Bearer {user_token}'}
    response = client.get('/api/admin/users', headers=headers)
    assert response.status_code == 403
    assert response.json['error']['code'] == 'INSUFFICIENT_PERMISSIONS'

def test_validation_error(client):
    """測試驗證錯誤"""
    data = {
        "email": "invalid_email",  # 無效 email
        "password": "short"  # 密碼太短
    }
    response = client.post('/api/users', json=data)
    assert response.status_code == 400
    assert response.json['error']['code'] == 'VALIDATION_ERROR'
    assert len(response.json['error']['details']) > 0
```

### 集成測試

```python
def test_create_and_update_user_flow(client, admin_token):
    """測試完整的用戶創建和更新流程"""
    # 1. 創建用戶
    create_data = {
        "email": "test@example.com",
        "password": "SecurePass123!",
        "display_name": "Test User",
        "role": "user"
    }

    headers = {'Authorization': f'Bearer {admin_token}'}
    response = client.post('/api/admin/users', json=create_data, headers=headers)

    assert response.status_code == 201
    user_id = response.json['user']['id']

    # 2. 更新用戶
    update_data = {
        "display_name": "Updated Name",
        "company": "New Company"
    }

    response = client.put(f'/api/admin/users/{user_id}', json=update_data, headers=headers)

    assert response.status_code == 200
    assert response.json['success'] is True
```

---

## 遷移現有程式碼

### 步驟 1：替換手動認證檢查

**之前：**
```python
@app.route('/api/users', methods=['GET'])
def get_users():
    auth_header = request.headers.get('Authorization')
    user = get_user_from_token(auth_header)

    if not user or user.get('role') != 'admin':
        return jsonify({"error": "Unauthorized"}), 403

    # 業務邏輯...
```

**之後：**
```python
@app.route('/api/users', methods=['GET'])
@require_auth
@require_admin
def get_users():
    # 業務邏輯...
```

### 步驟 2：添加輸入驗證

**之前：**
```python
@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()

    # 手動驗證
    if not data.get('email'):
        return jsonify({"error": "email is required"}), 400
    if len(data.get('password', '')) < 8:
        return jsonify({"error": "password too short"}), 400

    # 業務邏輯...
```

**之後：**
```python
@app.route('/api/users', methods=['POST'])
@validate_request(UserCreateSchema)
def create_user():
    data = get_validated_data()
    # 數據已驗證，直接使用
```

---

## 故障排除

### 問題：裝飾器順序錯誤

**錯誤：**
```python
@app.route('/api/admin/users')
@require_permission('admin')  # ❌ 錯誤順序
@require_auth
def admin_route():
    pass
```

**正確：**
```python
@app.route('/api/admin/users')
@require_auth          # ✅ 先認證
@require_permission('admin')  # ✅ 再檢查權限
def admin_route():
    pass
```

### 問題：忘記提供 Authorization header

**解決方案：**
確保前端在請求時包含 header：
```javascript
const response = await fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 問題：Pydantic 驗證錯誤不清楚

**解決方案：**
查看 `details` 欄位中的詳細資訊：
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "value is not a valid email address",
        "type": "value_error.email"
      }
    ]
  }
}
```

---

## 總結

✅ **已實作功能：**
- `@require_auth` - 身份驗證
- `@require_permission(role1, role2, ...)` - 權限驗證
- `@require_admin` - 管理員權限
- `@require_ownership(getter, field)` - 資源擁有權驗證
- `@optional_auth` - 可選認證
- `@validate_request(Schema)` - 請求驗證
- 完整的 Pydantic schema 模型

✅ **優點：**
- 程式碼更清晰、可維護
- 一致的錯誤處理
- 自動驗證，減少手動檢查
- 型別安全（TypeScript + Pydantic）
- 易於測試

📚 **下一步：**
- 添加單元測試
- 更新 API 文檔
- 遷移現有端點使用新中間件
