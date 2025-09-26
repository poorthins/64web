# 管理員頁面 POC 實施計畫 v2.0 - 詳細版

---
**版本**: 2.0  
**日期**: 2025-09-22  
**狀態**: 實施規劃  
**目的**: 提供詳細的 POC 開發步驟和 API 整合指引

---

## 🎯 POC 目標與範圍

### 核心目標
1. **驗證設計可行性**：確認 UI/UX 設計符合需求
2. **測試技術架構**：驗證前後端整合方案
3. **建立開發模板**：為正式開發提供參考

### POC 範圍
- ✅ 4 個核心頁面完整實作
- ✅ 假資料 + 真實 API 雙軌開發
- ✅ 完整的審核流程
- ✅ 基本的匯出功能展示
- ❌ 暫不包含：批量操作、圖表統計、複雜權限

---

## 🏗️ 技術架構詳細規格

### 檔案結構（完整版）
```
frontend/src/
├── pages/admin/
│   ├── poc/                          # POC 專用資料夾
│   │   ├── components/               # 共用元件
│   │   │   ├── common/              # 通用元件
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   ├── ErrorMessage.tsx
│   │   │   │   └── ConfirmDialog.tsx
│   │   │   ├── cards/               # 卡片元件
│   │   │   │   ├── StatisticsCard.tsx
│   │   │   │   ├── UserCard.tsx
│   │   │   │   └── SubmissionCard.tsx
│   │   │   ├── forms/               # 表單元件
│   │   │   │   ├── UserForm.tsx
│   │   │   │   ├── CategorySelector.tsx
│   │   │   │   └── FormValidation.ts
│   │   │   └── modals/              # 對話框元件
│   │   │       ├── RejectModal.tsx
│   │   │       ├── ExportModal.tsx
│   │   │       └── ConfirmModal.tsx
│   │   │
│   │   ├── hooks/                   # 自定義 Hooks
│   │   │   ├── useUsers.ts         # 用戶資料 Hook
│   │   │   ├── useSubmissions.ts   # 填報資料 Hook
│   │   │   ├── useAuth.ts          # 認證 Hook
│   │   │   └── useExport.ts        # 匯出功能 Hook
│   │   │
│   │   ├── data/                    # 假資料
│   │   │   ├── mockUsers.ts
│   │   │   ├── mockSubmissions.ts
│   │   │   ├── mockStatistics.ts
│   │   │   └── mockConfig.ts       # 配置常數
│   │   │
│   │   ├── utils/                   # 工具函數
│   │   │   ├── validation.ts       # 驗證函數
│   │   │   ├── formatters.ts       # 格式化函數
│   │   │   └── constants.ts        # 常數定義
│   │   │
│   │   ├── types/                   # TypeScript 類型
│   │   │   ├── user.types.ts
│   │   │   ├── submission.types.ts
│   │   │   └── common.types.ts
│   │   │
│   │   ├── pages/                   # 頁面元件
│   │   │   ├── AdminDashboardPOC.tsx
│   │   │   ├── CreateUserPOC.tsx
│   │   │   ├── EditUserPOC.tsx
│   │   │   └── SubmissionManagementPOC.tsx
│   │   │
│   │   └── index.tsx                # POC 入口
│   │
│   └── api/                         # 真實 API（整合階段）
│       ├── adminUsers.ts
│       ├── adminSubmissions.ts
│       └── adminExport.ts
```

### 開發模式切換
```typescript
// config/poc.config.ts
export const POC_CONFIG = {
  // 開發模式：'mock' | 'api' | 'hybrid'
  mode: process.env.VITE_POC_MODE || 'mock',
  
  // API 端點配置
  api: {
    baseUrl: process.env.VITE_API_URL,
    timeout: 10000,
  },
  
  // 功能開關
  features: {
    export: true,        // 匯出功能
    batchOperation: false, // 批量操作
    advancedFilter: false, // 進階篩選
  }
};
```

---

## 📝 詳細頁面實作規格

### 1. 主控台頁面 (AdminDashboardPOC.tsx)

#### 資料需求
```typescript
interface DashboardData {
  // 統計資料
  statistics: {
    submitted: number;
    approved: number;
    rejected: number;
  };
  
  // 用戶列表
  users: UserProfile[];
  
  // 篩選條件
  filters: {
    search: string;
    role: 'all' | 'admin' | 'user';
    status: 'all' | 'active' | 'inactive';
  };
}
```

