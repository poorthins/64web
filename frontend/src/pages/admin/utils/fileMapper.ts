import type { EvidenceFile } from '../../../api/files'
import type { ExtractedRecord } from './dataExtractor'

/**
 * 檔案綁定規則完整映射表（基於舊程式碼分析）
 *
 * | 頁面類別               | 匹配規則                                    | file_type       | 備註           |
 * |-----------------------|--------------------------------------------|----------------|----------------|
 * | diesel, gasoline      | file.record_id === record.groupId          | usage_evidence | 用 groupId！   |
 * | diesel_generator (加油)| file.record_id === record.groupId          | usage_evidence | 同上           |
 * | diesel_generator (測試)| file.record_id === gen.id                  | other          | 銘牌照片       |
 * | electricity           | file.record_index === index                | usage_evidence | 電費單         |
 * | natural_gas           | file.record_index === index                | usage_evidence | 帳單           |
 * |                       | file_type === 'other' + no record_index    | other          | 熱值證明(共用)  |
 * | acetylene, wd40, lpg  | file.month === month                       | usage_evidence | 月份佐證       |
 * | refrigerant           | file.record_id === record.id               | other          | 設備佐證       |
 * | fire_extinguisher     | file.record_id === record.id               | other          | 銘牌           |
 * |                       | file_type === 'other' + no record_id      | other          | 檢修表(共用)    |
 * | urea                  | file.record_id === record.id               | usage_evidence | 使用佐證       |
 * |                       | file_type === 'msds'                       | msds           | MSDS(共用)     |
 * | welding_rod           | file.month === month                       | usage_evidence | 使用佐證       |
 * |                       | file_type === 'msds'                       | msds           | MSDS(共用)     |
 * | septic_tank           | file.month === month                       | usage_evidence | 月份佐證       |
 * | employee_commute      | 無檔案                                     | -              | 不顯示佐證      |
 */

/**
 * 根據頁面類型和記錄資訊，精確匹配檔案
 *
 * @param pageKey - 頁面識別碼（如 'diesel', 'electricity'）
 * @param record - 資料記錄（包含 id, groupId, month 等）
 * @param recordIndex - 記錄索引（電費/天然氣用）
 * @param allFiles - 該 entry 的所有檔案
 * @returns 匹配的檔案陣列
 */
