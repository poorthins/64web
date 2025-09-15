# 狀態指示器資料庫整合備忘錄

## 功能概述
在 WD-40 填報頁面底部操作欄新增狀態指示器，顯示當前能源記錄的批閱狀態，並預留資料庫整合接口。

## 前端實現概要

### 組件架構
- **主組件**: `StatusIndicator.tsx`
- **狀態類型**: `EntryStatus = 'submitted' | 'approved' | 'rejected'`
- **整合位置**: `WD40Page.tsx` 底部操作欄左側
- **當前實現**: 使用 mock 資料

### 視覺設計
```typescript
const statusConfig = {
  submitted: { color: '#3b82f6', text: '已提交' },
  approved: { color: '#10b981', text: '已通過' },
  rejected: { color: '#ef4444', text: '已退回' }
}
```

### 響應式策略
- 桌面版：圓點 + 文字
- 手機版：僅圓點 + tooltip

## 資料庫整合要點

### 對應資料表
**主表**: `energy_entries`
- 狀態欄位：`status` (TEXT)
- 關聯欄位：`owner_id`, `reviewer_id`, `reviewed_at`
- 鎖定狀態：`is_locked` (BOOLEAN) - 批准後自動鎖定
- 批閱備註：`review_notes` (TEXT)

**歷史追蹤**: `review_history`
- 記錄所有狀態變更歷史
- 審計追蹤功能

### 權限控制 (RLS)
- **用戶權限**：只能查看自己的 `energy_entries` 記錄狀態
- **管理員權限**：可查看所有記錄，可修改狀態
- **狀態變更**：只能通過 `admin_review_entry()` 函數

### 查詢邏輯
```sql
-- 用戶查詢自己記錄的狀態
SELECT status, is_locked, review_notes, reviewed_at 
FROM energy_entries 
WHERE owner_id = auth.uid() 
  AND page_key = 'wd40' 
  AND period_year = 2025;

-- 管理員查詢特定記錄（需通過函數）
SELECT * FROM admin_get_entry_details(entry_id);
```

## API 接口設計

### 需要實現的端點

#### 1. 獲取記錄狀態
```typescript
// GET /api/entries/{page_key}/status
interface EntryStatusResponse {
  entry_id: string;
  status: EntryStatus;
  is_locked: boolean;
  reviewer_id?: string;
  reviewer_name?: string;
  review_notes?: string;
  reviewed_at?: string;
  updated_at: string;
}
```

#### 2. 管理員批閱 (預留)
```typescript
// PUT /api/admin/entries/{entry_id}/review
interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

### 前端 API 整合

#### 目前實現 (Mock)
```typescript
// WD40Page.tsx - 當前 mock 實現
const [currentStatus] = useState<EntryStatus>('submitted');
```

#### 未來實現 (真實 API)
```typescript
// 替換為真實 API 調用
const { data: statusData, isLoading } = useQuery({
  queryKey: ['entry-status', 'wd40', year],
  queryFn: () => getEntryStatus('wd40', year)
});

const currentStatus = statusData?.status || 'submitted';
```

#### 建議的 Hook 設計
```typescript
// hooks/useEntryStatus.ts
export const useEntryStatus = (pageKey: string, year: number) => {
  return useQuery({
    queryKey: ['entry-status', pageKey, year],
    queryFn: () => api.getEntryStatus(pageKey, year),
    refetchInterval: 30000, // 30秒輪詢更新
    enabled: !!pageKey && !!year
  });
};
```

## 實時更新機制

### 狀態同步策略
1. **輪詢更新**：每30秒檢查狀態變更
2. **手動刷新**：用戶操作後立即查詢
3. **WebSocket (未來)**：即時推送狀態變更

### 快取策略
```typescript
// React Query 快取配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30秒內認為資料新鮮
      cacheTime: 300000, // 5分鐘快取時間
    },
  },
});
```

## 錯誤處理

### 網路錯誤
- 顯示最後已知狀態
- 提供重試機制
- 友善的錯誤訊息

### 權限錯誤
- 403：顯示「無權限查看」
- 401：導向登入頁面

### 資料不存在
- 404：顯示「記錄不存在」

## 測試策略

### 單元測試
- StatusIndicator 組件渲染
- 不同狀態的視覺呈現
- 響應式行為

### 整合測試
- API 調用正確性
- 錯誤處理流程
- 狀態同步機制

### E2E 測試
- 完整的狀態變更流程
- 用戶 vs 管理員權限差異

## 整合檢查清單

### Phase 1: 基礎整合
- [ ] 創建 `getEntryStatus` API 函數
- [ ] 修改 WD40Page 使用真實 API
- [ ] 實現基本錯誤處理
- [ ] 測試用戶權限控制

### Phase 2: 進階功能
- [ ] 實現狀態輪詢更新
- [ ] 添加載入狀態指示器
- [ ] 整合管理員批閱功能
- [ ] 完善錯誤處理和重試機制

### Phase 3: 最佳化
- [ ] 實現 WebSocket 即時更新
- [ ] 最佳化快取策略
- [ ] 添加操作確認對話框
- [ ] 完整的測試覆蓋

## 注意事項

### 安全考量
- 所有狀態查詢都要驗證用戶權限
- 前端狀態僅供顯示，不可直接修改
- 狀態變更必須通過後端 API 和權限檢查

### 效能考量
- 避免過度頻繁的狀態查詢
- 使用適當的快取策略
- 考慮批量查詢多個記錄狀態

### 用戶體驗
- 狀態變更要有視覺反饋
- 載入狀態要有明確指示
- 錯誤訊息要易於理解

## 相關文檔
- [資料庫架構文檔](./DATABASE_SCHEMA.md)
- [前端開發指引](./FRONTEND_DEVELOPMENT_GUIDE.md)
- [API 文檔](./API_DOCUMENTATION.md)

---
**建立日期**: 2025-09-09  
**最後更新**: 2025-09-12  
**狀態**: 已實作（移除 draft 狀態）  
**負責開發**: 前端團隊