#### 元件結構
```typescript
const AdminDashboardPOC = () => {
  // 狀態管理
  const [statistics, setStatistics] = useState<Statistics>();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filters, setFilters] = useState<Filters>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  
  // 資料載入
  useEffect(() => {
    loadDashboardData();
  }, [filters]);
  
  // API 呼叫（可切換 mock/real）
  const loadDashboardData = async () => {
    if (POC_CONFIG.mode === 'mock') {
      // 使用假資料
      setStatistics(mockStatistics);
      setUsers(mockUsers);
    } else {
      // 呼叫真實 API
      const stats = await getDashboardStats();
      const userList = await listUsers();
      setStatistics(stats);
      setUsers(userList);
    }
  };
  
  return (
    <div className="p-6">
      {/* 標題區 */}
      <DashboardHeader />
      
      {/* 統計卡片 */}
      <StatisticsSection 
        statistics={statistics}
        onCardClick={handleStatusFilter}
      />
      
      {/* 用戶管理區 */}
      <UserManagementSection
        users={filteredUsers}
        filters={filters}
        onFilterChange={setFilters}
        onUserAction={handleUserAction}
      />
    </div>
  );
};
```

### 2. 建立用戶頁面 (CreateUserPOC.tsx)

#### 表單驗證邏輯
```typescript
const validateForm = (data: UserFormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // Email 驗證
  if (!data.email) {
    errors.email = '請輸入 Email';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Email 格式不正確';
  }
  
  // 密碼驗證
  if (!data.password) {
    errors.password = '請輸入密碼';
  } else if (data.password.length < 6) {
    errors.password = '密碼至少 6 個字元';
  }
  
  // 確認密碼
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = '密碼不相符';
  }
  
  // 類別驗證
  if (data.visibleCategories.length === 0) {
    errors.categories = '請至少選擇一個類別';
  }
  
  return errors;
};
```

#### 提交處理
```typescript
const handleSubmit = async (formData: UserFormData) => {
  // 驗證
  const errors = validateForm(formData);
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    return;
  }
  
  // 提交
  try {
    setLoading(true);
    
    if (POC_CONFIG.mode === 'mock') {
      // 模擬提交
      await simulateDelay(1000);
      console.log('建立用戶：', formData);
      showSuccess('用戶建立成功！');
      navigate('/admin/poc');
    } else {
      // 真實 API
      const result = await createUser(formData);
      if (result.error) throw result.error;
      showSuccess('用戶建立成功！');
      navigate('/admin/poc');
    }
  } catch (error) {
    showError('建立失敗：' + error.message);
  } finally {
    setLoading(false);
  }
};
```

### 3. 編輯用戶頁面 (EditUserPOC.tsx)

#### 資料載入與更新
```typescript
const EditUserPOC = ({ userId }) => {
  const [userData, setUserData] = useState<UserProfile>();
  const [statistics, setStatistics] = useState<UserStats>();
  
  // 載入用戶資料
  useEffect(() => {
    loadUserData();
  }, [userId]);
  
  const loadUserData = async () => {
    if (POC_CONFIG.mode === 'mock') {
      // 假資料
      const user = mockUsers.find(u => u.id === userId);
      setUserData(user);
      setStatistics(generateMockStats(userId));
    } else {
      // 真實 API
      const user = await getUserById(userId);
      const stats = await getUserStatistics(userId);
      setUserData(user);
      setStatistics(stats);
    }
  };
  
  // 更新處理
  const handleUpdate = async (updatedData: Partial<UserProfile>) => {
    try {
      if (POC_CONFIG.mode === 'mock') {
        console.log('更新用戶：', updatedData);
        showSuccess('更新成功！');
      } else {
        await updateUser(userId, updatedData);
        showSuccess('更新成功！');
      }
    } catch (error) {
      showError('更新失敗');
    }
  };
  
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* 主要表單區 */}
      <div className="col-span-2">
        <UserForm 
          data={userData}
          onSubmit={handleUpdate}
        />
      </div>
      
      {/* 側邊欄 */}
      <div className="col-span-1">
        <UserSidebar 
          user={userData}
          statistics={statistics}
          onAction={handleSidebarAction}
        />
      </div>
    </div>
  );
};
```

### 4. 填報管理頁面 (SubmissionManagementPOC.tsx)

#### 審核操作實作
```typescript
const SubmissionManagementPOC = () => {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [activeStatus, setActiveStatus] = useState<Status>('submitted');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<string>();
  
  // 通過審核
  const handleApprove = async (recordId: string) => {
    const confirmed = await confirm('確定要通過此筆申請嗎？');
    if (!confirmed) return;
    
    try {
      if (POC_CONFIG.mode === 'mock') {
        // 更新假資料
        updateMockSubmission(recordId, 'approved');
        showSuccess('審核通過！');
      } else {
        // 真實 API
        await reviewEntry(recordId, 'approve');
        showSuccess('審核通過！');
      }
      
      // 重新載入列表
      loadSubmissions();
    } catch (error) {
      showError('操作失敗');
    }
  };
  
  // 退回審核
  const handleReject = (recordId: string) => {
    setSelectedRecord(recordId);
    setShowRejectModal(true);
  };
  
  const confirmReject = async (reason: string) => {
    try {
      if (POC_CONFIG.mode === 'mock') {
        updateMockSubmission(selectedRecord, 'rejected', reason);
        showSuccess('已退回');
      } else {
        await reviewEntry(selectedRecord, 'reject', reason);
        showSuccess('已退回');
      }
      
      setShowRejectModal(false);
      loadSubmissions();
    } catch (error) {
      showError('操作失敗');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 狀態篩選卡片 */}
      <StatusFilter 
        statistics={statistics}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
      />
      
      {/* 進階篩選 */}
      <AdvancedFilter 
        onFilterChange={handleFilterChange}
      />
      
      {/* 記錄列表 */}
      <SubmissionList 
        records={filteredSubmissions}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      
      {/* 退回對話框 */}
      <RejectModal 
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={confirmReject}
      />
    </div>
  );
};
```

