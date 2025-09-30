import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock authHelpers first
vi.mock('@/utils/authHelpers', () => ({
  validateAuth: vi.fn(),
  handleAPIError: vi.fn()
}))

// Mock supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn()
  }
}))

// Import after mocks
import { getRejectedEntries } from '../dashboardAPI'
import { validateAuth, handleAPIError } from '@/utils/authHelpers'
import { supabase } from '@/lib/supabaseClient'

// Type the mocked functions
const mockValidateAuth = validateAuth as ReturnType<typeof vi.fn>
const mockHandleAPIError = handleAPIError as ReturnType<typeof vi.fn>
const mockSupabase = supabase as {
  from: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
}

// Mock data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
}

const mockRejectedEntries = [
  {
    id: '1',
    page_key: 'wd40',
    category: '範疇一',
    updated_at: '2024-09-24T00:00:00Z',
    review_notes: '資料不完整'
  },
  {
    id: '2',
    page_key: 'diesel',
    category: '範疇一',
    updated_at: '2024-09-23T00:00:00Z',
    review_notes: '缺少檔案'
  },
  {
    id: '3',
    page_key: 'septic_tank',
    category: '範疇一',
    updated_at: '2024-09-22T00:00:00Z',
    review_notes: '數值錯誤'
  }
]

const mockUserPermissionsLimited = {
  filling_config: {
    energy_categories: ['diesel', 'septic_tank'] // 資料庫格式
  }
}

const mockUserPermissionsEmpty = {
  filling_config: {
    energy_categories: []
  }
}

const mockUserPermissionsNull = {
  filling_config: null
}

