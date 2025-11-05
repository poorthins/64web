import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressBar from '../ProgressBar'

describe('ProgressBar', () => {
  it('應該正確顯示完成數量', () => {
    render(<ProgressBar completed={2} total={14} />)

    expect(screen.getByText('2/14')).toBeInTheDocument()
  })

  it('應該正確計算並顯示百分比', () => {
    render(<ProgressBar completed={2} total={14} />)

    // 2/14 = 14.28... ≈ 14%
    expect(screen.getByText('14%')).toBeInTheDocument()
  })

  it('應該正確顯示 50% 進度', () => {
    render(<ProgressBar completed={7} total={14} />)

    expect(screen.getByText('7/14')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('應該正確顯示 100% 進度', () => {
    render(<ProgressBar completed={14} total={14} />)

    expect(screen.getByText('14/14')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('應該正確顯示 0% 進度', () => {
    render(<ProgressBar completed={0} total={14} />)

    expect(screen.getByText('0/14')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('total 為 0 時應該顯示 0%', () => {
    render(<ProgressBar completed={0} total={0} />)

    expect(screen.getByText('0/0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('應該顯示完成度標題', () => {
    render(<ProgressBar completed={2} total={14} />)

    expect(screen.getByText('完成度')).toBeInTheDocument()
  })

  it('進度條寬度應該正確設置', () => {
    const { container } = render(<ProgressBar completed={7} total={14} />)

    // 找到進度條填充元素（有 backgroundColor: #01e083 的 div）
    const progressFill = container.querySelector('div[style*="background-color: rgb(1, 224, 131)"]')
    expect(progressFill).toHaveStyle({ width: '50%' })
  })

  it('進度條容器應該有正確的尺寸', () => {
    const { container } = render(<ProgressBar completed={2} total={14} />)

    // 找到進度條容器（有 backgroundColor: #FFF 的 div）
    const progressContainer = container.querySelector('div[style*="background-color: rgb(255, 255, 255)"]')
    expect(progressContainer).toHaveStyle({
      width: '1268px',
      height: '24px'
    })
  })

  it('分數應該是綠色', () => {
    const { container } = render(<ProgressBar completed={2} total={14} />)

    const fraction = screen.getByText('2/14')
    expect(fraction).toHaveStyle({ color: '#01e083' })
  })

  it('百分比應該是黑色', () => {
    const { container } = render(<ProgressBar completed={2} total={14} />)

    const percentage = screen.getByText('14%')
    expect(percentage).toHaveStyle({ color: '#000' })
  })

  it('應該有水平佈局', () => {
    const { container } = render(<ProgressBar completed={2} total={14} />)

    // 主容器應該是相對定位
    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveStyle({
      width: '1920px',
      height: '182px'
    })
  })
})
