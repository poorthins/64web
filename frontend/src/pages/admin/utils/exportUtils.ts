import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { mockUsers, mockSubmissions, energyCategories, UserStatus, SubmissionRecord } from '../data/mockData'

// 類別中文名稱對照表
export const categoryNameMap: Record<string, string> = {
  // 範疇一
  'diesel': '柴油發電機',
  'gasoline': '汽油使用',
  'natural_gas': '天然氣',
  'lpg': '液化石油氣',
  'coal': '煤炭使用',

  // 範疇二
  'electricity': '電費單',
  'renewable_energy': '再生能源憑證',

  // 範疇三
  'employee_commute': '員工通勤',
  'business_travel': '商務差旅',
  'paper_consumption': '紙張消耗',
  'waste_disposal': '廢棄物處理',
  'water_consumption': '水資源消耗',
  'upstream_transport': '上游運輸',
  'downstream_transport': '下游運輸'
}

// 檔案類型對照表
export const fileTypeMap: Record<string, string> = {
  'msds': 'MSDS安全資料表',
  'sds': 'MSDS安全資料表',
  '安全': 'MSDS安全資料表',
  'bill': '帳單',
  'invoice': '發票',
  'receipt': '收據',
  'certificate': '證明書',
  'report': '報告',
  'data': '資料',
  'record': '紀錄',
  'usage': '使用證明',
  'consumption': '消耗紀錄',
  'monthly': '月報',
  'annual': '年度統計報告',
  'quarterly': '季度報告'
}

// 月份對照表
export const monthMap: Record<string, string> = {
  '01': '1月', '02': '2月', '03': '3月', '04': '4月',
  '05': '5月', '06': '6月', '07': '7月', '08': '8月',
  '09': '9月', '10': '10月', '11': '11月', '12': '12月',
  'jan': '1月', 'feb': '2月', 'mar': '3月', 'apr': '4月',
  'may': '5月', 'jun': '6月', 'jul': '7月', 'aug': '8月',
  'sep': '9月', 'oct': '10月', 'nov': '11月', 'dec': '12月'
}

// 智慧檔案命名函數
export function smartFileRename(originalFileName: string, categoryId: string, submissionData?: any): string {
  const categoryName = categoryNameMap[categoryId] || categoryId
  const extension = originalFileName.split('.').pop() || 'pdf'
  const lowerFileName = originalFileName.toLowerCase()

  // 偵測 MSDS 檔案
  if (lowerFileName.includes('msds') || lowerFileName.includes('sds') || lowerFileName.includes('安全')) {
    return `${categoryName}_MSDS安全資料表.${extension}`
  }

  // 偵測年度檔案 (必須在月份檢測之前)
  if (lowerFileName.includes('annual') || lowerFileName.includes('year') || lowerFileName.includes('年度')) {
    return `${categoryName}_年度統計報告.${extension}`
  }

  // 偵測季度檔案
  if (lowerFileName.includes('quarter') || lowerFileName.includes('q1') || lowerFileName.includes('q2') ||
      lowerFileName.includes('q3') || lowerFileName.includes('q4') || lowerFileName.includes('季')) {
    return `${categoryName}_季度報告.${extension}`
  }

  // 偵測月份檔案 (更精確的模式匹配)
  let monthMatch = null
  let month = ''

  // 檢查中文月份模式 (1月-12月)
  monthMatch = lowerFileName.match(/([1-9]|1[0-2])月/)
  if (monthMatch) {
    month = monthMatch[0]
  }

  if (!monthMatch) {
    // 檢查英文月份縮寫
    monthMatch = lowerFileName.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)
    if (monthMatch) {
      const englishMonth = monthMatch[0].toLowerCase()
      month = monthMap[englishMonth] || monthMatch[0]
    }
  }

  if (!monthMatch) {
    // 檢查數字月份 (只匹配明確的月份模式，如 _03_ 或 03_)
    monthMatch = lowerFileName.match(/(?:^|_)(0[1-9]|1[0-2])(?:_|$)/)
    if (monthMatch) {
      const monthNum = parseInt(monthMatch[1])
      if (monthNum >= 1 && monthNum <= 12) {
        month = `${monthNum}月`
      } else {
        monthMatch = null
      }
    }
  }

  if (monthMatch) {
    // 偵測檔案類型
    let fileType = '使用證明'
    for (const [key, value] of Object.entries(fileTypeMap)) {
      if (lowerFileName.includes(key)) {
        fileType = value
        break
      }
    }

    return `${categoryName}_${month}_${fileType}.${extension}`
  }

  // 一般檔案命名
  let fileType = '資料'
  for (const [key, value] of Object.entries(fileTypeMap)) {
    if (lowerFileName.includes(key)) {
      fileType = value
      break
    }
  }

  return `${categoryName}_${fileType}.${extension}`
}

