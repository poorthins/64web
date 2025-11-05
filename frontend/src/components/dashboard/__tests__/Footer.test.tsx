import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Footer from '../Footer'

describe('Footer', () => {
  it('應該顯示版權文字', () => {
    render(<Footer />)

    expect(screen.getByText(/© Formosanus Engineering Sustainable Solution © All Rights Reserved\./i)).toBeInTheDocument()
  })

  it('應該有灰色背景', () => {
    const { container } = render(<Footer />)

    const footer = container.querySelector('footer')
    expect(footer).toHaveClass('bg-figma-gray')
  })

  it('應該居中對齊', () => {
    const { container } = render(<Footer />)

    const footer = container.querySelector('footer')
    expect(footer).toHaveClass('flex', 'items-center', 'justify-center', 'text-center')
  })

  it('版權文字應該有正確的樣式', () => {
    render(<Footer />)

    const copyright = screen.getByText(/© Formosanus Engineering Sustainable Solution © All Rights Reserved\./i)
    expect(copyright).toHaveStyle({
      fontSize: 'clamp(12px, 1vw, 15px)',
      fontWeight: '300'
    })
  })
})
