import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { EnergyEntry } from '../../../api/entries'
import { getEntryFiles, type EvidenceFile } from '../../../api/files'

// 檔案命名上下文介面
interface FileNamingContext {
  categoryId: string
  file: EvidenceFile
  groupIndex?: number           // 組別編號（第一組、第二組...）
  generatorLocation?: string    // 發電機位置
  month?: number               // 月份（1-12）
}

// ⭐ 輔助函式：格式化檔案列表（使用智慧重新命名）
function formatFileNames(
  files: EvidenceFile[],
  categoryId: string,
  context?: Partial<FileNamingContext>
): string {
  if (!files || files.length === 0) return ''

  // ⭐ 使用 Set 來處理重複檔名
  const existingNames = new Set<string>()

  return files
    .map(file => {
      const baseFileName = smartFileRename(file.file_name, {
        categoryId,
        file,
        ...context
      })
      // 處理重複檔名（第一個不加編號，第二個開始 _1, _2...）
      return handleDuplicateFileName(baseFileName, existingNames)
    })
    .join(', ')
}

// 類別中文名稱對照表
export const categoryNameMap: Record<string, string> = {
  // 範疇一
  'diesel': '柴油(移動源)',
  'diesel_generator': '柴油(固定源)',
  'gasoline': '汽油',
  'natural_gas': '天然氣',
  'lpg': '液化石油氣',
  'acetylene': '乙炔',
  'refrigerant': '冷媒',
  'wd40': 'WD-40',
  'urea': '尿素',
  'fire_extinguisher': '滅火器',
  'welding_rod': '焊條',
  'septic_tank': '化糞池',

  // 範疇二
  'electricity': '電費單',

  // 範疇三
  'employee_commute': '員工通勤'
}

// Excel 轉換函數：柴油頁面（使用記錄格式）
interface DieselExcelRow {
  '日期': string
  '使用量(L)': number
  '佐證檔案': string
}

export function convertDieselEntry(entry: EnergyEntry, files: EvidenceFile[]): DieselExcelRow[] {
  // ⭐ 在最開頭就輸出日誌，確認函數有被調用
  console.log(`🔍 [convertDieselEntry] 開始處理 Entry ${entry.id} (${entry.page_key})`)

  try {
    // ⭐ 增加多種資料路徑容錯處理（支援直接陣列和 .records 格式）
    const records = entry.payload?.gasolineData ||                // ✅ 汽油頁面
                    entry.payload?.gasolineData?.records ||
                    entry.payload?.dieselGeneratorData ||         // ✅ 柴油發電機加油版
                    entry.payload?.dieselGeneratorData?.records ||
                    entry.payload?.dieselData ||                  // ✅ 柴油頁面（原有）
                    entry.payload?.dieselData?.records ||
                    entry.payload?.records ||
                    entry.extraPayload?.gasolineData ||           // ✅ 汽油頁面
                    entry.extraPayload?.gasolineData?.records ||
                    entry.extraPayload?.dieselGeneratorData ||    // ✅ 柴油發電機加油版
                    entry.extraPayload?.dieselGeneratorData?.records ||
                    entry.extraPayload?.dieselData ||             // ✅ 柴油頁面（原有）
                    entry.extraPayload?.dieselData?.records ||
                    entry.extraPayload?.records ||
                    []

    console.log(`[convertDieselEntry] Entry ${entry.id}: 找到 ${records.length} 筆記錄`)

    if (records.length === 0) {
      console.warn(`⚠️ [convertDieselEntry] Entry ${entry.id} 沒有記錄資料`, {
        payload: entry.payload,
        extraPayload: entry.extraPayload
      })
    }

    // ⭐ 建立 groupId → groupIndex 映射
    const uniqueGroupIds: string[] = []
    const groupIdMap = new Map<string, number>()

    records.forEach((r: any) => {
      if (r.groupId && !groupIdMap.has(r.groupId)) {
        groupIdMap.set(r.groupId, uniqueGroupIds.length)
        uniqueGroupIds.push(r.groupId)
      }
    })

    console.log(`[convertDieselEntry] Entry ${entry.id}: 找到 ${uniqueGroupIds.length} 個群組`)

    return records
      .filter((r: any) => r.quantity > 0)
      .map((record: any, index: number) => {
        // 根據 record.id 找到對應的檔案（因為檔案是綁定到 recordId 的）
        const recordFiles = files.filter(f =>
          f.file_type === 'usage_evidence' &&
          f.record_id === record.id
        )

        // 取得 groupIndex（如果有 groupId）
        const groupIndex = record.groupId ? groupIdMap.get(record.groupId) : undefined

        return {
          '日期': record.date || '',
          '使用量(L)': record.quantity || 0,
          '佐證檔案': formatFileNames(recordFiles, entry.page_key, { groupIndex })
        }
      })
  } catch (error) {
    console.error(`❌ [convertDieselEntry] Entry ${entry.id} 轉換失敗:`, error)
    console.error('資料結構:', { payload: entry.payload, extraPayload: entry.extraPayload })
    return []
  }
}

// Excel 轉換函數：柴油發電機測試版（多台發電機資料）
interface DieselGeneratorTestExcelRow {
  '位置': string
  '功率(kW)': number
  '測試頻率': string
  '測試時間(分)': number
  '年總測試時間(分)': number
  '佐證檔案': string
}

export function convertDieselGeneratorTestEntry(entry: EnergyEntry, files: EvidenceFile[]): DieselGeneratorTestExcelRow[] {
  console.log(`🔍 [convertDieselGeneratorTestEntry] 開始處理測試版 Entry ${entry.id}`)

  try {
    // ⭐ 從 extraPayload.generators 或 payload.generators 讀取
    const generators = entry.extraPayload?.generators ||
                       entry.payload?.generators ||
                       []

    console.log(`[convertDieselGeneratorTestEntry] Entry ${entry.id}: 找到 ${generators.length} 台發電機`)

    if (generators.length === 0) {
      console.warn(`⚠️ [convertDieselGeneratorTestEntry] Entry ${entry.id} 沒有發電機資料`, {
        extraPayload: entry.extraPayload,
        payload: entry.payload
      })
      return []
    }

    return generators.map((gen: any) => {
      // 根據 record_id (gen.id) 找到對應的銘牌檔案
      const genFiles = files.filter(f =>
        f.file_type === 'other' &&
        f.record_id === gen.id
      )

      return {
        '位置': gen.generatorLocation || '',
        '功率(kW)': gen.powerRating || 0,
        '測試頻率': gen.testFrequency || '',
        '測試時間(分)': gen.testDuration || 0,
        '年總測試時間(分)': gen.annualTestTime || 0,
        '佐證檔案': formatFileNames(genFiles, entry.page_key, {
          generatorLocation: gen.generatorLocation
        })
      }
    })
  } catch (error) {
    console.error(`❌ [convertDieselGeneratorTestEntry] Entry ${entry.id} 轉換失敗:`, error)
    console.error('資料結構:', { payload: entry.payload, extraPayload: entry.extraPayload })
    return []
  }
}

