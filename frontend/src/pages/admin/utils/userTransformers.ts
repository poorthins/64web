/**
 * 用戶資料轉換層
 * 統一處理 API ↔ UI 的資料轉換邏輯
 */

import { UserProfile, CreateUserData, UserUpdateData, User as APIUser } from '../../../api/adminUsers'
import { User, UserStatus, UserFormData } from '../types/admin'

/**
 * API User → UI User (for AdminDashboard)
 * 將後端的 User (含 entries_count) 轉換為前端用戶列表顯示格式
 */
export function apiUserToUIUser(apiUser: APIUser): User {
  let status: UserStatus = 'submitted'

  if (!apiUser.is_active) {
    status = 'rejected'
  } else if (apiUser.entries_count > 0) {
    status = 'approved'
  }

  return {
    id: apiUser.id,
    name: apiUser.display_name || '未知用戶',
    email: apiUser.email || '',
    department: '未知部門', // API User 沒有 company/job_title
    status,
    submissionDate: new Date().toISOString().split('T')[0],
    lastActivity: new Date().toISOString().split('T')[0],
    entries: apiUser.entries_count,
    avatar: '👤'
  }
}

/**
 * API UserProfile → Form Data (for EditUser)
 * 將後端的 UserProfile 轉換為編輯表單格式
 */
export function apiUserToFormData(apiUser: UserProfile): UserFormData {
  const fillingConfig = apiUser.filling_config || {}

  return {
    name: apiUser.display_name || '',
    email: apiUser.email || '',
    password: '', // 空白表示不更改密碼
    company: apiUser.company || '',
    targetYear: fillingConfig.target_year || new Date().getFullYear(),
    energyCategories: fillingConfig.energy_categories || [],
    dieselGeneratorVersion: fillingConfig.diesel_generator_mode || undefined,
    isActive: apiUser.is_active ?? true
  }
}

/**
 * Form Data → Create User Data (for CreateUser)
 * 將建立用戶表單資料轉換為 API 格式
 */
export function formDataToCreateUserData(formData: UserFormData): CreateUserData {
  return {
    email: formData.email,
    password: formData.password,
    display_name: formData.name,
    company: formData.company,
    job_title: '', // 不使用部門資訊
    phone: '', // 這個表單沒有電話欄位
    role: 'user', // 預設為一般用戶
    filling_config: {
      diesel_generator_mode: formData.dieselGeneratorVersion || 'refuel'
    },
    energy_categories: formData.energyCategories,
    target_year: formData.targetYear,
    diesel_generator_version: formData.dieselGeneratorVersion
  }
}

/**
 * Form Data → Update User Data (for EditUser)
 * 將編輯用戶表單資料轉換為 API 更新格式
 */
export function formDataToUpdateUserData(formData: UserFormData): UserUpdateData {
  const updateData: UserUpdateData = {
    display_name: formData.name,
    email: formData.email,
    company: formData.company,
    job_title: '',
    is_active: formData.isActive ?? true,
    energy_categories: formData.energyCategories,
    target_year: formData.targetYear,
    diesel_generator_version: formData.dieselGeneratorVersion
  }

  // 如果有密碼，加入更新資料
  if (formData.password && formData.password.trim() !== '') {
    updateData.password = formData.password
  }

  return updateData
}
