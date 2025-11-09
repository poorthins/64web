import { useSearchParams } from 'react-router-dom'

/**
 * useReviewMode - 審核模式檢測 Hook
 *
 * 統一管理審核模式的 URL 參數讀取邏輯
 *
 * URL 參數：
 * - mode=review: 是否為審核模式
 * - entryId: 待審核的記錄 ID
 * - userId: 填報者 ID
 *
 * 使用方式：
 * ```tsx
 * const { isReviewMode, reviewEntryId, reviewUserId } = useReviewMode()
 * ```
 *
 * @returns {Object} 審核模式相關資訊
 * @returns {boolean} isReviewMode - 是否為審核模式
 * @returns {string | null} reviewEntryId - 待審核的記錄 ID
 * @returns {string | null} reviewUserId - 填報者 ID
 */
export const useReviewMode = () => {
  const [searchParams] = useSearchParams()

  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  return {
    isReviewMode,
    reviewEntryId,
    reviewUserId
  }
}

export default useReviewMode
