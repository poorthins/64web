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

  // 載入資料
  useEffect(() => {
    loadDashboardData()
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

    visibleEntries.forEach(entry => {
      const status = entry.status || 'pending'
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++
        itemsByStatus[status as keyof typeof itemsByStatus].push(entry)
      }
    })

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
    // TODO: 導航到盤查清單頁面或打開範例
    console.log('盤查清單/佐證範例按鈕被點擊')
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
    <div className="fixed inset-0 bg-figma-gray overflow-y-auto z-40">
      {/* 頂部導航 - 固定在頂部 */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <NavigationBar />
      </div>

      {/* 主要內容 */}
      <div>
        {/* Hero Section */}
        <HeroSection onChecklistClick={handleChecklistClick} />

        {/* 狀態卡片區塊 */}
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-center items-stretch gap-5 w-full max-w-[1920px] mx-auto">
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
          </div>
        </section>

        {/* 進度條 */}
        <ProgressBar
          completed={stats.completedCount}
          total={stats.totalCategories}
        />

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
  )
}

export default NewDashboard
