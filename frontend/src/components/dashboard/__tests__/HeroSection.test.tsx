import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HeroSection from '../HeroSection'

describe('HeroSection', () => {
  it('應該顯示主標題文字', () => {
    render(<HeroSection />)

    expect(screen.getByText(/Your Action Today Shapes/i)).toBeInTheDocument()
    expect(screen.getByText(/Our Sustainable Future/i)).toBeInTheDocument()
  })

  it('應該有背景圖片', () => {
    const { container } = render(<HeroSection />)

    const section = container.querySelector('section')
    expect(section).toHaveStyle({ backgroundImage: 'url(/hero-bg.jpg)' })
  })

  it('應該有固定尺寸 (1920x528px)', () => {
    const { container } = render(<HeroSection />)

    const contentDiv = container.querySelector('section > div')
    expect(contentDiv).toHaveStyle({
      width: '1920px',
      height: '528px'
    })
  })

  it('標題應該有正確的樣式', () => {
    const { container } = render(<HeroSection />)

    const title = container.querySelector('h1')
    expect(title).toHaveStyle({
      fontSize: '90px',
      fontFamily: 'Inter, sans-serif',
      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
    })
  })
})
