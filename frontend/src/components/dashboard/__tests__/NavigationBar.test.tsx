import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import NavigationBar from '../NavigationBar'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('NavigationBar', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('應該顯示 Logo 和品牌名稱', () => {
    renderWithRouter(<NavigationBar />)

    const logo = screen.getByAltText('山椒魚 Logo')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveAttribute('src', '/formosanus-logo.jpg')

    expect(screen.getByText('山椒魚FESS')).toBeInTheDocument()
  })

  it('應該顯示首頁按鈕', () => {
    renderWithRouter(<NavigationBar />)

    const homeButton = screen.getByText('首頁')
    expect(homeButton).toBeInTheDocument()
  })

  it('點擊首頁按鈕應該導航到 /app', () => {
    renderWithRouter(<NavigationBar />)

    const homeButton = screen.getByText('首頁')
    fireEvent.click(homeButton)

    expect(mockNavigate).toHaveBeenCalledWith('/app')
  })

  it('應該顯示有項目的分類（類別一、二、三）', () => {
    renderWithRouter(<NavigationBar />)

    expect(screen.getByText('類別一')).toBeInTheDocument()
    expect(screen.getByText('類別二')).toBeInTheDocument()
    expect(screen.getByText('類別三')).toBeInTheDocument()
  })

  it('應該顯示空分類為禁用狀態（類別四五六）', () => {
    renderWithRouter(<NavigationBar />)

    const category4 = screen.getByText('類別四')
    const category5 = screen.getByText('類別五')
    const category6 = screen.getByText('類別六')

    expect(category4).toBeDisabled()
    expect(category5).toBeDisabled()
    expect(category6).toBeDisabled()
  })

  it('hover 類別一應該顯示下拉選單', async () => {
    renderWithRouter(<NavigationBar />)

    const category1Button = screen.getByText('類別一')
    fireEvent.mouseEnter(category1Button)

    await waitFor(() => {
      expect(screen.getByText('WD-40')).toBeInTheDocument()
      expect(screen.getByText('乙炔')).toBeInTheDocument()
      expect(screen.getByText('冷媒')).toBeInTheDocument()
    })
  })

  it('mouseLeave 應該隱藏下拉選單', async () => {
    renderWithRouter(<NavigationBar />)

    const category1Button = screen.getByText('類別一')
    fireEvent.mouseEnter(category1Button)

    await waitFor(() => {
      expect(screen.getByText('WD-40')).toBeInTheDocument()
    })

    fireEvent.mouseLeave(category1Button.parentElement!)

    await waitFor(() => {
      expect(screen.queryByText('WD-40')).not.toBeInTheDocument()
    })
  })

  it('點擊下拉選單項目應該導航到對應路由', async () => {
    renderWithRouter(<NavigationBar />)

    const category2Button = screen.getByText('類別二')
    fireEvent.mouseEnter(category2Button)

    await waitFor(() => {
      expect(screen.getByText('外購電力')).toBeInTheDocument()
    })

    const electricityButton = screen.getByText('外購電力')
    fireEvent.click(electricityButton)

    expect(mockNavigate).toHaveBeenCalledWith('/app/electricity')
  })

  it('下拉選單應該顯示所有類別一項目（12 個）', async () => {
    renderWithRouter(<NavigationBar />)

    const category1Button = screen.getByText('類別一')
    fireEvent.mouseEnter(category1Button)

    await waitFor(() => {
      expect(screen.getByText('WD-40')).toBeInTheDocument()
      expect(screen.getByText('乙炔')).toBeInTheDocument()
      expect(screen.getByText('冷媒')).toBeInTheDocument()
      expect(screen.getByText('化糞池')).toBeInTheDocument()
      expect(screen.getByText('天然氣')).toBeInTheDocument()
      expect(screen.getByText('尿素')).toBeInTheDocument()
      expect(screen.getByText('柴油(發電機)')).toBeInTheDocument()
      expect(screen.getByText('柴油')).toBeInTheDocument()
      expect(screen.getByText('汽油')).toBeInTheDocument()
      expect(screen.getByText('液化石油氣')).toBeInTheDocument()
      expect(screen.getByText('滅火器')).toBeInTheDocument()
      expect(screen.getByText('焊條')).toBeInTheDocument()
    })
  })
})
