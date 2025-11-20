from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from utils.supabase_admin import get_supabase_admin
from utils.auth import get_user_from_token

# 新的 middleware 和 schemas
from src.api.middleware.auth import require_auth, require_admin, require_permission
from src.api.middleware.validation import validate_request, get_validated_data
from src.api.schemas.user import UserCreateSchema, UserUpdateSchema, BulkUserUpdateSchema
from src.api.schemas.review import ReviewCreateSchema
from src.api.schemas.carbon import CarbonCalculateRequest
from src.api.schemas.submission import EntrySubmitRequest, EntryUpdateRequest
from src.api.schemas.file_upload import FileUploadMetadata, FileUploadResponse
from src.services.carbon_service import calculate_total_carbon
from src.services.entry_service import create_energy_entry, update_energy_entry
from src.services.file_service import upload_evidence_file, delete_evidence_file

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
@require_auth
@validate_request(CarbonCalculateRequest)
def calculate_carbon():
    """計算碳排放量"""
    try:
        # 從已驗證的數據取得參數
        validated_data = get_validated_data()

        # 執行碳排放計算
        result = calculate_total_carbon(
            page_key=validated_data.page_key,
            monthly_data=validated_data.monthly_data,
            year=validated_data.year
        )

        return jsonify(result), 200

    except Exception as e:
        import traceback
        print(f"Carbon calculation error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Internal server error",
            "code": "CALCULATION_ERROR",
            "message": str(e)
        }), 500

# Energy Entry Submission API
@app.route('/api/entries/submit', methods=['POST'])
@require_auth
@validate_request(EntrySubmitRequest)
def submit_energy_entry():
    """提交能源條目（新增）"""
    print(f"=== [ENTRY SUBMIT] Request received ===")
    try:
        validated_data = get_validated_data()
        print(f"=== [ENTRY SUBMIT] Validated data: page_key={validated_data.page_key}, year={validated_data.period_year} ===")
        supabase = get_supabase_admin()
        user_id = request.user['id']
        print(f"=== [ENTRY SUBMIT] User ID: {user_id} ===")

        # 呼叫 entry service 創建條目
        result = create_energy_entry(
            supabase=supabase,
            user_id=user_id,
            page_key=validated_data.page_key,
            period_year=validated_data.period_year,
            unit=validated_data.unit,
            monthly=validated_data.monthly,
            notes=validated_data.notes,
            payload=validated_data.payload,
            extraPayload=validated_data.extraPayload,
            status=validated_data.status or 'submitted'
        )

        return jsonify({
            'success': True,
            'entry_id': result['entry_id'],
            'message': 'Entry created successfully'
        }), 201

    except Exception as e:
        import traceback
        print(f"Entry submission error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to create entry",
            "code": "SUBMISSION_ERROR",
            "message": str(e)
        }), 500

@app.route('/api/entries/<entry_id>', methods=['PUT'])
@require_auth
@validate_request(EntryUpdateRequest)
def update_entry(entry_id):
    """更新能源條目"""
    try:
        validated_data = get_validated_data()
        supabase = get_supabase_admin()
        user_id = request.user['id']

        # 呼叫 entry service 更新條目
        result = update_energy_entry(
            supabase=supabase,
            entry_id=entry_id,
            user_id=user_id,
            monthly=validated_data.monthly,
            notes=validated_data.notes,
            payload=validated_data.payload,
            extraPayload=validated_data.extraPayload,
            status=validated_data.status
        )

        return jsonify({
            'success': True,
            'entry_id': entry_id,
            'updated_fields': result.get('updated_fields', []),
            'message': 'Entry updated successfully'
        }), 200

    except Exception as e:
        import traceback
        print(f"Entry update error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to update entry",
            "code": "UPDATE_ERROR",
            "message": str(e)
        }), 500

