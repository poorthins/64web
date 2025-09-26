import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Mock adminUsersAPI (not used by EditUserPOC but kept for consistency)
const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockDeleteUser = vi.fn()

vi.mock('../../../api/adminUsers', () => ({
  adminUsersAPI: {
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    deleteUser: mockDeleteUser,
  }
}))

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

// Mock user data - matches first user in mockData
const mockUserData = {
  id: '1',
  name: '王小明',
  email: 'ming.wang@company.com',
  role: 'user' as const,
  department: '研發部',
  energyCategories: ['diesel', 'electricity_bill', 'employee_commute'],
  isActive: true,
  createdAt: '2024-01-01',
  lastLogin: '2024-01-15'
}

describe('EditUserPOC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up successful API response by default
    mockGetUser.mockResolvedValue(mockUserData)
    mockUpdateUser.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('基本渲染測試', () => {
    it('應該渲染用戶編輯表單', async () => {
      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      // 等待資料載入完成
      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      }, { timeout: 5000 })

      // 檢查基本表單元素
      expect(screen.getByLabelText(/姓名/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/電子郵件/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/部門/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/角色/i)).toBeInTheDocument()
    })

    it('應該顯示載入狀態', () => {
      // Make API call pending
      mockGetUser.mockImplementation(() => new Promise(() => {}))

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      expect(screen.getByText('載入用戶資料中...')).toBeInTheDocument()
    })

    it('應該顯示錯誤狀態', async () => {
      const errorMessage = '無法載入用戶資料'
      mockGetUser.mockRejectedValue(new Error(errorMessage))

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('載入用戶資料失敗')).toBeInTheDocument()
      })
    })
  })

  describe('表單操作測試', () => {
    it('應該能編輯用戶基本資訊', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      // 等待資料載入
      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 修改用戶姓名
      const nameInput = screen.getByLabelText(/姓名/i)
      await user.clear(nameInput)
      await user.type(nameInput, '新測試用戶')

      expect(nameInput).toHaveValue('新測試用戶')
    })

    it('應該能選擇角色', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      const roleSelect = screen.getByLabelText(/角色/i)
      await user.selectOptions(roleSelect, 'admin')

      expect(roleSelect).toHaveValue('admin')
    })

    it('應該能切換用戶狀態', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      const statusToggle = screen.getByRole('checkbox', { name: /啟用/i })
      expect(statusToggle).toBeChecked()

      await user.click(statusToggle)
      expect(statusToggle).not.toBeChecked()
    })
  })

  describe('能源類別管理測試', () => {
    it('應該顯示所有14個能源類別', async () => {
      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 檢查範疇1類別
      expect(screen.getByText('WD40')).toBeInTheDocument()
      expect(screen.getByText('乙炔')).toBeInTheDocument()
      expect(screen.getByText('冷媒')).toBeInTheDocument()
      expect(screen.getByText('化糞池')).toBeInTheDocument()
      expect(screen.getByText('天然氣')).toBeInTheDocument()
      expect(screen.getByText('尿素')).toBeInTheDocument()
      expect(screen.getByText('汽油')).toBeInTheDocument()
      expect(screen.getByText('柴油')).toBeInTheDocument()
      expect(screen.getByText('柴油發電機')).toBeInTheDocument()
      expect(screen.getByText('液化石油氣')).toBeInTheDocument()
      expect(screen.getByText('焊條')).toBeInTheDocument()
      expect(screen.getByText('滅火器')).toBeInTheDocument()

      // 檢查範疇2類別
      expect(screen.getByText('外購電力')).toBeInTheDocument()

      // 檢查範疇3類別
      expect(screen.getByText('員工通勤')).toBeInTheDocument()
    })

    it('應該能勾選和取消勾選能源類別', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // WD40 預設應該沒有勾選（不在 mockUserData.energyCategories 中）
      const wd40Checkbox = screen.getByLabelText('WD40')
      expect(wd40Checkbox).not.toBeChecked()

      // 勾選 WD40
      await user.click(wd40Checkbox)
      expect(wd40Checkbox).toBeChecked()

      // 柴油預設應該勾選（在 mockUserData.energyCategories 中）
      const dieselCheckbox = screen.getByLabelText('柴油')
      expect(dieselCheckbox).toBeChecked()

      // 取消勾選柴油
      await user.click(dieselCheckbox)
      expect(dieselCheckbox).not.toBeChecked()
    })
  })

  describe('審核導航測試', () => {
    it('應該顯示審核管理側邊欄', async () => {
      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      expect(screen.getByText('審核管理')).toBeInTheDocument()
      expect(screen.getByText('點擊下方按鈕進入對應類別的審核頁面')).toBeInTheDocument()
    })

    it('應該能點擊審核按鈕進行導航', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 找到柴油的審核按鈕（用戶有此權限）
      const auditButtons = screen.getAllByText(/審核/i)
      const dieselAuditButton = auditButtons.find(button =>
        button.closest('.bg-white')?.textContent?.includes('柴油')
      )

      expect(dieselAuditButton).toBeInTheDocument()

      if (dieselAuditButton) {
        await user.click(dieselAuditButton)

        // 檢查導航是否被調用
        expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc/users/1/review/diesel')
      }
    })

    it('應該禁用沒有權限的類別審核按鈕', async () => {
      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 找到 WD40 的審核按鈕（用戶沒有此權限）
      const auditButtons = screen.getAllByText(/審核/i)
      const wd40AuditButton = auditButtons.find(button =>
        button.closest('.bg-white')?.textContent?.includes('WD40')
      )

      expect(wd40AuditButton).toBeInTheDocument()
      expect(wd40AuditButton).toHaveClass('opacity-50', 'cursor-not-allowed')
    })
  })

  describe('表單提交測試', () => {
    it('應該成功保存用戶資料', async () => {
      const user = userEvent.setup()
      vi.mocked(window.confirm).mockReturnValue(true)

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 修改用戶姓名
      const nameInput = screen.getByLabelText(/姓名/i)
      await user.clear(nameInput)
      await user.type(nameInput, '更新後的用戶')

      // 點擊保存按鈕
      const saveButton = screen.getByRole('button', { name: /保存變更/i })
      await user.click(saveButton)

      // 檢查 API 是否被調用
      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith('1', expect.objectContaining({
          name: '更新後的用戶'
        }))
      })
    })

    it('應該處理保存失敗的情況', async () => {
      const user = userEvent.setup()
      vi.mocked(window.confirm).mockReturnValue(true)
      mockUpdateUser.mockResolvedValue({ success: false, message: '保存失敗' })

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /保存變更/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('❌ 保存失敗：保存失敗')
      })
    })

    it('應該在有未保存變更時顯示確認對話框', async () => {
      const user = userEvent.setup()
      vi.mocked(window.confirm).mockReturnValue(false)

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 修改表單內容
      const nameInput = screen.getByLabelText(/姓名/i)
      await user.type(nameInput, ' 修改')

      // 嘗試點擊審核按鈕
      const auditButtons = screen.getAllByText(/審核/i)
      const dieselAuditButton = auditButtons.find(button =>
        button.closest('.bg-white')?.textContent?.includes('柴油')
      )

      if (dieselAuditButton) {
        await user.click(dieselAuditButton)

        // 應該顯示確認對話框
        expect(window.confirm).toHaveBeenCalledWith('您有未儲存的變更，確定要離開此頁面嗎？變更將會遺失。')

        // 用戶取消，不應該導航
        expect(mockNavigate).not.toHaveBeenCalled()
      }
    })
  })

  describe('用戶刪除測試', () => {
    it('應該成功刪除用戶', async () => {
      const user = userEvent.setup()
      vi.mocked(window.confirm).mockReturnValue(true)
      vi.mocked(window.prompt).mockReturnValue('DELETE')
      mockDeleteUser.mockResolvedValue({ success: true })

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 點擊刪除按鈕
      const deleteButton = screen.getByRole('button', { name: /刪除用戶/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(mockDeleteUser).toHaveBeenCalledWith('1')
        expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc')
      })
    })

    it('應該在刪除確認輸入錯誤時取消刪除', async () => {
      const user = userEvent.setup()
      vi.mocked(window.confirm).mockReturnValue(true)
      vi.mocked(window.prompt).mockReturnValue('WRONG')

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      const deleteButton = screen.getByRole('button', { name: /刪除用戶/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('❌ 輸入的確認文字不正確')
        expect(mockDeleteUser).not.toHaveBeenCalled()
      })
    })
  })

  describe('無障礙訪問測試', () => {
    it('應該具有正確的表單標籤', async () => {
      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 檢查表單標籤
      expect(screen.getByLabelText(/姓名/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/電子郵件/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/部門/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/角色/i)).toBeInTheDocument()
    })

    it('應該具有正確的按鈕角色', async () => {
      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 檢查按鈕角色
      expect(screen.getByRole('button', { name: /保存變更/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /刪除用戶/i })).toBeInTheDocument()
    })
  })

  describe('響應式設計測試', () => {
    it('應該在不同屏幕尺寸下正確顯示', async () => {
      const { container } = render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })

      // 檢查響應式類名
      const mainContainer = container.querySelector('.lg\\:grid-cols-3')
      expect(mainContainer).toBeInTheDocument()
    })
  })

  describe('API 錯誤處理測試', () => {
    it('應該處理網絡錯誤', async () => {
      mockGetUser.mockRejectedValue(new Error('Network Error'))

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('載入用戶資料失敗')).toBeInTheDocument()
        expect(screen.getByText('重新載入')).toBeInTheDocument()
      })
    })

    it('應該能重新載入失敗的資料', async () => {
      mockGetUser.mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(mockUserData)

      const user = userEvent.setup()

      render(
        <TestWrapper>
          <EditUserPOC />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('載入用戶資料失敗')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('重新載入')
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByDisplayValue('王小明')).toBeInTheDocument()
      })
    })
  })
})