// Excel 轉換函數：電費單頁面（電表+帳單格式）
interface ElectricityExcelRow {
  '電表電號': string
  '計費起日': string
  '計費迄日': string
  '使用度數': number
  '佐證檔案': string
}

export function convertElectricityEntry(entry: EnergyEntry, files: EvidenceFile[]): ElectricityExcelRow[] {
  try {
    // ⭐ 增加多種資料路徑容錯處理
    const billData = entry.extraPayload?.billData ||
                     entry.payload?.billData ||
                     []
    const meters = entry.extraPayload?.meters ||
                   entry.payload?.meters ||
                   []

    console.log(`[convertElectricityEntry] Entry ${entry.id}: 找到 ${billData.length} 筆帳單, ${meters.length} 個電表`)

    if (!Array.isArray(billData)) {
      console.warn(`⚠️ [convertElectricityEntry] Entry ${entry.id} billData 不是陣列`)
      return []
    }

    if (billData.length === 0) {
      console.warn(`⚠️ [convertElectricityEntry] Entry ${entry.id} 沒有帳單資料`, {
        extraPayload: entry.extraPayload,
        payload: entry.payload
      })
    }

    // 建立電表 ID 對應電號的 Map
    const meterMap = new Map<string, string>()
    meters.forEach((meter: any) => {
      meterMap.set(meter.id, meter.meterNumber || '')
    })

    return billData.map((bill: any, index: number) => {
      // 根據 record_index 找到對應的檔案
      const recordFiles = files.filter(f =>
        f.file_type === 'usage_evidence' &&
        f.record_index === index
      )

      return {
        '電表電號': meterMap.get(bill.meterId || '') || '',
        '計費起日': bill.billingStartDate || '',
        '計費迄日': bill.billingEndDate || '',
        '使用度數': bill.billingUnits || 0,
        '佐證檔案': formatFileNames(recordFiles, entry.page_key)
      }
    })
  } catch (error) {
    console.error(`❌ [convertElectricityEntry] Entry ${entry.id} 轉換失敗:`, error)
    console.error('資料結構:', { payload: entry.payload, extraPayload: entry.extraPayload })
    return []
  }
}

// Excel 轉換函數：天然氣頁面（帳單+熱值格式）
interface NaturalGasExcelRow {
  '計費起日': string
  '計費迄日': string
  '使用度數': number
  '熱值(kcal/m³)': number
  '帳單佐證': string
  '熱值佐證': string
}

export function convertNaturalGasEntry(entry: EnergyEntry, files: EvidenceFile[]): NaturalGasExcelRow[] {
  try {
    // ⭐ 增加多種資料路徑容錯處理
    const billData = entry.extraPayload?.billData ||
                     entry.payload?.billData ||
                     []
    const heatValue = entry.extraPayload?.heatValue ||
                      entry.payload?.heatValue ||
                      0

    console.log(`[convertNaturalGasEntry] Entry ${entry.id}: 找到 ${billData.length} 筆帳單, 熱值=${heatValue}`)

    if (!Array.isArray(billData)) {
      console.warn(`⚠️ [convertNaturalGasEntry] Entry ${entry.id} billData 不是陣列`)
      return []
    }

    if (billData.length === 0) {
      console.warn(`⚠️ [convertNaturalGasEntry] Entry ${entry.id} 沒有帳單資料`, {
        extraPayload: entry.extraPayload,
        payload: entry.payload
      })
    }

    // 找出熱值佐證檔案（file_type = 'other'，沒有 record_index）
    const heatValueFiles = files.filter(f => f.file_type === 'other')
    const heatValueFileNames = formatFileNames(heatValueFiles, entry.page_key)

    return billData.map((bill: any, index: number) => {
      // 根據 record_index 找到對應的帳單檔案
      const billFiles = files.filter(f =>
        f.file_type === 'usage_evidence' &&
        f.record_index === index
      )

      return {
        '計費起日': bill.billingStartDate || '',
        '計費迄日': bill.billingEndDate || '',
        '使用度數': bill.billingUnits || 0,
        '熱值(kcal/m³)': heatValue,
        '帳單佐證': formatFileNames(billFiles, entry.page_key),
        '熱值佐證': heatValueFileNames  // 每筆帳單都顯示相同的熱值佐證
      }
    })
  } catch (error) {
    console.error(`❌ [convertNaturalGasEntry] Entry ${entry.id} 轉換失敗:`, error)
    console.error('資料結構:', { payload: entry.payload, extraPayload: entry.extraPayload })
    return []
  }
}

// Excel 轉換函數：容量+數量格式（乙炔、WD-40、液化石油氣）
export function convertCapacityQuantityEntry(entry: EnergyEntry, files: EvidenceFile[]): any[] {
  try {
    const unitCapacity = entry.payload?.unitCapacity || 0
    const carbonRate = entry.payload?.carbonRate || 0  // WD-40 含碳率
    const monthlyQuantity = entry.payload?.monthlyQuantity || {}
    const monthly = entry.payload?.monthly || {}

    // 取得單位（從 entry.unit 或預設為 kg）
    const unit = entry.unit || 'kg'
    const unitLabel = unit === 'kg' ? 'kg' : unit

    // 根據 page_key 決定數量單位和欄位標題
    let quantityUnit = '瓶'
    let capacityLabel = '單位重量'  // 預設標籤

    if (entry.page_key === 'wd40') {
      quantityUnit = '罐'
      capacityLabel = '單位容量'
    } else if (entry.page_key === 'lpg') {
      quantityUnit = '瓶'
      capacityLabel = '單位重量'
    } else if (entry.page_key === 'acetylene') {
      quantityUnit = '瓶'
      capacityLabel = '單位重量'
    }

    // 動態生成欄位標題（加上單位）
    const capacityColumnName = `${capacityLabel}(${unitLabel}/${quantityUnit})`
    const quantityColumnName = `使用數量(${quantityUnit})`
    const totalColumnName = `總使用量(${unitLabel})`

    // 轉換資料
    const rows = Object.entries(monthlyQuantity)
      .filter(([_, quantity]) => Number(quantity) > 0)
      .map(([month, quantity]) => {
        // 根據 month 找到對應的檔案
        const monthFiles = files.filter(f =>
          f.file_type === 'usage_evidence' &&
          f.month === parseInt(month)
        )

        const baseRow: any = {
          '月份': `${month}月`,
          [capacityColumnName]: unitCapacity,
          [quantityColumnName]: Number(quantity),
          [totalColumnName]: Number(monthly[month] || 0)
        }

        // ⭐ WD-40 需要額外顯示含碳率
        if (entry.page_key === 'wd40' && carbonRate > 0) {
          baseRow['含碳率(%)'] = carbonRate
        }

        // ⭐ 加入佐證檔案欄位
        baseRow['佐證檔案'] = formatFileNames(monthFiles, entry.page_key, {
          month: parseInt(month)
        })

        return baseRow
      })
      .sort((a, b) => parseInt(a['月份']) - parseInt(b['月份']))

    return rows
  } catch (error) {
    console.warn(`無法轉換容量+數量記錄 (entry ${entry.id}):`, error)
    return []
  }
}

