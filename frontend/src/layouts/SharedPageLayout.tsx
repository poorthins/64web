import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { CATEGORY_GROUPS } from '../config/categoryMapping'
import LogoutButton from '../components/common/LogoutButton'
import BottomActionBar from '../components/BottomActionBar'
import { EntryStatus } from '../components/StatusSwitcher'
import PageHeader from '../components/PageHeader'
import StatusBanner from '../components/StatusBanner'
import InstructionText from '../components/InstructionText'
import { ApprovalStatus } from '../hooks/useApprovalStatus'

interface SharedPageLayoutProps {
  children: React.ReactNode
  /** 自訂右側按鈕文字，預設為「盤查清單/佐證範例」 */
  actionButtonText?: string
  /** 是否顯示右側按鈕，預設為 true */
  showActionButton?: boolean

  // PageHeader 配置 - 頁面標題（D、柴油(移動源)、Diesel）
  pageHeader?: {
    category: string
    title: string
    subtitle: string
    iconColor?: string
  }

  // StatusBanner 配置 - 審核狀態橫幅
  statusBanner?: {
    approvalStatus: ApprovalStatus
    isReviewMode?: boolean
    accentColor?: string
  }

  // InstructionText 配置 - 說明文字（每頁不同）
  instructionText?: string

  // BottomActionBar 配置 - 傳入這些 props 即可自動顯示底部操作欄
  bottomActionBar?: {
    currentStatus: EntryStatus
    submitting: boolean
    onSubmit: () => void
    onSave?: () => void
    onClear: () => void
    show?: boolean  // 是否顯示（預設 true）
    accentColor?: string
  }
}

/**
 * SharedPageLayout - 共用頁面模板
 *
 * 基於 Figma 設計的統一模板，包含：
 * - 頂部導航欄（Logo、首頁、類別一~六、溫室氣體盤查項目、Log Out）
 * - 白色內容區域
 * - 1920px 固定寬度，響應式縮放
 */
