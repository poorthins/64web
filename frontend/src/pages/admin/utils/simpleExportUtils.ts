import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { EnergyEntry } from '../../../api/entries'
import { getEntryFiles, type EvidenceFile, getFileUrlForAdmin } from '../../../api/files'
import { extractRecords, getEntryMetadata, extractSpecs, getSpecName } from './dataExtractor'
import { findRelatedFiles, simpleRename, handleDuplicateFileName, getAllEntryFiles } from './fileMapper'

// 類別中文名稱（從舊版保留）
export const categoryNameMap: Record<string, string> = {
  'diesel': '柴油(移動源)',
  'diesel_generator': '柴油發電機',
  'gasoline': '汽油',
  'natural_gas': '天然氣',
  'lpg': '液化石油氣',
  'acetylene': '乙炔',
  'refrigerant': '冷媒',
  'wd40': 'WD-40',
  'urea': '尿素',
  'fire_extinguisher': '滅火器',
  'welding_rod': '焊條',
  'gas_cylinder': '氣體鋼瓶',
  'other_energy_sources': '其他使用能源',
  'septic_tank': '化糞池',
  'electricity': '電費單',
  'employee_commute': '員工通勤'
}

/**
 * 根據類別生成對應的 Excel 列
 */
function generateRowsByCategory(
  entry: EnergyEntry,
  files: EvidenceFile[]
): any[] {
  const records = extractRecords(entry)
  const metadata = getEntryMetadata(entry)
  const categoryName = categoryNameMap[entry.page_key] || entry.page_key

  console.log(`   ${categoryName}: ${records.length} 筆記錄, ${files.length} 個檔案`)

  if (records.length === 0) {
    console.warn(`   ⚠️ ${categoryName} 沒有記錄資料`)
    return []
  }

  const pageKey = entry.page_key

  // 根據不同類別生成不同欄位
  switch (pageKey) {
    case 'diesel':
    case 'gasoline':
    case 'diesel_generator':
      // 日期 + 使用量格式
      return records.map((record, idx) => {
        const relatedFiles = findRelatedFiles(pageKey, record, idx, files)
        const finalFiles = relatedFiles.length > 0 ? relatedFiles : files

        // 診斷日誌
        if (finalFiles.length === 0) {
          console.warn(`⚠️ 記錄 ${idx}: record.id=${record.id}, 找不到檔案 (entry 共 ${files.length} 個檔案)`)
        } else {
          console.log(`✅ 記錄 ${idx}: 找到 ${finalFiles.length} 個檔案`)
        }

        return {
          '日期': record.date || '',
          '使用量(L)': record.quantity || 0,
          '佐證檔案': finalFiles.map(f => f.file_name).join(', ')
        }
      })

    case 'electricity':
      // 電費格式
      const meters = metadata.meters || []
      const meterMap = new Map<string, string>()
      meters.forEach((m: any) => meterMap.set(m.id, m.meterNumber || ''))

      return records.map((record, index) => {
        const relatedFiles = findRelatedFiles(pageKey, record, index, files)
        return {
          '電表電號': meterMap.get(record.meterId || '') || '',
          '計費起日': record.billingStartDate || '',
          '計費迄日': record.billingEndDate || '',
          '使用度數': record.billingUnits || 0,
          '佐證檔案': relatedFiles.map(f => f.file_name).join(', ')
        }
      })

    case 'natural_gas':
      // 天然氣格式
      const heatValue = metadata.heatValue || 0
      const heatValueFiles = files.filter(f => f.file_type === 'other')
      const heatValueFileNames = heatValueFiles.map(f => f.file_name).join(', ')

      return records.map((record, index) => {
        const billFiles = findRelatedFiles(pageKey, record, index, files)
        return {
          '計費起日': record.billingStartDate || '',
          '計費迄日': record.billingEndDate || '',
          '使用度數': record.billingUnits || 0,
          '熱值(kcal/m³)': heatValue,
          '帳單佐證': billFiles.map(f => f.file_name).join(', '),
          '熱值佐證': heatValueFileNames
        }
      })

    case 'acetylene':
    case 'wd40':
    case 'lpg':
      // Type 3 頁面：購買日期 + 品項 + 數量 + 品項佐證 + 數量佐證
      const specs = extractSpecs(entry)

      console.log(`[acetylene] 所有檔案:`, files.map(f => ({
        id: f.id,
        name: f.file_name,
        type: f.file_type,
        record_id: f.record_id
      })))

      return records.map((record, idx) => {
        const specName = getSpecName(record.specId, specs)

        // 先計算數量佐證（購買單據，綁定 record.id）
        const quantityFilesRaw = findRelatedFiles(pageKey, record, idx, files)

        // 去重：基於檔案名稱，避免同一檔案出現在兩個欄位
        const quantityFileNames = new Set(quantityFilesRaw.map(f => f.file_name))
        const quantityFiles = quantityFilesRaw.reduce((acc, file) => {
          const existing = acc.find(f => f.file_name === file.file_name)
          if (!existing) acc.push(file)
          return acc
        }, [] as typeof quantityFilesRaw)

        // 品項佐證資料（重量證明，綁定 spec.id）
        // ⚠️ 排除數量佐證的檔案名稱，避免重複
        const specFilesRaw = files.filter(f =>
          f.file_type === 'other' &&
          f.record_id === record.specId
        )

        // 去重：排除已經在數量佐證中的檔案名稱
        const specFiles = specFilesRaw.filter(f => !quantityFileNames.has(f.file_name))
          .reduce((acc, file) => {
            const existing = acc.find(f => f.file_name === file.file_name)
            if (!existing) acc.push(file)
            return acc
          }, [] as typeof specFilesRaw)

        return {
          '購買日期': record.date || '',
          '品項': specName,
          '數量': record.quantity || 0,
          '品項佐證資料': specFiles.map(f => f.file_name).join(', '),
          '數量佐證資料': quantityFiles.map(f => f.file_name).join(', ')
        }
      })

    case 'refrigerant':
      // 冷媒格式
      return records.map((record, idx) => {
        const relatedFiles = findRelatedFiles(pageKey, record, idx, files)
        return {
          '廠牌名稱': record.brandName || '',
          '型號': record.modelNumber || '',
          '設備位置': record.equipmentLocation || '',
          '冷媒類型': record.refrigerantType || '',
          '填充量': record.fillAmount || 0,
          '單位': record.unit || 'kg',
          '佐證檔案': relatedFiles.map(f => f.file_name).join(', ')
        }
      })

    case 'fire_extinguisher':
      // Type 3 頁面：購買日期 + 品項 + 數量 + 品項佐證 + 數量佐證 + 檢修表
      const specsFE = extractSpecs(entry)
      const inspectionFiles = files.filter(f => f.file_type === 'other' && !f.record_id)
      const inspectionFileNames = inspectionFiles.map(f => f.file_name).join(', ')

      return records.map((record, idx) => {
        const specName = getSpecName(record.specId, specsFE)

        // 先計算數量佐證（購買單據，綁定 record.id）
        const quantityFiles = findRelatedFiles(pageKey, record, idx, files)
        const quantityFileIds = new Set(quantityFiles.map(f => f.id))

        // 品項佐證資料（規格證明，綁定 spec.id）
        // ⚠️ 排除數量佐證的檔案，避免重複
        const specFiles = files.filter(f =>
          f.file_type === 'other' &&
          f.record_id === record.specId &&
          !quantityFileIds.has(f.id)  // 排除數量佐證的檔案
        )

        return {
          '購買日期': record.date || '',
          '品項': specName,
          '數量': record.quantity || 0,
          '品項佐證資料': specFiles.map(f => f.file_name).join(', '),
          '數量佐證資料': quantityFiles.map(f => f.file_name).join(', '),
          '安全檢修表佐證': inspectionFileNames
        }
      })

    case 'urea':
      // 尿素格式
      const msdsFiles = files.filter(f => f.file_type === 'msds')
      const msdsFileNames = msdsFiles.map(f => f.file_name).join(', ')

      return records.map((record, idx) => {
        const usageFiles = findRelatedFiles(pageKey, record, idx, files)
        return {
          '日期': record.date || '',
          '使用量(L)': record.quantity || 0,
          '使用佐證': usageFiles.map(f => f.file_name).join(', '),
          'MSDS佐證': msdsFileNames
        }
      })

    case 'welding_rod':
      // Type 3 頁面：購買日期 + 品項 + 數量 + 品項佐證 + 數量佐證
      const specsWR = extractSpecs(entry)

      return records.map((record, idx) => {
        const specName = getSpecName(record.specId, specsWR)

        // 先計算數量佐證（購買單據，綁定 record.id）
        const quantityFiles = findRelatedFiles(pageKey, record, idx, files)
        const quantityFileIds = new Set(quantityFiles.map(f => f.id))

        // 品項佐證資料（規格證明，綁定 spec.id）
        // ⚠️ 排除數量佐證的檔案，避免重複
        const specFiles = files.filter(f =>
          f.file_type === 'other' &&
          f.record_id === record.specId &&
          !quantityFileIds.has(f.id)  // 排除數量佐證的檔案
        )

        return {
          '購買日期': record.date || '',
          '品項': specName,
          '數量': record.quantity || 0,
          '品項佐證資料': specFiles.map(f => f.file_name).join(', '),
          '數量佐證資料': quantityFiles.map(f => f.file_name).join(', ')
        }
      })

    case 'employee_commute':
      // 員工通勤（純月份）
      return records.map(record => ({
        '月份': record.month ? `${record.month}月` : '',
        '使用量': record.quantity || record.usage || 0
      }))

    case 'gas_cylinder':
      // Type 3 頁面：購買日期 + 品項 + 數量 + 品項佐證 + 數量佐證
      const specsGC = extractSpecs(entry)
      return records.map((record, idx) => {
        const specName = getSpecName(record.specId, specsGC)

        // 先計算數量佐證（購買單據，綁定 record.id）
        const quantityFiles = findRelatedFiles(pageKey, record, idx, files)
        const quantityFileIds = new Set(quantityFiles.map(f => f.id))

        // 品項佐證資料（規格證明，綁定 spec.id）
        // ⚠️ 排除數量佐證的檔案，避免重複
        const specFiles = files.filter(f =>
          f.file_type === 'other' &&
          f.record_id === record.specId &&
          !quantityFileIds.has(f.id)  // 排除數量佐證的檔案
        )

        return {
          '購買日期': record.date || '',
          '品項': specName,
          '數量': record.quantity || 0,
          '品項佐證資料': specFiles.map(f => f.file_name).join(', '),
          '數量佐證資料': quantityFiles.map(f => f.file_name).join(', ')
        }
      })

    case 'septic_tank':
    case 'other_energy_sources':
      // 純月份格式（含佐證）
      return records.map((record, idx) => {
        const relatedFiles = findRelatedFiles(pageKey, record, idx, files)
        return {
          '月份': record.month ? `${record.month}月` : '',
          '使用量': record.quantity || record.usage || 0,
          '佐證檔案': relatedFiles.map(f => f.file_name).join(', ')
        }
      })

    default:
      // 預設格式（fallback）
      return records.map((record, idx) => {
        const relatedFiles = findRelatedFiles(pageKey, record, idx, files)
        const finalFiles = relatedFiles.length > 0 ? relatedFiles : files
        return {
          '日期': record.date || '',
          '月份': record.month ? `${record.month}月` : '',
          '使用量': record.quantity || record.usage || 0,
          '單位': record.unit || entry.unit || '',
          '佐證檔案': finalFiles.map(f => f.file_name).join(', ')
        }
      })
  }
}

