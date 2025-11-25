import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCurrentUserPermissions } from '../hooks/useCurrentUserPermissions'
import { ALL_ENERGY_CATEGORIES } from '../utils/energyCategories'
import { getAllEntries, AllEntry } from '../api/dashboardAPI'
import { ENERGY_CONFIG } from '../pages/admin/data/energyConfig'

// 新版 Dashboard 元件
import NavigationBar from '../components/dashboard/NavigationBar'
import HeroSection from '../components/dashboard/HeroSection'
import StatusCard from '../components/dashboard/StatusCard'
import StatusModal from '../components/dashboard/StatusModal'
import ProgressBar from '../components/dashboard/ProgressBar'
import AboutUsSection from '../components/dashboard/AboutUsSection'
import type { StatusType } from '../components/dashboard/StatusCard'

/**
 * NewDashboard - 新版儀表板
 *
 * 特點：
 * 1. 全螢幕設計，自帶 NavigationBar
 * 2. 重用舊版 Dashboard 的所有資料邏輯
 * 3. 使用 Figma 設計的新 UI 元件
 * 4. 支援權限系統（一般用戶只看有權限的項目）
 */
const NewDashboard = () => {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { permissions, filterByPermissions, hasPermissionSync, isLoading: isPermissionsLoading } = useCurrentUserPermissions()

  // 資料狀態
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allEntries, setAllEntries] = useState<AllEntry[]>([])

  // UI 狀態
  const [modalStatus, setModalStatus] = useState<StatusType | null>(null)
  const [scale, setScale] = useState(1)

  // 載入資料
  useEffect(() => {
    loadDashboardData()
  }, [])

  // 響應式縮放
  useEffect(() => {
    const updateScale = () => {
      const viewportWidth = window.innerWidth
      const designWidth = 1920
      const newScale = viewportWidth < designWidth ? viewportWidth / designWidth : 1
      setScale(newScale)
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const allEntriesData = await getAllEntries()
      setAllEntries(allEntriesData)
    } catch (err) {
      console.error('載入工作台數據失敗:', err)
      setError(err instanceof Error ? err.message : '載入數據時發生未知錯誤')
    } finally {
      setLoading(false)
    }
  }

  // 計算基於權限的統計（與舊版邏輯相同）
  const stats = useMemo(() => {
    if (isPermissionsLoading || !permissions) {
      return {
        totalCategories: 0,
        completedCount: 0,
        statusCounts: { pending: 0, submitted: 0, approved: 0, rejected: 0 },
        itemsByStatus: {
          pending: [] as AllEntry[],
          submitted: [] as AllEntry[],
          approved: [] as AllEntry[],
          rejected: [] as AllEntry[]
        }
      }
    }

    // 管理員看到所有 14 個類別，一般用戶看有權限的類別
    const totalCategories = isAdmin ? ALL_ENERGY_CATEGORIES.length : (permissions.energy_categories?.length || 0)

    // 只統計有權限的項目
    const visibleEntries = filterByPermissions(allEntries, (entry) => entry.pageKey)

    // 🔍 Debug log
    console.log('🔍 [NewDashboard] Dashboard 統計開始', {
      totalCategories,
      allEntriesCount: allEntries.length,
      visibleEntriesCount: visibleEntries.length,
      visibleEntries: visibleEntries.map(e => ({ pageKey: e.pageKey, status: e.status }))
    })

    // 計算已完成數量（狀態為 approved）
    const completedCount = visibleEntries.filter(entry => entry.status === 'approved').length

    // 計算各狀態的數量和項目列表
    const statusCounts = { pending: 0, submitted: 0, approved: 0, rejected: 0 }
    const itemsByStatus = {
      pending: [] as AllEntry[],
      submitted: [] as AllEntry[],
      approved: [] as AllEntry[],
      rejected: [] as AllEntry[]
    }

    const unknownStatuses: string[] = []

    visibleEntries.forEach(entry => {
      // saved 和 null 都視為 pending（待填寫）
      let status = (entry.status === 'saved' || !entry.status) ? 'pending' : entry.status

      // ✅ 統一退回狀態
      if (status === 'returned') {
        status = 'rejected'
      }

      // ✅ 處理其他後端可能的狀態
      if (status === 'draft') {
        status = 'pending'  // 草稿視為待填寫
      }
      if (status === 'under_review' || status === 'needs_revision' || status === 'needs_fix') {
        status = 'submitted'  // 審核中視為已提交
      }

      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++
        itemsByStatus[status as keyof typeof itemsByStatus].push(entry)
      } else {
        // ⚠️ 記錄未知狀態
        console.warn(`❌ [NewDashboard] 未知狀態: "${status}" for ${entry.pageKey}`)
        unknownStatuses.push(`${entry.pageKey}:${status}`)
      }
    })

    // 📊 Debug 統計結果
    const statusSum = Object.values(statusCounts).reduce((a, b) => a + b, 0)
    console.log('📊 [NewDashboard] 統計結果', {
      statusCounts,
      statusSum,
      completedCount,
      visibleEntriesCount: visibleEntries.length,
      isMatched: statusSum === visibleEntries.length,
      unknownStatuses
    })

    if (statusSum !== visibleEntries.length) {
      console.error('⚠️ [NewDashboard] 統計不一致！', {
        visibleEntries: visibleEntries.length,
        statusSum,
        difference: visibleEntries.length - statusSum
      })
    }

    return {
      totalCategories,
      completedCount,
      statusCounts,
      itemsByStatus
    }
  }, [isPermissionsLoading, permissions, isAdmin, allEntries, filterByPermissions])

  // 處理導航
  const handleNavigateToPage = (pageKey: string) => {
    // 檢查權限
    if (!isAdmin && !hasPermissionSync(pageKey)) {
      console.warn(`嘗試訪問無權限的頁面: ${pageKey}`)
      return
    }
    navigate(`/app/${pageKey}`)
  }

  // 將 AllEntry 轉換為 Modal 需要的格式
  const getModalItems = (status: StatusType) => {
    const entries = stats.itemsByStatus[status]
    return entries.map(entry => {
      const config = ENERGY_CONFIG.find(c => c.id === entry.pageKey)
      return {
        id: entry.pageKey,
        name: config?.name || entry.pageKey,
        route: `/app/${entry.pageKey}`
      }
    })
  }

  // 處理盤查清單按鈕點擊
  const handleChecklistClick = () => {
    navigate('/app/inventory-checklist')
  }

  if (loading || isPermissionsLoading) {
    return (
      <div className="min-h-screen bg-figma-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-figma-accent mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-figma-gray flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-800 mb-4">載入失敗</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="w-full px-4 py-2 bg-figma-accent text-white rounded-md hover:bg-opacity-90 transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto z-40 bg-white flex justify-center">
      <div style={{
        width: '1920px',
        minHeight: '100vh',
        position: 'relative',
        transform: `scale(${scale})`,
        transformOrigin: 'top center'
      }}>
        {/* 頂部導航 - 絕對定位在最上層 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }}>
          <NavigationBar onChecklistClick={handleChecklistClick} />
        </div>

        {/* 主要內容 */}
        <div>
          {/* Hero Section - 從頁面頂部開始 */}
          <HeroSection />

          {/* 狀態卡片 + 進度條區塊 (帶背景圖 1920x488px) */}
          <section
            className="w-full flex justify-center"
            style={{
              backgroundImage: 'url(/bottom-bg.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              height: '488px'
            }}
          >
            <div style={{ width: '1920px', height: '100%' }}>
              {/* StatusCard 區塊 - 緊密連在一起 */}
              <div className="flex justify-center items-stretch" style={{ gap: 0 }}>
                <StatusCard
                  type="pending"
                  count={stats.statusCounts.pending}
                  onClick={() => setModalStatus('pending')}
                />
                <StatusCard
                  type="submitted"
                  count={stats.statusCounts.submitted}
                  onClick={() => setModalStatus('submitted')}
                />
                <StatusCard
                  type="approved"
                  count={stats.statusCounts.approved}
                  onClick={() => setModalStatus('approved')}
                />
                <StatusCard
                  type="rejected"
                  count={stats.statusCounts.rejected}
                  onClick={() => setModalStatus('rejected')}
                />
              </div>

              {/* 灰色半透明矩形 - 包含進度條 */}
              <div
                className="w-full flex justify-center"
                style={{
                  background: 'rgba(235, 237, 240, 0.90)',
                  height: '182px'
                }}
              >
                <div style={{ width: '1920px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ProgressBar
                    completed={stats.completedCount}
                    total={stats.totalCategories}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 關於我們 */}
          <AboutUsSection />

          {/* 狀態 Modal */}
          {modalStatus && (
            <StatusModal
              isOpen={true}
              onClose={() => setModalStatus(null)}
              type={modalStatus}
              items={getModalItems(modalStatus)}
              onItemClick={handleNavigateToPage}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default NewDashboard
