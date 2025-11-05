from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from utils.supabase_admin import get_supabase_admin
from utils.auth import get_user_from_token

load_dotenv()

app = Flask(__name__)
# 開發環境：允許所有來源（生產環境需要限制）
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"ok": True})

@app.route('/api/test-supabase', methods=['GET'])
def test_supabase():
    try:
        supabase = get_supabase_admin()
        
        # 測試查詢 profiles 表
        result = supabase.table('profiles').select('*').limit(5).execute()
        
        return jsonify({
            "success": True, 
            "profiles_count": len(result.data) if result.data else 0,
            "profiles": result.data
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/test-cors', methods=['GET', 'OPTIONS'])
def test_cors():
    """測試 CORS 設定的端點"""
    return jsonify({
        "message": "CORS test successful",
        "origin": request.headers.get('Origin'),
        "method": request.method
    })

@app.route('/api/carbon/calculate', methods=['POST'])
def calculate_carbon():
    data = request.get_json()
    # TODO: 實作碳排計算邏輯
    return jsonify({"result": "計算結果將在此顯示"})

# Admin API Routes
@app.route('/api/admin/users', methods=['GET'])
def get_all_users():
    try:
        # 驗證管理員權限
        auth_header = request.headers.get('Authorization')
        print(f"Auth header: {auth_header}")  # Debug log
        
        user = get_user_from_token(auth_header)
        print(f"Authenticated user: {user}")  # Debug log
        
        if not user or user.get('role') != 'admin':
            print(f"Access denied. User: {user}, Role: {user.get('role') if user else 'None'}")  # Debug log
            return jsonify({"error": "Unauthorized"}), 403
            
        supabase = get_supabase_admin()
        
        # 直接查詢 profiles 表取得所有用戶
        profiles_result = supabase.table('profiles').select('*').execute()
        
        if not profiles_result.data:
            return jsonify({"users": []})
        
        users_with_counts = []
        
        # 為每個用戶取得填報數量和 email
        for profile in profiles_result.data:
            # 取得填報數量
            entries_result = supabase.table('energy_entries').select('id').eq('owner_id', profile['id']).execute()
            entries_count = len(entries_result.data) if entries_result.data else 0
            
            # 嘗試從 auth.users 取得 email（可能會失敗，所以用 try-catch）
            email = 'N/A'
            try:
                auth_result = supabase.auth.admin.get_user_by_id(profile['id'])
                if auth_result.user:
                    email = auth_result.user.email
            except:
                pass
            
            users_with_counts.append({
                'id': profile['id'],
                'email': email,
                'display_name': profile.get('display_name', 'N/A'),
                'role': profile.get('role', 'user'),
                'is_active': profile.get('is_active', True),
                'company': profile.get('company', 'N/A'),  # 如果沒有 company 欄位則顯示 N/A
                'entries_count': entries_count
            })
        
        return jsonify({"users": users_with_counts})
    except Exception as e:
        print(f"Error in get_all_users: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users/<user_id>/entries', methods=['GET'])
def get_user_entries(user_id):
    try:
        # 驗證管理員權限
        auth_header = request.headers.get('Authorization')
        user = get_user_from_token(auth_header)
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized"}), 403
            
        supabase = get_supabase_admin()
        
        # 取得查詢參數
        from_date = request.args.get('from')
        to_date = request.args.get('to')
        category = request.args.get('category')
        
        query = supabase.table('energy_entries').select(
            '*', 
            'entry_reviews(*)'
        ).eq('owner_id', user_id).order('period_start', desc=True)
        
        if from_date:
            query = query.gte('period_start', from_date)
        if to_date:
            query = query.lte('period_start', to_date)
        if category:
            query = query.eq('category', category)
            
        result = query.execute()
        
        return jsonify({"entries": result.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/entries', methods=['GET'])
def get_all_entries():
    try:
        # 驗證管理員權限
        auth_header = request.headers.get('Authorization')
        user = get_user_from_token(auth_header)
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized"}), 403
            
        supabase = get_supabase_admin()
        
        # 取得查詢參數
        from_date = request.args.get('from')
        to_date = request.args.get('to')
        category = request.args.get('category')
        
        query = supabase.table('energy_entries').select(
            '*',
            'profiles!energy_entries_owner_id_fkey(display_name)',
            'entry_reviews(*)'
        ).order('period_start', desc=True)
        
        if from_date:
            query = query.gte('period_start', from_date)
        if to_date:
            query = query.lte('period_start', to_date)
        if category:
            query = query.eq('category', category)
            
        result = query.execute()
        
        return jsonify({"entries": result.data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users/bulk-update', methods=['PUT'])
def bulk_update_users():
    try:
        # 驗證管理員權限
        auth_header = request.headers.get('Authorization')
        user = get_user_from_token(auth_header)
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized"}), 403
            
        data = request.get_json()
        user_ids = data.get('user_ids', [])
        is_active = data.get('is_active')
        
        if not user_ids:
            return jsonify({"error": "user_ids is required"}), 400
            
        supabase = get_supabase_admin()
        
        # 批次更新用戶狀態
        result = supabase.table('profiles').update({
            'is_active': is_active
        }).in_('id', user_ids).execute()
        
        return jsonify({"success": True, "updated_count": len(result.data)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/entries/<entry_id>/review', methods=['POST'])
def create_entry_review(entry_id):
    try:
        # 驗證管理員權限
        auth_header = request.headers.get('Authorization')
        user = get_user_from_token(auth_header)
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized"}), 403
            
        data = request.get_json()
        status = data.get('status')
        note = data.get('note', '')
        
        if status not in ['needs_fix', 'approved']:
            return jsonify({"error": "Invalid status"}), 400
            
        supabase = get_supabase_admin()
        
        # 建立審核記錄
        result = supabase.table('entry_reviews').insert({
            'entry_id': entry_id,
            'reviewer_id': user['id'],
            'status': status,
            'note': note
        }).execute()
        
        return jsonify({"success": True, "review": result.data[0]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        # 驗證管理員權限
        auth_header = request.headers.get('Authorization')
        user = get_user_from_token(auth_header)
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        supabase = get_supabase_admin()

        # 處理 auth.users 的更新（email 和 password）
        auth_updates = {}
        if 'email' in data and data['email']:
            auth_updates['email'] = data['email']
        if 'password' in data and data['password']:
            auth_updates['password'] = data['password']

        if auth_updates:
            supabase.auth.admin.update_user_by_id(
                user_id,
                auth_updates
            )

        # 準備 profiles 表的更新資料
        profile_updates = {}

        # 基本欄位
        if 'display_name' in data:
            profile_updates['display_name'] = data['display_name']
        if 'email' in data:
            profile_updates['email'] = data['email']
        if 'company' in data:
            profile_updates['company'] = data['company']
        if 'job_title' in data:
            profile_updates['job_title'] = data['job_title']
        if 'phone' in data:
            profile_updates['phone'] = data['phone']
        if 'role' in data:
            profile_updates['role'] = data['role']
        if 'is_active' in data:
            profile_updates['is_active'] = data['is_active']

        # 處理 filling_config 更新
        if 'energy_categories' in data or 'target_year' in data or 'diesel_generator_version' in data:
            # 先取得當前的 filling_config
            current_profile = supabase.table('profiles').select('filling_config').eq('id', user_id).single().execute()
            current_config = current_profile.data.get('filling_config', {}) if current_profile.data else {}

            # 合併更新
            filling_config = {**current_config}
            if 'energy_categories' in data:
                filling_config['energy_categories'] = data['energy_categories']
            if 'target_year' in data:
                filling_config['target_year'] = data['target_year']
            if 'diesel_generator_version' in data:
                if data['diesel_generator_version']:
                    filling_config['diesel_generator_mode'] = data['diesel_generator_version']
                elif 'diesel_generator_mode' in filling_config:
                    del filling_config['diesel_generator_mode']

            profile_updates['filling_config'] = filling_config

        # 更新 profiles 表
        if profile_updates:
            supabase.table('profiles').update(profile_updates).eq('id', user_id).execute()

        return jsonify({"success": True})

    except Exception as e:
        print(f"Error in update_user: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/create-user', methods=['POST'])
def create_user():
    print("=== [create_user] 收到請求 ===")
    try:
        # 驗證管理員權限
        auth_header = request.headers.get('Authorization')
        print(f"[create_user] Authorization header: {auth_header[:50] if auth_header else 'None'}...")

        user = get_user_from_token(auth_header)
        print(f"[create_user] 認證用戶: {user}")

        if not user or user.get('role') != 'admin':
            print(f"[create_user] ❌ 權限不足: user={user}, role={user.get('role') if user else 'None'}")
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        print(f"[create_user] 請求資料: {data}")

        email = data.get('email')
        display_name = data.get('displayName')
        password = data.get('password', 'TempPassword123!')

        # ⭐ 接收完整欄位
        company = data.get('company', '')
        phone = data.get('phone', '')
        job_title = data.get('job_title', '')
        role = data.get('role', 'user')

        # ⭐ 處理 filling_config
        energy_categories = data.get('energy_categories', [])
        target_year = data.get('target_year', datetime.now().year)
        diesel_generator_version = data.get('diesel_generator_version', 'refuel')

        print(f"[create_user] 解析後: email={email}, display_name={display_name}, company={company}")

        if not email or not display_name:
            print(f"[create_user] ❌ 缺少必要欄位")
            return jsonify({"error": "email and displayName are required"}), 400

        print(f"[create_user] 開始建立 auth user...")
        supabase = get_supabase_admin()

        # 建立新用戶（使用 admin API）
        auth_result = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })

        print(f"[create_user] Auth user 建立結果: {auth_result.user.id if auth_result.user else 'Failed'}")

        if auth_result.user:
            # ⭐ 建立 profile 記錄（包含所有欄位）
            print(f"[create_user] 開始建立 profile...")
            profile_data = {
                'id': auth_result.user.id,
                'display_name': display_name,
                'email': email,
                'role': role,
                'is_active': True,
                'company': company,
                'phone': phone,
                'job_title': job_title,
                'filling_config': {
                    'energy_categories': energy_categories,
                    'target_year': target_year,
                    'diesel_generator_mode': diesel_generator_version
                }
            }
            print(f"[create_user] Profile data: {profile_data}")

            profile_result = supabase.table('profiles').insert(profile_data).execute()
            print(f"[create_user] ✅ Profile 建立成功")

            # ⭐ 回傳完整 profile 資料
            return jsonify({
                "success": True,
                "user": profile_result.data[0]
            })
        else:
            print(f"[create_user] ❌ Auth user 建立失敗")
            return jsonify({"error": "Failed to create user"}), 500

    except Exception as e:
        print(f"[create_user] ❌ Exception: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users/<user_id>/sessions', methods=['DELETE'])
def force_logout_user(user_id):
    """管理員強制登出指定用戶（清除所有 sessions）"""
    try:
        # 驗證管理員權限
        auth_header = request.headers.get('Authorization')
        user = get_user_from_token(auth_header)
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized"}), 403

        supabase = get_supabase_admin()

        # 調用 Supabase function 清除 sessions
        result = supabase.rpc('admin_clear_user_sessions_by_id', {
            'target_user_id': user_id
        }).execute()

        if result.data and result.data.get('success'):
            return jsonify({
                "success": True,
                "message": "User sessions cleared successfully",
                "deleted_sessions": result.data.get('deleted_sessions', 0)
            })
        else:
            return jsonify({
                "error": result.data.get('message', 'Failed to clear sessions')
            }), 500

    except Exception as e:
        print(f"Error in force_logout_user: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')