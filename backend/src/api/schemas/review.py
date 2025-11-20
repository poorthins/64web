"""
審核相關驗證模型
"""
from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class ReviewStatus(str, Enum):
    """審核狀態"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_FIX = "needs_fix"


class ReviewCreateSchema(BaseModel):
    """創建審核請求"""
    entry_id: str = Field(..., description="條目 ID")
    status: ReviewStatus = Field(..., description="審核狀態")
    note: Optional[str] = Field(None, max_length=1000, description="審核意見")
    requested_changes: Optional[list[str]] = Field(None, description="需要修改的項目")

    @validator('note')
    def validate_note_for_rejection(cls, v, values):
        """當拒絕時，必須提供審核意見"""
        if 'status' in values and values['status'] in [ReviewStatus.REJECTED, ReviewStatus.NEEDS_FIX]:
            if not v or len(v.strip()) == 0:
                raise ValueError('Note is required when rejecting or requesting changes')
        return v

    class Config:
        schema_extra = {
            "example": {
                "entry_id": "uuid-123",
                "status": "needs_fix",
                "note": "請補充 3 月份的佐證文件，並確認 6 月份數據是否正確。",
                "requested_changes": ["補充3月佐證文件", "確認6月數據"]
            }
        }


class ReviewUpdateSchema(BaseModel):
    """更新審核請求"""
    status: Optional[ReviewStatus] = Field(None, description="審核狀態")
    note: Optional[str] = Field(None, max_length=1000, description="審核意見")
    requested_changes: Optional[list[str]] = Field(None, description="需要修改的項目")


class ReviewResponseSchema(BaseModel):
    """審核響應"""
    id: str = Field(..., description="審核 ID")
    entry_id: str = Field(..., description="條目 ID")
    reviewer_id: str = Field(..., description="審核人 ID")
    reviewer_name: Optional[str] = Field(None, description="審核人名稱")
    status: str = Field(..., description="審核狀態")
    note: Optional[str] = Field(None, description="審核意見")
    requested_changes: Optional[list[str]] = Field(None, description="需要修改的項目")
    reviewed_at: datetime = Field(..., description="審核時間")
    created_at: datetime = Field(..., description="創建時間")

    class Config:
        orm_mode = True
        schema_extra = {
            "example": {
                "id": "review-uuid-123",
                "entry_id": "entry-uuid-456",
                "reviewer_id": "admin-uuid-789",
                "reviewer_name": "管理員A",
                "status": "approved",
                "note": "數據完整，佐證文件齊全，核准通過。",
                "requested_changes": None,
                "reviewed_at": "2024-01-17T10:30:00",
                "created_at": "2024-01-17T10:30:00"
            }
        }


class BatchReviewSchema(BaseModel):
    """批量審核請求"""
    entry_ids: list[str] = Field(..., min_items=1, max_items=50, description="條目 ID 列表")
    status: ReviewStatus = Field(..., description="審核狀態")
    note: Optional[str] = Field(None, max_length=1000, description="審核意見")

    @validator('note')
    def validate_note_for_rejection(cls, v, values):
        """當拒絕時，必須提供審核意見"""
        if 'status' in values and values['status'] in [ReviewStatus.REJECTED, ReviewStatus.NEEDS_FIX]:
            if not v or len(v.strip()) == 0:
                raise ValueError('Note is required when rejecting or requesting changes')
        return v

    class Config:
        schema_extra = {
            "example": {
                "entry_ids": ["uuid-1", "uuid-2", "uuid-3"],
                "status": "approved",
                "note": "本批次數據全部核准通過"
            }
        }