describe('getRejectedEntries 權限過濾測試', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default successful auth
    mockValidateAuth.mockResolvedValue({
      user: mockUser,
      error: null
    })

    // Setup default chain methods
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.in.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('應該過濾掉沒有權限的退回項目', async () => {
    // Mock user with limited permissions (database format)
    mockSupabase.single.mockResolvedValueOnce({
      data: mockUserPermissionsLimited,
      error: null
    })

    // Mock entries query (the chain ending with .order())
    mockSupabase.order.mockResolvedValueOnce({
      data: mockRejectedEntries,
      error: null
    })

    const result = await getRejectedEntries()

    // Should only return diesel and septic_tank (frontend format), not wd40
    expect(result).toHaveLength(2)

    const pageKeys = result.map(entry => entry.pageKey)
    expect(pageKeys).toContain('diesel')
    expect(pageKeys).toContain('septic_tank')
    expect(pageKeys).not.toContain('wd40') // WD-40 should be filtered out

    // Verify result structure
    expect(result[0]).toMatchObject({
      id: expect.any(String),
      pageKey: expect.any(String),
      title: expect.any(String),
      category: expect.any(String),
      reviewNotes: expect.any(String),
      updatedAt: expect.any(String)
    })
  })

  test('應該正確轉換資料庫 key', async () => {
    const mockUserWithSepticTank = {
      filling_config: {
        energy_categories: ['septic_tank'] // Database format
      }
    }

    mockSupabase.single.mockResolvedValueOnce({
      data: mockUserWithSepticTank,
      error: null
    })

    mockSupabase.order.mockResolvedValueOnce({
      data: mockRejectedEntries,
      error: null
    })

    const result = await getRejectedEntries()

    // Should convert septic_tank (db) to septic_tank (frontend) and include it
    expect(result).toHaveLength(1)
    expect(result[0].pageKey).toBe('septic_tank')
    expect(result[0].title).toBe('化糞池')
  })

  test('沒有任何權限時應該返回空陣列', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: mockUserPermissionsEmpty,
      error: null
    })

    mockSupabase.order.mockResolvedValueOnce({
      data: mockRejectedEntries,
      error: null
    })

    const result = await getRejectedEntries()

    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })

  test('沒有 filling_config 時應該返回所有項目', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: mockUserPermissionsNull,
      error: null
    })

    mockSupabase.order.mockResolvedValueOnce({
      data: mockRejectedEntries,
      error: null
    })

    const result = await getRejectedEntries()

    // No permissions config should return all items (backward compatibility)
    expect(result).toHaveLength(3)
    expect(result.map(r => r.pageKey)).toEqual(['wd40', 'diesel', 'septic_tank'])
  })

  test('處理空的退回記錄', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: mockUserPermissionsLimited,
      error: null
    })

    mockSupabase.order.mockResolvedValueOnce({
      data: [],
      error: null
    })

    const result = await getRejectedEntries()

    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })

  test('處理認證失敗', async () => {
    mockValidateAuth.mockResolvedValue({
      user: null,
      error: new Error('認證失敗')
    })

    await expect(getRejectedEntries()).rejects.toThrow('認證失敗')
  })

  test('處理資料庫錯誤', async () => {
    const dbError = new Error('Database connection failed')

    mockSupabase.single.mockResolvedValueOnce({
      data: mockUserPermissionsLimited,
      error: null
    })

    mockSupabase.order.mockResolvedValueOnce({
      data: null,
      error: dbError
    })

    mockHandleAPIError.mockImplementation(() => {
      throw new Error('取得退回記錄失敗')
    })

    await expect(getRejectedEntries()).rejects.toThrow('取得退回記錄失敗')
  })

  test('處理空的 review_notes', async () => {
    const mockEntriesWithoutNotes = [
      {
        id: '1',
        page_key: 'diesel',
        category: '範疇一',
        updated_at: '2024-09-24T00:00:00Z',
        review_notes: null
      }
    ]

    mockSupabase.single.mockResolvedValueOnce({
      data: mockUserPermissionsLimited,
      error: null
    })

    mockSupabase.order.mockResolvedValueOnce({
      data: mockEntriesWithoutNotes,
      error: null
    })

    const result = await getRejectedEntries()

    expect(result).toHaveLength(1)
    expect(result[0].reviewNotes).toBe('無退回原因說明')
  })

  test('驗證正確的 Supabase 查詢參數', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: mockUserPermissionsLimited,
      error: null
    })

    mockSupabase.order.mockResolvedValueOnce({
      data: mockRejectedEntries,
      error: null
    })

    await getRejectedEntries()

    // Verify correct Supabase method calls
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    expect(mockSupabase.from).toHaveBeenCalledWith('energy_entries')

    expect(mockSupabase.select).toHaveBeenCalledWith('filling_config')
    expect(mockSupabase.select).toHaveBeenCalledWith('id, page_key, category, updated_at, review_notes')

    expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockUser.id)
    expect(mockSupabase.eq).toHaveBeenCalledWith('owner_id', mockUser.id)
    expect(mockSupabase.eq).toHaveBeenCalledWith('period_year', new Date().getFullYear())

    expect(mockSupabase.in).toHaveBeenCalledWith('status', ['rejected', 'returned'])
    expect(mockSupabase.order).toHaveBeenCalledWith('updated_at', { ascending: false })
  })

  test('權限轉換邊界情況：未知的資料庫 key', async () => {
    const mockUserWithUnknownKey = {
      filling_config: {
        energy_categories: ['unknown_key', 'diesel'] // Contains unknown key
      }
    }

    const mockEntriesWithUnknownKey = [
      {
        id: '1',
        page_key: 'diesel',
        category: '範疇一',
        updated_at: '2024-09-24T00:00:00Z',
        review_notes: '測試'
      },
      {
        id: '2',
        page_key: 'unknown_key', // Frontend also has corresponding item
        category: '範疇一',
        updated_at: '2024-09-23T00:00:00Z',
        review_notes: '測試'
      }
    ]

    mockSupabase.single.mockResolvedValueOnce({
      data: mockUserWithUnknownKey,
      error: null
    })

    mockSupabase.order.mockResolvedValueOnce({
      data: mockEntriesWithUnknownKey,
      error: null
    })

    const result = await getRejectedEntries()

    // Should include known diesel and existing unknown_key
    expect(result).toHaveLength(2)
    expect(result.map(r => r.pageKey).sort()).toEqual(['diesel', 'unknown_key'])
  })
})