"""
認證和授權中間件
提供裝飾器用於保護 API 端點
"""
from functools import wraps
from flask import request, jsonify
from typing import Optional, List, Callable
import sys
import os

# 添加專案根目錄到 Python 路徑
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../'))

from utils.auth import get_user_from_token
from src.core.exceptions import AuthenticationError, AuthorizationError


def require_auth(f: Callable) -> Callable:
    """
    身份驗證裝飾器
    確保請求包含有效的認證 token

    使用方法:
    @app.route('/api/protected')
    @require_auth
    def protected_route():
        # request.user 包含認證用戶資訊
        return jsonify({"message": "Success"})

    Raises:
        AuthenticationError: 當認證失敗時
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({
                "error": {
                    "code": "MISSING_AUTH_HEADER",
                    "message": "Authorization header is required"
                }
            }), 401

        if not auth_header.startswith('Bearer '):
            return jsonify({
                "error": {
                    "code": "INVALID_AUTH_HEADER",
                    "message": "Authorization header must start with 'Bearer '"
                }
            }), 401

        user = get_user_from_token(auth_header)

        if not user:
            return jsonify({
                "error": {
                    "code": "AUTHENTICATION_FAILED",
                    "message": "Invalid or expired token"
                }
            }), 401

        # 檢查用戶是否被停用
        if not user.get('is_active', True):
            return jsonify({
                "error": {
                    "code": "USER_DEACTIVATED",
                    "message": "User account has been deactivated"
                }
            }), 403

        # 將用戶資訊附加到 request 對象
        request.user = user

        return f(*args, **kwargs)

    return decorated_function


def require_permission(*roles: str) -> Callable:
    """
    權限驗證裝飾器
    確保用戶具有指定的角色權限

    參數:
        *roles: 允許的角色列表 (例如: 'admin', 'manager', 'user')

    使用方法:
    @app.route('/api/admin/users')
    @require_auth
    @require_permission('admin')
    def admin_only_route():
        return jsonify({"users": []})

    @app.route('/api/manager/dashboard')
    @require_auth
    @require_permission('admin', 'manager')
    def manager_route():
        return jsonify({"stats": {}})

    注意: 必須與 @require_auth 一起使用

    Raises:
        AuthorizationError: 當用戶沒有所需權限時
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 確保已經通過身份驗證
            if not hasattr(request, 'user'):
                return jsonify({
                    "error": {
                        "code": "AUTH_REQUIRED",
                        "message": "Authentication required. Use @require_auth before @require_permission"
                    }
                }), 401

            user = request.user
            user_role = user.get('role', 'user')

            # 檢查用戶角色是否在允許的角色列表中
            if user_role not in roles:
                return jsonify({
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": f"This action requires one of the following roles: {', '.join(roles)}",
                        "details": {
                            "required_roles": list(roles),
                            "user_role": user_role
                        }
                    }
                }), 403

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_admin(f: Callable) -> Callable:
    """
    管理員權限裝飾器 (語法糖)
    等同於 @require_permission('admin')

    使用方法:
    @app.route('/api/admin/settings')
    @require_auth
    @require_admin
    def admin_settings():
        return jsonify({"settings": {}})
    """
    return require_permission('admin')(f)


def require_ownership(resource_getter: Callable, user_id_field: str = 'owner_id') -> Callable:
    """
    資源擁有權驗證裝飾器
    確保用戶只能操作自己的資源（或管理員可以操作所有資源）

    參數:
        resource_getter: 取得資源的函數，接收 resource_id 參數
        user_id_field: 資源中用戶 ID 的欄位名稱，預設為 'owner_id'

    使用方法:
    def get_entry_by_id(entry_id):
        # 從資料庫取得 entry
        return entry

    @app.route('/api/entries/<entry_id>', methods=['PUT'])
    @require_auth
    @require_ownership(get_entry_by_id, 'owner_id')
    def update_entry(entry_id):
        # request.resource 包含資源資料
        return jsonify({"message": "Updated"})

    Raises:
        NotFoundError: 當資源不存在時
        AuthorizationError: 當用戶不擁有該資源且非管理員時
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 確保已經通過身份驗證
            if not hasattr(request, 'user'):
                return jsonify({
                    "error": {
                        "code": "AUTH_REQUIRED",
                        "message": "Authentication required"
                    }
                }), 401

            user = request.user
            user_role = user.get('role', 'user')

            # 管理員可以存取所有資源
            if user_role == 'admin':
                return f(*args, **kwargs)

            # 從路由參數取得資源 ID
            # 支援多種參數名稱
            resource_id = (
                kwargs.get('entry_id') or
                kwargs.get('resource_id') or
                kwargs.get('id') or
                kwargs.get('user_id')
            )

            if not resource_id:
                return jsonify({
                    "error": {
                        "code": "MISSING_RESOURCE_ID",
                        "message": "Resource ID not found in request"
                    }
                }), 400

            # 取得資源
            try:
                resource = resource_getter(resource_id)
            except Exception as e:
                return jsonify({
                    "error": {
                        "code": "RESOURCE_NOT_FOUND",
                        "message": f"Resource with ID '{resource_id}' not found"
                    }
                }), 404

            if not resource:
                return jsonify({
                    "error": {
                        "code": "RESOURCE_NOT_FOUND",
                        "message": f"Resource with ID '{resource_id}' not found"
                    }
                }), 404

            # 檢查擁有權
            resource_owner_id = resource.get(user_id_field)

            if resource_owner_id != user['id']:
                return jsonify({
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "You don't have permission to access this resource"
                    }
                }), 403

            # 將資源附加到 request 對象，避免重複查詢
            request.resource = resource

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def optional_auth(f: Callable) -> Callable:
    """
    可選認證裝飾器
    如果提供了有效的 token，則設置 request.user
    如果沒有提供或 token 無效，則 request.user 為 None

    使用方法:
    @app.route('/api/public/content')
    @optional_auth
    def public_content():
        if hasattr(request, 'user') and request.user:
            # 已登入用戶看到個性化內容
            return jsonify({"content": "personalized"})
        else:
            # 未登入用戶看到公開內容
            return jsonify({"content": "public"})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if auth_header and auth_header.startswith('Bearer '):
            user = get_user_from_token(auth_header)
            if user and user.get('is_active', True):
                request.user = user
            else:
                request.user = None
        else:
            request.user = None

        return f(*args, **kwargs)

    return decorated_function


# 工具函數

def get_current_user():
    """
    取得當前認證用戶

    Returns:
        Dict: 用戶資訊，如果未認證則為 None

    使用方法:
    @app.route('/api/me')
    @require_auth
    def get_me():
        user = get_current_user()
        return jsonify(user)
    """
    return getattr(request, 'user', None)


def check_permission(role: str) -> bool:
    """
    檢查當前用戶是否具有指定角色

    參數:
        role: 要檢查的角色

    Returns:
        bool: True 如果用戶具有該角色，否則 False

    使用方法:
    @app.route('/api/conditional')
    @require_auth
    def conditional_action():
        if check_permission('admin'):
            # 管理員邏輯
            return jsonify({"admin_data": []})
        else:
            # 普通用戶邏輯
            return jsonify({"user_data": []})
    """
    user = get_current_user()
    if not user:
        return False
    return user.get('role') == role


def is_admin() -> bool:
    """
    檢查當前用戶是否為管理員

    Returns:
        bool: True 如果是管理員，否則 False
    """
    return check_permission('admin')