const SharedPageLayout: React.FC<SharedPageLayoutProps> = ({
  children,
  actionButtonText = '盤查清單/佐證範例',
  showActionButton = true,
  pageHeader,
  statusBanner,
  instructionText,
  bottomActionBar
}) => {
  const navigate = useNavigate()
  const [scale, setScale] = useState(1)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

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

  const handleItemClick = (route: string) => {
    navigate(route)
    setHoveredCategory(null)
  }

  const handleLogoClick = () => {
    navigate('/app')
  }

  const handleInventoryClick = () => {
    navigate('/app/inventory-checklist')
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-white flex justify-center">
      <div
        style={{
          width: '1920px',
          minHeight: '100vh',
          position: 'relative',
          transform: `scale(${scale})`,
          transformOrigin: 'top center'
        }}
      >
        {/* 導航欄 - 86px 高度，灰色背景 */}
        <nav
          style={{
            position: 'relative',
            width: '1920px',
            height: '86px',
            flexShrink: 0,
            backgroundColor: '#EBEDF0',
            zIndex: 10000
          }}
        >
          <div style={{ position: 'relative', width: '1920px', height: '100%' }}>
            {/* Logo - 可點擊回首頁 */}
            <button
              onClick={handleLogoClick}
              className="absolute flex items-center gap-3 hover:opacity-80 transition-opacity"
              style={{
                left: '54px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <img
                src="/formosanus-logo.png"
                alt="山椒魚 Logo"
                className="h-11 w-11 object-cover rounded-full"
              />
              <span
                className="font-bold text-figma-primary"
                style={{
                  fontSize: '32px',
                  fontFamily: "'PT Sans Narrow', 'Noto Sans JP', sans-serif",
                  lineHeight: '1',
                  fontVariationSettings: "'wght' 700"
                }}
              >
                山椒魚FESS
              </span>
            </button>

            {/* 首頁按鈕 */}
            <button
              onClick={handleLogoClick}
              className="absolute hover:text-figma-accent transition-colors"
              style={{
                left: '325px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                width: '74px',
                height: '48px',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#0E3C32',
                fontFamily: 'Inter',
                fontSize: '22px',
                fontWeight: 600
              }}
            >
              首頁
            </button>

            {/* 類別一~六 */}
            {CATEGORY_GROUPS.map((category, index) => (
              <div
                key={category.id}
                className="absolute"
                style={{
                  left: `${325 + (index + 1) * 114}px`,
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
                onMouseEnter={() => category.items.length > 0 ? setHoveredCategory(category.id) : null}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <button
                  disabled={category.items.length === 0}
                  className={category.items.length > 0 ? "hover:text-figma-accent transition-colors" : "cursor-not-allowed"}
                  title={category.items.length === 0 ? "此分類尚未開放" : undefined}
                  style={{
                    display: 'flex',
                    width: '74px',
                    height: '86px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: category.items.length === 0 ? '#9CA3AF' : '#0E3C32',
                    fontFamily: 'Inter',
                    fontSize: '22px',
                    fontWeight: 600
                  }}
                >
                  {category.label}
                </button>

                {/* Dropdown Menu */}
                {hoveredCategory === category.id && category.items.length > 0 && (
                  <div
                    className="absolute left-0"
                    style={{
                      top: '100%',
                      marginTop: '0',
                      width: '202px',
                      background: 'rgba(255, 255, 255, 0.80)',
                      borderRadius: '0 0 8px 8px',
                      padding: '9px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      zIndex: 9999
                    }}
                  >
                    {category.items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item.route)}
                        className="hover:opacity-80 transition-opacity"
                        style={{
                          width: '202px',
                          height: '33px',
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '12.76%',
                          background: 'transparent',
                          color: '#000',
                          fontFamily: 'Inter',
                          fontSize: '20px',
                          fontWeight: 400,
                          textAlign: 'left'
                        }}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* 右側：盤查清單/佐證範例按鈕 */}
            {showActionButton && (
              <button
                onClick={handleInventoryClick}
                className="absolute bg-figma-primary text-white hover:opacity-90 transition-opacity flex items-center justify-center"
                style={{
                  left: '1413px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '273px',
                  height: '51px',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '1.4px',
                  borderRadius: '27px'
                }}
              >
                {actionButtonText}
              </button>
            )}

            {/* 右側：Log Out 按鈕 */}
            <div
              className="absolute"
              style={{
                left: '1704px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <LogoutButton onClick={handleLogout} />
            </div>
          </div>
        </nav>

        {/* 主要內容區域 */}
        <main
          style={{
            position: 'relative',
            width: '1920px',
            minHeight: 'calc(100vh - 96px)',
            backgroundColor: '#FFFFFF'
          }}
        >
          {/* 頁面標題 */}
          {pageHeader && (
            <PageHeader
              category={pageHeader.category}
              title={pageHeader.title}
              subtitle={pageHeader.subtitle}
              iconColor={pageHeader.iconColor}
            />
          )}

          {/* 審核狀態橫幅 */}
          {statusBanner && (
            <StatusBanner
              approvalStatus={statusBanner.approvalStatus}
              isReviewMode={statusBanner.isReviewMode}
              accentColor={statusBanner.accentColor}
            />
          )}

          {/* 說明文字 */}
          {instructionText && (
            <InstructionText content={instructionText} />
          )}

          {children}
        </main>
      </div>

      {/* 底部操作欄 - 固定在視窗底部，並應用相同的縮放 */}
      {bottomActionBar && (bottomActionBar.show !== false) && (
        <div
          className="fixed bottom-0 left-0 flex justify-center"
          style={{ zIndex: 50, right: `${30 / scale}px` }}
        >
          <div
            style={{
              width: '1920px',
              transform: `scale(${scale})`,
              transformOrigin: 'bottom center'
            }}
          >
            <BottomActionBar
              currentStatus={bottomActionBar.currentStatus}
              submitting={bottomActionBar.submitting}
              onSubmit={bottomActionBar.onSubmit}
              onSave={bottomActionBar.onSave}
              onClear={bottomActionBar.onClear}
              containerMode={true}
              accentColor={bottomActionBar.accentColor}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default SharedPageLayout
