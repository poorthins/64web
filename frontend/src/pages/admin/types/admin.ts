/**
 * 管理員介面相關型別定義
 */

export type UserStatus = 'submitted' | 'approved' | 'rejected'

/**
 * UI 層的 User 型別（用於 AdminDashboard、UserCard）
 */
export interface User {
  id: string
  name: string
  email: string
  department: string
  status: UserStatus
  submissionDate: string
  lastActivity: string
  entries: number
  avatar: string
}

/**
 * 統計資料型別
 */
export interface StatsData {
  submitted: number
  approved: number
  rejected: number
}

/**
 * 用戶表單資料型別（用於 CreateUser、EditUser）
 */
export interface UserFormData {
  name: string
  email: string
  password: string
  company: string
  targetYear: number
  energyCategories: string[]
  dieselGeneratorVersion?: 'refuel' | 'test'
  isActive?: boolean
}