// Excel 轉換函數：多記錄格式（冷媒、滅火器）
export function convertMultiRecordEntry(entry: EnergyEntry, files: EvidenceFile[]): any[] {
  try {
    const pageKey = entry.page_key

    // 冷媒頁面
    if (pageKey === 'refrigerant') {
      const refrigerantData = entry.payload?.refrigerantData || entry.extraPayload?.refrigerantData

      if (!refrigerantData) {
        console.warn(`⚠️ [convertMultiRecordEntry] 冷媒 Entry ${entry.id} 沒有 refrigerantData`)
        return []
      }

      // ⭐ 支援兩種格式：直接陣列 或 { records: [...] }
      const records = Array.isArray(refrigerantData)
                      ? refrigerantData
                      : refrigerantData.records

      if (!records || !Array.isArray(records)) {
        console.warn(`⚠️ [convertMultiRecordEntry] 冷媒 Entry ${entry.id} records 不是陣列`, {
          refrigerantData
        })
        return []
      }

      console.log(`[convertMultiRecordEntry] 冷媒 Entry ${entry.id}: 找到 ${records.length} 筆記錄`)

      return records.map((record: any) => {
        // 根據 record_id 找到對應的檔案
        const recordFiles = files.filter(f =>
          f.file_type === 'other' &&
          f.record_id === record.id
        )

        return {
          '廠牌名稱': record.brandName || '',
          '型號': record.modelNumber || '',
          '設備位置': record.equipmentLocation || '',
          '冷媒類型': record.refrigerantType || '',
          '填充量': record.fillAmount || 0,
          '單位': record.unit || 'kg',
          '佐證檔案': formatFileNames(recordFiles, pageKey)
        }
      })
    }

    // 滅火器頁面
    if (pageKey === 'fire_extinguisher') {
      const fireData = entry.payload?.fireExtinguisherData || entry.extraPayload?.fireExtinguisherData

      if (!fireData) {
        console.warn(`⚠️ [convertMultiRecordEntry] 滅火器 Entry ${entry.id} 沒有 fireExtinguisherData`)
        return []
      }

      // ⭐ 支援兩種格式：直接陣列 或 { records: [...] }
      const records = Array.isArray(fireData)
                      ? fireData
                      : fireData.records

      if (!records || !Array.isArray(records)) {
        console.warn(`⚠️ [convertMultiRecordEntry] 滅火器 Entry ${entry.id} records 不是陣列`, {
          fireData
        })
        return []
      }

      console.log(`[convertMultiRecordEntry] 滅火器 Entry ${entry.id}: 找到 ${records.length} 筆記錄`)

      // 找出全年度共用的檢修表檔案（沒有 record_id）
      const inspectionFiles = files.filter(f =>
        f.file_type === 'other' &&
        !f.record_id
      )
      const inspectionFileNames = formatFileNames(inspectionFiles, pageKey)

      return records.map((record: any) => {
        // 根據 record_id 找到對應的銘牌照片
        const nameplateFiles = files.filter(f =>
          f.file_type === 'other' &&
          f.record_id === record.id
        )

        return {
          '設備類型': record.type || '',
          '數量': record.quantity || 0,
          '單位': record.unit || '支',
          '位置': record.location || '',
          '該年度是否填充': record.isRefilled ? '是' : '否',
          '使用佐證': formatFileNames(nameplateFiles, pageKey),
          '安全檢修表佐證': inspectionFileNames  // 每筆記錄都顯示相同的檢修表檔案
        }
      })
    }

    return []
  } catch (error) {
    console.warn(`無法轉換多記錄格式 (entry ${entry.id}):`, error)
    return []
  }
}

// Excel 轉換函數：純月份格式（化糞池）
interface SimpleMonthlyExcelRow {
  '月份': string
  '使用量': number
  '佐證檔案': string
}

export function convertSimpleMonthlyEntry(entry: EnergyEntry, files: EvidenceFile[]): SimpleMonthlyExcelRow[] {
  try {
    const monthly = entry.payload?.monthly || {}
    return Object.entries(monthly)
      .filter(([_, value]) => Number(value) > 0)
      .map(([month, value]) => {
        // 根據 month 找到對應的檔案
        const monthFiles = files.filter(f =>
          f.file_type === 'usage_evidence' &&
          f.month === parseInt(month)
        )

        return {
          '月份': `${month}月`,
          '使用量': Number(value),
          '佐證檔案': formatFileNames(monthFiles, entry.page_key, {
            month: parseInt(month)
          })
        }
      })
      .sort((a, b) => parseInt(a['月份']) - parseInt(b['月份']))
  } catch (error) {
    console.warn(`無法轉換月份記錄 (entry ${entry.id}):`, error)
    return []
  }
}

// Excel 轉換函數：尿素頁面（使用記錄 + MSDS）
interface UreaExcelRow {
  '日期': string
  '使用量(L)': number
  '使用佐證': string
  'MSDS佐證': string
}

