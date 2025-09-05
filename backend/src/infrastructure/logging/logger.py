"""
結構化日誌系統
"""
import sys
import logging
import structlog
from typing import Any, Dict, Optional
from pathlib import Path
from datetime import datetime

from src.core.config import settings


def add_timestamp(_, __, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """添加時間戳記"""
    event_dict["timestamp"] = datetime.utcnow().isoformat()
    return event_dict


def add_app_context(_, __, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """添加應用程式上下文"""
    event_dict["app_name"] = settings.APP_NAME
    event_dict["app_version"] = settings.APP_VERSION
    event_dict["environment"] = settings.ENVIRONMENT
    return event_dict


def setup_logging() -> structlog.BoundLogger:
    """設置結構化日誌"""
    
    # 設置日誌級別
    log_level = getattr(logging, settings.LOG_LEVEL.upper())
    
    # 配置標準 logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )
    
    # 設置處理器
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        add_timestamp,
        add_app_context,
    ]
    
    # 根據環境選擇渲染器
    if settings.LOG_FORMAT == "json":
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())
    
    # 配置 structlog
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # 如果設置了日誌文件，添加文件處理器
    if settings.LOG_FILE:
        log_path = Path(settings.LOG_FILE)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_path)
        file_handler.setLevel(log_level)
        
        # 為文件處理器設置格式
        if settings.LOG_FORMAT == "json":
            formatter = logging.Formatter('%(message)s')
        else:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        file_handler.setFormatter(formatter)
        
        # 添加到根日誌器
        logging.getLogger().addHandler(file_handler)
    
    return structlog.get_logger()


class LoggerMixin:
    """日誌混入類別"""
    
    @property
    def logger(self) -> structlog.BoundLogger:
        """獲取綁定了類別名稱的日誌器"""
        return structlog.get_logger(self.__class__.__name__)


class RequestLogger:
    """請求日誌中間件"""
    
    def __init__(self):
        self.logger = structlog.get_logger(__name__)
    
    def log_request(
        self,
        method: str,
        path: str,
        remote_addr: str,
        user_id: Optional[str] = None,
        **kwargs
    ):
        """記錄請求"""
        self.logger.info(
            "request_started",
            method=method,
            path=path,
            remote_addr=remote_addr,
            user_id=user_id,
            **kwargs
        )
    
    def log_response(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        user_id: Optional[str] = None,
        **kwargs
    ):
        """記錄響應"""
        log_method = self.logger.info if status_code < 400 else self.logger.warning
        
        log_method(
            "request_completed",
            method=method,
            path=path,
            status_code=status_code,
            duration_ms=duration_ms,
            user_id=user_id,
            **kwargs
        )
    
    def log_error(
        self,
        method: str,
        path: str,
        error: Exception,
        user_id: Optional[str] = None,
        **kwargs
    ):
        """記錄錯誤"""
        self.logger.error(
            "request_failed",
            method=method,
            path=path,
            error=str(error),
            error_type=type(error).__name__,
            user_id=user_id,
            exc_info=True,
            **kwargs
        )


# 全域日誌器實例
logger = setup_logging()
request_logger = RequestLogger()
