import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import EditUserPOC from '../EditUserPOC'

// Mock react-router-dom hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ userId: '1' }),
    useNavigate: () => mockNavigate,
  }
})

// Mock Math.random to avoid random errors in loading
vi.spyOn(Math, 'random').mockReturnValue(0.5) // Always return value > 0.1 to avoid errors

// Mock window functions
vi.stubGlobal('confirm', vi.fn())
vi.stubGlobal('alert', vi.fn())
vi.stubGlobal('prompt', vi.fn())

// Mock console methods to avoid test noise
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'group').mockImplementation(() => {})
vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
)

describe('EditUserPOC - Simple Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('應該渲染 EditUserPOC 元件', async () => {
    render(
      <TestWrapper>
        <EditUserPOC />
      </TestWrapper>
    )

    // 等待資料載入完成
    await waitFor(() => {
      expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('應該包含必要的表單元素', async () => {
    render(
      <TestWrapper>
        <EditUserPOC />
      </TestWrapper>
    )

    // 等待資料載入
    await waitFor(() => {
      expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
    })

    // 檢查表單存在 (使用 ID 選擇器)
    expect(document.getElementById('edit-user-form')).toBeInTheDocument()
    expect(screen.getByLabelText(/姓名/i)).toBeInTheDocument()
  })

  it('應該顯示審核管理側邊欄', async () => {
    render(
      <TestWrapper>
        <EditUserPOC />
      </TestWrapper>
    )

    // 等待資料載入
    await waitFor(() => {
      expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
    })

    // 檢查審核管理區塊
    expect(screen.getByText('審核管理')).toBeInTheDocument()
  })
})