export function convertUreaEntry(entry: EnergyEntry, files: EvidenceFile[]): UreaExcelRow[] {
  try {
    // ⭐ 增加多種資料路徑容錯處理
    const usageRecords = entry.extraPayload?.usageRecords ||
                         entry.payload?.usageRecords ||
                         []

    console.log(`[convertUreaEntry] Entry ${entry.id}: 找到 ${usageRecords.length} 筆使用記錄`)

    if (!Array.isArray(usageRecords)) {
      console.warn(`⚠️ [convertUreaEntry] Entry ${entry.id} usageRecords 不是陣列`)
      return []
    }

    if (usageRecords.length === 0) {
      console.warn(`⚠️ [convertUreaEntry] Entry ${entry.id} 沒有使用記錄`, {
        extraPayload: entry.extraPayload,
        payload: entry.payload
      })
    }

    // 找出 MSDS 檔案（沒有 record_id）
    const msdsFiles = files.filter(f => f.file_type === 'msds')
    const msdsFileNames = formatFileNames(msdsFiles, entry.page_key)

    return usageRecords.map((record: any) => {
      // 根據 record_id 找到對應的使用佐證檔案
      const usageFiles = files.filter(f =>
        f.file_type === 'usage_evidence' &&
        f.record_id === record.id
      )

      return {
        '日期': record.date || '',
        '使用量(L)': record.quantity || 0,
        '使用佐證': formatFileNames(usageFiles, entry.page_key),
        'MSDS佐證': msdsFileNames  // 每筆記錄都顯示相同的 MSDS 檔案
      }
    })
  } catch (error) {
    console.error(`❌ [convertUreaEntry] Entry ${entry.id} 轉換失敗:`, error)
    console.error('資料結構:', { payload: entry.payload, extraPayload: entry.extraPayload })
    return []
  }
}

// Excel 轉換函數：焊條頁面（月份 + 單位重量 + 含碳率 + MSDS）
interface WeldingRodExcelRow {
  '月份': string
  '單位重量(kg/支)': number
  '含碳率(%)': number
  '使用數量(支)': number
  '總使用量(kg)': number
  '使用佐證': string
  '檢修報告': string
}

export function convertWeldingRodEntry(entry: EnergyEntry, files: EvidenceFile[]): WeldingRodExcelRow[] {
  try {
    // ⭐ 增加多種資料路徑容錯處理
    const unitCapacity = entry.payload?.unitCapacity ||
                        entry.extraPayload?.unitCapacity ||
                        0  // 單位重量
    const carbonRate = entry.payload?.carbonRate ||
                       entry.extraPayload?.carbonRate ||
                       0     // 含碳率
    const monthlyQuantity = entry.payload?.monthlyQuantity ||
                           entry.extraPayload?.monthlyQuantity ||
                           {}
    const monthly = entry.payload?.monthly ||
                   entry.extraPayload?.monthly ||
                   {}

    const monthCount = Object.keys(monthlyQuantity).length
    console.log(`[convertWeldingRodEntry] Entry ${entry.id}: 單位重量=${unitCapacity}, 含碳率=${carbonRate}, 月份數=${monthCount}`)

    if (monthCount === 0) {
      console.warn(`⚠️ [convertWeldingRodEntry] Entry ${entry.id} 沒有月份資料`, {
        payload: entry.payload,
        extraPayload: entry.extraPayload
      })
    }

    // 找出 MSDS 檔案（沒有 month）
    const msdsFiles = files.filter(f => f.file_type === 'msds')
    const msdsFileNames = formatFileNames(msdsFiles, entry.page_key)

    return Object.entries(monthlyQuantity)
      .filter(([_, quantity]) => Number(quantity) > 0)
      .map(([month, quantity]) => {
        // 根據 month 找到對應的使用佐證檔案
        const monthFiles = files.filter(f =>
          f.file_type === 'usage_evidence' &&
          f.month === parseInt(month)
        )

        return {
          '月份': `${month}月`,
          '單位重量(kg/支)': unitCapacity,
          '含碳率(%)': carbonRate,
          '使用數量(支)': Number(quantity),
          '總使用量(kg)': Number(monthly[month] || 0),
          '使用佐證': formatFileNames(monthFiles, entry.page_key, {
            month: parseInt(month)
          }),
          '檢修報告': msdsFileNames  // 每筆月份都顯示相同的 MSDS 檔案
        }
      })
      .sort((a, b) => parseInt(a['月份']) - parseInt(b['月份']))
  } catch (error) {
    console.error(`❌ [convertWeldingRodEntry] Entry ${entry.id} 轉換失敗:`, error)
    console.error('資料結構:', { payload: entry.payload, extraPayload: entry.extraPayload })
    return []
  }
}

