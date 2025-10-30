export type UserStatus = 'submitted' | 'approved' | 'rejected'

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

export interface StatsData {
  submitted: number
  approved: number
  rejected: number
}

export const statusColors = {
  submitted: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300'
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300'
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300'
  }
}

export const statusLabels = {
  submitted: '已提交',
  approved: '已通過',
  rejected: '已退回'
}

export interface EnergyCategory {
  id: string
  name: string
  scope: 1 | 2 | 3
  hasVersion?: boolean
}

export const energyCategories: EnergyCategory[] = [
  // 範疇一
  { id: 'wd40', name: 'WD-40', scope: 1 },
  { id: 'acetylene', name: '乙炔', scope: 1 },
  { id: 'refrigerant', name: '冷媒', scope: 1 },
  { id: 'septic_tank', name: '化糞池', scope: 1 }, // Fixed: unified page_key to 'septic_tank'
  { id: 'natural_gas', name: '天然氣', scope: 1 },
  { id: 'urea', name: '尿素', scope: 1 },
  { id: 'diesel_generator', name: '柴油(發電機)', scope: 1, hasVersion: true },
  { id: 'diesel', name: '柴油', scope: 1 },
  { id: 'gasoline', name: '汽油', scope: 1 },
  { id: 'lpg', name: '液化石油氣', scope: 1 },
  { id: 'fire_extinguisher', name: '滅火器', scope: 1 },
  { id: 'welding_rod', name: '焊條', scope: 1 },

  // 範疇二
  { id: 'electricity', name: '外購電力', scope: 2 },

  // 範疇三
  { id: 'employee_commute', name: '員工通勤', scope: 3 }
]

export const scopeLabels = {
  1: '範疇一：直接排放',
  2: '範疇二：外購電力',
  3: '範疇三：其他間接排放'
}

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
