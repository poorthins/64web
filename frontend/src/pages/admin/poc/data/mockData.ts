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

export const mockUsers: User[] = [
  {
    id: '1',
    name: '王小明',
    email: 'ming.wang@company.com',
    department: '研發部',
    status: 'approved',
    submissionDate: '2024-03-15',
    lastActivity: '2024-03-20',
    entries: 12,
    avatar: '👨‍💻'
  },
  {
    id: '2',
    name: '李美華',
    email: 'meihua.li@company.com',
    department: '行銷部',
    status: 'submitted',
    submissionDate: '2024-03-18',
    lastActivity: '2024-03-21',
    entries: 8,
    avatar: '👩‍💼'
  },
  {
    id: '3',
    name: '張志豪',
    email: 'zhihao.zhang@company.com',
    department: '財務部',
    status: 'submitted',
    submissionDate: '2024-03-20',
    lastActivity: '2024-03-22',
    entries: 5,
    avatar: '🧑‍💼'
  },
  {
    id: '4',
    name: '陳雅婷',
    email: 'yating.chen@company.com',
    department: '人資部',
    status: 'rejected',
    submissionDate: '2024-03-10',
    lastActivity: '2024-03-19',
    entries: 15,
    avatar: '👩'
  },
  {
    id: '5',
    name: '林俊傑',
    email: 'junjie.lin@company.com',
    department: '業務部',
    status: 'approved',
    submissionDate: '2024-03-12',
    lastActivity: '2024-03-21',
    entries: 20,
    avatar: '👨'
  },
  {
    id: '6',
    name: '黃詩涵',
    email: 'shihan.huang@company.com',
    department: '設計部',
    status: 'submitted',
    submissionDate: '2024-03-19',
    lastActivity: '2024-03-22',
    entries: 10,
    avatar: '👩‍🎨'
  },
  {
    id: '7',
    name: '劉建國',
    email: 'jianguo.liu@company.com',
    department: '生產部',
    status: 'submitted',
    submissionDate: '2024-03-21',
    lastActivity: '2024-03-23',
    entries: 7,
    avatar: '👨‍🏭'
  },
  {
    id: '8',
    name: '楊雅琪',
    email: 'yaqi.yang@company.com',
    department: '品管部',
    status: 'approved',
    submissionDate: '2024-03-14',
    lastActivity: '2024-03-20',
    entries: 18,
    avatar: '👩‍🔬'
  }
]

export const calculateStats = (users: User[]): StatsData => {
  return {
    submitted: users.filter(u => u.status === 'submitted').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length
  }
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
  { id: 'septic_tank', name: '化糞池', scope: 1 },
  { id: 'natural_gas', name: '天然氣', scope: 1 },
  { id: 'urea', name: '尿素', scope: 1 },
  { id: 'diesel_generator', name: '柴油(發電機)', scope: 1, hasVersion: true },
  { id: 'diesel', name: '柴油', scope: 1 },
  { id: 'gasoline', name: '汽油', scope: 1 },
  { id: 'lpg', name: '液化石油氣', scope: 1 },
  { id: 'fire_extinguisher', name: '滅火器', scope: 1 },
  { id: 'welding_rod', name: '焊條', scope: 1 },

  // 範疇二
  { id: 'electricity_bill', name: '外購電力', scope: 2 },

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
  department: string
  targetYear: number
  energyCategories: string[]
  dieselGeneratorVersion?: 'refuel' | 'test'
  isActive?: boolean
}

export interface SubmissionRecord {
  id: string
  userId: string
  userName: string
  userDepartment: string
  categoryId: string
  categoryName: string
  scope: 1 | 2 | 3
  status: UserStatus
  submissionDate: string
  reviewDate?: string
  amount: number
  unit: string
  co2Emission: number
  reviewer?: string
  comments?: string
  priority: 'high' | 'medium' | 'low'
  reviewNotes?: string
  reviewedAt?: string
  reviewerId?: string
}

// 常用退回原因選項
export const COMMON_REJECT_REASONS = [
  '資料不完整',
  '證明文件缺失',
  '數據異常',
  '格式錯誤',
  '計量單位錯誤',
  '數值超出合理範圍',
  '缺少必要檔案',
  '其他（請說明）'
]

// 審核者資訊
export const REVIEWERS = [
  { id: 'admin_001', name: '張主管', department: '環保組' },
  { id: 'admin_002', name: '林主管', department: '品管部' },
  { id: 'admin_003', name: '陳主管', department: '安衛組' },
  { id: 'admin_system', name: '系統管理員', department: '資訊部' }
]

