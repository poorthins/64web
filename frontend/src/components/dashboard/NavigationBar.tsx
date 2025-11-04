import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORY_GROUPS } from '../../config/categoryMapping'

const NavigationBar: React.FC = () => {
  const navigate = useNavigate()
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  // 只顯示有項目的分類
  const activeCategories = CATEGORY_GROUPS.filter(cat => cat.items.length > 0)

  const handleItemClick = (route: string) => {
    navigate(route)
    setHoveredCategory(null)
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img
              src="/formosanus-logo.jpg"
              alt="山椒魚 Logo"
              className="h-10 w-10 object-contain"
            />
            <span className="text-figma-primary font-bold text-xl">
              山椒魚FESS
            </span>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-8">
            {/* 首頁 */}
            <button
              onClick={() => navigate('/app')}
              className="text-figma-primary hover:text-figma-accent transition-colors font-medium"
            >
              首頁
            </button>

            {/* Category Dropdowns */}
            {activeCategories.map(category => (
              <div
                key={category.id}
                className="relative"
                onMouseEnter={() => setHoveredCategory(category.id)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <button className="text-figma-primary hover:text-figma-accent transition-colors font-medium">
                  {category.label}
                </button>

                {/* Dropdown Menu */}
                {hoveredCategory === category.id && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <div className="py-1">
                      {category.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item.route)}
                          className="w-full text-left px-4 py-2 text-sm text-figma-primary hover:bg-gray-50 hover:text-figma-accent transition-colors"
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Empty Categories (類別四五六) */}
            {CATEGORY_GROUPS.filter(cat => cat.items.length === 0).map(category => (
              <button
                key={category.id}
                disabled
                className="text-gray-400 cursor-not-allowed font-medium"
                title="此分類尚未開放"
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default NavigationBar