// 生成多工作表 Excel 檔案
export function generateMultiSheetExcel(entries: EnergyEntry[], filesMap: Map<string, EvidenceFile[]>): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  // ⭐ 診斷日誌：輸出收到的 entries 總數
  console.log(`📊 [generateMultiSheetExcel] 收到 ${entries.length} 筆 entries`)

  // 根據 page_key 分組
  const entriesByPageKey = entries.reduce((acc, entry) => {
    const key = entry.page_key || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {} as Record<string, EnergyEntry[]>)

  // ⭐ 診斷日誌：輸出所有 page_key 和數量
  console.log(`📊 [generateMultiSheetExcel] 分組結果:`)
  Object.entries(entriesByPageKey).forEach(([pageKey, pageEntries]) => {
    console.log(`   ${pageKey}: ${pageEntries.length} 筆`)
  })

  // 柴油頁面類型（使用 records 格式）
  const dieselPages = ['diesel', 'gasoline']
  // 容量+數量頁面類型（乙炔、WD-40、液化石油氣）
  const capacityQuantityPages = ['acetylene', 'wd40', 'lpg']
  // 多記錄頁面類型（冷媒、滅火器）
  const multiRecordPages = ['refrigerant', 'fire_extinguisher']

  // 為每個 page_key 建立工作表
  Object.entries(entriesByPageKey).forEach(([pageKey, pageEntries]) => {
    // ⭐ 特殊處理：柴油發電機需要根據 mode 分成兩個工作表
    if (pageKey === 'diesel_generator') {
      console.log(`[generateMultiSheetExcel] 處理柴油發電機，共 ${pageEntries.length} 筆 entry`)

      // 分離加油版和測試版
      const refuelEntries: any[] = []
      const testEntries: any[] = []

      pageEntries.forEach(entry => {
        const files = filesMap.get(entry.id) || []
        // ⭐ 增加資料路徑容錯
        const mode = entry.extraPayload?.mode ||
                     entry.payload?.mode

        console.log(`[generateMultiSheetExcel] Entry ${entry.id} mode=${mode}`)

        if (mode === 'test') {
          // 測試版：使用專用轉換函數處理 generators 資料
          const rows = convertDieselGeneratorTestEntry(entry, files)
          if (rows.length > 0) {
            testEntries.push(...rows)
          } else {
            console.warn(`⚠️ [generateMultiSheetExcel] Entry ${entry.id} (測試版) 轉換結果為空`)
          }
        } else {
          // 加油版：使用 dieselGeneratorData
          const rows = convertDieselEntry(entry, files)
          if (rows.length > 0) {
            refuelEntries.push(...rows)
          } else {
            console.warn(`⚠️ [generateMultiSheetExcel] Entry ${entry.id} (加油版) 轉換結果為空`)
          }
        }
      })

      // 創建加油版工作表
      if (refuelEntries.length > 0) {
        const refuelSheet = XLSX.utils.json_to_sheet(refuelEntries)
        XLSX.utils.book_append_sheet(workbook, refuelSheet, '柴油發電機（加油）')
        console.log(`✅ [generateMultiSheetExcel] 建立「柴油發電機（加油）」工作表，${refuelEntries.length} 筆資料`)
      } else {
        console.warn(`⚠️ [generateMultiSheetExcel] 柴油發電機（加油）沒有資料`)
      }

      // 創建測試版工作表
      if (testEntries.length > 0) {
        const testSheet = XLSX.utils.json_to_sheet(testEntries)
        XLSX.utils.book_append_sheet(workbook, testSheet, '柴油發電機（測試）')
        console.log(`✅ [generateMultiSheetExcel] 建立「柴油發電機（測試）」工作表，${testEntries.length} 筆資料`)
      } else {
        console.warn(`⚠️ [generateMultiSheetExcel] 柴油發電機（測試）沒有資料`)
      }

      return  // 跳過後續處理
    }

    let sheetData: any[] = []

    // 根據頁面類型選擇轉換函數
    if (dieselPages.includes(pageKey)) {
      // 柴油頁面：合併所有記錄
      pageEntries.forEach(entry => {
        const files = filesMap.get(entry.id) || []
        const rows = convertDieselEntry(entry, files)
        sheetData.push(...rows)
      })
    } else if (pageKey === 'electricity') {
      // 電費單頁面：顯示電表號和帳單資料
      pageEntries.forEach(entry => {
        const files = filesMap.get(entry.id) || []
        const rows = convertElectricityEntry(entry, files)
        sheetData.push(...rows)
      })
    } else if (pageKey === 'natural_gas') {
      // 天然氣頁面：顯示帳單資料和熱值
      pageEntries.forEach(entry => {
        const files = filesMap.get(entry.id) || []
        const rows = convertNaturalGasEntry(entry, files)
        sheetData.push(...rows)
      })
    } else if (capacityQuantityPages.includes(pageKey)) {
      // 容量+數量頁面：顯示單位容量、使用數量、總使用量
      pageEntries.forEach(entry => {
        const files = filesMap.get(entry.id) || []
        const rows = convertCapacityQuantityEntry(entry, files)
        sheetData.push(...rows)
      })
    } else if (multiRecordPages.includes(pageKey)) {
      // 多記錄頁面：顯示所有使用者填寫的設備詳細資料
      pageEntries.forEach(entry => {
        const files = filesMap.get(entry.id) || []
        const rows = convertMultiRecordEntry(entry, files)
        sheetData.push(...rows)
      })
    } else if (pageKey === 'urea') {
      // 尿素頁面：使用記錄 + MSDS
      pageEntries.forEach(entry => {
        const files = filesMap.get(entry.id) || []
        const rows = convertUreaEntry(entry, files)
        sheetData.push(...rows)
      })
    } else if (pageKey === 'welding_rod') {
      // 焊條頁面：月份 + 單位重量 + 含碳率 + MSDS
      pageEntries.forEach(entry => {
        const files = filesMap.get(entry.id) || []
        const rows = convertWeldingRodEntry(entry, files)
        sheetData.push(...rows)
      })
    } else if (pageKey === 'employee_commute') {
      // 員工通勤：純月份格式（不顯示佐證檔案）
      pageEntries.forEach(entry => {
        // ⭐ 增加資料路徑容錯
        const monthly = entry.payload?.monthly ||
                       entry.extraPayload?.monthly ||
                       {}

        console.log(`[generateMultiSheetExcel] Entry ${entry.id} (員工通勤): 找到 ${Object.keys(monthly).length} 個月份`)

        if (Object.keys(monthly).length === 0) {
          console.warn(`⚠️ [generateMultiSheetExcel] Entry ${entry.id} (員工通勤) 沒有月份資料`, {
            payload: entry.payload,
            extraPayload: entry.extraPayload
          })
        }

        const rows = Object.entries(monthly)
          // ⭐ 修改：不過濾掉 0 值，只要有填寫就顯示
          .filter(([_, value]) => value !== null && value !== undefined && value !== '')
          .map(([month, value]) => ({
            '月份': `${month}月`,
            '使用量': Number(value)
          }))
          .sort((a: any, b: any) => parseInt(a['月份']) - parseInt(b['月份']))

        console.log(`[generateMultiSheetExcel] 員工通勤產生 ${rows.length} 行資料`)
        sheetData.push(...rows)
      })
    } else {
      // 其他頁面：純月份格式（含佐證檔案）
      pageEntries.forEach(entry => {
        const files = filesMap.get(entry.id) || []
        const rows = convertSimpleMonthlyEntry(entry, files)
        sheetData.push(...rows)
      })
    }

    // 如果有資料，建立工作表
    if (sheetData.length > 0) {
      const sheet = XLSX.utils.json_to_sheet(sheetData)
      const sheetName = categoryNameMap[pageKey] || pageKey
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
      console.log(`✅ [generateMultiSheetExcel] 建立工作表「${sheetName}」，${sheetData.length} 行資料`)
    } else {
      // ⭐ 新增：記錄為什麼沒建立工作表
      const categoryName = categoryNameMap[pageKey] || pageKey
      console.warn(`⚠️ [generateMultiSheetExcel] ${categoryName} 沒有資料，不建立工作表`)
    }
  })

  return workbook
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

// 智慧檔案命名函數（重寫版）
export function smartFileRename(originalFileName: string, context: FileNamingContext): string {
  const { categoryId, file, groupIndex, generatorLocation, month } = context
  const categoryName = categoryNameMap[categoryId] || categoryId
  const extension = originalFileName.split('.').pop() || 'pdf'
  const lowerFileName = originalFileName.toLowerCase()

  // ⭐ 檢查 categoryId 是否有效
  if (!categoryId || !categoryName) {
    console.warn(`[smartFileRename] Invalid categoryId: ${categoryId}, using original filename`)
    return originalFileName
  }

  // ⭐ 檢查 file 是否存在
  if (!file) {
    console.warn('[smartFileRename] file is undefined, using fallback naming')
    return `${categoryName}_資料.${extension}`
  }

  // ⭐ 規則 1：MSDS 檔案
  if (file.file_type === 'msds' ||
      lowerFileName.includes('msds') ||
      lowerFileName.includes('sds') ||
      lowerFileName.includes('安全')) {
    return `${categoryName}_MSDS安全資料表.${extension}`
  }

  // ⭐ 規則 2：柴油發電機測試版（有 generatorLocation）
  if (categoryId === 'diesel_generator' && generatorLocation) {
    return `${generatorLocation}_發電機佐證銘牌.${extension}`
  }

  // ⭐ 規則 3：有 groupId 的頁面（汽油、柴油、柴油發電機加油版）
  const groupPages = ['gasoline', 'diesel', 'diesel_generator']
  if (groupPages.includes(categoryId) && groupIndex !== undefined) {
    const groupNumber = ['第一組', '第二組', '第三組', '第四組', '第五組', '第六組', '第七組', '第八組', '第九組', '第十組'][groupIndex] || `第${groupIndex + 1}組`
    return `${categoryName}_${groupNumber}.${extension}`
  }

  // ⭐ 規則 4：月份格式頁面（優先使用資料庫的 month 欄位）
  let monthStr = ''
  if (month !== undefined && month >= 1 && month <= 12) {
    monthStr = `${month}月`
  } else if (file.month !== undefined && file.month >= 1 && file.month <= 12) {
    monthStr = `${file.month}月`
  } else {
    // 嘗試從檔名偵測月份
    const monthMatch = lowerFileName.match(/([1-9]|1[0-2])月/) ||
                       lowerFileName.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i) ||
                       lowerFileName.match(/(?:^|_)(0[1-9]|1[0-2])(?:_|$)/)
    if (monthMatch) {
      if (monthMatch[0].includes('月')) {
        monthStr = monthMatch[0]
      } else {
        const monthNum = parseInt(monthMatch[1] || monthMatch[0])
        if (monthNum >= 1 && monthNum <= 12) {
          monthStr = `${monthNum}月`
        }
      }
    }
  }

  if (monthStr) {
    return `${categoryName}_${monthStr}_使用證明.${extension}`
  }

  // ⭐ 規則 5：一般檔案（fallback）
  return `${categoryName}_資料.${extension}`
}

