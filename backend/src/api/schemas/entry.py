"""
能源條目相關驗證模型
"""
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field, validator
from datetime import date, datetime
from enum import Enum


class EntryStatus(str, Enum):
    """條目狀態"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class MonthlyDataSchema(BaseModel):
    """月份數據"""
    month: int = Field(..., ge=1, le=12, description="月份 (1-12)")
    value: float = Field(..., ge=0, description="使用量")
    unit: Optional[str] = Field(None, description="單位")
    note: Optional[str] = Field(None, max_length=500, description="備註")

    class Config:
        schema_extra = {
            "example": {
                "month": 1,
                "value": 1500.5,
                "unit": "L",
                "note": "一月柴油使用量"
            }
        }


class EnergyEntryCreateSchema(BaseModel):
    """創建能源條目請求"""
    page_key: str = Field(..., description="能源類型頁面鍵值 (例如: diesel, gasoline)")
    category: str = Field(..., description="能源類別")
    period_year: int = Field(..., ge=2020, le=2100, description="填報年份")
    monthly_data: List[MonthlyDataSchema] = Field(..., min_items=1, max_items=12, description="月份數據")
    total_amount: float = Field(..., ge=0, description="總使用量")
    status: EntryStatus = Field(default=EntryStatus.DRAFT, description="條目狀態")
    note: Optional[str] = Field(None, max_length=1000, description="備註")

    @validator('monthly_data')
    def validate_monthly_data(cls, v):
        """驗證月份數據"""
        months = [data.month for data in v]

        # 檢查月份是否重複
        if len(months) != len(set(months)):
            raise ValueError('Duplicate month entries found')

        # 檢查月份是否連續（如果需要）
        # 這個可以根據業務需求調整

        return v

    @validator('total_amount')
    def validate_total_amount(cls, v, values):
        """驗證總量是否與月份數據總和一致"""
        if 'monthly_data' in values:
            calculated_total = sum(data.value for data in values['monthly_data'])
            # 允許浮點數誤差
            if abs(calculated_total - v) > 0.01:
                raise ValueError(f'total_amount ({v}) does not match sum of monthly data ({calculated_total})')
        return v

    class Config:
        schema_extra = {
            "example": {
                "page_key": "diesel",
                "category": "柴油",
                "period_year": 2024,
                "monthly_data": [
                    {"month": 1, "value": 100.5, "unit": "L"},
                    {"month": 2, "value": 150.0, "unit": "L"}
                ],
                "total_amount": 250.5,
                "status": "draft",
                "note": "2024年度柴油使用記錄"
            }
        }


class EnergyEntryUpdateSchema(BaseModel):
    """更新能源條目請求"""
    monthly_data: Optional[List[MonthlyDataSchema]] = Field(None, description="月份數據")
    total_amount: Optional[float] = Field(None, ge=0, description="總使用量")
    status: Optional[EntryStatus] = Field(None, description="條目狀態")
    note: Optional[str] = Field(None, max_length=1000, description="備註")

    @validator('monthly_data')
    def validate_monthly_data(cls, v):
        """驗證月份數據"""
        if v:
            months = [data.month for data in v]
            if len(months) != len(set(months)):
                raise ValueError('Duplicate month entries found')
        return v


class EnergyEntryResponseSchema(BaseModel):
    """能源條目響應"""
    id: str = Field(..., description="條目 ID")
    owner_id: str = Field(..., description="擁有者 ID")
    page_key: str = Field(..., description="頁面鍵值")
    category: str = Field(..., description="能源類別")
    period_year: int = Field(..., description="填報年份")
    period_start: Optional[date] = Field(None, description="期間開始日期")
    period_end: Optional[date] = Field(None, description="期間結束日期")
    monthly_data: List[Dict[str, Any]] = Field(..., description="月份數據")
    total_amount: float = Field(..., description="總使用量")
    status: str = Field(..., description="狀態")
    note: Optional[str] = Field(None, description="備註")
    created_at: datetime = Field(..., description="創建時間")
    updated_at: datetime = Field(..., description="更新時間")

    class Config:
        orm_mode = True


class EntryStatusUpdateSchema(BaseModel):
    """更新條目狀態請求"""
    status: EntryStatus = Field(..., description="新狀態")
    note: Optional[str] = Field(None, max_length=500, description="狀態變更備註")

    @validator('status')
    def validate_status_transition(cls, v):
        """驗證狀態轉換"""
        # 可以添加狀態機驗證邏輯
        # 例如: draft -> submitted -> approved/rejected
        return v


class EntryCarbonCalculationResponse(BaseModel):
    """碳排計算響應"""
    entry_id: str = Field(..., description="條目 ID")
    total_carbon: float = Field(..., description="總碳排量 (kgCO2e)")
    monthly_carbon: List[Dict[str, float]] = Field(..., description="每月碳排量")
    calculation_method: str = Field(..., description="計算方法")
    emission_factor: float = Field(..., description="排放係數")
    created_at: datetime = Field(..., description="計算時間")

    class Config:
        schema_extra = {
            "example": {
                "entry_id": "uuid-123",
                "total_carbon": 675.25,
                "monthly_carbon": [
                    {"month": 1, "carbon": 270.1},
                    {"month": 2, "carbon": 405.15}
                ],
                "calculation_method": "API_Method",
                "emission_factor": 2.7,
                "created_at": "2024-01-17T10:30:00"
            }
        }
