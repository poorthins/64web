import { useState, useEffect, useCallback } from 'react'
import {
  listUsers,
  combineUsersWithCounts,
  createUser,
  updateUser,
  getUserById,
  getUserWithPermissions,
  type UserProfile,
  type CreateUserData,
  type UserUpdateData
} from '../../../api/adminUsers'

export interface UseUsersState {
  users: UserProfile[]
  isLoading: boolean
  error: string | null
  lastFetch: Date | null
}

export interface UseUsersActions {
  fetchUsers: () => Promise<void>
  createNewUser: (userData: CreateUserData) => Promise<UserProfile>
  updateExistingUser: (userId: string, userData: UserUpdateData) => Promise<void>
  getUserProfile: (userId: string) => Promise<UserProfile | null>
  toggleStatus: (userId: string) => Promise<void>
  refreshUsers: () => Promise<void>
}

const CACHE_DURATION = 5 * 60 * 1000 // 5分鐘快取

export function useUsers(): UseUsersState & UseUsersActions {
  const [state, setState] = useState<UseUsersState>({
    users: [],
    isLoading: false,
    error: null,
    lastFetch: null
  })

  // 檢查快取是否仍有效
  const isCacheValid = useCallback(() => {
    if (!state.lastFetch) return false
    return Date.now() - state.lastFetch.getTime() < CACHE_DURATION
  }, [state.lastFetch])

  // 取得用戶列表
  const fetchUsers = useCallback(async () => {
    // 如果快取仍有效且有資料，直接返回
    if (isCacheValid() && state.users.length > 0) {
      console.log('使用快取的用戶資料')
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 使用整合函數取得用戶和填報統計
      const usersWithCounts = await combineUsersWithCounts()

      setState(prev => ({
        ...prev,
        users: usersWithCounts,
        isLoading: false,
        lastFetch: new Date()
      }))

      console.log(`✅ 成功取得 ${usersWithCounts.length} 位用戶資料`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取得用戶資料失敗'
      console.error('❌ 取得用戶資料錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))
    }
  }, [isCacheValid, state.users.length])

  // 建立新用戶
  const createNewUser = useCallback(async (userData: CreateUserData): Promise<UserProfile> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const newUser = await createUser(userData)

      // 重新整理用戶列表
      await refreshUsers()

      console.log('✅ 成功建立用戶：', newUser.display_name)
      return newUser
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '建立用戶失敗'
      console.error('❌ 建立用戶錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))

      throw error
    }
  }, [])

  // 更新用戶資料
  const updateExistingUser = useCallback(async (userId: string, userData: UserUpdateData): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      await updateUser(userId, userData)

      // 更新本地狀態中的用戶資料
      setState(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === userId ? { ...user, ...userData } : user
        ),
        isLoading: false
      }))

      console.log('✅ 成功更新用戶：', userId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新用戶失敗'
      console.error('❌ 更新用戶錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))

      throw error
    }
  }, [])

  // 取得特定用戶資料
  const getUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const user = await getUserById(userId)
      return user
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取得用戶資料失敗'
      console.error('❌ 取得用戶資料錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage
      }))

      return null
    }
  }, [])

  // 切換用戶狀態（暫時使用 updateUser 實作）
  const toggleStatus = useCallback(async (userId: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // 找到目前用戶
      const currentUser = state.users.find(user => user.id === userId)
      if (!currentUser) {
        throw new Error('找不到指定用戶')
      }

      // 使用 updateUser 切換狀態
      await updateUser(userId, { is_active: !currentUser.is_active })

      // 更新本地狀態
      setState(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === userId ? { ...user, is_active: !user.is_active } : user
        ),
        isLoading: false
      }))

      console.log('✅ 成功切換用戶狀態：', userId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '切換用戶狀態失敗'
      console.error('❌ 切換用戶狀態錯誤：', error)

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }))

      throw error
    }
  }, [state.users])

  // 強制重新整理用戶列表
  const refreshUsers = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, lastFetch: null })) // 清除快取
    await fetchUsers()
  }, [fetchUsers])

  // 初始載入
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return {
    ...state,
    fetchUsers,
    createNewUser,
    updateExistingUser,
    getUserProfile,
    toggleStatus,
    refreshUsers
  }
}

// 單一用戶的 hook
export function useUser(userId: string | null) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadUser = useCallback(async () => {
    if (!userId) {
      setUser(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const userData = await getUserWithPermissions(userId)
      setUser(userData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取得用戶資料失敗'
      setError(errorMessage)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  return { user, isLoading, error, reload: loadUser }
}