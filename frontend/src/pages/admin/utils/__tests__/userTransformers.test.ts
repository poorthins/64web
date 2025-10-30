import { describe, it, expect } from 'vitest'
import {
  apiUserToUIUser,
  apiUserToFormData,
  formDataToCreateUserData,
  formDataToUpdateUserData
} from '../userTransformers'
import type { User as APIUser, UserProfile } from '../../../../api/adminUsers'
import type { UserFormData } from '../../types/admin'

describe('userTransformers', () => {
  describe('apiUserToUIUser', () => {
    it('應該正確轉換 active 用戶', () => {
      const apiUser: APIUser = {
        id: 'user-1',
        display_name: '張三',
        is_active: true,
        entries_count: 5,
        role: 'user'
      }

      const result = apiUserToUIUser(apiUser)

      expect(result.id).toBe('user-1')
      expect(result.name).toBe('張三')
      expect(result.status).toBe('approved')
      expect(result.entries).toBe(5)
    })

    it('應該正確轉換 inactive 用戶', () => {
      const apiUser: APIUser = {
        id: 'user-2',
        display_name: '李四',
        is_active: false,
        entries_count: 0,
        role: 'user'
      }

      const result = apiUserToUIUser(apiUser)

      expect(result.status).toBe('rejected')
    })

    it('應該處理缺少資料的情況', () => {
      const apiUser: APIUser = {
        id: 'user-3',
        display_name: '',
        is_active: true,
        entries_count: 0,
        role: 'user'
      }

      const result = apiUserToUIUser(apiUser)

      expect(result.name).toBe('未知用戶')
      expect(result.entries).toBe(0)
    })
  })

  describe('apiUserToFormData', () => {
    it('應該正確轉換為表單資料', () => {
      const apiUser: UserProfile = {
        id: 'user-1',
        display_name: '張三',
        email: 'test@example.com',
        company: '測試公司',
        is_active: true,
        role: 'user',
        filling_config: {
          target_year: 2024,
          energy_categories: ['diesel', 'gasoline'],
          diesel_generator_mode: 'refuel'
        }
      }

      const result = apiUserToFormData(apiUser)

      expect(result.name).toBe('張三')
      expect(result.email).toBe('test@example.com')
      expect(result.company).toBe('測試公司')
      expect(result.targetYear).toBe(2024)
      expect(result.energyCategories).toEqual(['diesel', 'gasoline'])
      expect(result.dieselGeneratorVersion).toBe('refuel')
      expect(result.isActive).toBe(true)
      expect(result.password).toBe('')
    })

    it('應該處理缺少 filling_config 的情況', () => {
      const apiUser: UserProfile = {
        id: 'user-2',
        display_name: '李四',
        email: 'test2@example.com',
        role: 'user',
        is_active: true
      }

      const result = apiUserToFormData(apiUser)

      expect(result.targetYear).toBe(new Date().getFullYear())
      expect(result.energyCategories).toEqual([])
      expect(result.dieselGeneratorVersion).toBeUndefined()
    })
  })

  describe('formDataToCreateUserData', () => {
    it('應該正確轉換為建立用戶資料', () => {
      const formData: UserFormData = {
        name: '王五',
        email: 'test@example.com',
        password: 'password123',
        company: '新公司',
        targetYear: 2024,
        energyCategories: ['diesel', 'electricity'],
        dieselGeneratorVersion: 'test',
        isActive: true
      }

      const result = formDataToCreateUserData(formData)

      expect(result.email).toBe('test@example.com')
      expect(result.password).toBe('password123')
      expect(result.display_name).toBe('王五')
      expect(result.company).toBe('新公司')
      expect(result.role).toBe('user')
      expect(result.target_year).toBe(2024)
      expect(result.energy_categories).toEqual(['diesel', 'electricity'])
      expect(result.diesel_generator_version).toBe('test')
    })

    it('應該使用預設值處理缺少的 dieselGeneratorVersion', () => {
      const formData: UserFormData = {
        name: '測試',
        email: 'test@example.com',
        password: 'pass',
        company: '公司',
        targetYear: 2024,
        energyCategories: ['diesel']
      }

      const result = formDataToCreateUserData(formData)

      expect(result.filling_config?.diesel_generator_mode).toBe('refuel')
    })
  })

  describe('formDataToUpdateUserData', () => {
    it('應該正確轉換為更新資料（包含密碼）', () => {
      const formData: UserFormData = {
        name: '張三',
        email: 'test@example.com',
        password: 'newpassword',
        company: '公司',
        targetYear: 2024,
        energyCategories: ['diesel'],
        isActive: true
      }

      const result = formDataToUpdateUserData(formData)

      expect(result.display_name).toBe('張三')
      expect(result.password).toBe('newpassword')
      expect(result.is_active).toBe(true)
    })

    it('應該排除空密碼', () => {
      const formData: UserFormData = {
        name: '張三',
        email: 'test@example.com',
        password: '',
        company: '公司',
        targetYear: 2024,
        energyCategories: ['diesel'],
        isActive: true
      }

      const result = formDataToUpdateUserData(formData)

      expect(result.password).toBeUndefined()
    })
  })
})
