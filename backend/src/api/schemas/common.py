"""
共用驗證模型
"""
from typing import Optional, Generic, TypeVar, Any, Dict
from pydantic import BaseModel, Field, validator
from datetime import date, datetime


DataT = TypeVar('DataT')


class PaginationParams(BaseModel):
    """分頁參數"""
    page: int = Field(default=1, ge=1, description="頁碼（從 1 開始）")
    page_size: int = Field(default=20, ge=1, le=100, description="每頁數量")

    @property
    def offset(self) -> int:
        """計算 offset"""
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        """計算 limit"""
        return self.page_size


class DateRangeParams(BaseModel):
    """日期範圍參數"""
    from_date: Optional[date] = Field(None, description="起始日期 (YYYY-MM-DD)")
    to_date: Optional[date] = Field(None, description="結束日期 (YYYY-MM-DD)")

    @validator('to_date')
    def validate_date_range(cls, v, values):
        """驗證結束日期不能早於起始日期"""
        if v and 'from_date' in values and values['from_date']:
            if v < values['from_date']:
                raise ValueError('to_date must be after from_date')
        return v


class SuccessResponse(BaseModel, Generic[DataT]):
    """成功響應格式"""
    success: bool = Field(default=True, description="是否成功")
    data: DataT = Field(..., description="響應數據")
    message: Optional[str] = Field(None, description="提示訊息")
    timestamp: datetime = Field(default_factory=datetime.now, description="響應時間戳")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ErrorResponse(BaseModel):
    """錯誤響應格式"""
    success: bool = Field(default=False, description="是否成功")
    error: Dict[str, Any] = Field(..., description="錯誤資訊")
    timestamp: datetime = Field(default_factory=datetime.now, description="響應時間戳")

    class Config:
        schema_extra = {
            "example": {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid input data",
                    "details": {
                        "field": "email",
                        "issue": "Invalid email format"
                    }
                },
                "timestamp": "2025-01-17T10:30:00"
            }
        }


class PaginatedResponse(BaseModel, Generic[DataT]):
    """分頁響應格式"""
    success: bool = Field(default=True, description="是否成功")
    data: list[DataT] = Field(..., description="數據列表")
    pagination: Dict[str, int] = Field(..., description="分頁資訊")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": [],
                "pagination": {
                    "page": 1,
                    "page_size": 20,
                    "total": 100,
                    "total_pages": 5
                }
            }
        }

    @classmethod
    def create(
        cls,
        data: list[DataT],
        page: int,
        page_size: int,
        total: int
    ):
        """創建分頁響應"""
        total_pages = (total + page_size - 1) // page_size
        return cls(
            data=data,
            pagination={
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages
            }
        )


class IDSchema(BaseModel):
    """ID 驗證模型"""
    id: str = Field(..., min_length=1, description="資源 ID")


class BulkIDSchema(BaseModel):
    """批量 ID 驗證模型"""
    ids: list[str] = Field(..., min_items=1, max_items=100, description="資源 ID 列表")
