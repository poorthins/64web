import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HeroSection from '../HeroSection'

describe('HeroSection', () => {
  it('應該顯示主標題文字', () => {
    render(<HeroSection />)

    expect(screen.getByText(/Your Action Today/i)).toBeInTheDocument()
    expect(screen.getByText(/Shapes Our Sustainable Future/i)).toBeInTheDocument()
  })

  it('應該顯示盤查清單按鈕', () => {
    render(<HeroSection />)

    expect(screen.getByText('盤查清單/佐證範例')).toBeInTheDocument()
  })

  it('點擊按鈕應該觸發 onChecklistClick', () => {
    const handleClick = vi.fn()
    render(<HeroSection onChecklistClick={handleClick} />)

    const button = screen.getByText('盤查清單/佐證範例')
    fireEvent.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('沒有提供 onChecklistClick 時點擊按鈕不應該報錯', () => {
    render(<HeroSection />)

    const button = screen.getByText('盤查清單/佐證範例')
    expect(() => fireEvent.click(button)).not.toThrow()
  })

  it('應該有黑色背景', () => {
    const { container } = render(<HeroSection />)

    const section = container.querySelector('section')
    expect(section).toHaveClass('bg-black')
  })
})
