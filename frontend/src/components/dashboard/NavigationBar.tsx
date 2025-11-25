import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { CATEGORY_GROUPS, CategoryGroup } from '../../config/categoryMapping'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrentUserPermissions } from '../../hooks/useCurrentUserPermissions'
import LogoutButton from '../common/LogoutButton'

interface NavigationBarProps {
  onChecklistClick?: () => void
}

/**
 * NavigationBar - 符合 Figma 設計的導航欄
 *
 * 設計要點：
 * - 高度 86px，固定 1920px 寬度容器
 * - 左側：半透明白色橢圓形容器（Logo + 首頁 + 類別一~六）
 * - 右側：兩個獨立按鈕（盤查清單/佐證範例 + Log Out）
 * - 所有元素使用絕對定位
 */
const NavigationBar: React.FC<NavigationBarProps> = ({ onChecklistClick }) => {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { filterByPermissions } = useCurrentUserPermissions()
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

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
    setHoveredCategory(null)
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
    <nav
      style={{
        position: 'relative',
        height: '86px',
        width: '100%'
      }}
    >
      <div style={{ position: 'relative', width: '1920px', height: '100%', margin: '0 auto' }}>
        {/* 左側橢圓形容器：Logo + 首頁 + 類別一~六 */}
        <div
          className="absolute flex items-center gap-10 px-6"
          style={{
            left: '54px',
            top: '27px',
            height: '54px',
            borderRadius: '27px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)'
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

          {/* 類別一~六（權限過濾後） */}
          {CATEGORY_GROUPS.map(category => {
            const visibleItems = getVisibleItems(category)

            return (
              <div
                key={category.id}
                className="relative"
                onMouseEnter={() => visibleItems.length > 0 ? setHoveredCategory(category.id) : null}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <button
                  disabled={visibleItems.length === 0}
                  className={visibleItems.length > 0 ? "hover:text-figma-accent transition-colors" : "cursor-not-allowed"}
                  title={visibleItems.length === 0 ? "此分類尚未開放或無權限" : undefined}
                  style={{
                    display: 'flex',
                    width: '74px',
                    height: '54px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                    color: visibleItems.length === 0 ? '#9CA3AF' : '#0E3C32',
                    fontFamily: 'Inter',
                    fontSize: '22px',
                    fontWeight: 600
                  }}
                >
                  {category.label}
                </button>

                {/* Dropdown Menu：只顯示有權限的項目 */}
                {hoveredCategory === category.id && visibleItems.length > 0 && (
                  <div
                    className="absolute left-0 z-50"
                    style={{
                      top: '100%',
                      marginTop: '0',
                      width: '202px',
                      background: 'rgba(255, 255, 255, 0.80)',
                      borderRadius: '0 0 8px 8px',
                      padding: '9px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    {visibleItems.map(item => (
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
  )
}

export default NavigationBar
