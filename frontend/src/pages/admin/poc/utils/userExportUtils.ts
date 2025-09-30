import { ExportOptions } from '../components/UserExportModal'
import { mockUsers, mockSubmissions } from '../data/mockData'
import { categoryNameMap } from './exportUtils'

// 用戶匯出資料結構
export interface UserExportData {
  userInfo: {
    id: string
    name: string
    email: string
    company: string
    department: string
    phone: string
    targetYear: number
    activeCategories: string[]
    accountStatus: string
    createdAt: string
    lastLogin: string
  }

  submissions: Array<{
    id: string
    category: string
    categoryName: string
    scope: number
    year: number
    status: string
    totalAmount: number
    unit: string
    submittedAt: string
    reviewDate?: string
    reviewerId?: string
    reviewNotes?: string
    monthlyData: Record<string, number>
    co2Emission?: number
  }>

  exportInfo: {
    exportDate: string
    exportedBy: string
    dataRange: string
    selectedOptions: string[]
    totalRecords: number
  }
}

// 生成模擬的月度資料
function generateMockMonthlyData(): Record<string, number> {
  const monthlyData: Record<string, number> = {}
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

  months.forEach(month => {
    // 生成隨機數據，有些月份可能為 0
    monthlyData[month] = Math.random() > 0.3 ? Math.floor(Math.random() * 1000) + 100 : 0
  })

  return monthlyData
}

// 模擬用戶匯出邏輯
export async function simulateUserExport(
  userId: string,
  options: ExportOptions
): Promise<UserExportData> {
  // 模擬 API 延遲
  await new Promise(resolve => setTimeout(resolve, 1500))

  // 找到對應的用戶
  const user = mockUsers.find(u => u.id === userId)
  if (!user) {
    throw new Error('用戶不存在')
  }

  // 找到該用戶的所有提交記錄
  const userSubmissions = mockSubmissions.filter(s => s.userId === userId)

  // 根據選項篩選資料
  let filteredSubmissions = userSubmissions

  if (!options.submittedRecords) {
    filteredSubmissions = filteredSubmissions.filter(s => s.status !== 'submitted')
  }

  if (!options.rejectedRecords) {
    filteredSubmissions = filteredSubmissions.filter(s => s.status !== 'rejected')
  }

  // 建立匯出資料
  const exportData: UserExportData = {
    userInfo: {
      id: user.id,
      name: user.name,
      email: user.email,
      company: '示例科技有限公司', // 模擬公司名稱
      department: user.department,
      phone: '+886-2-1234-5678', // 模擬電話
      targetYear: 2024,
      activeCategories: ['diesel', 'electricity', 'employee_commute'], // 模擬啟用的類別
      accountStatus: user.status === 'approved' ? '啟用' :
                   '停用',
      createdAt: '2024-01-15',
      lastLogin: user.lastActivity
    },

    submissions: filteredSubmissions.map(submission => ({
      id: submission.id,
      category: submission.categoryId,
      categoryName: categoryNameMap[submission.categoryId] || submission.categoryName,
      scope: submission.scope,
      year: 2024,
      status: submission.status === 'approved' ? '已通過' :
              submission.status === 'rejected' ? '已退回' : '已提交',
      totalAmount: submission.amount,
      unit: submission.unit,
      submittedAt: submission.submissionDate,
      reviewDate: submission.reviewDate,
      reviewerId: submission.reviewerId,
      reviewNotes: options.includeRejectReasons ? submission.reviewNotes : undefined,
      monthlyData: generateMockMonthlyData(),
      co2Emission: submission.co2Emission
    })),

    exportInfo: {
      exportDate: new Date().toLocaleString('zh-TW'),
      exportedBy: '管理員', // 模擬匯出者
      dataRange: `${new Date().getFullYear()} 年度`,
      selectedOptions: getSelectedOptionNames(options),
      totalRecords: filteredSubmissions.length
    }
  }

  return exportData
}

// 獲取選擇的選項名稱
function getSelectedOptionNames(options: ExportOptions): string[] {
  const optionNames: string[] = []

  if (options.basicInfo) optionNames.push('基本資料')
  if (options.submittedRecords) optionNames.push('已提交記錄')
  if (options.rejectedRecords) optionNames.push('已退回記錄')
  if (options.includeRejectReasons) optionNames.push('退回原因')
  if (options.includeFileList) optionNames.push('檔案清單')

  return optionNames
}

