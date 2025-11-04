import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StatusModal from '../StatusModal'

const mockItems = [
  { id: 'wd40', name: 'WD-40', route: '/app/wd40' },
  { id: 'acetylene', name: '乙炔', route: '/app/acetylene' }
]

describe('StatusModal', () => {
  it('isOpen=false 時不應該顯示', () => {
    render(
      <StatusModal
        isOpen={false}
        onClose={vi.fn()}
        type="pending"
        items={mockItems}
        onItemClick={vi.fn()}
      />
    )

    expect(screen.queryByText('待填寫項目')).not.toBeInTheDocument()
  })

  it('isOpen=true 時應該顯示 Modal', () => {
    render(
      <StatusModal
        isOpen={true}
        onClose={vi.fn()}
        type="pending"
        items={mockItems}
        onItemClick={vi.fn()}
      />
    )

    expect(screen.getByText('待填寫項目')).toBeInTheDocument()
  })

  it('應該顯示所有項目', () => {
    render(
      <StatusModal
        isOpen={true}
        onClose={vi.fn()}
        type="pending"
        items={mockItems}
        onItemClick={vi.fn()}
      />
    )

    expect(screen.getByText('WD-40')).toBeInTheDocument()
    expect(screen.getByText('乙炔')).toBeInTheDocument()
  })

  it('點擊關閉按鈕應該觸發 onClose', () => {
    const handleClose = vi.fn()

    render(
      <StatusModal
        isOpen={true}
        onClose={handleClose}
        type="pending"
        items={mockItems}
        onItemClick={vi.fn()}
      />
    )

    const closeButton = screen.getByRole('button', { name: '' })
    fireEvent.click(closeButton)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('點擊 Backdrop 應該觸發 onClose', () => {
    const handleClose = vi.fn()

    const { container } = render(
      <StatusModal
        isOpen={true}
        onClose={handleClose}
        type="pending"
        items={mockItems}
        onItemClick={vi.fn()}
      />
    )

    const backdrop = container.querySelector('.fixed.inset-0.bg-black')!
    fireEvent.click(backdrop)

    expect(handleClose).toHaveBeenCalled()
  })

  it('點擊項目應該觸發 onItemClick 並關閉 Modal', () => {
    const handleItemClick = vi.fn()
    const handleClose = vi.fn()

    render(
      <StatusModal
        isOpen={true}
        onClose={handleClose}
        type="pending"
        items={mockItems}
        onItemClick={handleItemClick}
      />
    )

    const itemButton = screen.getByText('WD-40')
    fireEvent.click(itemButton)

    expect(handleItemClick).toHaveBeenCalledWith('/app/wd40')
    expect(handleClose).toHaveBeenCalled()
  })

  it('items 為空時應該顯示空狀態訊息', () => {
    render(
      <StatusModal
        isOpen={true}
        onClose={vi.fn()}
        type="pending"
        items={[]}
        onItemClick={vi.fn()}
      />
    )

    expect(screen.getByText(/目前沒有.*的項目/)).toBeInTheDocument()
  })

  it('不同狀態應該顯示不同標題', () => {
    const { rerender } = render(
      <StatusModal
        isOpen={true}
        onClose={vi.fn()}
        type="pending"
        items={[]}
        onItemClick={vi.fn()}
      />
    )
    expect(screen.getByText('待填寫項目')).toBeInTheDocument()

    rerender(
      <StatusModal
        isOpen={true}
        onClose={vi.fn()}
        type="submitted"
        items={[]}
        onItemClick={vi.fn()}
      />
    )
    expect(screen.getByText('已提交項目')).toBeInTheDocument()

    rerender(
      <StatusModal
        isOpen={true}
        onClose={vi.fn()}
        type="approved"
        items={[]}
        onItemClick={vi.fn()}
      />
    )
    expect(screen.getByText('已通過項目')).toBeInTheDocument()

    rerender(
      <StatusModal
        isOpen={true}
        onClose={vi.fn()}
        type="rejected"
        items={[]}
        onItemClick={vi.fn()}
      />
    )
    expect(screen.getByText('已退回項目')).toBeInTheDocument()
  })
})