/**
 * 生成多工作表 Excel（按類別分工作表）
 */
export function generateUnifiedExcel(
  entries: EnergyEntry[],
  filesMap: Map<string, EvidenceFile[]>
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  console.log(`📊 [simpleExport] 開始生成 Excel，共 ${entries.length} 筆 entry`)

  // 按類別分組
  const entriesByCategory = entries.reduce((acc, entry) => {
    const key = entry.page_key || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {} as Record<string, EnergyEntry[]>)

  // 為每個類別建立工作表
  Object.entries(entriesByCategory).forEach(([pageKey, pageEntries]) => {
    const categoryName = categoryNameMap[pageKey] || pageKey
    const allRows: any[] = []

    pageEntries.forEach(entry => {
      const files = filesMap.get(entry.id) || []
      const rows = generateRowsByCategory(entry, files)
      allRows.push(...rows)
    })

    if (allRows.length > 0) {
      const sheet = XLSX.utils.json_to_sheet(allRows)
      XLSX.utils.book_append_sheet(workbook, sheet, categoryName)
      console.log(`✅ [simpleExport] 建立工作表「${categoryName}」，${allRows.length} 行`)
    } else {
      console.warn(`⚠️ [simpleExport] ${categoryName} 沒有資料`)
    }
  })

  return workbook
}

/**
 * 下載單個檔案
 */
async function downloadFile(
  filePath: string,
  userId: string,
  timeoutMs: number = 30000
): Promise<Blob> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const fileUrl = await getFileUrlForAdmin(filePath, userId, true)
    const response = await fetch(fileUrl, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    if (blob.size === 0) {
      throw new Error('檔案大小為 0')
    }

    return blob
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('下載超時')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 批次下載檔案
 */
async function batchDownloadFiles(
  files: EvidenceFile[],
  userId: string,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<Map<string, { blob?: Blob; originalName: string; error?: string }>> {
  const results = new Map<string, { blob?: Blob; originalName: string; error?: string }>()
  const maxConcurrent = 5
  let completed = 0

  console.log(`🚀 [batchDownload] 開始下載 ${files.length} 個檔案`)

  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent)

    const batchResults = await Promise.allSettled(
      batch.map(async (file) => {
        const blob = await downloadFile(file.file_path, userId)
        return { fileId: file.id, blob, originalName: file.file_name }
      })
    )

    batchResults.forEach((result, index) => {
      const file = batch[index]
      completed++

      if (result.status === 'fulfilled') {
        results.set(result.value.fileId, {
          blob: result.value.blob,
          originalName: result.value.originalName
        })
        console.log(`✅ [${completed}/${files.length}] ${file.file_name}`)
      } else {
        results.set(file.id, {
          originalName: file.file_name,
          error: result.reason?.message || '下載失敗'
        })
        console.error(`❌ [${completed}/${files.length}] ${file.file_name}: ${result.reason?.message}`)
      }

      onProgress?.(completed, files.length, file.file_name)
    })
  }

  return results
}

/**
 * 生成時間戳
 */
function generateTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

/**
 * 主要匯出函式：Excel + 佐證資料 → ZIP
 */
export async function exportUserEntriesWithFiles(
  userId: string,
  userName: string,
  entries: EnergyEntry[],
  onProgress?: (status: string, current?: number, total?: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const errors: string[] = []
  let successCount = 0
  let failedCount = 0

  try {
    if (!entries || entries.length === 0) {
      throw new Error('沒有可匯出的資料')
    }

    onProgress?.('正在準備資料...')

    // 1. 取得所有檔案
    console.log('📁 [export] 取得所有檔案記錄...')
    const filesMap = new Map<string, EvidenceFile[]>()
    for (const entry of entries) {
      try {
        const files = await getEntryFiles(entry.id)
        filesMap.set(entry.id, files)
        console.log(`   Entry ${entry.id}: ${files.length} 個檔案`)
      } catch (error) {
        console.warn(`無法取得 entry ${entry.id} 的檔案:`, error)
        filesMap.set(entry.id, [])
      }
    }

    // 收集所有檔案
    const allFiles: EvidenceFile[] = []
    filesMap.forEach(files => allFiles.push(...files))

    console.log(`📊 總共 ${allFiles.length} 個檔案`)

    if (allFiles.length === 0) {
      console.warn('⚠️ 沒有佐證資料，只匯出 Excel')
    }

    // 2. 下載檔案
    let downloadResults = new Map<string, { blob?: Blob; originalName: string; error?: string }>()

    if (allFiles.length > 0) {
      onProgress?.('正在下載佐證資料...', 0, allFiles.length)
      downloadResults = await batchDownloadFiles(
        allFiles,
        userId,
        (current, total, fileName) => {
          onProgress?.(`正在下載... ${fileName}`, current, total)
        }
      )
    }

    // 3. 重命名檔案
    onProgress?.('正在處理檔案名稱...')
    const existingNames = new Set<string>()
    const renamedFiles = new Map<string, { blob: Blob; newName: string; category: string }>()

    // 建立檔案 ID → entry 的對照表
    const fileIdToEntry = new Map<string, EnergyEntry>()
    filesMap.forEach((files, entryId) => {
      const entry = entries.find(e => e.id === entryId)
      if (entry) {
        files.forEach(file => {
          fileIdToEntry.set(file.id, entry)
        })
      }
    })

    downloadResults.forEach((result, fileId) => {
      if (result.error || !result.blob) {
        errors.push(`${result.originalName}: ${result.error || '下載失敗'}`)
        failedCount++
        return
      }

      const entry = fileIdToEntry.get(fileId)
      const categoryId = entry?.page_key || 'unknown'
      const categoryName = categoryNameMap[categoryId] || categoryId

      // 簡單前綴命名
      const renamedFileName = simpleRename(result.originalName, categoryName)
      const finalName = handleDuplicateFileName(renamedFileName, existingNames)

      renamedFiles.set(fileId, {
        blob: result.blob,
        newName: finalName,
        category: categoryName
      })

      successCount++
    })

    console.log(`✅ 成功：${successCount} 個檔案`)
    console.log(`❌ 失敗：${failedCount} 個檔案`)

    // 4. 生成 Excel
    onProgress?.('正在生成 Excel...')
    const workbook = generateUnifiedExcel(entries, filesMap)

    if (workbook.SheetNames.length === 0) {
      throw new Error('沒有可匯出的資料')
    }

    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })

    // 5. 打包 ZIP
    onProgress?.('正在打包 ZIP...')
    const zip = new JSZip()

    // 加入 Excel
    const timestamp = generateTimestamp()
    const excelFileName = `${userName}_能源填報資料_${timestamp}.xlsx`
    zip.file(excelFileName, excelBuffer)

    // 按類別組織佐證資料
    const filesByCategory = new Map<string, Array<{ blob: Blob; newName: string }>>()

    renamedFiles.forEach(({ blob, newName, category }) => {
      if (!filesByCategory.has(category)) {
        filesByCategory.set(category, [])
      }
      filesByCategory.get(category)!.push({ blob, newName })
    })

    console.log(`📁 [ZIP] 按 ${filesByCategory.size} 個類別組織檔案`)

    // 加入檔案到 ZIP
    filesByCategory.forEach((files, categoryName) => {
      console.log(`📂 ${categoryName}/  包含 ${files.length} 個檔案`)
      files.forEach(({ blob, newName }) => {
        zip.file(`${categoryName}/${newName}`, blob)
      })
    })

    // 6. 下載 ZIP
    onProgress?.('正在生成 ZIP 檔案...')
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipFileName = `${userName}_能源填報資料_${timestamp}.zip`
    saveAs(zipBlob, zipFileName)

    console.log(`✅ 成功匯出：${zipFileName}`)
    console.log(`📄 包含 ${workbook.SheetNames.length} 個工作表`)
    console.log(`📋 總共 ${entries.length} 筆 entry`)
    console.log(`📁 包含 ${successCount} 個檔案`)

    return { success: successCount, failed: failedCount, errors }
  } catch (error) {
    console.error('❌ 匯出失敗：', error)
    throw error
  }
}
