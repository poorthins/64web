import { SubmissionRecord, mockSubmissions } from '../data/mockData'

export type SubmissionStatus = 'submitted' | 'approved' | 'rejected'

export interface StatusChangeResult {
  success: boolean
  message: string
  data?: SubmissionRecord
  error?: string
}

export interface StatusChangeEvent {
  id: string
  oldStatus: SubmissionStatus
  newStatus: SubmissionStatus
  reason?: string
  timestamp: string
  reviewerId?: string
}

// 狀態轉換規則
export const STATUS_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  submitted: ['approved', 'rejected'],
  approved: ['rejected'], // 允許從已通過改為已退回（修正錯誤）
  rejected: ['approved', 'submitted'] // 允許重新審核
}

// 狀態中文標籤
export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: '已提交',
  approved: '已通過',
  rejected: '已退回'
}

// 狀態樣式配置
export const STATUS_STYLES: Record<SubmissionStatus, {
  bg: string
  text: string
  border: string
  icon: string
}> = {
  submitted: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    icon: '📋'
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    icon: '✅'
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    icon: '❌'
  }
}

// 狀態管理器類別
export class StatusManager {
  private static instance: StatusManager
  private submissions: Map<string, SubmissionRecord> = new Map()
  private statusHistory: Map<string, StatusChangeEvent[]> = new Map()
  private listeners: Array<(event: StatusChangeEvent) => void> = []

  private constructor() {
    // 初始化資料 - 優先從 localStorage 載入，否則使用 mock 資料
    this.initializeFromStorage()
  }

  // 從 localStorage 或 mock 資料初始化
  private initializeFromStorage(): void {
    try {
      const stored = localStorage.getItem('poc_submissions')
      if (stored) {
        console.log('📦 從 localStorage 載入狀態資料')
        const data = JSON.parse(stored)
        data.forEach((item: SubmissionRecord) => {
          this.submissions.set(item.id, item)
        })
        console.log(`✅ 載入了 ${data.length} 筆記錄`)
      } else {
        console.log('📦 使用 mock 資料初始化')
        mockSubmissions.forEach(submission => {
          this.submissions.set(submission.id, { ...submission })
        })
        console.log(`✅ 初始化了 ${mockSubmissions.length} 筆記錄`)
      }
    } catch (error) {
      console.error('❌ localStorage 載入失敗，使用 mock 資料:', error)
      mockSubmissions.forEach(submission => {
        this.submissions.set(submission.id, { ...submission })
      })
    }
  }

