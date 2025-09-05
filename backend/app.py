from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from utils.supabase_admin import get_supabase_admin
from utils.auth import get_user_from_token

load_dotenv()

app = Flask(__name__)
CORS(app, origins=[
    os.getenv('ALLOW_ORIGIN', 'http://localhost:5173'),
    'http://localhost:5175'  # 增加前端實際運行的端口
])

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

@app.route('/api/admin/create-user', methods=['POST'])
def create_user():
    try:
        # 驗證管理員權限
        auth_header = request.headers.get('Authorization')
        user = get_user_from_token(auth_header)
        if not user or user.get('role') != 'admin':
            return jsonify({"error": "Unauthorized"}), 403
            
        data = request.get_json()
        email = data.get('email')
        display_name = data.get('displayName')
        company = data.get('company', '')
        password = data.get('password', 'TempPassword123!')
        
        if not email or not display_name:
            return jsonify({"error": "email and displayName are required"}), 400
            
        supabase = get_supabase_admin()
        
        # 建立新用戶（使用 admin API）
        auth_result = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        
        if auth_result.user:
            # 建立 profile 記錄
            profile_result = supabase.table('profiles').insert({
                'id': auth_result.user.id,
                'display_name': display_name,
                'role': 'user',
                'is_active': True,
                'company': company
            }).execute()
            
            return jsonify({
                "success": True,
                "user_id": auth_result.user.id,
                "profile": profile_result.data[0]
            })
        else:
            return jsonify({"error": "Failed to create user"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)