// 處理重複檔名
export function handleDuplicateFileName(fileName: string, existingNames: Set<string>): string {
  let finalName = fileName
  let counter = 1

  while (existingNames.has(finalName)) {
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex === -1) {
      finalName = `${fileName}_${counter}`
    } else {
      const nameWithoutExt = fileName.substring(0, lastDotIndex)
      const extension = fileName.substring(lastDotIndex)
      finalName = `${nameWithoutExt}_${counter}${extension}`
    }
    counter++
  }

  existingNames.add(finalName)
  return finalName
}

// 生成時間戳
export function generateTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

// 生成 Excel 工作表
export function generateUserExcel(users: any[], submissions: SubmissionRecord[] = []): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  // 使用者資料工作表
  const userData = users.map(user => ({
    '使用者ID': user.id,
    '姓名': user.name,
    '電子郵件': user.email,
    '部門': user.department,
    '狀態': user.status === 'active' ? '啟用' :
                      user.status === 'suspended' ? '停用' : '未知',
    '建立日期': user.createdAt || '2024-01-01',
    '最後登入': user.lastLogin || '未登入',
    '權限類別數量': user.energyCategories?.length || 0
  }))

  const userSheet = XLSX.utils.json_to_sheet(userData)
  XLSX.utils.book_append_sheet(workbook, userSheet, '使用者清單')

  // 提交紀錄工作表
  if (submissions.length > 0) {
    const submissionData = submissions.map(submission => ({
      '提交ID': submission.id,
      '使用者': submission.userName,
      '類別': categoryNameMap[submission.categoryId] || submission.categoryId,
      '數量': submission.amount,
      '單位': submission.unit,
      '狀態': submission.status === 'approved' ? '已通過' :
              submission.status === 'rejected' ? '已退回' :
               '未知',
      '提交日期': submission.submissionDate,
      '審核日期': submission.reviewDate || '未審核',
      '審核者': submission.reviewerId || '未審核',
      '備註': submission.reviewNotes || ''
    }))

    const submissionSheet = XLSX.utils.json_to_sheet(submissionData)
    XLSX.utils.book_append_sheet(workbook, submissionSheet, '提交紀錄')
  }

  // 類別統計工作表
  const categoryStats = energyCategories.map(category => {
    const categorySubmissions = submissions.filter(s => s.categoryId === category.id)
    const approved = categorySubmissions.filter(s => s.status === 'approved').length
    const pending = categorySubmissions.filter(s => s.status === 'submitted').length
    const rejected = categorySubmissions.filter(s => s.status === 'rejected').length

    return {
      '類別ID': category.id,
      '類別名稱': categoryNameMap[category.id] || category.name,
      '範疇': category.scope,
      '總提交數': categorySubmissions.length,
      '已通過': approved,
      '待審核': pending,
      '已退回': rejected,
      '通過率': categorySubmissions.length > 0 ?
                `${Math.round((approved / categorySubmissions.length) * 100)}%` : '0%'
    }
  })

  const categorySheet = XLSX.utils.json_to_sheet(categoryStats)
  XLSX.utils.book_append_sheet(workbook, categorySheet, '類別統計')

  return workbook
}

// 生成模擬檔案內容
export function generateMockFileContent(fileName: string, categoryId: string): Uint8Array {
  const content = `模擬檔案內容 - ${fileName}
類別：${categoryNameMap[categoryId] || categoryId}
生成時間：${new Date().toLocaleString('zh-TW')}
檔案大小：${Math.floor(Math.random() * 1000000)} bytes

這是一個模擬的檔案內容，用於展示智慧命名和打包功能。
實際使用時，這裡會是真實的檔案內容。`

  return new TextEncoder().encode(content)
}

