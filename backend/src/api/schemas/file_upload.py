"""
檔案上傳相關驗證模型
"""
from typing import Optional
from pydantic import BaseModel, Field, validator


class FileUploadMetadata(BaseModel):
    """檔案上傳元數據"""
    page_key: str = Field(..., description="能源類型鍵值")
    period_year: int = Field(..., ge=2020, le=2100, description="期間年份")
    file_type: str = Field(..., description="檔案類型：msds, usage_evidence, other, heat_value_evidence, annual_evidence, nameplate_evidence")
    month: Optional[int] = Field(None, ge=1, le=12, description="月份 (1-12)，usage_evidence 必填")
    entry_id: Optional[str] = Field(None, description="關聯的 energy_entry ID")
    record_id: Optional[str] = Field(None, description="記錄 ID（多筆記錄頁面）")
    standard: str = Field(default='64', description="ISO 標準代碼：64 或 67")

    @validator('file_type')
    def validate_file_type(cls, v):
        """驗證檔案類型"""
        valid_types = ['msds', 'usage_evidence', 'other', 'heat_value_evidence', 'annual_evidence', 'nameplate_evidence']
        if v not in valid_types:
            raise ValueError(f'Invalid file_type: {v}. Must be one of {valid_types}')
        return v

    @validator('month')
    def validate_month_with_type(cls, v, values):
        """驗證 usage_evidence 必須提供月份"""
        file_type = values.get('file_type')
        if file_type == 'usage_evidence' and v is None:
            raise ValueError('month is required for usage_evidence file type')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "page_key": "diesel",
                "period_year": 2024,
                "file_type": "usage_evidence",
                "month": 1,
                "entry_id": "abc-123",
                "standard": "64"
            }
        }


class FileUploadResponse(BaseModel):
    """檔案上傳響應"""
    success: bool = Field(..., description="是否成功")
    file_id: str = Field(..., description="檔案 ID")
    file_path: str = Field(..., description="儲存路徑")
    file_name: str = Field(..., description="檔案名稱")
    file_size: int = Field(..., description="檔案大小（bytes）")
    message: str = Field(default="File uploaded successfully", description="訊息")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "file_id": "file-uuid-123",
                "file_path": "user-id/64/diesel/1/timestamp_file.pdf",
                "file_name": "evidence.pdf",
                "file_size": 1048576,
                "message": "File uploaded successfully"
            }
        }


class FileDeleteRequest(BaseModel):
    """檔案刪除請求"""
    file_id: str = Field(..., description="要刪除的檔案 ID")

    class Config:
        json_schema_extra = {
            "example": {
                "file_id": "file-uuid-123"
            }
        }