// 處理重複檔名（第一個不加編號）
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

/**
 * 處理重複檔名（從 _1 開始編號）
 *
 * 與 handleDuplicateFileName 的差異：
 * - handleDuplicateFileName: file.pdf, file_1.pdf, file_2.pdf
 * - handleDuplicateFileNameFromOne: file_1.pdf, file_2.pdf, file_3.pdf
 *
 * @param fileName - 原始檔名
 * @param existingNames - 已存在的檔名集合
 * @returns 不重複的檔名（從 _1 開始編號）
 */
export function handleDuplicateFileNameFromOne(fileName: string, existingNames: Set<string>): string {
  const lastDotIndex = fileName.lastIndexOf('.')
  const nameWithoutExt = lastDotIndex === -1 ? fileName : fileName.substring(0, lastDotIndex)
  const extension = lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex)

  let counter = 1
  let finalName = `${nameWithoutExt}_${counter}${extension}`

  while (existingNames.has(finalName)) {
    counter++
    finalName = `${nameWithoutExt}_${counter}${extension}`
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

// ============================================================================
// 檔案下載與打包功能
// ============================================================================

/**
 * 驗證檔案是否有效（下載前檢查）
 *
 * @param file - 檔案記錄
 * @returns 驗證結果 { valid, reason? }
 */
async function validateFileBeforeDownload(
  file: EvidenceFile
): Promise<{ valid: boolean; reason?: string }> {
  // 檢查檔案路徑
  if (!file.file_path || file.file_path === 'null' || file.file_path === 'undefined') {
    return { valid: false, reason: '檔案路徑無效' }
  }

  // 檢查檔案大小
  if (file.file_size === 0) {
    return { valid: false, reason: '檔案大小為 0' }
  }

  return { valid: true }
}

/**
 * 下載單個檔案（含超時保護）
 *
 * @param filePath - Storage 檔案路徑
 * @param userId - 檔案擁有者 ID（管理員下載用）
 * @param timeoutMs - 超時時間（毫秒）
 * @returns Promise<Blob>
 * @throws {Error} 下載失敗或超時
 */
async function downloadFileWithTimeout(
  filePath: string,
  userId: string,
  timeoutMs: number = 30000
): Promise<Blob> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // 使用管理員權限獲取檔案 URL
    const { getFileUrlForAdmin } = await import('../../../api/files')
    const fileUrl = await getFileUrlForAdmin(filePath, userId, true)

    // 下載檔案
    const response = await fetch(fileUrl, { signal: controller.signal })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()

    // 驗證 blob 有效性
    if (blob.size === 0) {
      throw new Error('下載的檔案大小為 0')
    }

    return blob
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('下載超時（30 秒）')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 批次下載檔案（限制並發數量）
 *
 * @param files - 檔案清單
 * @param userId - 檔案擁有者 ID
 * @param onProgress - 進度回調
 * @returns Map<檔案ID, { blob, originalName, error? }>
 */
async function batchDownloadFiles(
  files: EvidenceFile[],
  userId: string,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<Map<string, { blob?: Blob; originalName: string; error?: string }>> {
  const results = new Map<string, { blob?: Blob; originalName: string; error?: string }>()
  const maxConcurrent = 5 // 最多同時下載 5 個檔案
  let completed = 0

  console.log(`🚀 [batchDownloadFiles] 開始批次下載 ${files.length} 個檔案`)

  // 分批處理
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent)

    const batchResults = await Promise.allSettled(
      batch.map(async (file) => {
        // 驗證檔案
        const validation = await validateFileBeforeDownload(file)
        if (!validation.valid) {
          throw new Error(validation.reason || '檔案驗證失敗')
        }

        // 下載檔案
        const blob = await downloadFileWithTimeout(file.file_path, userId)
        return { fileId: file.id, blob, originalName: file.file_name }
      })
    )

    // 處理結果
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

      // 通知進度
      onProgress?.(completed, files.length, file.file_name)
    })
  }

  return results
}

// ============================================================================
// 以下為 POC 功能 - 使用 mock 資料，生產環境請使用真實 API
// ============================================================================

/**
 * 匯出使用者資料 (POC 功能 - 開發中)
 * @param userId - 使用者 ID
 */
export const exportUserData = async (userId: string): Promise<void> => {
  throw new Error('此功能正在開發中，請使用「匯出填報資料」功能')
}

/**
 * 匯出部門資料 (POC 功能 - 開發中)
 * @param department - 部門名稱
 */
export const exportDepartmentData = async (department: string): Promise<void> => {
  throw new Error('此功能正在開發中，請使用「匯出填報資料」功能')
}

/**
 * 匯出使用者的能源填報資料為 Excel 檔案
 * @param userId - 使用者 ID
 * @param userName - 使用者名稱（用於檔案命名）
 * @param entries - 能源填報記錄陣列
 */
