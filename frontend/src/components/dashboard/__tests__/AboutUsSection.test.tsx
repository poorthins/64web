import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AboutUsSection from '../AboutUsSection'

describe('AboutUsSection', () => {
  it('應該顯示「About Us >」標題', () => {
    render(<AboutUsSection />)

    expect(screen.getByText('About Us >')).toBeInTheDocument()
  })

  it('應該顯示山椒魚介紹文字', () => {
    render(<AboutUsSection />)

    expect(screen.getByText(/棲息於台灣高山冷冽溪谷間/)).toBeInTheDocument()
    expect(screen.getByText(/山椒魚永續工程股份有限公司/)).toBeInTheDocument()
  })

  it('應該有灰色背景', () => {
    const { container } = render(<AboutUsSection />)

    const section = container.querySelector('section')
    expect(section).toHaveStyle({ background: '#EBEDF0' })
  })

  it('應該顯示 QR Code', () => {
    const { container } = render(<AboutUsSection />)

    // QR Code 現在是使用 background 的 div，位置在 top: 505px, left: 1476px, size: 100x100px
    const allDivs = container.querySelectorAll('div')
    const qrCode = Array.from(allDivs).find(div => {
      const computedStyle = window.getComputedStyle(div)
      return computedStyle.top === '505px' && computedStyle.left === '1476px' && computedStyle.width === '100px'
    })

    expect(qrCode).toBeTruthy()
    if (qrCode) {
      expect(qrCode).toHaveStyle({
        width: '100px',
        height: '100px'
      })
    }
  })

  it('應該有固定尺寸 (1920x774px)', () => {
    const { container } = render(<AboutUsSection />)

    const contentDiv = container.querySelector('section > div')
    expect(contentDiv).toHaveStyle({
      width: '1920px',
      height: '774px'
    })
  })
})
