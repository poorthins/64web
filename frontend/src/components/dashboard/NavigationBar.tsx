import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { CATEGORY_GROUPS, CategoryGroup } from '../../config/categoryMapping'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrentUserPermissions } from '../../hooks/useCurrentUserPermissions'
import LogoutButton from '../common/LogoutButton'

interface NavigationBarProps {
  onChecklistClick?: () => void
}

/**
 * NavigationBar - Good Taste 大白框設計
 *
 * 設計要點：
 * - 高度 86px，固定 1920px 寬度容器
 * - 點擊觸發（不是 hover）
 * - 大白框從導航欄底部展開（518px）
 * - 背景模糊 + Logo 橢圓形消失 + 元素上移
 * - 4x4 Grid 佈局，225px 間距
 */
const NavigationBar: React.FC<NavigationBarProps> = ({ onChecklistClick }) => {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { filterByPermissions } = useCurrentUserPermissions()
  const [clickedCategory, setClickedCategory] = useState<string | null>(null)
  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  /**
   * 根據權限過濾可見項目
   * 管理員看到所有項目，一般用戶只看有權限的項目
   */
  const getVisibleItems = (category: CategoryGroup) => {
    if (isAdmin) {
      return category.items  // 管理員：無過濾
    }
    return filterByPermissions(category.items, (item) => item.id)
  }

  const handleItemClick = (route: string) => {
    navigate(route)
    setClickedCategory(null)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setClickedCategory(prev => prev === categoryId ? null : categoryId)
  }

  const closeExpanded = () => {
    setClickedCategory(null)
  }

  // ESC 鍵關閉
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && clickedCategory) {
        closeExpanded()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [clickedCategory])

  const isExpanded = clickedCategory !== null

  // 鎖定頁面滾動
  useEffect(() => {
    const dashboardContainer = document.getElementById('dashboard-container')

    if (isExpanded) {
      document.body.style.overflow = 'hidden'
      if (dashboardContainer) {
        dashboardContainer.style.overflow = 'hidden'
      }
    } else {
      document.body.style.overflow = ''
      if (dashboardContainer) {
        dashboardContainer.style.overflow = ''
      }
    }

    // 清理函數：組件卸載時恢復滾動
    return () => {
      document.body.style.overflow = ''
      if (dashboardContainer) {
        dashboardContainer.style.overflow = ''
      }
    }
  }, [isExpanded])
  const clickedCategoryData = clickedCategory ? CATEGORY_GROUPS.find(c => c.id === clickedCategory) : null
  const clickedCategoryItems = clickedCategoryData ? getVisibleItems(clickedCategoryData) : []

  // 計算 Grid 左邊距（對齊按鈕）
  const gridLeftPosition = clickedCategory && categoryButtonRefs.current[clickedCategory]
    ? categoryButtonRefs.current[clickedCategory]?.getBoundingClientRect().left ?? 0
    : 0

  return (
    <>
      {/* Grid 項目 hover 樣式 */}
      <style>{`
        .grid-item-btn:hover {
          color: #01E083 !important;
        }
      `}</style>

      {/* 導航欄容器 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          zIndex: 9999
        }}
      >
        {/* 導航欄本身 */}
        <nav
          style={{
            position: 'relative',
            height: '86px',
            background: isExpanded ? 'white' : 'transparent',
            transition: 'background-color 0.3s ease',
            zIndex: 2
          }}
        >
          {/* 導航欄內容 */}
          <div
            style={{
              position: 'relative',
              width: '1920px',
              height: '86px',
              margin: '0 auto',
              zIndex: 3,
              transform: isExpanded ? 'translateY(-11px)' : 'translateY(0)',
              transition: 'transform 0.3s ease'
            }}
          >
            {/* 左側橢圓形容器：Logo + 類別一~六 */}
            <div
              className="absolute flex items-center gap-10 px-6"
              style={{
                left: '54px',
                top: '27px',
                height: '54px',
                borderRadius: '27px',
                backgroundColor: isExpanded ? 'transparent' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: isExpanded ? 'none' : 'blur(8px)',
                transition: 'background-color 0.3s ease, backdrop-filter 0.3s ease'
              }}
            >
              {/* Logo */}
              <div className="flex items-center gap-3">
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
              </div>

              {/* 類別一~六（點擊觸發） */}
              {CATEGORY_GROUPS.map(category => {
                const visibleItems = getVisibleItems(category)
                const isActive = clickedCategory === category.id

                return (
                  <button
                    key={category.id}
                    ref={el => { categoryButtonRefs.current[category.id] = el }}
                    disabled={visibleItems.length === 0}
                    onClick={() => visibleItems.length > 0 && toggleCategory(category.id)}
                    className={visibleItems.length > 0 ? "hover:text-figma-accent transition-colors" : "cursor-not-allowed"}
                    title={visibleItems.length === 0 ? "此分類尚未開放或無權限" : undefined}
                    style={{
                      display: 'flex',
                      width: '74px',
                      height: '54px',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0,
                      color: visibleItems.length === 0 ? '#9CA3AF' : (isActive ? '#01E083' : '#0E3C32'),
                      fontFamily: 'Inter',
                      fontSize: '22px',
                      fontWeight: 600
                    }}
                  >
                    {category.label}
                  </button>
                )
              })}
            </div>

            {/* 右側：盤查清單/佐證範例按鈕 */}
            <button
              onClick={onChecklistClick}
              className="absolute bg-figma-primary text-white hover:opacity-90 transition-opacity flex items-center justify-center"
              style={{
                left: '1413px',
                top: '30px',
                width: '273px',
                height: '54px',
                fontSize: '20px',
                fontWeight: 600,
                letterSpacing: '1.4px',
                borderRadius: '27px'
              }}
            >
              盤查清單/佐證範例
            </button>

            {/* 右側：Log Out 按鈕 */}
            <div
              className="absolute"
              style={{
                left: '1704px',
                top: '30px'
              }}
            >
              <LogoutButton onClick={handleLogout} />
            </div>
          </div>
        </nav>

        {/* 大白框展開區域 */}
        <div
          style={{
            position: 'absolute',
            top: '86px',
            left: '50%',
            marginLeft: '-960px',
            width: '1920px',
            height: isExpanded ? '518px' : '0',
            background: 'white',
            overflow: 'hidden',
            transition: 'height 0.3s ease, box-shadow 0.3s ease',
            borderRadius: '0 0 16px 16px',
            boxShadow: isExpanded ? '0 8px 32px rgba(0, 0, 0, 0.15)' : 'none',
            zIndex: 1
          }}
        >
          {/* Grid 內容區 */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              opacity: isExpanded ? 1 : 0,
              transition: 'opacity 0.3s ease 0.15s'
            }}
          >
            {/* Grid 容器 */}
            <div
              style={{
                position: 'absolute',
                width: '1300px',
                height: '277px',
                top: '50%',
                left: `${gridLeftPosition}px`,
                transform: 'translateY(-50%)'
              }}
            >
              {/* Grid 項目 */}
              <div
                style={{
                  display: 'grid',
                  width: '100%',
                  height: '100%',
                  columnGap: '225px',
                  rowGap: '20px',
                  gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'
                }}
              >
                {clickedCategoryItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.route)}
                    className="grid-item-btn transition-colors"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      background: 'transparent',
                      color: '#000',
                      fontFamily: 'Inter',
                      fontSize: '20px',
                      fontStyle: 'normal',
                      fontWeight: 400,
                      lineHeight: 'normal',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      padding: '12px',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      border: 'none'
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 背景模糊層 */}
      {isExpanded && (
        <div
          onClick={closeExpanded}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            zIndex: 9998
          }}
        />
      )}
    </>
  )
}

export default NavigationBar
