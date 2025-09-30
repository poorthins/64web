import { deleteEvidenceFile, getEntryFiles, uploadEvidenceWithEntry, EvidenceFile } from './files'
import { MemoryFile } from '../components/EvidenceUpload'

interface SmartOverwriteItem {
  itemKey: string | number      // 項目識別（如月份、'msds'等）
  newFiles: MemoryFile[]        // 新上傳的檔案
  existingFiles: EvidenceFile[] // 現有的檔案
  fileType?: 'msds' | 'usage_evidence' | 'other' // 明確指定檔案類型
}

interface SmartOverwriteOptions {
  entryId: string
  pageKey: string
  year: number
  debug?: boolean
}

interface SmartOverwriteResult {
  itemKey: string | number
  deleted: number
  uploaded: number
  kept: number
  error?: string
}

/**
 * 智慧型檔案覆蓋 - 只覆蓋有新檔案的項目
 *
 * 範例：
 * - 原本：1月(舊)、2月(舊)、3月(舊)
 * - 使用者上傳：2月(新)、4月(新)
 * - 結果：1月(舊)、2月(新)、3月(舊)、4月(新)
 */
export async function smartOverwriteFiles(
  items: SmartOverwriteItem[],
  options: SmartOverwriteOptions
): Promise<SmartOverwriteResult[]> {
  const { entryId, pageKey, year, debug = false } = options
  const results: SmartOverwriteResult[] = []

  if (debug) {
    console.log('========== 智慧型檔案覆蓋開始 ==========')
    console.log('處理項目數:', items.length)
  }

  for (const item of items) {
    const { itemKey, newFiles, existingFiles, fileType } = item
    const result: SmartOverwriteResult = {
      itemKey,
      deleted: 0,
      uploaded: 0,
      kept: 0
    }

    try {
      if (debug) {
        console.log(`\n📦 處理項目 ${itemKey} (類型: ${fileType || '未指定'}):`)
        console.log(`  現有: ${existingFiles.length} 個, 新增: ${newFiles.length} 個`)
      }

      // 如果有新檔案，執行覆蓋
      if (newFiles.length > 0) {
        // 刪除舊檔案
        for (const oldFile of existingFiles) {
          try {
            await deleteEvidenceFile(oldFile.id)
            result.deleted++
            if (debug) console.log(`  ✅ 刪除: ${oldFile.file_name}`)
          } catch (error) {
            console.error(`  ❌ 刪除失敗: ${oldFile.file_name}`)
            // 刪除失敗但繼續處理
          }
        }

        // 上傳新檔案
        for (const memFile of newFiles) {
          try {
            // 根據 fileType 或 itemKey 決定檔案類別
            let category: 'msds' | 'usage_evidence' | 'other' = 'other'
            if (fileType) {
              category = fileType
            } else if (itemKey === 'msds' || typeof itemKey === 'string' && itemKey.includes('msds')) {
              category = 'msds'
            } else if (typeof itemKey === 'string' && itemKey.includes('usage')) {
              category = 'usage_evidence'
            } else if (typeof itemKey === 'number') {
              category = 'usage_evidence' // 數字通常表示月份
            }

            const month = category === 'usage_evidence' && typeof itemKey === 'number' ? itemKey : undefined

            await uploadEvidenceWithEntry(memFile.file, {
              entryId,
              pageKey,
              year,
              category,
              month
            })
            result.uploaded++
            if (debug) console.log(`  ✅ 上傳: ${memFile.file_name} (類別: ${category}, 月份: ${month || '無'})`)
          } catch (error) {
            console.error(`  ❌ 上傳失敗: ${memFile.file_name}`)
            result.error = error instanceof Error ? error.message : '上傳失敗'
            // 上傳失敗時不增加計數器，但記錄錯誤
          }
        }
      } else {
        // 沒有新檔案，保留舊檔案
        result.kept = existingFiles.length
        if (debug && existingFiles.length > 0) {
          console.log(`  ⏭️ 保留 ${existingFiles.length} 個舊檔案`)
        }
      }

      results.push(result)
    } catch (error) {
      result.error = error instanceof Error ? error.message : '處理失敗'
      results.push(result)
    }
  }

  if (debug) {
    const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0)
    const totalUploaded = results.reduce((sum, r) => sum + r.uploaded, 0)
    const totalKept = results.reduce((sum, r) => sum + r.kept, 0)
    console.log('\n========== 智慧型檔案覆蓋完成 ==========')
    console.log(`總計: 刪除 ${totalDeleted}, 上傳 ${totalUploaded}, 保留 ${totalKept}`)
  }

  return results
}