export async function exportUserEntriesExcel(
  userId: string,
  userName: string,
  entries: EnergyEntry[]
): Promise<void> {
  try {
    if (!entries || entries.length === 0) {
      throw new Error('沒有可匯出的資料')
    }

    // ⭐ 取得所有 entry 的檔案
    const filesMap = new Map<string, EvidenceFile[]>()
    for (const entry of entries) {
      try {
        const files = await getEntryFiles(entry.id)
        filesMap.set(entry.id, files)
      } catch (error) {
        console.warn(`無法取得 entry ${entry.id} 的檔案:`, error)
        filesMap.set(entry.id, [])
      }
    }

    // 生成多工作表 Excel
    const workbook = generateMultiSheetExcel(entries, filesMap)

    // 如果沒有任何工作表，拋出錯誤
    if (workbook.SheetNames.length === 0) {
      throw new Error('沒有可匯出的資料')
    }

    // 生成檔案名稱
    const timestamp = generateTimestamp()
    const fileName = `${userName}_能源填報資料_${timestamp}.xlsx`

    // 寫入並下載
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, fileName)

    console.log(`✅ 成功匯出：${fileName}`)
    console.log(`📄 包含 ${workbook.SheetNames.length} 個工作表`)
    console.log(`📋 總共 ${entries.length} 筆填報記錄`)
  } catch (error) {
    console.error('❌ Excel 匯出失敗：', error)
    throw error
  }
}

/**
 * 匯出使用者的能源填報資料為 ZIP 檔案（Excel + 佐證資料）
 *
 * @param userId - 使用者 ID
 * @param userName - 使用者名稱（用於檔案命名）
 * @param entries - 能源填報記錄陣列
 * @param onProgress - 進度回調 (status, current?, total?)
 * @returns Promise<{ success: number; failed: number; errors: string[] }>
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

    // 1. 取得所有 entry 的檔案
    console.log('📁 [exportWithFiles] 取得所有檔案記錄...')
    const filesMap = new Map<string, EvidenceFile[]>()
    for (const entry of entries) {
      try {
        const files = await getEntryFiles(entry.id)
        filesMap.set(entry.id, files)
      } catch (error) {
        console.warn(`無法取得 entry ${entry.id} 的檔案:`, error)
        filesMap.set(entry.id, [])
      }
    }

    // 收集所有檔案
    const allFiles: EvidenceFile[] = []
    filesMap.forEach(files => allFiles.push(...files))

    if (allFiles.length === 0) {
      console.warn('⚠️ 沒有佐證資料，只匯出 Excel')
    }

    // 2. 檢查總大小（警告使用者）
    const totalSize = allFiles.reduce((sum, f) => sum + (f.file_size || 0), 0)
    const totalSizeMB = totalSize / 1024 / 1024
    console.log(`📊 總檔案大小：${totalSizeMB.toFixed(2)} MB`)

    if (totalSize > 500 * 1024 * 1024) {
      const confirmed = confirm(
        `總檔案大小 ${totalSizeMB.toFixed(0)} MB，可能需要較長時間。是否繼續？`
      )
      if (!confirmed) {
        throw new Error('使用者取消下載')
      }
    }

    // 3. 批次下載檔案
    onProgress?.('正在下載佐證資料...', 0, allFiles.length)
    const downloadResults = await batchDownloadFiles(
      allFiles,
      userId,
      (current, total, fileName) => {
        onProgress?.(`正在下載... ${fileName}`, current, total)
      }
    )

    // 4. 重命名檔案並處理重複
    onProgress?.('正在處理檔案名稱...')
    const existingNames = new Set<string>()
    // ⭐ 增加 category 欄位，用於後續按類別分資料夾
    const renamedFiles = new Map<string, { blob: Blob; newName: string; category: string }>()

    downloadResults.forEach((result, fileId) => {
      if (result.error) {
        errors.push(`${result.originalName}: ${result.error}`)
        failedCount++
        return
      }

      if (!result.blob) {
        errors.push(`${result.originalName}: 檔案下載失敗`)
        failedCount++
        return
      }

      // 找到對應的檔案記錄以獲取 category 和 context
      let categoryId = 'unknown'
      let foundFile: EvidenceFile | undefined
      let fileNamingContext: Partial<FileNamingContext> = {}

      for (const [entryId, files] of filesMap.entries()) {
        const file = files.find(f => f.id === fileId)
        if (file) {
          foundFile = file
          const entry = entries.find(e => e.id === entryId)
          categoryId = entry?.page_key || 'unknown'

          // 根據頁面類型計算 naming context
          if (entry) {
            // 檢查是否是柴油發電機
            if (categoryId === 'diesel_generator') {
              const mode = entry.payload?.mode || entry.extraPayload?.mode || 'refuel'

              if (mode === 'test') {
                // 測試版：找 generatorLocation
                const generators = entry.payload?.generators || entry.extraPayload?.generators || []
                const gen = generators.find((g: any) => g.id === file.record_id)
                if (gen?.generatorLocation) {
                  fileNamingContext.generatorLocation = gen.generatorLocation
                }
              } else {
                // 加油版：計算 groupIndex
                const records = entry.payload?.dieselGeneratorData ||
                               entry.payload?.dieselGeneratorData?.records ||
                               entry.extraPayload?.dieselGeneratorData ||
                               entry.extraPayload?.dieselGeneratorData?.records ||
                               []

                const uniqueGroupIds: string[] = []
                const groupIdMap = new Map<string, number>()
                records.forEach((r: any) => {
                  if (r.groupId && !groupIdMap.has(r.groupId)) {
                    groupIdMap.set(r.groupId, uniqueGroupIds.length)
                    uniqueGroupIds.push(r.groupId)
                  }
                })

                const record = records.find((r: any) => r.id === file.record_id)
                if (record?.groupId && groupIdMap.has(record.groupId)) {
                  fileNamingContext.groupIndex = groupIdMap.get(record.groupId)
                }
              }
            } else if (categoryId === 'gasoline') {
              // 汽油：計算 groupIndex
              const records = entry.payload?.gasolineData ||
                             entry.payload?.gasolineData?.records ||
                             entry.extraPayload?.gasolineData ||
                             entry.extraPayload?.gasolineData?.records ||
                             []

              const uniqueGroupIds: string[] = []
              const groupIdMap = new Map<string, number>()
              records.forEach((r: any) => {
                if (r.groupId && !groupIdMap.has(r.groupId)) {
                  groupIdMap.set(r.groupId, uniqueGroupIds.length)
                  uniqueGroupIds.push(r.groupId)
                }
              })

              const record = records.find((r: any) => r.id === file.record_id)
              if (record?.groupId && groupIdMap.has(record.groupId)) {
                fileNamingContext.groupIndex = groupIdMap.get(record.groupId)
              }
            } else if (categoryId === 'diesel') {
              // 柴油：計算 groupIndex
              const records = entry.payload?.dieselData ||
                             entry.payload?.dieselData?.records ||
                             entry.extraPayload?.dieselData ||
                             entry.extraPayload?.dieselData?.records ||
                             []

              const uniqueGroupIds: string[] = []
              const groupIdMap = new Map<string, number>()
              records.forEach((r: any) => {
                if (r.groupId && !groupIdMap.has(r.groupId)) {
                  groupIdMap.set(r.groupId, uniqueGroupIds.length)
                  uniqueGroupIds.push(r.groupId)
                }
              })

              const record = records.find((r: any) => r.id === file.record_id)
              if (record?.groupId && groupIdMap.has(record.groupId)) {
                fileNamingContext.groupIndex = groupIdMap.get(record.groupId)
              }
            }

            // 月份資訊（適用於所有月份頁面）
            if (file.month !== undefined && file.month >= 1 && file.month <= 12) {
              fileNamingContext.month = file.month
            }
          }

          break
        }
      }

      // 如果沒找到 file，跳過此檔案
      if (!foundFile) {
        errors.push(`${result.originalName}: 找不到檔案記錄`)
        failedCount++
        return
      }

      // 使用 smartFileRename 重命名（傳遞完整 context）
      const renamedFileName = smartFileRename(result.originalName, {
        categoryId,
        file: foundFile,
        ...fileNamingContext
      })

      // 處理重複檔名（第一個不加編號，第二個開始 _1, _2）
      const finalName = handleDuplicateFileName(renamedFileName, existingNames)

      // ⭐ 記錄類別名稱（用於建立資料夾）
      const categoryName = categoryNameMap[categoryId] || categoryId

      renamedFiles.set(fileId, {
        blob: result.blob,
        newName: finalName,
        category: categoryName  // ⭐ 新增：記錄類別名稱
      })

      successCount++
    })

    console.log(`✅ 成功下載：${successCount} 個檔案`)
    console.log(`❌ 失敗：${failedCount} 個檔案`)

    // 5. 生成 Excel
    onProgress?.('正在生成 Excel...')
    const workbook = generateMultiSheetExcel(entries, filesMap)

    if (workbook.SheetNames.length === 0) {
      throw new Error('沒有可匯出的資料')
    }

    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })

    // 6. 打包成 ZIP
    onProgress?.('正在打包 ZIP...')
    const zip = new JSZip()

    // 加入 Excel（放在根目錄）
    const timestamp = generateTimestamp()
    const excelFileName = `${userName}_能源填報資料_${timestamp}.xlsx`
    zip.file(excelFileName, excelBuffer)

    // ⭐ 按類別組織佐證資料到資料夾中
    const filesByCategory = new Map<string, Array<{ blob: Blob; newName: string }>>()

    renamedFiles.forEach(({ blob, newName, category }) => {
      if (!filesByCategory.has(category)) {
        filesByCategory.set(category, [])
      }
      filesByCategory.get(category)!.push({ blob, newName })
    })

    console.log(`📁 [ZIP 打包] 按 ${filesByCategory.size} 個類別組織佐證資料`)

    // 為每個類別創建資料夾並加入檔案
    filesByCategory.forEach((files, categoryName) => {
      console.log(`📂 [ZIP 打包] ${categoryName}/  包含 ${files.length} 個檔案`)
      files.forEach(({ blob, newName }) => {
        // ⭐ 使用 "類別名稱/檔案名稱" 的路徑結構
        zip.file(`${categoryName}/${newName}`, blob)
      })
    })

    // 7. 生成並下載 ZIP
    onProgress?.('正在生成 ZIP 檔案...')
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const zipFileName = `${userName}_能源填報資料_${timestamp}.zip`
    saveAs(zipBlob, zipFileName)

    console.log(`✅ 成功匯出：${zipFileName}`)
    console.log(`📄 包含 ${workbook.SheetNames.length} 個工作表`)
    console.log(`📋 總共 ${entries.length} 筆填報記錄`)
    console.log(`📁 包含 ${successCount} 個佐證資料`)

    return { success: successCount, failed: failedCount, errors }
  } catch (error) {
    console.error('❌ ZIP 匯出失敗：', error)
    throw error
  }
}

/**
 * 匯出單一類別的能源填報資料為 ZIP 檔案
 *
 * @param userId - 使用者 ID
 * @param userName - 使用者名稱
 * @param entries - 能源填報記錄陣列（所有類別）
 * @param categoryId - 要匯出的類別 ID (page_key)
 * @param onProgress - 進度回調
 * @returns Promise<{ success: number; failed: number; errors: string[] }>
 */