// 測試用例資料
export const TEST_SCENARIOS = {
  // 正常審核流程
  normalFlow: [
    'sub_001', // submitted → approved
    'sub_002', // submitted → rejected
  ],

  // 修正錯誤流程
  errorCorrection: [
    'sub_003', // approved → rejected
  ],

  // 重新審核流程
  reReview: [
    'sub_004', // rejected → approved
    'sub_012'  // rejected → submitted
  ],

  // 批量操作測試
  batchTest: [
    'sub_005', 'sub_006', 'sub_007'
  ]
}

export const mockSubmissions: SubmissionRecord[] = [
  {
    id: 'sub_001',
    userId: '1',
    userName: '王小明',
    userDepartment: '研發部',
    categoryId: 'diesel',
    categoryName: '柴油',
    scope: 1,
    status: 'approved',
    submissionDate: '2024-03-15',
    reviewDate: '2024-03-16',
    amount: 150.5,
    unit: '公升',
    co2Emission: 375.25,
    reviewer: '張主管',
    comments: '數據正確，已核准',
    priority: 'medium'
  },
  {
    id: 'sub_002',
    userId: '2',
    userName: '李美華',
    userDepartment: '行銷部',
    categoryId: 'electricity_bill',
    categoryName: '外購電力',
    scope: 2,
    status: 'submitted',
    submissionDate: '2024-03-18',
    amount: 2850,
    unit: '度',
    co2Emission: 1425,
    priority: 'high'
  },
  {
    id: 'sub_003',
    userId: '3',
    userName: '張志豪',
    userDepartment: '財務部',
    categoryId: 'employee_commute',
    categoryName: '員工通勤',
    scope: 3,
    status: 'submitted',
    submissionDate: '2024-03-20',
    amount: 45.2,
    unit: '公里',
    co2Emission: 12.1,
    priority: 'low'
  },
  {
    id: 'sub_004',
    userId: '4',
    userName: '陳雅婷',
    userDepartment: '人資部',
    categoryId: 'natural_gas',
    categoryName: '天然氣',
    scope: 1,
    status: 'rejected',
    submissionDate: '2024-03-10',
    reviewDate: '2024-03-12',
    amount: 80.3,
    unit: '立方公尺',
    co2Emission: 160.6,
    reviewer: '林主管',
    comments: '數據來源不明確，請重新提交',
    priority: 'medium',
    reviewNotes: '填報數據異常偏高，請確認是否有誤並提供相關證明文件。建議檢查計量單位是否正確，並附上氣表讀數照片。',
    reviewedAt: '2024-03-12 15:30',
    reviewerId: 'admin_001'
  },
  {
    id: 'sub_005',
    userId: '5',
    userName: '林俊傑',
    userDepartment: '業務部',
    categoryId: 'gasoline',
    categoryName: '汽油',
    scope: 1,
    status: 'approved',
    submissionDate: '2024-03-12',
    reviewDate: '2024-03-13',
    amount: 120.8,
    unit: '公升',
    co2Emission: 278.84,
    reviewer: '張主管',
    comments: '符合標準，已核准',
    priority: 'medium'
  },
  {
    id: 'sub_006',
    userId: '6',
    userName: '黃詩涵',
    userDepartment: '設計部',
    categoryId: 'lpg',
    categoryName: '液化石油氣',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-19',
    amount: 25.6,
    unit: '公斤',
    co2Emission: 76.8,
    priority: 'low'
  },
  {
    id: 'sub_007',
    userId: '7',
    userName: '劉建國',
    userDepartment: '生產部',
    categoryId: 'diesel_generator',
    categoryName: '柴油(發電機)',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-21',
    amount: 200,
    unit: '公升',
    co2Emission: 522,
    priority: 'high'
  },
  {
    id: 'sub_008',
    userId: '8',
    userName: '楊雅琪',
    userDepartment: '品管部',
    categoryId: 'electricity_bill',
    categoryName: '外購電力',
    scope: 2,
    status: 'approved',
    submissionDate: '2024-03-14',
    reviewDate: '2024-03-15',
    amount: 1850,
    unit: '度',
    co2Emission: 925,
    reviewer: '陳主管',
    priority: 'medium'
  },
  {
    id: 'sub_009',
    userId: '1',
    userName: '王小明',
    userDepartment: '研發部',
    categoryId: 'acetylene',
    categoryName: '乙炔',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-22',
    amount: 15.2,
    unit: '公斤',
    co2Emission: 45.6,
    priority: 'low'
  },
  {
    id: 'sub_010',
    userId: '2',
    userName: '李美華',
    userDepartment: '行銷部',
    categoryId: 'employee_commute',
    categoryName: '員工通勤',
    scope: 3,
    status: 'approved',
    submissionDate: '2024-03-17',
    reviewDate: '2024-03-18',
    amount: 38.5,
    unit: '公里',
    co2Emission: 10.3,
    reviewer: '林主管',
    priority: 'low'
  },
  {
    id: 'sub_011',
    userId: '3',
    userName: '張志豪',
    userDepartment: '財務部',
    categoryId: 'refrigerant',
    categoryName: '冷媒',
    scope: 1,
    status: 'rejected',
    submissionDate: '2024-03-16',
    reviewDate: '2024-03-17',
    amount: 2.5,
    unit: '公斤',
    co2Emission: 5250,
    reviewer: '張主管',
    comments: '冷媒類型與申報不符',
    priority: 'high',
    reviewNotes: '申報的冷媒類型為 R-410A，但實際設備規格顯示使用 R-22。請重新確認冷媒種類並提交正確的設備規格書。',
    reviewedAt: '2024-03-17 11:15',
    reviewerId: 'admin_002'
  },
  {
    id: 'sub_012',
    userId: '4',
    userName: '陳雅婷',
    userDepartment: '人資部',
    categoryId: 'urea',
    categoryName: '尿素',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-23',
    amount: 50,
    unit: '公斤',
    co2Emission: 82.5,
    priority: 'low'
  },
  {
    id: 'sub_013',
    userId: '5',
    userName: '林俊傑',
    userDepartment: '業務部',
    categoryId: 'electricity_bill',
    categoryName: '外購電力',
    scope: 2,
    status: 'submitted',
    submissionDate: '2024-03-24',
    amount: 3200,
    unit: '度',
    co2Emission: 1600,
    priority: 'high'
  },
  {
    id: 'sub_014',
    userId: '6',
    userName: '黃詩涵',
    userDepartment: '設計部',
    categoryId: 'wd40',
    categoryName: 'WD-40',
    scope: 1,
    status: 'approved',
    submissionDate: '2024-03-11',
    reviewDate: '2024-03-12',
    amount: 5.8,
    unit: '公斤',
    co2Emission: 17.4,
    reviewer: '陳主管',
    priority: 'low'
  },
  {
    id: 'sub_015',
    userId: '7',
    userName: '劉建國',
    userDepartment: '生產部',
    categoryId: 'welding_rod',
    categoryName: '焊條',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-25',
    amount: 12.5,
    unit: '公斤',
    co2Emission: 25,
    priority: 'medium'
  },
  {
    id: 'sub_016',
    userId: '8',
    userName: '楊雅琪',
    userDepartment: '品管部',
    categoryId: 'fire_extinguisher',
    categoryName: '滅火器',
    scope: 1,
    status: 'rejected',
    submissionDate: '2024-03-13',
    reviewDate: '2024-03-14',
    amount: 8.2,
    unit: '公斤',
    co2Emission: 16.4,
    reviewer: '林主管',
    comments: '設備檢查記錄不完整',
    priority: 'medium',
    reviewNotes: '滅火器填充記錄缺少時間戳記和操作人員簽名。請補充完整的維護記錄表並加蓋廠商印章。',
    reviewedAt: '2024-03-14 16:45',
    reviewerId: 'admin_001'
  },
  {
    id: 'sub_017',
    userId: '1',
    userName: '王小明',
    userDepartment: '研發部',
    categoryId: 'septic_tank',
    categoryName: '化糞池',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-26',
    amount: 1200,
    unit: '公升',
    co2Emission: 240,
    priority: 'medium'
  },
  {
    id: 'sub_018',
    userId: '2',
    userName: '李美華',
    userDepartment: '行銷部',
    categoryId: 'diesel',
    categoryName: '柴油',
    scope: 1,
    status: 'approved',
    submissionDate: '2024-03-09',
    reviewDate: '2024-03-10',
    amount: 95.3,
    unit: '公升',
    co2Emission: 237.75,
    reviewer: '張主管',
    priority: 'medium'
  },
  {
    id: 'sub_019',
    userId: '3',
    userName: '張志豪',
    userDepartment: '財務部',
    categoryId: 'gasoline',
    categoryName: '汽油',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-27',
    amount: 85.6,
    unit: '公升',
    co2Emission: 197.38,
    priority: 'low'
  },
  {
    id: 'sub_020',
    userId: '4',
    userName: '陳雅婷',
    userDepartment: '人資部',
    categoryId: 'employee_commute',
    categoryName: '員工通勤',
    scope: 3,
    status: 'submitted',
    submissionDate: '2024-03-28',
    amount: 52.8,
    unit: '公里',
    co2Emission: 14.16,
    priority: 'low'
  },
  {
    id: 'sub_021',
    userId: '5',
    userName: '林俊傑',
    userDepartment: '業務部',
    categoryId: 'natural_gas',
    categoryName: '天然氣',
    scope: 1,
    status: 'approved',
    submissionDate: '2024-03-08',
    reviewDate: '2024-03-09',
    amount: 125.4,
    unit: '立方公尺',
    co2Emission: 250.8,
    reviewer: '陳主管',
    priority: 'medium'
  },
  {
    id: 'sub_022',
    userId: '6',
    userName: '黃詩涵',
    userDepartment: '設計部',
    categoryId: 'electricity_bill',
    categoryName: '外購電力',
    scope: 2,
    status: 'submitted',
    submissionDate: '2024-03-29',
    amount: 2150,
    unit: '度',
    co2Emission: 1075,
    priority: 'high'
  }
]

