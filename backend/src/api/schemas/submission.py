"""
能源條目提交相關驗證模型
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import date


class EntrySubmitRequest(BaseModel):
    """能源條目提交請求"""
    page_key: str = Field(..., description="能源類型鍵值")
    period_year: int = Field(..., ge=2020, le=2100, description="填報年份")
    unit: str = Field(..., description="單位")
    monthly: Optional[Dict[str, float]] = Field(None, description="月份數據 {month: value}（Type 5 不需要）")
    notes: Optional[str] = Field(None, max_length=1000, description="備註")
    payload: Optional[Dict[str, Any]] = Field(None, description="主要 payload 數據")
    extraPayload: Optional[Dict[str, Any]] = Field(None, description="額外 payload 數據")
    status: Optional[str] = Field("submitted", description="提交狀態")

    @validator('monthly')
    def validate_monthly(cls, v):
        """驗證月份數據"""
        if v is None:
            return v

        for month_str, value in v.items():
            # 驗證月份
            try:
                month = int(month_str)
                if month < 1 or month > 12:
                    raise ValueError(f'Invalid month: {month_str}. Must be 1-12')
            except ValueError as e:
                if 'invalid literal' in str(e):
                    raise ValueError(f'Month must be numeric string: {month_str}')
                raise

            # 驗證數值非負
            if value < 0:
                raise ValueError(f'Negative value not allowed for month {month_str}: {value}')

        return v

    @validator('status')
    def validate_status(cls, v):
        """驗證狀態"""
        allowed_statuses = ['saved', 'submitted', 'approved', 'rejected']
        if v and v not in allowed_statuses:
            raise ValueError(f'Status must be one of: {", ".join(allowed_statuses)}')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "page_key": "diesel",
                "period_year": 2024,
                "unit": "公升",
                "monthly": {
                    "1": 100.5,
                    "2": 150.0,
                    "3": 200.5
                },
                "notes": "2024年度柴油使用記錄",
                "status": "submitted"
            }
        }


class EntrySubmitResponse(BaseModel):
    """能源條目提交響應"""
    success: bool = Field(..., description="是否成功")
    entry_id: str = Field(..., description="條目 ID")
    message: Optional[str] = Field(None, description="訊息")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "entry_id": "uuid-123",
                "message": "提交成功"
            }
        }


class EntryUpdateRequest(BaseModel):
    """能源條目更新請求"""
    monthly: Optional[Dict[str, float]] = Field(None, description="月份數據")
    notes: Optional[str] = Field(None, max_length=1000, description="備註")
    payload: Optional[Dict[str, Any]] = Field(None, description="主要 payload")
    extraPayload: Optional[Dict[str, Any]] = Field(None, description="額外 payload")
    status: Optional[str] = Field(None, description="狀態")

    @validator('monthly')
    def validate_monthly(cls, v):
        """驗證月份數據"""
        if v:
            for month_str, value in v.items():
                try:
                    month = int(month_str)
                    if month < 1 or month > 12:
                        raise ValueError(f'Invalid month: {month_str}')
                except ValueError as e:
                    if 'invalid literal' in str(e):
                        raise ValueError(f'Month must be numeric: {month_str}')
                    raise

                if value < 0:
                    raise ValueError(f'Negative value not allowed')
        return v