// 建立 ZIP 檔案
export async function createZipExport(
  exportType: 'user' | 'department',
  userId?: string,
  department?: string
): Promise<void> {
  try {
    const zip = new JSZip()
    const timestamp = generateTimestamp()
    const usedFileNames = new Set<string>()

    // 根據匯出類型篩選資料
    let filteredUsers = mockUsers
    let filteredSubmissions = mockSubmissions
    let zipFileName = ''

    switch (exportType) {
      case 'user':
        if (userId) {
          filteredUsers = mockUsers.filter(u => u.id === userId)
          filteredSubmissions = mockSubmissions.filter(s => s.userId === userId)
          const user = filteredUsers[0]
          zipFileName = `個人資料_${user?.name || userId}_${timestamp}.zip`
        }
        break
      case 'department':
        if (department) {
          filteredUsers = mockUsers.filter(u => u.department === department)
          const userIds = filteredUsers.map(u => u.id)
          filteredSubmissions = mockSubmissions.filter(s => userIds.includes(s.userId))
          zipFileName = `部門資料_${department}_${timestamp}.zip`
        }
        break
    }

    // 生成 Excel 檔案
    const workbook = generateUserExcel(filteredUsers, filteredSubmissions)
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const excelFileName = `${exportType === 'user' ? '個人' :
                          exportType === 'department' ? '部門' : '系統'}_資料表_${timestamp}.xlsx`

    zip.file(excelFileName, excelBuffer)

    // 按類別建立資料夾並添加模擬檔案
    const categoryFolders: Record<string, any> = {}

    // 為每個提交紀錄建立對應的檔案
    for (const submission of filteredSubmissions) {
      const categoryName = categoryNameMap[submission.categoryId] || submission.categoryId

      if (!categoryFolders[categoryName]) {
        categoryFolders[categoryName] = zip.folder(categoryName)
      }

      // 模擬多個相關檔案
      const mockFiles = [
        `file_${Math.random().toString(36).substring(7)}.pdf`,
        `data_${Math.random().toString(36).substring(7)}.png`,
        `report_${Math.random().toString(36).substring(7)}.xlsx`,
        `msds_${Math.random().toString(36).substring(7)}.pdf`,
        `03_monthly_${Math.random().toString(36).substring(7)}.jpg`
      ]

      for (const mockFile of mockFiles.slice(0, Math.floor(Math.random() * 3) + 1)) {
        const smartName = smartFileRename(mockFile, submission.categoryId, submission)
        const finalName = handleDuplicateFileName(smartName, usedFileNames)
        const fileContent = generateMockFileContent(finalName, submission.categoryId)

        categoryFolders[categoryName].file(finalName, fileContent)
      }
    }

    // 生成檔案清單
    const fileList = Array.from(usedFileNames).sort()
    const fileListContent = `檔案清單 - ${zipFileName}
生成時間：${new Date().toLocaleString('zh-TW')}
總檔案數：${fileList.length}

智慧重新命名對照表：
===================

${fileList.map((fileName, index) => `${index + 1}. ${fileName}`).join('\n')}

說明：
- 所有檔案已依據類別和內容進行智慧重新命名
- MSDS 檔案自動標註為安全資料表
- 月份檔案自動加入時間標籤
- 重複檔名自動加上序號區分
`

    zip.file('檔案清單.txt', fileListContent)

    // 生成並下載 ZIP 檔案
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, zipFileName)

    console.log(`✅ 成功匯出：${zipFileName}`)
    console.log(`📁 包含 ${filteredUsers.length} 位使用者，${filteredSubmissions.length} 筆提交紀錄`)
    console.log(`📄 智慧重新命名 ${fileList.length} 個檔案`)

  } catch (error) {
    console.error('❌ 匯出失敗：', error)
    throw error
  }
}

// 快速匯出函數
export const exportUserData = (userId: string) => createZipExport('user', userId)
export const exportDepartmentData = (department: string) => createZipExport('department', undefined, department)

// 模擬檔案轉換展示
export function demonstrateFileRenaming(): void {
  const testFiles = [
    'file_abc123.pdf',
    'data_xyz789.png',
    'report_def456.xlsx',
    'msds_safety_data.pdf',
    '03_monthly_usage.jpg',
    'annual_summary_2024.pdf',
    'q1_report_ghi789.xlsx',
    'bill_invoice_123.pdf'
  ]

  const testCategories = ['diesel', 'natural_gas', 'electricity', 'employee_commute']

  console.log('🔄 智慧檔案重新命名展示：')
  console.log('='.repeat(50))

  testFiles.forEach((originalFile, index) => {
    const categoryId = testCategories[index % testCategories.length]
    const newName = smartFileRename(originalFile, categoryId)
    console.log(`${originalFile} → ${newName}`)
  })
}