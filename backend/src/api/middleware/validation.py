"""
請求驗證中間件
提供裝飾器用於驗證請求數據
"""
from functools import wraps
from flask import request, jsonify
from typing import Type, Callable
from pydantic import BaseModel, ValidationError as PydanticValidationError


def validate_request(schema: Type[BaseModel], location: str = 'json') -> Callable:
    """
    請求數據驗證裝飾器

    參數:
        schema: Pydantic 模型類別
        location: 數據來源 ('json', 'query', 'form')

    使用方法:
    from src.api.schemas import UserCreateSchema

    @app.route('/api/users', methods=['POST'])
    @validate_request(UserCreateSchema)
    def create_user():
        # request.validated_data 包含已驗證的數據
        data = request.validated_data
        return jsonify({"user": data.dict()})

    @app.route('/api/users', methods=['GET'])
    @validate_request(PaginationParams, location='query')
    def list_users():
        params = request.validated_data
        page = params.page
        page_size = params.page_size
        return jsonify({"users": []})

    Raises:
        ValidationError: 當數據驗證失敗時返回 400 錯誤
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 根據 location 取得數據
            if location == 'json':
                data = request.get_json() or {}
            elif location == 'query':
                data = request.args.to_dict()
            elif location == 'form':
                data = request.form.to_dict()
            else:
                return jsonify({
                    "error": {
                        "code": "INVALID_LOCATION",
                        "message": f"Invalid location: {location}"
                    }
                }), 500

            # 驗證數據
            try:
                print(f"[VALIDATION] Validating {schema.__name__} with data keys: {list(data.keys())}")
                validated_data = schema(**data)
                print(f"[VALIDATION] {schema.__name__} validation passed")
                # 將驗證後的數據附加到 request 對象
                request.validated_data = validated_data
            except PydanticValidationError as e:
                print(f"[VALIDATION] {schema.__name__} validation failed: {e}")
                # 格式化驗證錯誤
                errors = []
                for error in e.errors():
                    field_path = ' -> '.join(str(loc) for loc in error['loc'])
                    errors.append({
                        "field": field_path,
                        "message": error['msg'],
                        "type": error['type']
                    })

                return jsonify({
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Request validation failed",
                        "details": errors
                    }
                }), 400
            except Exception as e:
                return jsonify({
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": str(e)
                    }
                }), 400

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def validate_path_params(**param_schemas: Type[BaseModel]) -> Callable:
    """
    路徑參數驗證裝飾器

    使用方法:
    from pydantic import BaseModel, Field

    class UserIdParam(BaseModel):
        user_id: str = Field(..., regex="^[a-zA-Z0-9-]+$")

    @app.route('/api/users/<user_id>')
    @validate_path_params(user_id=UserIdParam)
    def get_user(user_id):
        # user_id 已經過驗證
        return jsonify({"user_id": user_id})
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 驗證每個路徑參數
            for param_name, schema in param_schemas.items():
                if param_name in kwargs:
                    try:
                        # 創建一個臨時模型驗證參數
                        validated = schema(**{param_name: kwargs[param_name]})
                        # 更新 kwargs 中的值
                        kwargs[param_name] = getattr(validated, param_name)
                    except PydanticValidationError as e:
                        return jsonify({
                            "error": {
                                "code": "VALIDATION_ERROR",
                                "message": f"Invalid path parameter: {param_name}",
                                "details": e.errors()
                            }
                        }), 400

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def get_validated_data():
    """
    取得當前請求的已驗證數據

    Returns:
        BaseModel: 已驗證的 Pydantic 模型實例

    使用方法:
    @app.route('/api/users', methods=['POST'])
    @validate_request(UserCreateSchema)
    def create_user():
        data = get_validated_data()
        email = data.email
        return jsonify({"success": True})
    """
    return getattr(request, 'validated_data', None)


def validate_and_get(schema: Type[BaseModel], data: dict):
    """
    手動驗證數據（非裝飾器用法）

    參數:
        schema: Pydantic 模型類別
        data: 要驗證的數據字典

    Returns:
        BaseModel: 驗證後的模型實例

    Raises:
        PydanticValidationError: 當驗證失敗時

    使用方法:
    from src.api.middleware.validation import validate_and_get
    from src.api.schemas import UserCreateSchema

    @app.route('/api/custom')
    def custom_route():
        data = request.get_json()
        try:
            validated = validate_and_get(UserCreateSchema, data)
            # 使用 validated 數據
            return jsonify({"user": validated.dict()})
        except PydanticValidationError as e:
            return jsonify({"error": e.errors()}), 400
    """
    return schema(**data)
