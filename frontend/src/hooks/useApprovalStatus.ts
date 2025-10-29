import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface ApprovalStatus {
  isApproved: boolean
  isRejected: boolean
  isPending: boolean
  isSaved: boolean
  rejectionReason: string
  status: 'saved' | 'submitted' | 'approved' | 'rejected' | null
  reviewNotes?: string
  reviewedAt?: string
  reviewerId?: string
}

export const useApprovalStatus = (pageKey: string, year: number) => {
  const [status, setStatus] = useState<ApprovalStatus>({
    isApproved: false,
    isRejected: false,
    isPending: false,
    isSaved: false,
    rejectionReason: '',
    status: null,
    reviewNotes: '',
    reviewedAt: '',
    reviewerId: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        setLoading(true)
        setError(null)

        // 獲取當前用戶
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          throw new Error('用戶未登入')
        }

        console.log('🔍 [useApprovalStatus] Checking approval status:', {
          pageKey,
          year,
          userId: user.id
        })

        // 查詢該類別的審核狀態
        const { data, error: queryError } = await supabase
          .from('energy_entries')
          .select(`
            status,
            review_notes,
            reviewed_at,
            reviewer_id,
            created_at,
            updated_at
          `)
          .eq('page_key', pageKey)
          .eq('period_year', year)
          .eq('owner_id', user.id)
          .maybeSingle() // 使用 maybeSingle 避免沒有資料時報錯

        if (queryError) {
          throw queryError
        }

        console.log('📊 [useApprovalStatus] Query result:', {
          data,
          hasData: !!data
        })

        if (data) {
          const newStatus: ApprovalStatus = {
            isApproved: data.status === 'approved',
            isRejected: data.status === 'rejected',
            isPending: data.status === 'submitted',
            isSaved: data.status === 'saved',
            rejectionReason: data.status === 'rejected' ? (data.review_notes || '') : '',
            status: data.status,
            reviewNotes: data.review_notes || '',
            reviewedAt: data.reviewed_at || '',
            reviewerId: data.reviewer_id || ''
          }

          console.log('✅ [useApprovalStatus] Status determined:', newStatus)
          setStatus(newStatus)
        } else {
          // 沒有資料表示還沒有填報記錄
          console.log('ℹ️ [useApprovalStatus] No entry found, assuming draft status')
          setStatus({
            isApproved: false,
            isRejected: false,
            isPending: false,
            isSaved: false,
            rejectionReason: '',
            status: null,
            reviewNotes: '',
            reviewedAt: '',
            reviewerId: ''
          })
        }

      } catch (error) {
        console.error('❌ [useApprovalStatus] Error checking approval status:', error)
        setError(error instanceof Error ? error.message : '檢查審核狀態失敗')
      } finally {
        setLoading(false)
      }
    }

    if (pageKey && year) {
      checkApprovalStatus()
    }
  }, [pageKey, year, refreshTrigger])

  const reload = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return { ...status, loading, error, reload }
}

export default useApprovalStatus