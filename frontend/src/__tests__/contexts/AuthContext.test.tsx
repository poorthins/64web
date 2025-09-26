import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import { mockAdmin, mockUser } from '../../__mocks__/data/users'
import React from 'react'

// Mock supabaseClient
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
}))

// Mock useRole hook
vi.mock('../../hooks/useRole', () => ({
  useRole: vi.fn()
}))

describe('AuthContext', () => {
  let mockGetSession: any
  let mockOnAuthStateChange: any
  let mockUseRole: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const { supabase } = await import('../../lib/supabaseClient')
    const { useRole } = await import('../../hooks/useRole')

    mockGetSession = vi.mocked(supabase.auth.getSession)
    mockOnAuthStateChange = vi.mocked(supabase.auth.onAuthStateChange)
    mockUseRole = vi.mocked(useRole)

    // 預設 mock 返回值
    mockGetSession.mockResolvedValue({
      data: { session: null }
    })

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })

    mockUseRole.mockReturnValue({
      role: null,
      loadingRole: false,
      error: null,
      refetchRole: vi.fn()
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  it('應該正確初始化預設狀態', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.role).toBeNull()
  })

  it('應該在載入完成後更新狀態', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com'
    } as any

    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: mockUser } }
    })

    mockUseRole.mockReturnValue({
      role: 'user',
      loadingRole: false,
      error: null,
      refetchRole: vi.fn()
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.role).toBe('user')
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.loadingRole).toBe(false)
  })

  it('應該正確識別管理員用戶', async () => {
    const mockAdminUser = {
      id: 'admin-1',
      email: 'admin@example.com'
    } as any

    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: mockAdminUser } }
    })

    mockUseRole.mockReturnValue({
      role: 'admin',
      loadingRole: false,
      error: null,
      refetchRole: vi.fn()
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual(mockAdminUser)
    expect(result.current.role).toBe('admin')
    expect(result.current.isAdmin).toBe(true)
    expect(result.current.loadingRole).toBe(false)
  })

  it('在角色載入中時 isAdmin 應該為 false', async () => {
    mockUseRole.mockReturnValue({
      role: 'admin', // 即使角色是 admin
      loadingRole: true, // 但載入中
      error: null,
      refetchRole: vi.fn()
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loadingRole).toBe(true)
    })

    // 載入中時 isAdmin 應該為 false，安全起見
    expect(result.current.isAdmin).toBe(false)
  })

  it('應該處理認證狀態變化', async () => {
    const mockCallback = vi.fn()
    mockOnAuthStateChange.mockImplementation((callback) => {
      mockCallback.mockImplementation(callback)
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    // 模擬認證狀態變化
    const newUser = { id: 'new-user', email: 'new@example.com' } as any
    const session = { user: newUser }

    // 觸發認證狀態變化
    mockCallback('SIGNED_IN', session)

    await waitFor(() => {
      expect(result.current.user).toEqual(newUser)
      expect(result.current.loading).toBe(false)
    })
  })

  it('應該處理登出狀態', async () => {
    const mockCallback = vi.fn()
    mockOnAuthStateChange.mockImplementation((callback) => {
      mockCallback.mockImplementation(callback)
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    // 模擬登出
    mockCallback('SIGNED_OUT', null)

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  it('useAuth 在 Provider 外使用時應該拋出錯誤', () => {
    expect(() => {
      renderHook(() => useAuth()) // 沒有 wrapper
    }).toThrow('useAuth must be used within an AuthProvider')
  })

  it('應該在組件卸載時取消訂閱', () => {
    const mockUnsubscribe = vi.fn()
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } }
    })

    const { unmount } = renderHook(() => useAuth(), { wrapper })

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})