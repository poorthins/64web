"""
碳排放計算相關驗證模型
"""
from typing import Dict
from pydantic import BaseModel, Field, validator


class CarbonCalculateRequest(BaseModel):
    """碳排放計算請求"""
    page_key: str = Field(..., description="能源類型鍵值 (例如: diesel, gasoline)")
    monthly_data: Dict[str, float] = Field(..., description="月份數據 {month: value}")
    year: int = Field(..., ge=2020, le=2100, description="計算年份")

    @validator('monthly_data')
    def validate_monthly_data(cls, v):
        """驗證月份數據"""
        for month_str, value in v.items():
            # 驗證月份
            try:
                month = int(month_str)
                if month < 1 or month > 12:
                    raise ValueError(f'Invalid month: {month_str}. Must be 1-12')
            except ValueError:
                raise ValueError(f'Month must be numeric string: {month_str}')

            # 驗證數值
            if value < 0:
                raise ValueError(f'Negative value not allowed for month {month_str}: {value}')

        return v

    class Config:
        json_schema_extra = {
            "example": {
                "page_key": "diesel",
                "monthly_data": {
                    "1": 100.5,
                    "2": 150.0
                },
                "year": 2024
            }
        }


class CarbonCalculateResponse(BaseModel):
    """碳排放計算響應"""
    total_emission: float = Field(..., description="總碳排量 (kgCO2e)")
    monthly_emission: Dict[str, float] = Field(..., description="每月碳排量")
    emission_factor: float = Field(..., description="使用的排放係數")
    formula: str = Field(..., description="計算公式說明")

    class Config:
        json_schema_extra = {
            "example": {
                "total_emission": 783.55,
                "monthly_emission": {
                    "1": 260.68,
                    "2": 522.87
                },
                "emission_factor": 2.6068,
                "formula": "diesel × 2.6068"
            }
        }