// 格式化匯出資料為控制台輸出
export function formatExportDataForConsole(
  exportData: UserExportData,
  options: ExportOptions
): string {
  const { userInfo, submissions, exportInfo } = exportData

  let output = `
📊 ===== 用戶資料匯出報告 =====

👤 用戶基本資料：
   姓名：${userInfo.name}
   Email：${userInfo.email}
   公司：${userInfo.company}
   部門：${userInfo.department}
   電話：${userInfo.phone}
   目標年度：${userInfo.targetYear}
   帳戶狀態：${userInfo.accountStatus}
   建立日期：${userInfo.createdAt}
   最後登入：${userInfo.lastLogin}
   啟用類別：${userInfo.activeCategories.map(id => categoryNameMap[id] || id).join('、')}

📋 選擇的資料類型：
   ${exportInfo.selectedOptions.join('、')}

📊 填報記錄統計：
   總記錄數：${exportInfo.totalRecords} 筆
   已通過：${submissions.filter(s => s.status === '已通過').length} 筆
   待審核：${submissions.filter(s => s.status === '待審核').length} 筆
   已退回：${submissions.filter(s => s.status === '已退回').length} 筆

📄 詳細填報記錄：`

  if (submissions.length === 0) {
    output += '\n   無符合條件的記錄'
  } else {
    submissions.forEach((submission, index) => {
      output += `
   ${index + 1}. ${submission.categoryName} (${submission.category})
      範疇：${submission.scope}
      狀態：${submission.status}
      數量：${submission.totalAmount.toLocaleString()} ${submission.unit}
      提交時間：${submission.submittedAt}
      CO2排放：${submission.co2Emission?.toLocaleString() || 'N/A'} kgCO2e`

      if (submission.reviewNotes && options.includeRejectReasons) {
        output += `
      退回原因：${submission.reviewNotes}`
      }

      if (options.includeFileList) {
        // 模擬檔案清單
        const fileCount = Math.floor(Math.random() * 3) + 1
        output += `
      相關檔案：${fileCount} 個檔案`
        for (let i = 1; i <= fileCount; i++) {
          output += `
        - ${submission.categoryName}_${i}.pdf`
        }
      }
    })
  }

  output += `

📦 匯出資訊：
   匯出時間：${exportInfo.exportDate}
   匯出人員：${exportInfo.exportedBy}
   資料範圍：${exportInfo.dataRange}
   檔案格式：Excel (.xlsx)

💡 正式版本將生成實際的 Excel 檔案，包含以下工作表：
   1. 基本資料 - 用戶個人和公司資訊
   2. 填報記錄 - 所有填報資料的詳細記錄
   3. 月度數據 - 各類別的月度使用量統計
   4. 審核記錄 - 審核歷程和退回原因
   5. 檔案清單 - 所有上傳檔案的詳細清單
   6. 匯出摘要 - 匯出資訊和統計數據

📊 ===== 匯出完成 =====
`

  return output
}

// 生成檔案名稱
export function generateExportFileName(userName: string, companyName: string): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const cleanUserName = userName.replace(/[^\w\u4e00-\u9fa5]/g, '')
  const cleanCompanyName = companyName.replace(/[^\w\u4e00-\u9fa5]/g, '').slice(0, 10)

  return `${cleanUserName}_${cleanCompanyName}_匯出_${timestamp}.xlsx`
}

// 主要匯出函數（POC 版本）
export async function exportSingleUser(
  userId: string,
  options: ExportOptions
): Promise<void> {
  try {
    console.log('🚀 開始匯出用戶資料...')

    // 模擬匯出過程
    const exportData = await simulateUserExport(userId, options)

    // 格式化並輸出到控制台
    const formattedOutput = formatExportDataForConsole(exportData, options)
    console.log(formattedOutput)

    // 生成檔案名稱
    const fileName = generateExportFileName(exportData.userInfo.name, exportData.userInfo.company)
    console.log(`📁 建議檔案名稱：${fileName}`)

    console.log('✅ 用戶資料匯出完成！')

  } catch (error) {
    console.error('❌ 用戶資料匯出失敗：', error)
    throw error
  }
}