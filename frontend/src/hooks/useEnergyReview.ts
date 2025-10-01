import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getEntryById, type EnergyEntry } from '../api/entries'
import { reviewEntry } from '../api/reviewEnhancements'

/**
 * useEnergyReview Hook 返回值
 */
export interface UseEnergyReviewReturn {
  // 審核模式
  isReviewing: boolean
  reviewData: EnergyEntry | null
  loading: boolean

  // 審核操作
  approve: () => Promise<void>
  reject: (reason: string) => Promise<void>
  approving: boolean
  rejecting: boolean

  // 訊息
  error: string | null
}

/**
 * 能源填報審核 Hook
 * 處理管理員審核功能：檢測審核模式、載入待審資料、執行通過/退件操作
 *
 * @returns UseEnergyReviewReturn
 *
 * @example
 * // URL: /app/admin/wd40?mode=review&entryId=xxx&userId=yyy
 * const {
 *   isReviewing,
 *   reviewData,
 *   loading,
 *   approve,
 *   reject,
 *   approving,
 *   rejecting
 * } = useEnergyReview()
 *
 * // 通過
 * await approve()
 *
 * // 退件
 * await reject('資料不完整，請補充證明文件')
 */
export function useEnergyReview(): UseEnergyReviewReturn {
  // 狀態管理
  const [reviewData, setReviewData] = useState<EnergyEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // URL 參數和導航
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // 檢測審核模式
  const mode = searchParams.get('mode')
  const entryId = searchParams.get('entryId')
  const userId = searchParams.get('userId')
  const isReviewing = mode === 'review' && !!entryId

  /**
   * 初始化：載入待審資料
   */
  useEffect(() => {
    if (!isReviewing) {
      return
    }

    const loadReviewData = async () => {
      console.log('📂 [useEnergyReview] Loading review data:', {
        entryId,
        userId,
        mode
      })

      setLoading(true)
      setError(null)

      try {
        const entry = await getEntryById(entryId!)
        setReviewData(entry)
        console.log('✅ [useEnergyReview] Review data loaded:', {
          entryId: entry?.id,
          status: entry?.status,
          category: entry?.category
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '載入待審資料失敗'
        console.error('❌ [useEnergyReview] Load error:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadReviewData()
  }, [isReviewing, entryId, userId, mode])

  /**
   * 通過審核
   */
  const approve = async () => {
    if (!entryId) {
      setError('缺少 entryId 參數')
      return
    }

    console.log('✅ [useEnergyReview] Approving entry:', entryId)
    setApproving(true)
    setError(null)

    try {
      await reviewEntry(entryId, 'approve', '')
      console.log('✅ [useEnergyReview] Entry approved successfully')

      // 導航回上一頁
      navigate(-1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '審核通過失敗'
      console.error('❌ [useEnergyReview] Approve error:', err)
      setError(errorMessage)
      throw err
    } finally {
      setApproving(false)
    }
  }

  /**
   * 退件
   */
  const reject = async (reason: string) => {
    if (!entryId) {
      setError('缺少 entryId 參數')
      return
    }

    // 驗證退件原因
    if (!reason || reason.trim() === '') {
      setError('請填寫退件原因')
      return
    }

    console.log('❌ [useEnergyReview] Rejecting entry:', { entryId, reason })
    setRejecting(true)
    setError(null)

    try {
      await reviewEntry(entryId, 'reject', reason)
      console.log('✅ [useEnergyReview] Entry rejected successfully')

      // 導航回上一頁
      navigate(-1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '退件失敗'
      console.error('❌ [useEnergyReview] Reject error:', err)
      setError(errorMessage)
      throw err
    } finally {
      setRejecting(false)
    }
  }

  return {
    // 審核模式
    isReviewing,
    reviewData,
    loading,

    // 審核操作
    approve,
    reject,
    approving,
    rejecting,

    // 訊息
    error
  }
}
