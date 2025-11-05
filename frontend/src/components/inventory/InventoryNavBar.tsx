import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import LogoutButton from '../common/LogoutButton'

/**
 * InventoryNavBar - 盤查清單頁面專用導航欄
 *
 * 特點：
 * - 無橢圓形容器，所有元素直接在灰色背景上
 * - Logo + 首頁 + 類別一~六 + Log Out
 */
const InventoryNavBar: React.FC = () => {
  const navigate = useNavigate()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  const navItems = [
    { id: 'home', label: '首頁', onClick: () => navigate('/app') },
    { id: 'cat1', label: '類別一', disabled: false },
    { id: 'cat2', label: '類別二', disabled: false },
    { id: 'cat3', label: '類別三', disabled: false },
    { id: 'cat4', label: '類別四', disabled: true },
    { id: 'cat5', label: '類別五', disabled: true },
    { id: 'cat6', label: '類別六', disabled: true },
  ]

  return (
    <div className="w-full flex items-center justify-between px-14">
      {/* 左側：Logo + 導航 */}
      <div className="flex items-center gap-10">
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
              lineHeight: 'normal'
            }}
          >
            山椒魚FESS
          </span>
        </div>

        {/* 導航項目 */}
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={item.onClick}
            disabled={item.disabled}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            className={`font-semibold transition-colors ${
              item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : hoveredItem === item.id
                ? 'text-figma-accent'
                : 'text-figma-primary'
            }`}
            style={{ fontSize: '22px' }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 右側：Log Out */}
      <LogoutButton onClick={handleLogout} />
    </div>
  )
}

export default InventoryNavBar