---

## 🔄 API 整合指南

### 階段性整合策略

#### Phase 1: 純 Mock 資料（POC 初期）
```typescript
// 使用假資料快速開發
const useUsers = () => {
  return {
    users: mockUsers,
    loading: false,
    error: null
  };
};
```

#### Phase 2: Hybrid 模式（POC 中期）
```typescript
// 部分功能使用真實 API
const useUsers = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    if (FEATURE_FLAGS.useRealUserAPI) {
      // 真實 API
      listUsers().then(setData);
    } else {
      // 假資料
      setData(mockUsers);
    }
  }, []);
  
  return { users: data };
};
```

#### Phase 3: 完整 API 整合（POC 後期）
```typescript
// 完全使用真實 API
const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await listUsers();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  return { users, loading, error, refetch: fetchUsers };
};
```

### API 錯誤處理標準
```typescript
// 統一錯誤處理器
const handleAPIError = (error: any) => {
  // 認證錯誤
  if (error.code === 'AUTH_ERROR') {
    redirectToLogin();
    return;
  }
  
  // 權限錯誤
  if (error.code === 'PERMISSION_DENIED') {
    showError('您沒有執行此操作的權限');
    return;
  }
  
  // 網路錯誤
  if (error.code === 'NETWORK_ERROR') {
    showError('網路連接失敗，請檢查網路');
    return;
  }
  
  // 一般錯誤
  showError(error.message || '操作失敗');
};
```

---

## 🧪 測試計畫

### 單元測試（元件）
```typescript
describe('UserCard', () => {
  it('應該正確顯示用戶資訊', () => {
    const user = { name: '張三', company: '測試公司' };
    render(<UserCard user={user} />);
    expect(screen.getByText('張三')).toBeInTheDocument();
  });
  
  it('點擊編輯按鈕應該觸發 onEdit', () => {
    const handleEdit = jest.fn();
    render(<UserCard onEdit={handleEdit} />);
    fireEvent.click(screen.getByText('編輯'));
    expect(handleEdit).toHaveBeenCalled();
  });
});
```

### 整合測試（流程）
```typescript
describe('審核流程', () => {
  it('完整的審核通過流程', async () => {
    // 1. 載入待審核列表
    // 2. 點擊通過按鈕
    // 3. 確認對話框
    // 4. API 呼叫
    // 5. 更新列表
    // 6. 顯示成功訊息
  });
});
```

### E2E 測試（端到端）
```typescript
describe('管理員操作流程', () => {
  it('建立用戶 → 編輯 → 審核', async () => {
    // 完整的用戶管理流程測試
  });
});
```

---

## 📊 效能優化建議

### 1. 資料載入優化
```typescript
// 使用 React.lazy 延遲載入
const EditUserPOC = lazy(() => import('./pages/EditUserPOC'));

// 使用 useMemo 快取計算結果
const filteredUsers = useMemo(() => {
  return users.filter(user => 
    user.name.includes(searchTerm)
  );
}, [users, searchTerm]);
```

### 2. 防抖與節流
```typescript
// 搜尋防抖
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 500),
  []
);

// 滾動節流
const throttledScroll = useMemo(
  () => throttle(handleScroll, 100),
  []
);
```

### 3. 虛擬列表
```typescript
// 大量資料使用虛擬列表
import { FixedSizeList } from 'react-window';

const VirtualUserList = ({ users }) => (
  <FixedSizeList
    height={600}
    itemCount={users.length}
    itemSize={80}
  >
    {({ index, style }) => (
      <UserCard 
        style={style}
        user={users[index]}
      />
    )}
  </FixedSizeList>
);
```

---

## 🚨 常見問題處理

### 1. CORS 錯誤
```typescript
// 開發環境 proxy 配置
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
};
```

### 2. 認證過期
```typescript
// 自動更新 token
const refreshAuthToken = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    redirectToLogin();
  }
};
```

### 3. 資料同步問題
```typescript
// 使用 optimistic update
const optimisticUpdate = async (id, newData) => {
  // 立即更新 UI
  setLocalData(newData);
  
  try {
    // 背景同步
    await updateAPI(id, newData);
  } catch (error) {
    // 失敗則回滾
    setLocalData(oldData);
    showError('同步失敗');
  }
};
```

---

**POC 狀態**: 準備開始實作