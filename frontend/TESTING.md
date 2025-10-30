# 測試指南 (Testing Guide)

## 📋 目錄

- [測試架構](#測試架構)
- [測試位置規範](#測試位置規範)
- [執行測試](#執行測試)
- [撰寫測試](#撰寫測試)
- [現有測試清單](#現有測試清單)
- [測試覆蓋率](#測試覆蓋率)

---

## 測試架構

本專案使用 **Vitest** 作為測試框架,搭配 React Testing Library 進行元件測試。

### 技術棧

- **測試執行器**: Vitest
- **React 測試**: @testing-library/react
- **Mock 工具**: Vitest (內建)
- **覆蓋率工具**: v8 (Vitest 內建)

### 設定檔

- **主要設定**: `vitest.config.ts`
- **測試環境**: jsdom (模擬瀏覽器環境)

---

## 測試位置規範

### 📁 測試檔案命名規則

```
原始檔案: userTransformers.ts
測試檔案: userTransformers.test.ts

位置規則:
src/
  pages/
    admin/
      utils/
        userTransformers.ts           # 原始檔案
        __tests__/
          userTransformers.test.ts    # 測試檔案 ✅
```

### 🗂️ 目錄結構範例

```
frontend/src/
├── api/
│   ├── entries.ts
│   └── __tests__/                   # ❌ 已刪除 (舊測試)
│
├── hooks/
│   ├── useEnergySubmit.ts
│   └── __tests__/                   # ❌ 已刪除 (舊測試)
│
├── pages/
│   └── admin/
│       ├── utils/
│       │   ├── userTransformers.ts
│       │   └── __tests__/
│       │       └── userTransformers.test.ts  # ✅ 新測試
│       │
│       └── hooks/
│           ├── useUserExport.ts
│           └── __tests__/
│               └── useUserExport.test.ts     # ✅ 新測試
│
└── components/
    ├── Button.tsx
    └── __tests__/                   # 未來測試位置
        └── Button.test.tsx
```

### 📝 命名規範

| 檔案類型 | 命名規則 | 範例 |
|---------|---------|------|
| 單元測試 | `*.test.ts(x)` | `userTransformers.test.ts` |
| 整合測試 | `*.integration.test.ts` | `api.integration.test.ts` |
| E2E 測試 | `*.e2e.test.ts` | `login.e2e.test.ts` |

---

## 執行測試

### 🚀 常用指令

```bash
# 執行所有測試
npm test

# 執行所有測試 (一次性,不 watch)
npm test -- --run

# 執行特定測試檔案
npm test -- userTransformers.test.ts

# 執行測試並產生覆蓋率報告
npm test -- --coverage

# Watch 模式 (自動重跑)
npm test

# 執行測試並顯示詳細資訊
npm test -- --reporter=verbose
```

### 📊 查看覆蓋率報告

```bash
# 產生覆蓋率報告
npm test -- --coverage

# 在瀏覽器查看 HTML 報告
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

---

## 撰寫測試

### 🔧 測試檔案模板

#### 1. 工具函式測試 (Pure Function)

```typescript
// src/utils/calculator.ts
export function add(a: number, b: number): number {
  return a + b
}

// src/utils/__tests__/calculator.test.ts
import { describe, it, expect } from 'vitest'
import { add } from '../calculator'

describe('calculator', () => {
  describe('add', () => {
    it('應該正確相加兩個數字', () => {
      expect(add(1, 2)).toBe(3)
      expect(add(-1, 1)).toBe(0)
    })

    it('應該處理小數', () => {
      expect(add(0.1, 0.2)).toBeCloseTo(0.3)
    })
  })
})
```

#### 2. React Hook 測試

```typescript
// src/hooks/useCounter.ts
import { useState } from 'react'

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue)
  const increment = () => setCount(c => c + 1)
  const decrement = () => setCount(c => c - 1)
  return { count, increment, decrement }
}

// src/hooks/__tests__/useCounter.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCounter } from '../useCounter'

describe('useCounter', () => {
  it('應該使用初始值', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  it('應該正確遞增', () => {
    const { result } = renderHook(() => useCounter())

    act(() => {
      result.current.increment()
    })

    expect(result.current.count).toBe(1)
  })
})
```

#### 3. 元件測試

```typescript
// src/components/Button.tsx
interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
}

export function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>
}

// src/components/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
  it('應該渲染子元素', () => {
    render(<Button onClick={() => {}}>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('應該在點擊時調用 onClick', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

#### 4. API Mock 測試

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from '../../api/users'

// Mock 整個模組
vi.mock('../../api/users')

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('應該取得用戶列表', async () => {
    const mockUsers = [{ id: '1', name: 'Test' }]
    vi.mocked(api.getUsers).mockResolvedValue(mockUsers)

    const result = await api.getUsers()

    expect(result).toEqual(mockUsers)
    expect(api.getUsers).toHaveBeenCalledTimes(1)
  })
})
```

### ✅ 測試最佳實踐

#### AAA 模式 (Arrange-Act-Assert)

```typescript
it('應該正確計算總和', () => {
  // Arrange - 準備測試資料
  const numbers = [1, 2, 3, 4, 5]

  // Act - 執行測試邏輯
  const result = sum(numbers)

  // Assert - 驗證結果
  expect(result).toBe(15)
})
```

#### 測試命名規範

```typescript
// ✅ 好的命名
it('應該在輸入為空時返回錯誤訊息')
it('應該正確轉換 API 資料為 UI 格式')
it('應該在用戶未登入時重導向到登入頁')

// ❌ 不好的命名
it('測試 1')
it('works')
it('test user function')
```

#### 測試獨立性

```typescript
// ✅ 每個測試都是獨立的
describe('Calculator', () => {
  it('測試加法', () => {
    const calc = new Calculator()  // 獨立建立
    expect(calc.add(1, 2)).toBe(3)
  })

  it('測試減法', () => {
    const calc = new Calculator()  // 獨立建立
    expect(calc.subtract(5, 3)).toBe(2)
  })
})

// ❌ 測試之間有依賴
describe('Calculator', () => {
  const calc = new Calculator()  // 共用實例

  it('測試加法', () => {
    calc.add(1, 2)  // 改變狀態
  })

  it('測試減法', () => {
    // 這個測試可能受到上一個測試影響
  })
})
```

---

## 現有測試清單

### ✅ 已完成的測試

#### 1. userTransformers.test.ts
**位置**: `src/pages/admin/utils/__tests__/userTransformers.test.ts`
**測試數**: 9 tests
**狀態**: ✅ 全部通過

**覆蓋功能**:
- `apiUserToUIUser()` - API User → UI User 轉換
- `apiUserToFormData()` - API → 表單資料
- `formDataToCreateUserData()` - 表單 → 建立用戶
- `formDataToUpdateUserData()` - 表單 → 更新用戶

**執行**:
```bash
npm test -- userTransformers.test.ts
```

#### 2. useUserExport.test.ts
**位置**: `src/pages/admin/hooks/__tests__/useUserExport.test.ts`
**測試數**: 9 tests
**狀態**: ✅ 全部通過

**覆蓋功能**:
- 初始狀態驗證
- `handleQuickExport()` - 快速匯出觸發
- `handleExportConfirm()` - 匯出確認與錯誤處理
- `handleExportClose()` - 關閉 modal

**執行**:
```bash
npm test -- useUserExport.test.ts
```

### 📊 測試統計

| 項目 | 數量 |
|-----|------|
| 測試檔案 | 2 |
| 測試案例 | 18 |
| 通過率 | 100% |
| 執行時間 | ~3s |

---

## 測試覆蓋率

### 🎯 覆蓋率目標

| 類型 | 目標覆蓋率 |
|-----|----------|
| 工具函式 (utils) | 100% |
| React Hooks | 90% |
| API 層 | 80% |
| UI 元件 | 70% |

### 📈 目前覆蓋率

```bash
# 產生覆蓋率報告
npm test -- --coverage

# 查看詳細報告
open coverage/index.html
```

### 🚫 覆蓋率排除項目

以下檔案/目錄不計入覆蓋率 (已在 `vitest.config.ts` 設定):

```typescript
coverage: {
  exclude: [
    'node_modules/',
    'src/**/*.d.ts',         // 型別定義檔
    'src/**/types.ts',       // 純型別檔案
    'src/**/constants.ts',   // 常數檔案
    'dist/',
    'coverage/',
    'public/',
    '*.config.*',
  ]
}
```

---

## 🔍 偵錯測試

### 查看詳細錯誤訊息

```bash
npm test -- --reporter=verbose
```

### 只執行失敗的測試

```bash
npm test -- --reporter=verbose --bail
```

### 使用 VS Code 偵錯

在 `.vscode/launch.json` 加入:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal"
}
```

---

## 📚 參考資源

### 官方文件

- [Vitest 官方文件](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)

### 最佳實踐

- [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)

### 內部文件

- [ADMIN_REFACTOR_PLAN.md](../recons_doc/ADMIN_REFACTOR_PLAN.md) - 管理員介面重構計畫
- [REFACTOR_MONTHLY_TO_USAGE.md](../recons_doc/REFACTOR_MONTHLY_TO_USAGE.md) - monthly→usage 重構計畫

---

## 🛠️ 維護指南

### 新增測試時機

✅ **必須寫測試**:
- 新增 API 函式
- 新增工具函式 (utils)
- 新增自訂 Hook
- 修復 Bug (防止回歸)

⚠️ **建議寫測試**:
- 複雜的 UI 元件
- 表單驗證邏輯
- 資料轉換邏輯

❌ **不需要測試**:
- 純型別定義
- 常數檔案
- 簡單的展示型元件

### 測試維護檢查清單

- [ ] 每次 PR 前執行所有測試
- [ ] 確保測試覆蓋率不下降
- [ ] 刪除程式碼時同步刪除測試
- [ ] 重構時更新相關測試
- [ ] 定期檢查並修復 flaky tests (不穩定的測試)

---

**最後更新**: 2025-10-30
**維護者**: Development Team
**問題回報**: 在專案 Issues 中標註 `testing` 標籤
