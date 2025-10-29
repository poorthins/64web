import { exportUserEntriesWithFiles } from './exportUtils'
import { getUserEntries } from '../../../api/entries'

/**
 * 匯出單一用戶的完整填報資料（Excel + 佐證資料）
 *
 * @param userId - 用戶 ID
 * @param userName - 用戶名稱
 * @param onProgress - 進度回調函數（選填）
 * @returns Promise<{ success: number; failed: number; errors: string[] }>
 */
export async function exportSingleUser(
  userId: string,
  userName: string,
  onProgress?: (status: string, current?: number, total?: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  try {
    console.log('🚀 [exportSingleUser] 開始匯出用戶資料:', { userId, userName })

    // 1. 取得用戶的所有填報記錄
    onProgress?.('正在載入填報記錄...', 0, 1)
    const entries = await getUserEntries(userId)

    if (!entries || entries.length === 0) {
      console.warn('⚠️ [exportSingleUser] 該用戶沒有填報資料')
      throw new Error('該用戶沒有填報資料')
    }

    console.log(`✅ [exportSingleUser] 成功載入 ${entries.length} 筆填報記錄`)

    // 2. 使用已實作的匯出功能（包含 Excel + 佐證資料）
    onProgress?.('正在準備下載...', 1, 1)
    const result = await exportUserEntriesWithFiles(
      userId,
      userName,
      entries,
      onProgress
    )

    console.log('✅ [exportSingleUser] 用戶資料匯出完成:', {
      success: result.success,
      failed: result.failed,
      hasErrors: result.errors.length > 0
    })

    return result

  } catch (error) {
    console.error('❌ [exportSingleUser] 用戶資料匯出失敗:', error)
    throw error
  }
}