"""
錯誤處理中間件
"""
from typing import Dict, Any, Optional, Callable
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
import traceback
from datetime import datetime

from src.core.exceptions import BaseAPIException
from src.infrastructure.logging.logger import logger


class ErrorHandler:
    """錯誤處理器"""
    
    def __init__(self, app: Optional[Flask] = None):
        self.app = app
        if app:
            self.init_app(app)
    
    def init_app(self, app: Flask):
        """初始化錯誤處理器"""
        self.app = app
        
        # 註冊錯誤處理器
        app.register_error_handler(BaseAPIException, self.handle_api_exception)
        app.register_error_handler(HTTPException, self.handle_http_exception)
        app.register_error_handler(Exception, self.handle_generic_exception)
        
        # 註冊 404 處理器
        app.register_error_handler(404, self.handle_not_found)
        
        # 註冊 405 處理器
        app.register_error_handler(405, self.handle_method_not_allowed)
    
    def handle_api_exception(self, error: BaseAPIException) -> tuple:
        """處理 API 異常"""
        # 記錄錯誤
        logger.warning(
            "api_exception",
            error_code=error.error_code,
            message=error.message,
            status_code=error.status_code,
            details=error.details,
            path=request.path,
            method=request.method,
        )
        
        # 構建響應
        response = {
            "error": {
                "code": error.error_code,
                "message": error.message,
                "details": error.details,
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.path,
            }
        }
        
        return jsonify(response), error.status_code
    
    def handle_http_exception(self, error: HTTPException) -> tuple:
        """處理 HTTP 異常"""
        # 記錄錯誤
        logger.warning(
            "http_exception",
            status_code=error.code,
            message=error.description,
            path=request.path,
            method=request.method,
        )
        
        # 構建響應
        response = {
            "error": {
                "code": f"HTTP_{error.code}",
                "message": error.description or "An error occurred",
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.path,
            }
        }
        
        return jsonify(response), error.code or 500
    
    def handle_generic_exception(self, error: Exception) -> tuple:
        """處理通用異常"""
        # 記錄錯誤（包含堆疊追蹤）
        logger.error(
            "unhandled_exception",
            error_type=type(error).__name__,
            message=str(error),
            path=request.path,
            method=request.method,
            exc_info=True,
        )
        
        # 在開發環境中返回詳細錯誤信息
        if self.app.debug:
            response = {
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": str(error),
                    "type": type(error).__name__,
                    "traceback": traceback.format_exc().split('\n'),
                    "timestamp": datetime.utcnow().isoformat(),
                    "path": request.path,
                }
            }
        else:
            # 在生產環境中返回通用錯誤信息
            response = {
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred",
                    "timestamp": datetime.utcnow().isoformat(),
                    "path": request.path,
                }
            }
        
        return jsonify(response), 500
    
    def handle_not_found(self, error: Any) -> tuple:
        """處理 404 錯誤"""
        response = {
            "error": {
                "code": "NOT_FOUND",
                "message": f"The requested URL {request.path} was not found",
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.path,
            }
        }
        
        return jsonify(response), 404
    
    def handle_method_not_allowed(self, error: Any) -> tuple:
        """處理 405 錯誤"""
        response = {
            "error": {
                "code": "METHOD_NOT_ALLOWED",
                "message": f"The method {request.method} is not allowed for {request.path}",
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.path,
                "allowed_methods": error.valid_methods if hasattr(error, 'valid_methods') else [],
            }
        }
        
        return jsonify(response), 405


def create_error_response(
    code: str,
    message: str,
    status_code: int = 400,
    details: Optional[Dict[str, Any]] = None
) -> tuple:
    """創建錯誤響應的輔助函數"""
    response = {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat(),
            "path": request.path if request else None,
        }
    }
    
    return jsonify(response), status_code


def handle_validation_errors(errors: Dict[str, Any]) -> tuple:
    """處理驗證錯誤"""
    return create_error_response(
        code="VALIDATION_ERROR",
        message="Validation failed",
        status_code=400,
        details={"validation_errors": errors}
    )


class ErrorHandlerMiddleware:
    """錯誤處理中間件（用於 WSGI）"""
    
    def __init__(self, app: Callable, error_handler: ErrorHandler):
        self.app = app
        self.error_handler = error_handler
    
    def __call__(self, environ, start_response):
        """WSGI 調用"""
        try:
            return self.app(environ, start_response)
        except Exception as e:
            # 處理未捕獲的異常
            logger.error(
                "wsgi_exception",
                error_type=type(e).__name__,
                message=str(e),
                exc_info=True,
            )
            
            # 返回 500 錯誤
            status = '500 Internal Server Error'
            headers = [('Content-Type', 'application/json')]
            start_response(status, headers)
            
            response = {
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            }
            
            import json
            return [json.dumps(response).encode('utf-8')]
