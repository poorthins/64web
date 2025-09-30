import { http, HttpResponse } from 'msw'
import { mockUsers, createMockUser } from '../data/users'
import { isValidEnergyCategory } from '../data/energyCategories'

const BASE_URL = 'https://fake-supabase-url.supabase.co'

export const handlers = [
  // 獲取用戶列表和單個用戶
  http.get(`${BASE_URL}/rest/v1/profiles`, ({ request }) => {
    const url = new URL(request.url)
    const role = url.searchParams.get('role')
    const id = url.searchParams.get('id')
    const simulateError = url.searchParams.get('simulate_error')

    // 錯誤模擬
    if (simulateError === 'true') {
      return HttpResponse.json(
        {
          error: 'Database connection failed',
          code: 'DATABASE_ERROR',
          details: null
        },
        { status: 500 }
      )
    }

    // 獲取單個用戶
    if (id?.startsWith('eq.')) {
      const userId = id.replace('eq.', '')
      const user = mockUsers.find(u => u.id === userId)

      if (user) {
        return HttpResponse.json([user])
      }
      return HttpResponse.json([], { status: 404 })
    }

    // 獲取用戶列表
    let users = [...mockUsers]

    if (role === 'eq.user') {
      users = users.filter(user => user.role === 'user')
    }

    return HttpResponse.json(users)
  }),

  // 更新用戶
  http.patch(`${BASE_URL}/rest/v1/profiles`, async ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id?.startsWith('eq.')) {
      return HttpResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const userId = id.replace('eq.', '')
    const body = await request.json() as any

    // 驗證能源類別
    if (body.filling_config?.energy_categories) {
      const invalidCategories = body.filling_config.energy_categories
        .filter((cat: string) => !isValidEnergyCategory(cat))

      if (invalidCategories.length > 0) {
        return HttpResponse.json(
          { error: `Invalid energy categories: ${invalidCategories.join(', ')}` },
          { status: 400 }
        )
      }
    }

    return HttpResponse.json(null, { status: 204 })
  }),

  // 創建用戶
  http.post(`${BASE_URL}/rest/v1/profiles`, async ({ request }) => {
    const body = await request.json() as any

    if (!body.display_name || !body.email) {
      return HttpResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 檢查 email 是否已存在
    if (mockUsers.some(user => user.email === body.email)) {
      return HttpResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      )
    }

    const newUser = createMockUser({
      display_name: body.display_name,
      email: body.email,
      company: body.company,
      job_title: body.job_title,
      phone: body.phone,
      filling_config: body.filling_config
    })

    return HttpResponse.json([newUser], { status: 201 })
  }),

  // 刪除用戶
  http.delete(`${BASE_URL}/rest/v1/profiles`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id?.startsWith('eq.')) {
      return HttpResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    return HttpResponse.json(null, { status: 204 })
  }),

  // 能源條目相關 API
  http.get(`${BASE_URL}/rest/v1/energy_entries`, ({ request }) => {
    const url = new URL(request.url)
    const ownerId = url.searchParams.get('owner_id')
    const select = url.searchParams.get('select')

    // 統計能源條目數量
    if (select === 'owner_id') {
      // 模擬統計數據
      const mockStats = [
        { owner_id: 'user-1' },
        { owner_id: 'user-1' },
        { owner_id: 'user-2' },
        { owner_id: 'user-3' },
        { owner_id: 'user-3' },
        { owner_id: 'user-3' }
      ]
      return HttpResponse.json(mockStats)
    }

    // 獲取特定用戶的能源條目（用於推斷權限）
    if (ownerId?.startsWith('eq.')) {
      const userId = ownerId.replace('eq.', '')

      // 模擬用戶的能源條目
      const mockEntries = [
        { owner_id: userId, page_key: 'wd40' },
        { owner_id: userId, page_key: 'diesel' },
        { owner_id: userId, page_key: 'electricity' }
      ]
      return HttpResponse.json(mockEntries)
    }

    return HttpResponse.json([])
  }),

  // Auth API - 創建用戶
  http.post(`${BASE_URL}/auth/v1/admin/users`, async ({ request }) => {
    const body = await request.json() as any

    const mockAuthUser = {
      user: {
        id: `auth-${Date.now()}`,
        email: body.email,
        email_confirmed_at: new Date().toISOString()
      }
    }

    return HttpResponse.json(mockAuthUser)
  }),

  // Auth API - 刪除用戶
  http.delete(`${BASE_URL}/auth/v1/admin/users/:userId`, () => {
    return HttpResponse.json(null, { status: 204 })
  })
]