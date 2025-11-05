import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StatusCard from '../StatusCard'

describe('StatusCard', () => {
  it('應該正確顯示待填寫狀態', () => {
    render(<StatusCard type="pending" count={5} />)

    expect(screen.getByText('待填寫')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('應該正確顯示已提交狀態', () => {
    render(<StatusCard type="submitted" count={3} />)

    expect(screen.getByText('已提交')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('應該正確顯示已通過狀態', () => {
    render(<StatusCard type="approved" count={2} />)

    expect(screen.getByText('已通過')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('應該正確顯示已退回狀態', () => {
    render(<StatusCard type="rejected" count={1} />)

    expect(screen.getByText('已退回')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('點擊卡片應該觸發 onClick', () => {
    const handleClick = vi.fn()
    render(<StatusCard type="pending" count={5} onClick={handleClick} />)

    const card = screen.getByText('待填寫').closest('button')
    fireEvent.click(card!)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('數字為 0 時應該正確顯示', () => {
    render(<StatusCard type="pending" count={0} />)

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('待填寫卡片應該有半透明白色背景', () => {
    render(<StatusCard type="pending" count={5} />)

    const card = screen.getByText('待填寫').closest('button')
    expect(card).toHaveStyle({ backgroundColor: 'rgba(255, 255, 255, 0.70)' })
  })

  it('已提交卡片應該有深藍綠色背景', () => {
    render(<StatusCard type="submitted" count={3} />)

    const card = screen.getByText('已提交').closest('button')
    expect(card).toHaveStyle({ backgroundColor: 'rgba(7, 85, 108, 0.85)' })
  })

  it('已通過卡片應該有淺藍綠色背景', () => {
    render(<StatusCard type="approved" count={2} />)

    const card = screen.getByText('已通過').closest('button')
    expect(card).toHaveStyle({ backgroundColor: 'rgba(161, 194, 201, 0.85)' })
  })

  it('已退回卡片應該有黃綠色背景', () => {
    render(<StatusCard type="rejected" count={1} />)

    const card = screen.getByText('已退回').closest('button')
    expect(card).toHaveStyle({ backgroundColor: 'rgba(217, 248, 58, 0.70)' })
  })

  it('數字應該有 text-shadow', () => {
    const { container } = render(<StatusCard type="pending" count={5} />)

    const count = screen.getByText('5')
    expect(count).toHaveStyle({ textShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)' })
  })

  it('卡片應該有固定寬度和高度', () => {
    render(<StatusCard type="pending" count={5} />)

    const card = screen.getByText('待填寫').closest('button')
    expect(card).toHaveStyle({
      width: '480px',
      height: '306px',
      flexShrink: 0
    })
  })
})
