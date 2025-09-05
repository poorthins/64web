"""
應用程式配置管理
"""
import os
from typing import Optional, Dict, Any
from functools import lru_cache
from pydantic import BaseSettings, validator
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()


class Settings(BaseSettings):
    """應用程式設定"""
    
    # 應用程式基本設定
    APP_NAME: str = "Carbon Tracker API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # API 設定
    API_V1_STR: str = "/api/v1"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 5000
    
    # CORS 設定
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5175"]
    
    # 資料庫設定
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: Optional[str] = None
    
    # JWT 設定
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Redis 設定
    REDIS_URL: Optional[str] = None
    CACHE_TTL: int = 300  # 5 分鐘
    
    # 日誌設定
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: Optional[str] = None
    
    # 監控設定
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    
    # 速率限制
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT: str = "100/hour"
    
    # 檔案上傳設定
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".pdf", ".docx"}
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v):
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True


class DevelopmentSettings(Settings):
    """開發環境設定"""
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"


class StagingSettings(Settings):
    """測試環境設定"""
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"


class ProductionSettings(Settings):
    """生產環境設定"""
    DEBUG: bool = False
    LOG_LEVEL: str = "WARNING"
    RATE_LIMIT_DEFAULT: str = "1000/hour"


@lru_cache()
def get_settings() -> Settings:
    """取得應用程式設定（單例模式）"""
    env = os.getenv("ENVIRONMENT", "development")
    
    settings_map = {
        "development": DevelopmentSettings,
        "staging": StagingSettings,
        "production": ProductionSettings,
    }
    
    settings_class = settings_map.get(env, DevelopmentSettings)
    return settings_class()


# 全域設定實例
settings = get_settings()