export function findRelatedFiles(
  pageKey: string,
  record: ExtractedRecord,
  recordIndex: number,
  allFiles: EvidenceFile[]
): EvidenceFile[] {
  console.log(`🔍 [findRelatedFiles] pageKey=${pageKey}, record.id=${record.id}, record.groupId=${record.groupId}, record.month=${record.month}, recordIndex=${recordIndex}`)

  let matched: EvidenceFile[] = []

  // 根據頁面類型使用不同的匹配策略
  switch (pageKey) {
    // 柴油/汽油：用 groupId 匹配（檔案儲存時用的是 groupId）
    case 'diesel':
    case 'gasoline':
      if (record.groupId) {
        matched = allFiles.filter(f =>
          f.file_type === 'usage_evidence' &&
          f.record_id === record.groupId
        )
        console.log(`   策略: groupId 匹配, groupId=${record.groupId}`)
      }
      break

    // 柴油發電機（加油版）：同樣用 groupId
    case 'diesel_generator':
      if (record.groupId) {
        matched = allFiles.filter(f =>
          f.file_type === 'usage_evidence' &&
          f.record_id === record.groupId
        )
        console.log(`   策略: groupId 匹配 (發電機加油)`)
      } else if (record.id) {
        // 測試版：用 record.id 匹配銘牌
        matched = allFiles.filter(f =>
          f.file_type === 'other' &&
          f.record_id === record.id
        )
        console.log(`   策略: record.id 匹配 (發電機銘牌)`)
      }
      break

    // 電費/天然氣：用 record_index 匹配
    case 'electricity':
    case 'natural_gas':
      matched = allFiles.filter(f =>
        f.file_type === 'usage_evidence' &&
        f.record_index === recordIndex
      )
      console.log(`   策略: record_index 匹配, index=${recordIndex}`)
      break

    // 容量+數量類（乙炔、WD-40、液化石油氣）：用 record.id 匹配數量佐證
    case 'acetylene':
    case 'wd40':
    case 'lpg':
    case 'gas_cylinder':
      if (record.id) {
        const recordId = record.id  // Type narrowing
        matched = allFiles.filter(f =>
          f.file_type === 'other' &&
          f.record_id?.split(',').includes(recordId)
        )
        console.log(`   策略: record.id 匹配 (數量佐證), id=${recordId}`)
      }
      break

    // 冷媒/滅火器：用 record.id 匹配
    case 'refrigerant':
    case 'fire_extinguisher':
      if (record.id) {
        matched = allFiles.filter(f =>
          f.file_type === 'other' &&
          f.record_id === record.id
        )
        console.log(`   策略: record.id 匹配 (設備佐證)`)
      }
      break

    // 尿素：用 record.id 匹配使用佐證
    case 'urea':
      if (record.id) {
        matched = allFiles.filter(f =>
          f.file_type === 'usage_evidence' &&
          f.record_id === record.id
        )
        console.log(`   策略: record.id 匹配 (使用佐證)`)
      }
      break

    // 焊條：用 record.id 匹配數量佐證
    case 'welding_rod':
      if (record.id) {
        const recordId = record.id  // Type narrowing
        matched = allFiles.filter(f =>
          f.file_type === 'other' &&
          f.record_id?.split(',').includes(recordId)
        )
        console.log(`   策略: record.id 匹配 (數量佐證), id=${recordId}`)
      }
      break

    // 化糞池：用 month 匹配
    case 'septic_tank':
      if (record.month) {
        matched = allFiles.filter(f =>
          f.file_type === 'usage_evidence' &&
          f.month === record.month
        )
        console.log(`   策略: month 匹配, month=${record.month}`)
      }
      break

    // 員工通勤：不顯示佐證檔案
    case 'employee_commute':
      matched = []
      console.log(`   策略: 無檔案 (員工通勤不顯示佐證)`)
      break

    // 其他頁面：嘗試 month 匹配（fallback）
    default:
      if (record.month) {
        matched = allFiles.filter(f =>
          f.file_type === 'usage_evidence' &&
          f.month === record.month
        )
        console.log(`   策略: month 匹配 (fallback), month=${record.month}`)
      }
      break
  }

  console.log(`   ✅ 匹配結果: ${matched.length} 個檔案`)

  // 診斷：如果找不到檔案，輸出所有檔案資訊
  if (matched.length === 0 && allFiles.length > 0) {
    console.warn(`⚠️ [findRelatedFiles] ${pageKey} 找不到匹配檔案`)
    console.warn(`   record 資訊: id=${record.id}, groupId=${record.groupId}, month=${record.month}, recordIndex=${recordIndex}`)
    console.warn(`   所有檔案:`)
    allFiles.forEach(f => {
      console.warn(`     - ${f.file_name}: record_id=${f.record_id}, record_index=${f.record_index}, month=${f.month}, file_type=${f.file_type}`)
    })
  }

  return matched
}

/**
 * 取得 entry 的所有「其他」類型檔案（MSDS、熱值證明等）
 */
export function getEntryOtherFiles(
  entryId: string,
  allFiles: EvidenceFile[]
): EvidenceFile[] {
  return allFiles.filter(f =>
    (f.file_type === 'other' || f.file_type === 'msds') &&
    !f.record_id  // 不屬於特定記錄的檔案
  )
}

/**
 * 取得 entry 的所有檔案（當無法精確匹配時使用）
 */
export function getAllEntryFiles(
  entryId: string,
  allFiles: EvidenceFile[]
): EvidenceFile[] {
  return allFiles
}

/**
 * 簡單前綴命名：類別_原始檔名
 */
export function simpleRename(
  originalName: string,
  categoryName: string
): string {
  return `${categoryName}_${originalName}`
}

/**
 * 處理重複檔名
 */
export function handleDuplicateFileName(
  fileName: string,
  existingNames: Set<string>
): string {
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
