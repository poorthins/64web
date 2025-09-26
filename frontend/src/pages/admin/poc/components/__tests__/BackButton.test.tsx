import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { BackButton, BackToDashboard, BackToUserEdit, SmallBackButton, PrimaryBackButton } from '../BackButton'

// Mock useNavigate and useLocation
const mockNavigate = vi.fn()
const mockLocation = {
  pathname: '/app/admin/poc/users/123',
  search: '',
  hash: '',
  state: null,
  key: 'test'
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation
  }
})

// 測試包裝器
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
)

describe('BackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基本功能', () => {
    it('應該渲染返回按鈕', () => {
      render(
        <TestWrapper>
          <BackButton />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /返回按鈕/ })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('返回')
    })

    it('應該顯示自訂標籤', () => {
      render(
        <TestWrapper>
          <BackButton label="回到首頁" />
        </TestWrapper>
      )

      expect(screen.getByRole('button')).toHaveTextContent('回到首頁')
    })

    it('應該在預設情況下顯示圖標', () => {
      render(
        <TestWrapper>
          <BackButton />
        </TestWrapper>
      )

      const button = screen.getByRole('button')
      expect(button.querySelector('span[aria-hidden="true"]')).toBeInTheDocument()
    })

    it('應該可以隱藏圖標', () => {
      render(
        <TestWrapper>
          <BackButton showIcon={false} />
        </TestWrapper>
      )

      const button = screen.getByRole('button')
      expect(button.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument()
    })
  })

  describe('點擊行為', () => {
    it('應該使用自訂返回邏輯', () => {
      const mockOnBack = vi.fn()
      render(
        <TestWrapper>
          <BackButton onBack={mockOnBack} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(mockOnBack).toHaveBeenCalledTimes(1)
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('應該導航到指定路徑', () => {
      render(
        <TestWrapper>
          <BackButton to="/custom/path" />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(mockNavigate).toHaveBeenCalledWith('/custom/path')
    })

    it('應該使用智慧返回邏輯', () => {
      render(
        <TestWrapper>
          <BackButton />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc')
    })
  })

  describe('智慧返回邏輯', () => {
    it('應該從審核頁面返回到用戶編輯頁面', () => {
      mockLocation.pathname = '/app/admin/poc/users/123/review/diesel'

      render(
        <TestWrapper>
          <BackButton />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc/users/123')
    })

    it('應該從統計頁面返回到主控台', () => {
      mockLocation.pathname = '/app/admin/poc/statistics'

      render(
        <TestWrapper>
          <BackButton />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc')
    })

    it('應該從創建頁面返回到主控台', () => {
      mockLocation.pathname = '/app/admin/poc/create'

      render(
        <TestWrapper>
          <BackButton />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc')
    })
  })

  describe('鍵盤快捷鍵', () => {
    it('應該響應 ESC 鍵', async () => {
      render(
        <TestWrapper>
          <BackButton />
        </TestWrapper>
      )

      fireEvent.keyDown(window, { key: 'Escape' })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc')
      })
    })

    it('應該響應 Alt + ← 鍵返回主控台', async () => {
      render(
        <TestWrapper>
          <BackButton />
        </TestWrapper>
      )

      fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc')
      })
    })

    it('應該可以禁用鍵盤快捷鍵', async () => {
      render(
        <TestWrapper>
          <BackButton enableKeyboardShortcut={false} />
        </TestWrapper>
      )

      fireEvent.keyDown(window, { key: 'Escape' })

      // 等待一下確保沒有調用
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('樣式和變體', () => {
    it('應該應用不同的大小', () => {
      const { rerender } = render(
        <TestWrapper>
          <BackButton size="sm" data-testid="small-button" />
        </TestWrapper>
      )

      expect(screen.getByTestId('small-button')).toHaveClass('px-3', 'py-1.5', 'text-sm')

      rerender(
        <TestWrapper>
          <BackButton size="lg" data-testid="large-button" />
        </TestWrapper>
      )

      expect(screen.getByTestId('large-button')).toHaveClass('px-6', 'py-3', 'text-base')
    })

    it('應該應用不同的變體樣式', () => {
      const { rerender } = render(
        <TestWrapper>
          <BackButton variant="primary" data-testid="primary-button" />
        </TestWrapper>
      )

      expect(screen.getByTestId('primary-button')).toHaveClass('bg-blue-600', 'text-white')

      rerender(
        <TestWrapper>
          <BackButton variant="ghost" data-testid="ghost-button" />
        </TestWrapper>
      )

      expect(screen.getByTestId('ghost-button')).toHaveClass('text-gray-600')
    })

    it('應該應用自訂 className', () => {
      render(
        <TestWrapper>
          <BackButton className="custom-class" />
        </TestWrapper>
      )

      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
  })

  describe('禁用狀態', () => {
    it('應該在禁用時不響應點擊', () => {
      render(
        <TestWrapper>
          <BackButton disabled />
        </TestWrapper>
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()

      fireEvent.click(button)
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('應該在禁用時不響應鍵盤快捷鍵', async () => {
      render(
        <TestWrapper>
          <BackButton disabled />
        </TestWrapper>
      )

      fireEvent.keyDown(window, { key: 'Escape' })

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('應該應用禁用樣式', () => {
      render(
        <TestWrapper>
          <BackButton disabled />
        </TestWrapper>
      )

      expect(screen.getByRole('button')).toHaveClass('cursor-not-allowed', 'opacity-60')
    })
  })
})

describe('預設配置變體', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('BackToDashboard', () => {
    it('應該導航到主控台', () => {
      render(
        <TestWrapper>
          <BackToDashboard />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc')
    })

    it('應該顯示正確的標籤', () => {
      render(
        <TestWrapper>
          <BackToDashboard />
        </TestWrapper>
      )

      expect(screen.getByRole('button')).toHaveTextContent('返回主控台')
    })
  })

  describe('BackToUserEdit', () => {
    it('應該導航到用戶編輯頁面', () => {
      render(
        <TestWrapper>
          <BackToUserEdit userId="123" />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(mockNavigate).toHaveBeenCalledWith('/app/admin/poc/users/123')
    })

    it('應該顯示正確的標籤', () => {
      render(
        <TestWrapper>
          <BackToUserEdit userId="123" />
        </TestWrapper>
      )

      expect(screen.getByRole('button')).toHaveTextContent('返回用戶編輯')
    })
  })

  describe('SmallBackButton', () => {
    it('應該應用小尺寸和 ghost 變體', () => {
      render(
        <TestWrapper>
          <SmallBackButton />
        </TestWrapper>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm', 'text-gray-600')
    })
  })

  describe('PrimaryBackButton', () => {
    it('應該應用 primary 變體', () => {
      render(
        <TestWrapper>
          <PrimaryBackButton />
        </TestWrapper>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-blue-600', 'text-white')
    })
  })
})