export async function exportSingleCategoryWithFiles(
  userId: string,
  userName: string,
  entries: EnergyEntry[],
  categoryId: string,
  onProgress?: (status: string, current?: number, total?: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  // 過濾出指定類別的 entries
  const filteredEntries = entries.filter(e => e.page_key === categoryId)

  if (filteredEntries.length === 0) {
    throw new Error(`沒有找到類別 ${categoryId} 的資料`)
  }

  console.log(`📦 [exportSingleCategory] 匯出類別：${categoryId}，共 ${filteredEntries.length} 筆記錄`)

  // 使用主函數匯出
  return await exportUserEntriesWithFiles(userId, userName, filteredEntries, onProgress)
}

/**
 * 下載單個檔案並自動重命名
 *
 * @param filePath - Storage 檔案路徑
 * @param originalName - 原始檔名
 * @param categoryId - 類別 ID (page_key)
 * @param userId - 檔案擁有者 ID
 */
export async function downloadFileWithRename(
  filePath: string,
  originalName: string,
  categoryId: string,
  userId: string
): Promise<void> {
  try {
    console.log(`📥 [downloadFileWithRename] 下載檔案：${originalName}`)

    // 下載檔案
    const blob = await downloadFileWithTimeout(filePath, userId)

    // 重命名檔案（單檔下載沒有完整 context，使用 fallback 命名）
    const renamedFileName = smartFileRename(originalName, {
      categoryId,
      file: undefined as any  // 單檔下載無完整 file 資訊，觸發 fallback
    })

    // 下載
    saveAs(blob, renamedFileName)

    console.log(`✅ 成功下載：${renamedFileName}`)
  } catch (error) {
    console.error(`❌ 下載失敗：${originalName}`, error)
    throw error
  }
}

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
    const newName = smartFileRename(originalFile, {
      categoryId,
      file: undefined as any  // Demo 用，觸發 fallback
    })
    console.log(`${originalFile} → ${newName}`)
  })
}