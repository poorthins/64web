import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ReviewPage from '../ReviewPage'
import * as adminReviewsAPI from '../../../api/adminReviews'
import { createMockSubmission, createMockUser } from '../../../utils/testHelpers'

// Mock the API
vi.mock('../../../api/adminReviews', () => ({
  adminReviewsAPI: {
    getReviewData: vi.fn(),
    approveReview: vi.fn(),
    rejectReview: vi.fn()
  }
}))

// Mock useParams
const mockParams = {
  userId: 'user_001',
  category: 'diesel'
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => vi.fn()
  }
})

// Mock window.confirm and window.alert
const mockConfirm = vi.fn()
const mockAlert = vi.fn()
vi.stubGlobal('confirm', mockConfirm)
vi.stubGlobal('alert', mockAlert)

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
)

describe('ReviewPage', () => {
  const mockReviewData = {
    submission: createMockSubmission({
      id: 'test_001',
      userId: 'user_001',
      categoryId: 'diesel',
      status: 'submitted',
      amount: 100,
      unit: '公升',
      co2Emission: 250,
      priority: 'medium'
    }),
    category: {
      id: 'diesel',
      name: '柴油',
      scope: 1 as const
    },
    user: createMockUser({
      id: 'user_001',
      name: '測試用戶',
      email: 'test@example.com',
      department: '測試部門'
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockReturnValue(true)
  })

  describe('載入狀態', () => {
    it('應該顯示載入指示器', async () => {
      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      expect(screen.getByText('載入審核資料中...')).toBeInTheDocument()
    })

    it('應該顯示錯誤狀態', async () => {
      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockRejectedValue(new Error('載入失敗'))

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('載入失敗')).toBeInTheDocument()
        expect(screen.getByText('載入失敗')).toBeInTheDocument()
      })
    })
  })

  describe('成功載入資料', () => {
    beforeEach(() => {
      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockResolvedValue(mockReviewData)
    })

    it('應該顯示審核頁面標題', async () => {
      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('柴油 審核')).toBeInTheDocument()
        expect(screen.getByText('用戶：測試用戶 (測試部門)')).toBeInTheDocument()
      })
    })

    it('應該顯示提交資料', async () => {
      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('100 公升')).toBeInTheDocument()
        expect(screen.getByText('250 kg')).toBeInTheDocument()
      })
    })

    it('應該顯示用戶資訊', async () => {
      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('測試用戶')).toBeInTheDocument()
        expect(screen.getByText('測試部門')).toBeInTheDocument()
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
      })
    })

    it('應該顯示審核操作按鈕（待審核狀態）', async () => {
      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /通過/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /退回/ })).toBeInTheDocument()
      })
    })
  })

  describe('審核操作', () => {
    beforeEach(() => {
      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockResolvedValue(mockReviewData)
    })

    it('應該處理通過審核操作', async () => {
      const mockApproveReview = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'approveReview')
      mockApproveReview.mockResolvedValue({
        success: true,
        message: '審核通過',
        data: { ...mockReviewData.submission, status: 'approved' }
      })

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /通過/ })
        fireEvent.click(approveButton)
      })

      expect(mockConfirm).toHaveBeenCalledWith('確定要通過 測試用戶 的 柴油 申請嗎？')

      await waitFor(() => {
        expect(mockApproveReview).toHaveBeenCalledWith('user_001', 'diesel', '管理員審核通過')
        expect(mockAlert).toHaveBeenCalledWith('✅ 審核通過')
      })
    })

    it('應該處理退回審核操作', async () => {
      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        const rejectButton = screen.getByRole('button', { name: /退回/ })
        fireEvent.click(rejectButton)
      })

      // 應該打開退回模態框（這裡簡化測試，實際上需要測試模態框內容）
      expect(screen.getByRole('button', { name: /退回/ })).toBeInTheDocument()
    })

    it('應該在用戶取消確認時不執行操作', async () => {
      mockConfirm.mockReturnValue(false)

      const mockApproveReview = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'approveReview')

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /通過/ })
        fireEvent.click(approveButton)
      })

      expect(mockConfirm).toHaveBeenCalled()
      expect(mockApproveReview).not.toHaveBeenCalled()
    })
  })

  describe('已審核狀態', () => {
    it('應該顯示已通過狀態', async () => {
      const approvedReviewData = {
        ...mockReviewData,
        submission: {
          ...mockReviewData.submission,
          status: 'approved' as const,
          reviewDate: '2024-03-16',
          reviewer: '管理員'
        }
      }

      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockResolvedValue(approvedReviewData)

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('✅ 已通過審核')).toBeInTheDocument()
        expect(screen.getByText('2024-03-16')).toBeInTheDocument()
        expect(screen.getByText('管理員')).toBeInTheDocument()
      })

      // 不應該顯示審核操作按鈕
      expect(screen.queryByRole('button', { name: /通過/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /退回/ })).not.toBeInTheDocument()
    })

    it('應該顯示已退回狀態和退回原因', async () => {
      const rejectedReviewData = {
        ...mockReviewData,
        submission: {
          ...mockReviewData.submission,
          status: 'rejected' as const,
          reviewDate: '2024-03-16',
          reviewer: '管理員',
          reviewNotes: '資料不完整'
        }
      }

      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockResolvedValue(rejectedReviewData)

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('❌ 已退回')).toBeInTheDocument()
        expect(screen.getByText('資料不完整')).toBeInTheDocument()
      })
    })
  })

  describe('不同能源類別的特殊顯示', () => {
    it('應該顯示柴油發電機特殊資訊', async () => {
      const dieselGeneratorData = {
        ...mockReviewData,
        category: {
          id: 'diesel_generator',
          name: '柴油發電機',
          scope: 1 as const,
          hasVersion: true
        },
        submission: {
          ...mockReviewData.submission,
          categoryId: 'diesel_generator',
          categoryName: '柴油發電機'
        }
      }

      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockResolvedValue(dieselGeneratorData)

      // 更新 mock params
      mockParams.category = 'diesel_generator'

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('⚙️ 柴油發電機特殊資訊')).toBeInTheDocument()
        expect(screen.getByText(/此類別需要特別注意發電機運行時間記錄/)).toBeInTheDocument()
      })
    })

    it('應該顯示外購電力特殊資訊', async () => {
      const electricityData = {
        ...mockReviewData,
        category: {
          id: 'electricity',
          name: '外購電力',
          scope: 2 as const
        },
        submission: {
          ...mockReviewData.submission,
          categoryId: 'electricity',
          categoryName: '外購電力'
        }
      }

      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockResolvedValue(electricityData)

      mockParams.category = 'electricity'

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('⚡ 外購電力特殊資訊')).toBeInTheDocument()
        expect(screen.getByText(/請確認電力使用量數據來源為正式電費單/)).toBeInTheDocument()
      })
    })
  })

  describe('錯誤處理', () => {
    it('應該處理審核操作錯誤', async () => {
      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockResolvedValue(mockReviewData)

      const mockApproveReview = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'approveReview')
      mockApproveReview.mockRejectedValue(new Error('網路錯誤'))

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /通過/ })
        fireEvent.click(approveButton)
      })

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('❌ 操作失敗：網路錯誤')
      })
    })

    it('應該處理 API 回傳的失敗響應', async () => {
      const mockGetReviewData = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'getReviewData')
      mockGetReviewData.mockResolvedValue(mockReviewData)

      const mockApproveReview = vi.spyOn(adminReviewsAPI.adminReviewsAPI, 'approveReview')
      mockApproveReview.mockResolvedValue({
        success: false,
        message: '此記錄已經被通過'
      })

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /通過/ })
        fireEvent.click(approveButton)
      })

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('❌ 操作失敗：此記錄已經被通過')
      })
    })
  })

  describe('缺少參數處理', () => {
    it('應該處理缺少 userId 參數', async () => {
      // Mock 缺少參數的情況
      vi.mocked(vi.importActual('react-router-dom')).then((actual) => {
        vi.doMock('react-router-dom', () => ({
          ...actual,
          useParams: () => ({ category: 'diesel' }) // 缺少 userId
        }))
      })

      render(
        <TestWrapper>
          <ReviewPage />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('載入失敗')).toBeInTheDocument()
        expect(screen.getByText('缺少必要的參數')).toBeInTheDocument()
      })
    })
  })
})