"""
基礎存儲庫介面
"""
from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Optional, Dict, Any
from datetime import datetime

# 定義泛型類型
T = TypeVar('T')
ID = TypeVar('ID')


class BaseRepository(ABC, Generic[T, ID]):
    """基礎存儲庫抽象類別"""
    
    @abstractmethod
    async def create(self, entity: T) -> T:
        """創建實體"""
        pass
    
    @abstractmethod
    async def get_by_id(self, id: ID) -> Optional[T]:
        """根據 ID 獲取實體"""
        pass
    
    @abstractmethod
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = None,
        sort_desc: bool = False
    ) -> List[T]:
        """獲取所有實體（支援分頁和過濾）"""
        pass
    
    @abstractmethod
    async def update(self, id: ID, data: Dict[str, Any]) -> Optional[T]:
        """更新實體"""
        pass
    
    @abstractmethod
    async def delete(self, id: ID) -> bool:
        """刪除實體"""
        pass
    
    @abstractmethod
    async def exists(self, id: ID) -> bool:
        """檢查實體是否存在"""
        pass
    
    @abstractmethod
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """計算實體數量"""
        pass


class CRUDRepository(BaseRepository[T, ID]):
    """CRUD 操作的基礎實現"""
    
    async def batch_create(self, entities: List[T]) -> List[T]:
        """批量創建實體"""
        results = []
        for entity in entities:
            result = await self.create(entity)
            results.append(result)
        return results
    
    async def batch_update(self, updates: List[Dict[str, Any]]) -> List[Optional[T]]:
        """批量更新實體
        
        Args:
            updates: 包含 'id' 和其他更新欄位的字典列表
        """
        results = []
        for update in updates:
            id = update.pop('id')
            result = await self.update(id, update)
            results.append(result)
        return results
    
    async def batch_delete(self, ids: List[ID]) -> List[bool]:
        """批量刪除實體"""
        results = []
        for id in ids:
            result = await self.delete(id)
            results.append(result)
        return results
    
    async def find_one(self, filters: Dict[str, Any]) -> Optional[T]:
        """根據過濾條件查找單個實體"""
        results = await self.get_all(limit=1, filters=filters)
        return results[0] if results else None
    
    async def find_many(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_desc: bool = False
    ) -> List[T]:
        """根據過濾條件查找多個實體"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters=filters,
            sort_by=sort_by,
            sort_desc=sort_desc
        )


class SoftDeleteRepository(CRUDRepository[T, ID]):
    """支援軟刪除的存儲庫"""
    
    @abstractmethod
    async def soft_delete(self, id: ID) -> bool:
        """軟刪除實體"""
        pass
    
    @abstractmethod
    async def restore(self, id: ID) -> Optional[T]:
        """恢復軟刪除的實體"""
        pass
    
    @abstractmethod
    async def get_deleted(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[T]:
        """獲取已刪除的實體"""
        pass
    
    @abstractmethod
    async def permanently_delete(self, id: ID) -> bool:
        """永久刪除實體"""
        pass
    
    async def delete(self, id: ID) -> bool:
        """覆寫 delete 方法，預設使用軟刪除"""
        return await self.soft_delete(id)


class TimestampedRepository(CRUDRepository[T, ID]):
    """支援時間戳記的存儲庫"""
    
    async def get_by_date_range(
        self,
        start_date: datetime,
        end_date: datetime,
        date_field: str = "created_at",
        skip: int = 0,
        limit: int = 100
    ) -> List[T]:
        """根據日期範圍獲取實體"""
        filters = {
            f"{date_field}__gte": start_date,
            f"{date_field}__lte": end_date
        }
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters=filters,
            sort_by=date_field,
            sort_desc=True
        )
    
    async def get_recent(
        self,
        days: int = 7,
        date_field: str = "created_at",
        limit: int = 100
    ) -> List[T]:
        """獲取最近的實體"""
        from datetime import timedelta
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        return await self.get_by_date_range(
            start_date=start_date,
            end_date=end_date,
            date_field=date_field,
            limit=limit
        )


class SearchableRepository(CRUDRepository[T, ID]):
    """支援搜尋的存儲庫"""
    
    @abstractmethod
    async def search(
        self,
        query: str,
        fields: List[str],
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[T]:
        """在指定欄位中搜尋"""
        pass
    
    @abstractmethod
    async def full_text_search(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[T]:
        """全文搜尋"""
        pass


class CacheableRepository(CRUDRepository[T, ID]):
    """支援緩存的存儲庫"""
    
    def __init__(self, cache_ttl: int = 300):
        """
        Args:
            cache_ttl: 緩存過期時間（秒）
        """
        self.cache_ttl = cache_ttl
    
    @abstractmethod
    async def invalidate_cache(self, id: Optional[ID] = None):
        """使緩存失效
        
        Args:
            id: 如果提供，只使該 ID 的緩存失效；否則使所有緩存失效
        """
        pass
    
    @abstractmethod
    async def warm_cache(self, ids: Optional[List[ID]] = None):
        """預熱緩存
        
        Args:
            ids: 要預熱的實體 ID 列表；如果為 None，預熱常用資料
        """
        pass
