from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger
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

# Swagger 配置
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/docs"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Carbon Footprint API",
        "description": "碳足跡管理系統 API 文檔",
        "version": "1.0.0"
    },
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Token (格式: Bearer <token>)"
        }
    },
    "security": [
        {
            "Bearer": []
        }
    ]
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "service": "Carbon Footprint API",
        "version": "1.0",
        "status": "running",
        "endpoints": {
            "health": "/api/health",
            "users": "/api/admin/users",
            "entries": "/api/entries/submit"
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    健康檢查
    ---
    tags:
      - System
    responses:
      200:
        description: 系統正常運行
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: true
    """
    return jsonify({"ok": True})

@app.route('/api/test-supabase', methods=['GET'])
def test_supabase():
    """
    測試 Supabase 連接
    ---
    tags:
      - System
    responses:
      200:
        description: 成功連接
        schema:
          type: object
          properties:
            success:
              type: boolean
            profiles_count:
              type: integer
            profiles:
              type: array
      500:
        description: 連接失敗
    """
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
    """
    測試 CORS 設定
    ---
    tags:
      - System
    responses:
      200:
        description: CORS 測試成功
        schema:
          type: object
          properties:
            message:
              type: string
            origin:
              type: string
            method:
              type: string
    """
    return jsonify({
        "message": "CORS test successful",
        "origin": request.headers.get('Origin'),
        "method": request.method
    })

@app.route('/api/carbon/calculate', methods=['POST'])
@require_auth
@validate_request(CarbonCalculateRequest)
def calculate_carbon():
    """
    計算碳排放量
    ---
    tags:
      - Carbon
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - page_key
            - monthly_data
            - year
          properties:
            page_key:
              type: string
              example: diesel
              description: 頁面類型
            monthly_data:
              type: object
              description: 月份數據
              example:
                "1": 100.5
                "2": 120.3
            year:
              type: integer
              example: 2024
              description: 年份
    responses:
      200:
        description: 計算成功
        schema:
          type: object
          properties:
            total_carbon:
              type: number
            monthly_carbon:
              type: object
      400:
        description: 請求驗證失敗
      401:
        description: 未授權
      500:
        description: 計算錯誤
    """
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
    """
    提交能源條目（新增）
    ---
    tags:
      - Entries
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - page_key
            - period_year
            - unit
            - monthly
          properties:
            page_key:
              type: string
              example: diesel
              description: 頁面類型 (diesel, gasoline, natural_gas, etc.)
            period_year:
              type: integer
              example: 2024
              description: 盤查年度
            unit:
              type: string
              example: L
              description: 單位
            monthly:
              type: object
              description: 月份數據 (key為月份1-12，value為數值)
              example:
                "1": 100.5
                "2": 120.3
            notes:
              type: string
              example: 備註資訊
            payload:
              type: object
              description: 額外資料
            extraPayload:
              type: object
              description: 額外佐證資料
            status:
              type: string
              enum: [submitted, approved, rejected, needs_fix]
              default: submitted
    responses:
      201:
        description: 成功創建條目
        schema:
          type: object
          properties:
            success:
              type: boolean
            entry_id:
              type: string
            message:
              type: string
      400:
        description: 請求驗證失敗
      401:
        description: 未授權
      500:
        description: 伺服器錯誤
    """
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
    """
    更新能源條目
    ---
    tags:
      - Entries
    security:
      - Bearer: []
    parameters:
      - in: path
        name: entry_id
        type: string
        required: true
        description: 條目 ID
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            monthly:
              type: object
              description: 月份數據
              example:
                "1": 100.5
                "2": 120.3
            notes:
              type: string
              example: 更新備註
            payload:
              type: object
            extraPayload:
              type: object
            status:
              type: string
              enum: [submitted, approved, rejected, needs_fix]
    responses:
      200:
        description: 成功更新條目
        schema:
          type: object
          properties:
            success:
              type: boolean
            entry_id:
              type: string
            updated_fields:
              type: array
              items:
                type: string
            message:
              type: string
      400:
        description: 請求驗證失敗
      401:
        description: 未授權
      500:
        description: 更新錯誤
    """
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
    """
    上傳證據檔案
    ---
    tags:
      - Files
    security:
      - Bearer: []
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: 要上傳的檔案
      - in: formData
        name: page_key
        type: string
        required: true
        description: 頁面類型
      - in: formData
        name: period_year
        type: integer
        required: true
        description: 盤查年度
      - in: formData
        name: file_type
        type: string
        required: true
        description: 檔案類型 (evidence, sds, nameplate, etc.)
      - in: formData
        name: month
        type: integer
        required: false
        description: 月份 (1-12)
      - in: formData
        name: entry_id
        type: string
        required: false
        description: 條目 ID
      - in: formData
        name: record_id
        type: string
        required: false
        description: 記錄 ID
      - in: formData
        name: standard
        type: string
        required: false
        default: "64"
        description: 標準版本
    responses:
      201:
        description: 檔案上傳成功
        schema:
          type: object
          properties:
            success:
              type: boolean
            file_id:
              type: string
            file_path:
              type: string
            file_name:
              type: string
            file_size:
              type: integer
            message:
              type: string
      400:
        description: 請求驗證失敗或檔案驗證失敗
      401:
        description: 未授權
      500:
        description: 上傳錯誤
    """
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
    """
    刪除證據檔案
    ---
    tags:
      - Files
    security:
      - Bearer: []
    parameters:
      - in: path
        name: file_id
        type: string
        required: true
        description: 檔案 ID
    responses:
      200:
        description: 檔案刪除成功
        schema:
          type: object
          properties:
            success:
              type: boolean
            file_id:
              type: string
            message:
              type: string
      401:
        description: 未授權
      403:
        description: 權限不足
      404:
        description: 檔案不存在
      500:
        description: 刪除錯誤
    """
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
    """
    獲取所有用戶列表
    ---
    tags:
      - Admin - Users
    security:
      - Bearer: []
    responses:
      200:
        description: 成功獲取用戶列表
        schema:
          type: object
          properties:
            users:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  email:
                    type: string
                  display_name:
                    type: string
                  role:
                    type: string
                  is_active:
                    type: boolean
                  company:
                    type: string
                  entries_count:
                    type: integer
      401:
        description: 未授權
      403:
        description: 權限不足
    """
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
    """
    獲取指定用戶的填報記錄
    ---
    tags:
      - Admin - Users
    security:
      - Bearer: []
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
        description: 用戶 ID
      - in: query
        name: from
        type: string
        required: false
        description: 起始日期 (YYYY-MM-DD)
      - in: query
        name: to
        type: string
        required: false
        description: 結束日期 (YYYY-MM-DD)
      - in: query
        name: category
        type: string
        required: false
        description: 類別篩選
    responses:
      200:
        description: 成功獲取填報記錄
        schema:
          type: object
          properties:
            entries:
              type: array
      401:
        description: 未授權
      403:
        description: 權限不足
      500:
        description: 伺服器錯誤
    """
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
    """
    獲取所有填報記錄
    ---
    tags:
      - Admin - Entries
    security:
      - Bearer: []
    parameters:
      - in: query
        name: from
        type: string
        required: false
        description: 起始日期 (YYYY-MM-DD)
      - in: query
        name: to
        type: string
        required: false
        description: 結束日期 (YYYY-MM-DD)
      - in: query
        name: category
        type: string
        required: false
        description: 類別篩選
    responses:
      200:
        description: 成功獲取所有填報記錄
        schema:
          type: object
          properties:
            entries:
              type: array
      401:
        description: 未授權
      403:
        description: 權限不足
      500:
        description: 伺服器錯誤
    """
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
    """
    批量更新用戶狀態
    ---
    tags:
      - Admin - Users
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - user_ids
            - is_active
          properties:
            user_ids:
              type: array
              items:
                type: string
              minItems: 1
              maxItems: 100
              example: ["uuid-1", "uuid-2"]
              description: 用戶 ID 列表
            is_active:
              type: boolean
              example: false
              description: 是否啟用
    responses:
      200:
        description: 批量更新成功
        schema:
          type: object
          properties:
            success:
              type: boolean
            updated_count:
              type: integer
      400:
        description: 請求驗證失敗
      401:
        description: 未授權
      403:
        description: 權限不足
      500:
        description: 伺服器錯誤
    """
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
    """
    創建填報審核記錄
    ---
    tags:
      - Admin - Entries
    security:
      - Bearer: []
    parameters:
      - in: path
        name: entry_id
        type: string
        required: true
        description: 條目 ID
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - status
          properties:
            status:
              type: string
              enum: [needs_fix, approved, rejected]
              example: approved
              description: 審核狀態
            note:
              type: string
              example: 資料填寫正確
              description: 審核備註
    responses:
      200:
        description: 審核記錄創建成功
        schema:
          type: object
          properties:
            success:
              type: boolean
            review:
              type: object
      400:
        description: 無效的狀態或請求
      401:
        description: 未授權
      403:
        description: 權限不足
      500:
        description: 伺服器錯誤
    """
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
    """
    更新用戶資料
    ---
    tags:
      - Admin - Users
    security:
      - Bearer: []
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
        description: 用戶 ID
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
              format: email
            password:
              type: string
              minLength: 8
            display_name:
              type: string
            company:
              type: string
            phone:
              type: string
            job_title:
              type: string
            role:
              type: string
              enum: [user, admin, manager, viewer]
            is_active:
              type: boolean
            energy_categories:
              type: array
              items:
                type: string
            target_year:
              type: integer
            diesel_generator_version:
              type: string
    responses:
      200:
        description: 更新成功
        schema:
          type: object
          properties:
            success:
              type: boolean
      400:
        description: 請求驗證失敗
      401:
        description: 未授權
      403:
        description: 權限不足
      500:
        description: 伺服器錯誤
    """
    try:
        print(f"=== [update_user] 開始更新用戶: {user_id} ===")
        # 從已驗證的數據取得參數
        validated_data = get_validated_data()
        data_dict = validated_data.dict(exclude_unset=True)  # 只包含實際提供的欄位
        print(f"[update_user] 驗證後的資料: {data_dict}")
        supabase = get_supabase_admin()

        # 處理 auth.users 的更新（僅密碼）
        # 注意：只在明確提供密碼時才更新
        if validated_data.password:
            print(f"[update_user] 準備更新密碼")
            try:
                # 方法 1: 直接用 dict（某些版本支持）
                try:
                    result = supabase.auth.admin.update_user_by_id(
                        user_id,
                        {"password": validated_data.password}
                    )
                    print(f"[update_user] 密碼更新成功 (方法1)")
                except:
                    # 方法 2: 使用 attributes 參數
                    result = supabase.auth.admin.update_user_by_id(
                        user_id,
                        attributes={"password": validated_data.password}
                    )
                    print(f"[update_user] 密碼更新成功 (方法2)")
            except Exception as auth_error:
                print(f"[update_user] 密碼更新失敗: {type(auth_error).__name__}: {str(auth_error)}")
                # 記錄錯誤但不中斷，繼續更新 profiles
                pass

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
    """
    創建新用戶
    ---
    tags:
      - Admin - Users
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
            - password
            - display_name
          properties:
            email:
              type: string
              format: email
              example: user@example.com
            password:
              type: string
              minLength: 8
              example: SecurePass123
            display_name:
              type: string
              example: 張三
            company:
              type: string
              example: 綠能科技
            phone:
              type: string
              example: +886-2-1234-5678
            job_title:
              type: string
              example: 環保專員
            role:
              type: string
              enum: [user, admin, manager, viewer]
              default: user
            energy_categories:
              type: array
              items:
                type: string
              example: ["diesel", "gasoline"]
            target_year:
              type: integer
              example: 2024
            diesel_generator_version:
              type: string
              example: refuel
    responses:
      200:
        description: 成功創建用戶
        schema:
          type: object
          properties:
            success:
              type: boolean
            user:
              type: object
      400:
        description: 請求驗證失敗
      401:
        description: 未授權
      403:
        description: 權限不足
      500:
        description: 伺服器錯誤
    """
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
    """
    強制登出指定用戶
    ---
    tags:
      - Admin - Users
    security:
      - Bearer: []
    parameters:
      - in: path
        name: user_id
        type: string
        required: true
        description: 用戶 ID
    responses:
      200:
        description: 成功清除用戶 sessions
        schema:
          type: object
          properties:
            success:
              type: boolean
            message:
              type: string
            deleted_sessions:
              type: integer
      401:
        description: 未授權
      403:
        description: 權限不足
      500:
        description: 伺服器錯誤
    """
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