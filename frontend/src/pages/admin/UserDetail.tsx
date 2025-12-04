import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserDetails, UserProfile, getUserEnergyEntries, forceLogoutUser } from '../../api/adminUsers'
import { getUserSubmissions, Submission } from '../../api/adminSubmissions'
import { getPageRouteByName, getCategoryName } from './data/energyConfig'
import { toast } from 'react-hot-toast'

const UserDetail = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [user, setUser] = useState<UserProfile | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<{ status: string; current?: number; total?: number } | null>(null)

  useEffect(() => {
    if (userId) {
      loadData()
    }
  }, [userId])

  const loadData = async () => {
    if (!userId) return

    try {
      setLoading(true)
      const [userData, submissionsData] = await Promise.all([
        getUserDetails(userId),
        getUserSubmissions(userId)
      ])
      setUser(userData)
      setSubmissions(submissionsData)
    } catch (error) {
      console.error('Error loading user detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (submission: Submission): 'submitted' | 'approved' | 'rejected' => {
    // 優先使用新的三狀態系統（energy_entries.status）
    if (submission.status) {
      return submission.status
    }

    // 向後相容：如果沒有新狀態，回退到舊的 review_history
    const latestReview = submission.review_history?.[submission.review_history.length - 1]
    if (!latestReview) return 'submitted'

    if (latestReview.new_status === 'approved') return 'approved'
    if (latestReview.new_status === 'needs_fix') return 'rejected'
    return 'submitted'
  }

  const getStatusText = (status: 'submitted' | 'approved' | 'rejected'): string => {
    const map = {
      submitted: '待審核',
      approved: '已核准',
      rejected: '已退回'
    }
    return map[status]
  }

  const handleBack = () => {
    navigate('/app/admin')
  }

  const handleEdit = () => {
    navigate(`/app/admin/edit/${userId}`)
  }

  const handleSubmissionClick = (submission: Submission) => {
    // 使用 getPageRouteByName 從 category 取得路由路徑（支援顯示名稱和 page_key）
    const route = getPageRouteByName(submission.category)
    if (route) {
      // 導航到審核模式: /app/{category}?mode=review&entryId={id}&userId={userId}
      navigate(`${route}?mode=review&entryId=${submission.id}&userId=${userId}`)
    } else {
      console.warn(`無法找到類別 "${submission.category}" 的路由`)
    }
  }

  const handleExport = async () => {
    if (!userId) return

    setIsExporting(true)
    setExportProgress({ status: '正在載入填報記錄...' })

    try {
      // 從 API 取得使用者的能源填報記錄
      const entries = await getUserEnergyEntries(userId)

      // 檢查是否有資料
      if (!entries || entries.length === 0) {
        alert('此使用者尚無填報資料')
        setExportProgress(null)
        setIsExporting(false)
        return
      }

      // 使用完整匯出功能（Excel + 佐證資料）
      const { exportUserEntriesWithFiles } = await import('./utils/simpleExportUtils')
      const result = await exportUserEntriesWithFiles(
        userId,
        user?.display_name || '未知用戶',
        entries,
        (status, current, total) => {
          setExportProgress({ status, current, total })
        }
      )

      setExportProgress(null)

      if (result.failed === 0) {
        alert(`✅ 下載完成！\n成功：${result.success} 個檔案`)
      } else {
        alert(`⚠️ 部分檔案失敗\n成功：${result.success}\n失敗：${result.failed}\n\n錯誤：\n${result.errors.join('\n')}`)
      }
    } catch (error) {
      console.error('❌ 匯出失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '匯出失敗，請稍後再試'
      alert(errorMessage)
      setExportProgress(null)
    } finally {
      setIsExporting(false)
    }
  }

  const handleForceLogout = async () => {
    if (!userId || !user) return

    if (!confirm(`確定要強制登出 ${user.display_name} (${user.email}) 嗎？\n\n這將清除該用戶的所有登入狀態。`)) {
      return
    }

    try {
      await forceLogoutUser(userId)
      toast.success(`已成功登出 ${user.display_name}`)
    } catch (error) {
      console.error('強制登出失敗:', error)
      toast.error(error instanceof Error ? error.message : '強制登出失敗')
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--apple-gray-4)' }}>
        <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: 'var(--spacing-lg)' }}>
          <div className="text-center py-12">載入中...</div>
        </div>
      </div>
    )
  }

  // 統計
  const stats = {
    approved: submissions.filter(s => getStatusColor(s) === 'approved').length,
    submitted: submissions.filter(s => getStatusColor(s) === 'submitted').length,
    rejected: submissions.filter(s => getStatusColor(s) === 'rejected').length
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--apple-gray-4)' }}>
      <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: 'var(--spacing-lg)' }}>
        {/* 返回按鈕 */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleBack}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--apple-blue)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ fontSize: '20px' }}>←</span> 返回用戶列表
          </button>
        </div>

        {/* 左右兩欄布局 */}
        <div className="admin-two-column">
          {/* 左側：用戶資訊 */}
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-xl)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <div style={{
              marginBottom: '32px',
              paddingBottom: '24px',
              borderBottom: '1px solid var(--apple-gray-3)'
            }}>
              <h1 style={{
                fontSize: '36px',
                fontWeight: 700,
                marginBottom: '12px',
                lineHeight: 1.2
              }}>
                {user.company || '公司名稱'}
              </h1>
              <div style={{
                fontSize: '18px',
                color: 'var(--apple-text-secondary)',
                marginBottom: '6px'
              }}>
                {user.display_name}
              </div>
              <div style={{
                fontSize: '16px',
                color: 'var(--apple-text-secondary)'
              }}>
                {user.email}
              </div>
            </div>

            <h3 style={{
              fontSize: '24px',
              fontWeight: 600,
              marginBottom: 'var(--spacing-md)'
            }}>基本資訊</h3>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: 'var(--spacing-md) 0',
              borderBottom: '1px solid var(--apple-gray-4)'
            }}>
              <span style={{
                color: 'var(--apple-text-secondary)',
                fontSize: '16px'
              }}>目標年份</span>
              <span style={{
                fontWeight: 500,
                fontSize: '28px'
              }}>
                {user.target_year || new Date().getFullYear()}
              </span>
            </div>

            <h3 style={{
              fontSize: '24px',
              fontWeight: 600,
              marginTop: '24px',
              marginBottom: 'var(--spacing-md)'
            }}>能源類別權限</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {user.energy_categories?.map((cat: string) => (
                <span key={cat} className="admin-status-badge approved">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* 右側：快速操作 */}
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-xl)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: 600,
              marginBottom: 'var(--spacing-md)'
            }}>快速操作</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <button
                onClick={handleEdit}
                className="admin-btn admin-btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '18px' }}>✏️</span>
                編輯用戶資料
              </button>
              <button
                className="admin-btn admin-btn-secondary"
                onClick={handleExport}
                disabled={isExporting}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isExporting ? 0.5 : 1,
                  cursor: isExporting ? 'not-allowed' : 'pointer'
                }}
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                    下載中...
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '18px' }}>📥</span>
                    下載用戶資料
                  </>
                )}
              </button>
              <button
                onClick={handleForceLogout}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fecaca'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fee2e2'
                }}
              >
                <span style={{ fontSize: '18px' }}>🚪</span>
                強制登出用戶
              </button>
            </div>

            {/* 匯出進度顯示 */}
            {exportProgress && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '8px' }}>
                  {exportProgress.status}
                </div>
                {exportProgress.total !== undefined && exportProgress.current !== undefined && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#2563eb', marginBottom: '4px' }}>
                      <span>{exportProgress.current} / {exportProgress.total}</span>
                      <span>{Math.round((exportProgress.current / exportProgress.total) * 100)}%</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#bfdbfe', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(exportProgress.current / exportProgress.total) * 100}%`,
                          backgroundColor: '#2563eb',
                          height: '100%',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <h3 style={{
              fontSize: '24px',
              fontWeight: 600,
              marginTop: '24px',
              marginBottom: 'var(--spacing-md)'
            }}>統計資訊</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--apple-text-secondary)', fontSize: '14px' }}>已通過</span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-success)' }}>
                  {stats.approved}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--apple-text-secondary)', fontSize: '14px' }}>待審核</span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-warning)' }}>
                  {stats.submitted}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--apple-text-secondary)', fontSize: '14px' }}>已退回</span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-error)' }}>
                  {stats.rejected}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 填報記錄表格 */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-xl)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{
            fontSize: '20px',
            marginBottom: '20px',
            fontWeight: 600
          }}>填報記錄</h3>

          {submissions.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--apple-text-secondary)' }}>
              尚無填報記錄
            </div>
          ) : (
            <div className="admin-submission-grid" style={{ marginBottom: '80px' }}>
              {submissions.map(sub => {
                const status = getStatusColor(sub)
                // 優先使用新系統的 review_notes，如果沒有則回退到舊的 review_history
                const rejectReason = sub.review_notes || sub.review_history?.[sub.review_history.length - 1]?.review_notes

                return (
                  <div
                    key={sub.id}
                    className={`admin-submission-card ${status}`}
                    onClick={() => handleSubmissionClick(sub)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="admin-submission-card-title">
                      {getCategoryName(sub.category)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className={`admin-submission-status-dot ${status}`}></div>
                      <span className="admin-submission-status-text">
                        {getStatusText(status)}
                      </span>
                    </div>

                    {/* 顯示退回原因 */}
                    {status === 'rejected' && rejectReason && (
                      <div style={{
                        marginTop: '12px',
                        padding: '8px 12px',
                        backgroundColor: '#fee2e2',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: '#991b1b',
                        textAlign: 'left',
                        width: '100%'
                      }}>
                        {rejectReason}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserDetail
