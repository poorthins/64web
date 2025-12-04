"""
用戶相關驗證模型
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator, constr
from datetime import datetime


class UserCreateSchema(BaseModel):
    """創建用戶請求"""
    email: EmailStr = Field(..., description="用戶 Email")
    password: constr(min_length=8) = Field(..., description="密碼（至少 8 個字元）")
    display_name: str = Field(..., min_length=1, max_length=100, description="顯示名稱")
    company: Optional[str] = Field(None, max_length=200, description="公司名稱")
    phone: Optional[str] = Field(None, max_length=20, description="電話號碼")
    job_title: Optional[str] = Field(None, max_length=100, description="職位")
    role: str = Field(default='user', description="用戶角色")
    energy_categories: List[str] = Field(default_factory=list, description="允許填報的能源類別")
    target_year: Optional[int] = Field(None, le=2100, description="目標年份")
    diesel_generator_version: Optional[str] = Field(None, description="柴油發電機版本")

    @validator('role')
    def validate_role(cls, v):
        """驗證角色"""
        allowed_roles = ['user', 'admin', 'manager', 'viewer']
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of: {", ".join(allowed_roles)}')
        return v

    @validator('phone')
    def validate_phone(cls, v):
        """驗證電話號碼格式"""
        if v:
            # 簡單的電話號碼驗證（可根據需求調整）
            import re
            if not re.match(r'^\+?[0-9\s\-\(\)]{8,20}$', v):
                raise ValueError('Invalid phone number format')
        return v

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "SecurePass123!",
                "display_name": "張三",
                "company": "綠能科技股份有限公司",
                "phone": "+886-2-1234-5678",
                "job_title": "環保專員",
                "role": "user",
                "energy_categories": ["diesel", "gasoline", "natural_gas"],
                "target_year": 2024,
                "diesel_generator_version": "refuel"
            }
        }


class UserUpdateSchema(BaseModel):
    """更新用戶請求"""
    email: Optional[EmailStr] = Field(None, description="Email")
    password: Optional[constr(min_length=8)] = Field(None, description="新密碼")
    display_name: Optional[str] = Field(None, min_length=1, max_length=100, description="顯示名稱")
    company: Optional[str] = Field(None, max_length=200, description="公司名稱")
    phone: Optional[str] = Field(None, max_length=20, description="電話號碼")
    job_title: Optional[str] = Field(None, max_length=100, description="職位")
    role: Optional[str] = Field(None, description="用戶角色")
    is_active: Optional[bool] = Field(None, description="是否啟用")
    energy_categories: Optional[List[str]] = Field(None, description="允許填報的能源類別")
    target_year: Optional[int] = Field(None, le=2100, description="目標年份")
    diesel_generator_version: Optional[str] = Field(None, description="柴油發電機版本")

    @validator('password', pre=True)
    def validate_password(cls, v):
        """空字串視為不更新密碼"""
        if v == '':
            return None
        return v

    @validator('role')
    def validate_role(cls, v):
        """驗證角色"""
        if v:
            allowed_roles = ['user', 'admin', 'manager', 'viewer']
            if v not in allowed_roles:
                raise ValueError(f'Role must be one of: {", ".join(allowed_roles)}')
        return v


class ProfileUpdateSchema(BaseModel):
    """更新個人資料請求（用戶自己更新）"""
    display_name: Optional[str] = Field(None, min_length=1, max_length=100, description="顯示名稱")
    company: Optional[str] = Field(None, max_length=200, description="公司名稱")
    phone: Optional[str] = Field(None, max_length=20, description="電話號碼")
    job_title: Optional[str] = Field(None, max_length=100, description="職位")

    # 用戶不能自己修改 role 和 is_active


class UserResponseSchema(BaseModel):
    """用戶響應"""
    id: str = Field(..., description="用戶 ID")
    email: str = Field(..., description="Email")
    display_name: str = Field(..., description="顯示名稱")
    company: Optional[str] = Field(None, description="公司名稱")
    phone: Optional[str] = Field(None, description="電話號碼")
    job_title: Optional[str] = Field(None, description="職位")
    role: str = Field(..., description="角色")
    is_active: bool = Field(..., description="是否啟用")
    filling_config: Optional[Dict[str, Any]] = Field(None, description="填報配置")
    created_at: Optional[datetime] = Field(None, description="創建時間")
    updated_at: Optional[datetime] = Field(None, description="更新時間")

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "uuid-123",
                "email": "user@example.com",
                "display_name": "張三",
                "company": "綠能科技股份有限公司",
                "phone": "+886-2-1234-5678",
                "job_title": "環保專員",
                "role": "user",
                "is_active": True,
                "filling_config": {
                    "energy_categories": ["diesel", "gasoline"],
                    "target_year": 2024,
                    "diesel_generator_mode": "refuel"
                },
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-15T10:30:00"
            }
        }


class BulkUserUpdateSchema(BaseModel):
    """批量更新用戶請求"""
    user_ids: List[str] = Field(..., min_items=1, max_items=100, description="用戶 ID 列表")
    is_active: bool = Field(..., description="是否啟用")

    class Config:
        schema_extra = {
            "example": {
                "user_ids": ["uuid-1", "uuid-2", "uuid-3"],
                "is_active": False
            }
        }


class PasswordChangeSchema(BaseModel):
    """修改密碼請求"""
    current_password: str = Field(..., description="當前密碼")
    new_password: constr(min_length=8) = Field(..., description="新密碼（至少 8 個字元）")
    confirm_password: str = Field(..., description="確認新密碼")

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """驗證兩次密碼輸入一致"""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('new_password')
    def password_strength(cls, v):
        """驗證密碼強度"""
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v
