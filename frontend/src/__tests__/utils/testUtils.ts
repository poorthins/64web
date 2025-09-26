import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 創建測試用的 QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // 在測試中靜音錯誤日誌
    },
  })

// 測試 Wrapper 組件
interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = createTestQueryClient()

  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(
      BrowserRouter,
      null,
      children
    )
  )
}

// 自定義渲染函數
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// 等待函數 - 用於等待異步操作
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

// 模擬 Supabase 錯誤
export const createSupabaseError = (message: string, code?: string) => ({
  message,
  code: code || 'GENERIC_ERROR',
  details: null,
  hint: null,
})

// 模擬成功的 Supabase 響應
export const createSupabaseSuccess = <T>(data: T) => ({
  data,
  error: null,
})

// 測試用戶數據生成器
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'test-user-1',
  display_name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  is_active: true,
  company: 'Test Company',
  job_title: 'Test Position',
  phone: '0912345678',
  filling_config: {
    energy_categories: ['wd40', 'diesel'],
    target_year: 2024,
    diesel_generator_mode: 'refuel' as const,
  },
  ...overrides,
})

// 測試用的能源類別數據
export const createMockEnergyCategories = () => [
  'wd40',
  'acetylene',
  'refrigerant',
  'septic_tank',
  'natural_gas',
  'urea',
  'diesel_generator',
  'diesel',
  'gasoline',
  'lpg',
  'fire_extinguisher',
  'welding_rod',
  'electricity',
  'employee_commute'
]

// 驗證 API 調用
export const expectApiCall = (mockFn: any, method: string, url: string) => {
  expect(mockFn).toHaveBeenCalledWith(
    expect.objectContaining({
      method,
      url: expect.stringContaining(url),
    })
  )
}

// 重新導出所有測試工具
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
export { customRender as render }