export const calculateSubmissionStats = (submissions: SubmissionRecord[]) => {
  return {
    submitted: submissions.filter(s => s.status === 'submitted').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length
  }
}

export const priorityLabels = {
  high: '高',
  medium: '中',
  low: '低'
}

export const priorityColors = {
  high: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300'
  },
  medium: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300'
  },
  low: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300'
  }
}

// 新增測試用例 - 狀態流程測試專用
export const additionalTestSubmissions: SubmissionRecord[] = [
  // 測試案例 1：即將被批准的項目
  {
    id: 'test_001',
    userId: '9',
    userName: '測試用戶 A',
    userDepartment: '測試部門',
    categoryId: 'diesel',
    categoryName: '柴油',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-29',
    amount: 100,
    unit: '公升',
    co2Emission: 250,
    priority: 'medium'
  },

  // 測試案例 2：即將被退回的項目
  {
    id: 'test_002',
    userId: '10',
    userName: '測試用戶 B',
    userDepartment: '測試部門',
    categoryId: 'electricity_bill',
    categoryName: '外購電力',
    scope: 2,
    status: 'submitted',
    submissionDate: '2024-03-29',
    amount: 5000,
    unit: '度',
    co2Emission: 2500,
    priority: 'high'
  },

  // 測試案例 3：已通過但需要修正的項目
  {
    id: 'test_003',
    userId: '11',
    userName: '測試用戶 C',
    userDepartment: '測試部門',
    categoryId: 'natural_gas',
    categoryName: '天然氣',
    scope: 1,
    status: 'approved',
    submissionDate: '2024-03-25',
    reviewDate: '2024-03-26',
    amount: 200,
    unit: '立方公尺',
    co2Emission: 400,
    reviewer: '張主管',
    comments: '已核准',
    priority: 'medium'
  },

  // 測試案例 4：已退回準備重新審核的項目
  {
    id: 'test_004',
    userId: '12',
    userName: '測試用戶 D',
    userDepartment: '測試部門',
    categoryId: 'gasoline',
    categoryName: '汽油',
    scope: 1,
    status: 'rejected',
    submissionDate: '2024-03-20',
    reviewDate: '2024-03-22',
    amount: 150,
    unit: '公升',
    co2Emission: 345,
    reviewer: '林主管',
    comments: '數據需要重新確認',
    priority: 'medium',
    reviewNotes: '油料使用量異常偏高，請提供相關憑證並重新計算。建議檢查是否包含非營業用途使用量。',
    reviewedAt: '2024-03-22 14:30',
    reviewerId: 'admin_002'
  },

  // 測試案例 5-8：批量操作測試用例
  {
    id: 'test_005',
    userId: '13',
    userName: '批量測試 A',
    userDepartment: '批量測試部',
    categoryId: 'lpg',
    categoryName: '液化石油氣',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-28',
    amount: 30,
    unit: '公斤',
    co2Emission: 90,
    priority: 'low'
  },
  {
    id: 'test_006',
    userId: '14',
    userName: '批量測試 B',
    userDepartment: '批量測試部',
    categoryId: 'acetylene',
    categoryName: '乙炔',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-28',
    amount: 20,
    unit: '公斤',
    co2Emission: 60,
    priority: 'low'
  },
  {
    id: 'test_007',
    userId: '15',
    userName: '批量測試 C',
    userDepartment: '批量測試部',
    categoryId: 'welding_rod',
    categoryName: '焊條',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-28',
    amount: 15,
    unit: '公斤',
    co2Emission: 30,
    priority: 'low'
  },
  {
    id: 'test_008',
    userId: '16',
    userName: '批量測試 D',
    userDepartment: '批量測試部',
    categoryId: 'wd40',
    categoryName: 'WD-40',
    scope: 1,
    status: 'submitted',
    submissionDate: '2024-03-28',
    amount: 8,
    unit: '公斤',
    co2Emission: 24,
    priority: 'low'
  }
]

// 合併所有提交記錄
export const allSubmissions = [...mockSubmissions, ...additionalTestSubmissions]

// 取得測試案例的輔助函數
export const getTestSubmission = (testId: string): SubmissionRecord | undefined => {
  return allSubmissions.find(sub => sub.id === testId)
}

// 取得特定狀態的測試項目
export const getTestSubmissionsByStatus = (status: UserStatus): SubmissionRecord[] => {
  return additionalTestSubmissions.filter(sub => sub.status === status)
}