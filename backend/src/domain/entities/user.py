"""
用戶實體模型
"""
from typing import Optional, List
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum


class UserRole(str, Enum):
    """用戶角色枚舉"""
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


class UserStatus(str, Enum):
    """用戶狀態枚舉"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    DELETED = "deleted"


@dataclass
class User:
    """用戶實體"""
    id: str
    email: str
    display_name: str
    role: UserRole = UserRole.USER
    status: UserStatus = UserStatus.ACTIVE
    company: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = None
    email_verified: bool = False
    metadata: dict = field(default_factory=dict)
    
    def __post_init__(self):
        """初始化後處理"""
        if isinstance(self.role, str):
            self.role = UserRole(self.role)
        if isinstance(self.status, str):
            self.status = UserStatus(self.status)
    
    @property
    def is_active(self) -> bool:
        """檢查用戶是否活躍"""
        return self.status == UserStatus.ACTIVE
    
    @property
    def is_admin(self) -> bool:
        """檢查是否為管理員"""
        return self.role == UserRole.ADMIN
    
    @property
    def full_name(self) -> str:
        """獲取完整名稱"""
        return self.display_name
    
    def can_access_admin(self) -> bool:
        """檢查是否可以訪問管理功能"""
        return self.is_admin and self.is_active
    
    def update_last_login(self):
        """更新最後登入時間"""
        self.last_login_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def activate(self):
        """啟用用戶"""
        self.status = UserStatus.ACTIVE
        self.updated_at = datetime.utcnow()
    
    def deactivate(self):
        """停用用戶"""
        self.status = UserStatus.INACTIVE
        self.updated_at = datetime.utcnow()
    
    def suspend(self):
        """暫停用戶"""
        self.status = UserStatus.SUSPENDED
        self.updated_at = datetime.utcnow()
    
    def soft_delete(self):
        """軟刪除用戶"""
        self.status = UserStatus.DELETED
        self.updated_at = datetime.utcnow()
    
    def to_dict(self, include_sensitive: bool = False) -> dict:
        """轉換為字典"""
        data = {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name,
            "role": self.role.value,
            "status": self.status.value,
            "company": self.company,
            "department": self.department,
            "avatar_url": self.avatar_url,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "email_verified": self.email_verified,
        }
        
        if include_sensitive:
            data.update({
                "phone": self.phone,
                "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
                "metadata": self.metadata,
            })
        
        return data


@dataclass
class UserProfile:
    """用戶檔案（用於更新）"""
    display_name: Optional[str] = None
    company: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    metadata: Optional[dict] = None
    
    def to_dict(self) -> dict:
        """轉換為字典（排除 None 值）"""
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class UserCredentials:
    """用戶認證憑據"""
    email: str
    password: str
    
    def __post_init__(self):
        """驗證憑據"""
        if not self.email or not self.password:
            raise ValueError("Email and password are required")
        
        # 基本的 email 格式驗證
        if "@" not in self.email:
            raise ValueError("Invalid email format")


@dataclass
class UserRegistration:
    """用戶註冊資料"""
    email: str
    password: str
    display_name: str
    company: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    
    def __post_init__(self):
        """驗證註冊資料"""
        if not all([self.email, self.password, self.display_name]):
            raise ValueError("Email, password, and display name are required")
        
        # 密碼強度驗證
        if len(self.password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        # Email 格式驗證
        if "@" not in self.email:
            raise ValueError("Invalid email format")
