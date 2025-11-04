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

  it('應該顯示完成進度標題', () => {
    render(<ProgressBar completed={2} total={14} />)

    expect(screen.getByText('完成進度')).toBeInTheDocument()
  })

  it('應該顯示詳細說明文字', () => {
    render(<ProgressBar completed={2} total={14} />)

    expect(screen.getByText('已完成 2 項，共 14 項能源類別')).toBeInTheDocument()
  })

  it('進度條寬度應該正確設置', () => {
    const { container } = render(<ProgressBar completed={7} total={14} />)

    const progressBar = container.querySelector('.bg-figma-accent')
    expect(progressBar).toHaveStyle({ width: '50%' })
  })
})
