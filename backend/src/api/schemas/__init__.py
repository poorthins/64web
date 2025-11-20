"""
API 請求/響應驗證模型
"""
from .user import (
    UserCreateSchema,
    UserUpdateSchema,
    UserResponseSchema,
    ProfileUpdateSchema
)
from .entry import (
    EnergyEntryCreateSchema,
    EnergyEntryUpdateSchema,
    EnergyEntryResponseSchema,
    MonthlyDataSchema
)
from .review import (
    ReviewCreateSchema,
    ReviewUpdateSchema,
    ReviewResponseSchema
)
from .common import (
    PaginationParams,
    DateRangeParams,
    SuccessResponse,
    ErrorResponse
)

__all__ = [
    # User schemas
    'UserCreateSchema',
    'UserUpdateSchema',
    'UserResponseSchema',
    'ProfileUpdateSchema',

    # Entry schemas
    'EnergyEntryCreateSchema',
    'EnergyEntryUpdateSchema',
    'EnergyEntryResponseSchema',
    'MonthlyDataSchema',

    # Review schemas
    'ReviewCreateSchema',
    'ReviewUpdateSchema',
    'ReviewResponseSchema',

    # Common schemas
    'PaginationParams',
    'DateRangeParams',
    'SuccessResponse',
    'ErrorResponse',
]
