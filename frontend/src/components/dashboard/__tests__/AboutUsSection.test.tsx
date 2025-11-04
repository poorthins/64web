import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AboutUsSection from '../AboutUsSection'

describe('AboutUsSection', () => {
  it('應該顯示關於我們標題', () => {
    render(<AboutUsSection />)

    expect(screen.getByText('關於我們')).toBeInTheDocument()
  })

  it('應該顯示公司介紹文字', () => {
    render(<AboutUsSection />)

    expect(screen.getByText(/山椒魚碳足跡管理系統/)).toBeInTheDocument()
    expect(screen.getByText(/精準的數據收集與分析/)).toBeInTheDocument()
    expect(screen.getByText(/就像山椒魚這種珍貴的生物/)).toBeInTheDocument()
  })

  it('應該有灰色背景', () => {
    const { container } = render(<AboutUsSection />)

    const section = container.querySelector('section')
    expect(section).toHaveClass('bg-figma-gray')
  })

  it('應該有白色內容卡片', () => {
    const { container } = render(<AboutUsSection />)

    const card = container.querySelector('.bg-white')
    expect(card).toBeInTheDocument()
  })
})
