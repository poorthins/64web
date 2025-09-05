"""
碳排放記錄實體模型
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from dataclasses import dataclass, field
from enum import Enum
from decimal import Decimal


class EntryCategory(str, Enum):
    """碳排放類別枚舉"""
    ELECTRICITY = "electricity"
    WATER = "water"
    GAS = "gas"
    TRANSPORTATION = "transportation"
    WASTE = "waste"
    OTHER = "other"


class EntryStatus(str, Enum):
    """記錄狀態枚舉"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVISION = "needs_revision"


class EvidenceType(str, Enum):
    """證據類型枚舉"""
    INVOICE = "invoice"
    RECEIPT = "receipt"
    METER_READING = "meter_reading"
    REPORT = "report"
    PHOTO = "photo"
    OTHER = "other"


@dataclass
class CarbonEntry:
    """碳排放記錄實體"""
    id: str
    owner_id: str
    category: EntryCategory
    period_start: date
    period_end: date
    amount: Decimal
    unit: str
    carbon_emission: Decimal  # 計算後的碳排放量（kg CO2e）
    status: EntryStatus = EntryStatus.DRAFT
    description: Optional[str] = None
    location: Optional[str] = None
    evidence_files: List[str] = field(default_factory=list)
    calculation_method: Optional[str] = None
    emission_factor: Optional[Decimal] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """初始化後處理"""
        if isinstance(self.category, str):
            self.category = EntryCategory(self.category)
        if isinstance(self.status, str):
            self.status = EntryStatus(self.status)
        if isinstance(self.amount, (int, float)):
            self.amount = Decimal(str(self.amount))
        if isinstance(self.carbon_emission, (int, float)):
            self.carbon_emission = Decimal(str(self.carbon_emission))
        if self.emission_factor and isinstance(self.emission_factor, (int, float)):
            self.emission_factor = Decimal(str(self.emission_factor))
    
    @property
    def is_draft(self) -> bool:
        """檢查是否為草稿"""
        return self.status == EntryStatus.DRAFT
    
    @property
    def is_approved(self) -> bool:
        """檢查是否已批准"""
        return self.status == EntryStatus.APPROVED
    
    @property
    def is_editable(self) -> bool:
        """檢查是否可編輯"""
        return self.status in [EntryStatus.DRAFT, EntryStatus.NEEDS_REVISION]
    
    @property
    def period_days(self) -> int:
        """計算期間天數"""
        return (self.period_end - self.period_start).days + 1
    
    def submit(self):
        """提交記錄"""
        if not self.is_editable:
            raise ValueError("Entry is not editable")
        self.status = EntryStatus.SUBMITTED
        self.submitted_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def approve(self, approver_id: str):
        """批准記錄"""
        if self.status != EntryStatus.UNDER_REVIEW:
            raise ValueError("Entry must be under review to approve")
        self.status = EntryStatus.APPROVED
        self.approved_at = datetime.utcnow()
        self.approved_by = approver_id
        self.updated_at = datetime.utcnow()
    
    def reject(self, reason: Optional[str] = None):
        """拒絕記錄"""
        if self.status not in [EntryStatus.SUBMITTED, EntryStatus.UNDER_REVIEW]:
            raise ValueError("Entry must be submitted or under review to reject")
        self.status = EntryStatus.REJECTED
        if reason:
            self.metadata["rejection_reason"] = reason
        self.updated_at = datetime.utcnow()
    
    def request_revision(self, notes: str):
        """要求修改"""
        if self.status not in [EntryStatus.SUBMITTED, EntryStatus.UNDER_REVIEW]:
            raise ValueError("Entry must be submitted or under review")
        self.status = EntryStatus.NEEDS_REVISION
        self.metadata["revision_notes"] = notes
        self.updated_at = datetime.utcnow()
    
    def add_evidence(self, file_url: str):
        """添加證據文件"""
        if file_url not in self.evidence_files:
            self.evidence_files.append(file_url)
            self.updated_at = datetime.utcnow()
    
    def remove_evidence(self, file_url: str):
        """移除證據文件"""
        if file_url in self.evidence_files:
            self.evidence_files.remove(file_url)
            self.updated_at = datetime.utcnow()
    
    def calculate_emission(self, emission_factor: Decimal) -> Decimal:
        """計算碳排放量"""
        self.emission_factor = emission_factor
        self.carbon_emission = self.amount * emission_factor
        self.updated_at = datetime.utcnow()
        return self.carbon_emission
    
    def to_dict(self) -> dict:
        """轉換為字典"""
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "category": self.category.value,
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "amount": str(self.amount),
            "unit": self.unit,
            "carbon_emission": str(self.carbon_emission),
            "status": self.status.value,
            "description": self.description,
            "location": self.location,
            "evidence_files": self.evidence_files,
            "calculation_method": self.calculation_method,
            "emission_factor": str(self.emission_factor) if self.emission_factor else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "approved_by": self.approved_by,
            "metadata": self.metadata,
        }


@dataclass
class CarbonEntryCreate:
    """創建碳排放記錄的資料"""
    category: EntryCategory
    period_start: date
    period_end: date
    amount: Decimal
    unit: str
    description: Optional[str] = None
    location: Optional[str] = None
    evidence_files: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """驗證資料"""
        if isinstance(self.category, str):
            self.category = EntryCategory(self.category)
        if isinstance(self.amount, (int, float)):
            self.amount = Decimal(str(self.amount))
        
        # 驗證日期範圍
        if self.period_end < self.period_start:
            raise ValueError("Period end must be after period start")
        
        # 驗證數量
        if self.amount <= 0:
            raise ValueError("Amount must be positive")


@dataclass
class CarbonEntryUpdate:
    """更新碳排放記錄的資料"""
    amount: Optional[Decimal] = None
    unit: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    evidence_files: Optional[List[str]] = None
    
    def __post_init__(self):
        """處理資料類型"""
        if self.amount is not None and isinstance(self.amount, (int, float)):
            self.amount = Decimal(str(self.amount))
    
    def to_dict(self) -> dict:
        """轉換為字典（排除 None 值）"""
        return {k: v for k, v in self.__dict__.items() if v is not None}


@dataclass
class CarbonSummary:
    """碳排放摘要"""
    user_id: str
    period_start: date
    period_end: date
    total_emission: Decimal
    by_category: Dict[EntryCategory, Decimal]
    entry_count: int
    approved_count: int
    pending_count: int
    
    @property
    def approval_rate(self) -> float:
        """計算批准率"""
        if self.entry_count == 0:
            return 0.0
        return self.approved_count / self.entry_count
    
    def to_dict(self) -> dict:
        """轉換為字典"""
        return {
            "user_id": self.user_id,
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "total_emission": str(self.total_emission),
            "by_category": {k.value: str(v) for k, v in self.by_category.items()},
            "entry_count": self.entry_count,
            "approved_count": self.approved_count,
            "pending_count": self.pending_count,
            "approval_rate": self.approval_rate,
        }