# File Upload API
@app.route('/api/files/upload', methods=['POST'])
@require_auth
def upload_file():
    """上傳證據檔案"""
    try:
        supabase = get_supabase_admin()
        user_id = request.user['id']

        # 檢查是否有檔案
        if 'file' not in request.files:
            return jsonify({
                "error": "No file provided",
                "code": "MISSING_FILE"
            }), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({
                "error": "No file selected",
                "code": "EMPTY_FILENAME"
            }), 400

        # 從 form data 取得元數據
        try:
            metadata = FileUploadMetadata(
                page_key=request.form.get('page_key'),
                period_year=int(request.form.get('period_year', 0)),
                file_type=request.form.get('file_type'),
                month=int(request.form.get('month')) if request.form.get('month') else None,
                entry_id=request.form.get('entry_id'),
                record_id=request.form.get('record_id'),
                standard=request.form.get('standard', '64')
            )
        except Exception as e:
            return jsonify({
                "error": "Invalid metadata",
                "code": "VALIDATION_ERROR",
                "message": str(e)
            }), 400

        # 讀取檔案數據
        file_data = file.read()
        file_size = len(file_data)
        mime_type = file.content_type or ''

        # 呼叫 file service 上傳
        result = upload_evidence_file(
            supabase=supabase,
            user_id=user_id,
            entry_id=metadata.entry_id,
            file_data=file_data,
            filename=file.filename,
            file_size=file_size,
            mime_type=mime_type,
            page_key=metadata.page_key,
            period_year=metadata.period_year,
            file_type=metadata.file_type,
            standard=metadata.standard,
            month=metadata.month,
            record_id=metadata.record_id
        )

        return jsonify({
            'success': True,
            'file_id': result['file_id'],
            'file_path': result['file_path'],
            'file_name': result['file_name'],
            'file_size': result['file_size'],
            'message': 'File uploaded successfully'
        }), 201

    except ValueError as e:
        # 驗證錯誤（檔案大小、類型等）
        import traceback
        print(f"File validation error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "File validation failed",
            "code": "VALIDATION_ERROR",
            "message": str(e)
        }), 400

    except Exception as e:
        # 其他錯誤（上傳失敗等）
        import traceback
        print(f"File upload error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to upload file",
            "code": "UPLOAD_ERROR",
            "message": str(e)
        }), 500

@app.route('/api/files/<file_id>', methods=['DELETE'])
@require_auth
def delete_file(file_id):
    """刪除證據檔案"""
    try:
        supabase = get_supabase_admin()
        user_id = request.user['id']

        # 呼叫 file service 刪除
        result = delete_evidence_file(
            supabase=supabase,
            user_id=user_id,
            file_id=file_id
        )

        return jsonify({
            'success': True,
            'file_id': file_id,
            'message': 'File deleted successfully'
        }), 200

    except Exception as e:
        import traceback
        print(f"File deletion error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "error": "Failed to delete file",
            "code": "DELETION_ERROR",
            "message": str(e)
        }), 500

