import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ReviewPage from '../ReviewPage'

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({
      userId: 'user_001',
      category: 'diesel'
    }),
    useNavigate: () => vi.fn()
  }
})

// Mock adminReviewsAPI
vi.mock('../../../api/adminReviews', () => ({
  adminReviewsAPI: {
    getReviewData: vi.fn().mockImplementation(() => new Promise(() => {}))
  }
}))

// Mock window functions
vi.stubGlobal('confirm', vi.fn())
vi.stubGlobal('alert', vi.fn())

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
)

describe('ReviewPage - Basic Tests', () => {
  it('應該渲染 ReviewPage 元件', () => {
    render(
      <TestWrapper>
        <ReviewPage />
      </TestWrapper>
    )

    // 檢查載入狀態
    expect(screen.getByText('載入審核資料中...')).toBeInTheDocument()
  })

  it('應該包含必要的 HTML 結構', () => {
    const { container } = render(
      <TestWrapper>
        <ReviewPage />
      </TestWrapper>
    )

    // 檢查主要容器
    expect(container.querySelector('.min-h-screen')).toBeInTheDocument()
    expect(container.querySelector('.bg-gray-50')).toBeInTheDocument()
  })
})