  public static getInstance(): StatusManager {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager()
    }
    return StatusManager.instance
  }

  // 檢查狀態轉換是否有效
  public isValidTransition(currentStatus: SubmissionStatus, newStatus: SubmissionStatus): boolean {
    if (currentStatus === newStatus) {
      return false // 不允許相同狀態轉換
    }

    const allowedTransitions = STATUS_TRANSITIONS[currentStatus]
    return allowedTransitions.includes(newStatus)
  }

  // 取得項目當前狀態
  public getSubmissionStatus(submissionId: string): SubmissionStatus | null {
    const submission = this.submissions.get(submissionId)
    return submission ? submission.status : null
  }

  // 取得所有提交記錄
  public getAllSubmissions(): SubmissionRecord[] {
    return Array.from(this.submissions.values())
  }

  // 根據狀態篩選
  public getSubmissionsByStatus(status: SubmissionStatus): SubmissionRecord[] {
    return this.getAllSubmissions().filter(submission => submission.status === status)
  }

  // 變更狀態
  public async changeStatus(
    submissionId: string,
    newStatus: SubmissionStatus,
    reason?: string,
    reviewerId?: string
  ): Promise<StatusChangeResult> {
    try {
      const submission = this.submissions.get(submissionId)
      if (!submission) {
        return {
          success: false,
          message: '找不到指定的提交記錄',
          error: 'SUBMISSION_NOT_FOUND'
        }
      }

      const oldStatus = submission.status

      // 檢查狀態轉換是否有效
      if (!this.isValidTransition(oldStatus, newStatus)) {
        return {
          success: false,
          message: `無法從 ${STATUS_LABELS[oldStatus]} 轉換為 ${STATUS_LABELS[newStatus]}`,
          error: 'INVALID_TRANSITION'
        }
      }

      // 退回狀態必須提供原因
      if (newStatus === 'rejected' && !reason?.trim()) {
        return {
          success: false,
          message: '退回狀態必須提供原因',
          error: 'REASON_REQUIRED'
        }
      }

      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 300))

      // 更新提交記錄
      const updatedSubmission: SubmissionRecord = {
        ...submission,
        status: newStatus,
        reviewDate: new Date().toISOString().split('T')[0],
        reviewer: reviewerId || '系統管理員',
        comments: reason || '',
        reviewNotes: reason || '',
        reviewedAt: new Date().toISOString(),
        reviewerId: reviewerId || 'admin_system'
      }

      this.submissions.set(submissionId, updatedSubmission)

      // 記錄狀態變更歷史
      const changeEvent: StatusChangeEvent = {
        id: submissionId,
        oldStatus,
        newStatus,
        reason,
        timestamp: new Date().toISOString(),
        reviewerId
      }

      if (!this.statusHistory.has(submissionId)) {
        this.statusHistory.set(submissionId, [])
      }
      this.statusHistory.get(submissionId)!.push(changeEvent)

      // 通知監聽器
      this.notifyListeners(changeEvent)

      // 持久化到 localStorage
      this.persistToLocalStorage()

      return {
        success: true,
        message: `已成功更新為 ${STATUS_LABELS[newStatus]}`,
        data: updatedSubmission
      }

    } catch (error) {
      return {
        success: false,
        message: '狀態更新失敗',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      }
    }
  }

  // 取得狀態變更歷史
  public getStatusHistory(submissionId: string): StatusChangeEvent[] {
    return this.statusHistory.get(submissionId) || []
  }

  // 取得使用者鎖定狀態訊息
  public getLockMessage(status: SubmissionStatus): string {
    switch (status) {
      case 'approved':
        return '此項目已通過審核，無法編輯'
      case 'rejected':
        return '此項目已退回，請修正後重新提交'
      case 'submitted':
        return '此項目審核中，請等待審核結果'
      default:
        return ''
    }
  }

  // 檢查項目是否可編輯
  public isEditable(status: SubmissionStatus): boolean {
    return status === 'rejected' || status === 'submitted'
  }

  // 計算統計資料
  public calculateStats(): Record<SubmissionStatus, number> {
    const stats: Record<SubmissionStatus, number> = {
      submitted: 0,
      approved: 0,
      rejected: 0
    }

    this.getAllSubmissions().forEach(submission => {
      stats[submission.status]++
    })

    return stats
  }

  // 批量狀態變更
  public async bulkChangeStatus(
    submissionIds: string[],
    newStatus: SubmissionStatus,
    reason?: string,
    reviewerId?: string
  ): Promise<{
    successful: StatusChangeResult[]
    failed: StatusChangeResult[]
  }> {
    const successful: StatusChangeResult[] = []
    const failed: StatusChangeResult[] = []

    for (const id of submissionIds) {
      const result = await this.changeStatus(id, newStatus, reason, reviewerId)
      if (result.success) {
        successful.push(result)
      } else {
        failed.push(result)
      }
    }

    return { successful, failed }
  }

  // 註冊狀態變更監聽器
  public addListener(listener: (event: StatusChangeEvent) => void): void {
    this.listeners.push(listener)
  }

  // 移除監聽器
  public removeListener(listener: (event: StatusChangeEvent) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  // 通知所有監聽器
  private notifyListeners(event: StatusChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Status change listener error:', error)
      }
    })
  }

  // 持久化到 localStorage
  private persistToLocalStorage(): void {
    try {
      const data = Array.from(this.submissions.values())
      localStorage.setItem('poc_submissions', JSON.stringify(data))
      console.log(`💾 已保存 ${data.length} 筆記錄到 localStorage`)
    } catch (error) {
      console.error('❌ localStorage 保存失敗:', error)
    }
  }

  // 重置資料（測試用）
  public reset(): void {
    console.log('🔄 重置狀態資料')
    this.submissions.clear()
    this.statusHistory.clear()
    mockSubmissions.forEach(submission => {
      this.submissions.set(submission.id, { ...submission })
    })
    this.persistToLocalStorage()
    console.log('✅ 狀態資料已重置')
  }

  // 取得可用的狀態轉換選項
  public getAvailableTransitions(currentStatus: SubmissionStatus): SubmissionStatus[] {
    return STATUS_TRANSITIONS[currentStatus] || []
  }

  // 模擬網路延遲
  private async simulateNetworkDelay(): Promise<void> {
    const delay = Math.random() * 500 + 200 // 200-700ms
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

// 輔助函數
export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const getStatusIcon = (status: SubmissionStatus): string => {
  return STATUS_STYLES[status].icon
}

export const getStatusStyle = (status: SubmissionStatus) => {
  return STATUS_STYLES[status]
}

// 建立預設實例
export const statusManager = StatusManager.getInstance()