# Admin API Routes
@app.route('/api/admin/users', methods=['GET'])
@require_auth
@require_admin
def get_all_users():
    try:
        # request.user 已由 @require_auth 設置
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
@require_auth
@require_admin
def get_user_entries(user_id):
    try:
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
@require_auth
@require_admin
def get_all_entries():
    try:
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
@require_auth
@require_admin
@validate_request(BulkUserUpdateSchema)
def bulk_update_users():
    try:
        # 從已驗證的數據取得參數
        data = get_validated_data()
        user_ids = data.user_ids
        is_active = data.is_active

        supabase = get_supabase_admin()

        # 批次更新用戶狀態
        result = supabase.table('profiles').update({
            'is_active': is_active
        }).in_('id', user_ids).execute()
        
        return jsonify({"success": True, "updated_count": len(result.data)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/entries/<entry_id>/review', methods=['POST'])
@require_auth
@require_admin
def create_entry_review(entry_id):
    try:
        data = request.get_json()
        status = data.get('status')
        note = data.get('note', '')

        if status not in ['needs_fix', 'approved', 'rejected']:
            return jsonify({"error": "Invalid status"}), 400

        supabase = get_supabase_admin()

        # 建立審核記錄
        result = supabase.table('entry_reviews').insert({
            'entry_id': entry_id,
            'reviewer_id': request.user['id'],  # 使用 request.user
            'status': status,
            'note': note
        }).execute()
        
        return jsonify({"success": True, "review": result.data[0]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/users/<user_id>', methods=['PUT'])
@require_auth
@require_admin
@validate_request(UserUpdateSchema)
def update_user(user_id):
    try:
        # 從已驗證的數據取得參數
        validated_data = get_validated_data()
        data_dict = validated_data.dict(exclude_unset=True)  # 只包含實際提供的欄位
        supabase = get_supabase_admin()

        # 處理 auth.users 的更新（email 和 password）
        auth_updates = {}
        if validated_data.email:
            auth_updates['email'] = validated_data.email
        if validated_data.password:
            auth_updates['password'] = validated_data.password

        if auth_updates:
            supabase.auth.admin.update_user_by_id(
                user_id,
                auth_updates
            )

        # 準備 profiles 表的更新資料
        profile_updates = {}

        # 基本欄位
        if validated_data.display_name is not None:
            profile_updates['display_name'] = validated_data.display_name
        if validated_data.email is not None:
            profile_updates['email'] = validated_data.email
        if validated_data.company is not None:
            profile_updates['company'] = validated_data.company
        if validated_data.job_title is not None:
            profile_updates['job_title'] = validated_data.job_title
        if validated_data.phone is not None:
            profile_updates['phone'] = validated_data.phone
        if validated_data.role is not None:
            profile_updates['role'] = validated_data.role
        if validated_data.is_active is not None:
            profile_updates['is_active'] = validated_data.is_active

        # 處理 filling_config 更新
        if validated_data.energy_categories or validated_data.target_year or validated_data.diesel_generator_version:
            # 先取得當前的 filling_config
            current_profile = supabase.table('profiles').select('filling_config').eq('id', user_id).single().execute()
            current_config = current_profile.data.get('filling_config', {}) if current_profile.data else {}

            # 合併更新
            filling_config = {**current_config}
            if validated_data.energy_categories is not None:
                filling_config['energy_categories'] = validated_data.energy_categories
            if validated_data.target_year is not None:
                filling_config['target_year'] = validated_data.target_year
            if validated_data.diesel_generator_version is not None:
                if validated_data.diesel_generator_version:
                    filling_config['diesel_generator_mode'] = validated_data.diesel_generator_version
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
@require_auth
@require_admin
@validate_request(UserCreateSchema)
def create_user():
    print("=== [create_user] 收到請求 ===")
    try:
        # 從已驗證的數據取得參數
        validated_data = get_validated_data()
        print(f"[create_user] 驗證後的數據: {validated_data}")

        supabase = get_supabase_admin()
        print(f"[create_user] 開始建立 auth user...")

        # 建立新用戶（使用 admin API）
        auth_result = supabase.auth.admin.create_user({
            "email": validated_data.email,
            "password": validated_data.password,
            "email_confirm": True
        })

        print(f"[create_user] Auth user 建立結果: {auth_result.user.id if auth_result.user else 'Failed'}")

        if auth_result.user:
            # 建立 profile 記錄（包含所有欄位）
            print(f"[create_user] 開始建立 profile...")
            profile_data = {
                'id': auth_result.user.id,
                'display_name': validated_data.display_name,
                'email': validated_data.email,
                'role': validated_data.role,
                'is_active': True,
                'company': validated_data.company or '',
                'phone': validated_data.phone or '',
                'job_title': validated_data.job_title or '',
                'filling_config': {
                    'energy_categories': validated_data.energy_categories,
                    'target_year': validated_data.target_year or datetime.now().year,
                    'diesel_generator_mode': validated_data.diesel_generator_version or 'refuel'
                }
            }
            print(f"[create_user] Profile data: {profile_data}")

            profile_result = supabase.table('profiles').insert(profile_data).execute()
            print(f"[create_user] ✅ Profile 建立成功")

            # 回傳完整 profile 資料
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
@require_auth
@require_admin
def force_logout_user(user_id):
    """管理員強制登出指定用戶（清除所有 sessions）"""
    try:
        supabase = get_supabase_admin()

        # 直接刪除 auth.sessions 表中的記錄
        result = supabase.table('auth.sessions').delete().eq('user_id', user_id).execute()

        deleted_count = len(result.data) if result.data else 0

        return jsonify({
            "success": True,
            "message": "User sessions cleared successfully",
            "deleted_sessions": deleted_count
        })

    except Exception as e:
        print(f"Error in force_logout_user: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')