import React, { useState } from 'react'
import type { InventoryItem } from '../../config/inventoryData'

interface InventoryCardProps {
  item: InventoryItem
  onImageClick: (images: string[], initialIndex: number) => void
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
  item,
  onImageClick
}) => {
  const [currentImageIndex] = useState(0)
  const hasImages = item.exampleImages && item.exampleImages.length > 0

  const handleImageAreaClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasImages) {
      onImageClick(item.exampleImages, currentImageIndex)
    }
  }

  return (
    <div
      onClick={handleImageAreaClick}
      className="flex gap-[9px] cursor-pointer"
      style={{
        height: item.id === 'fire_extinguisher' ? '233px' : '239px'
      }}
    >
      {/* 左側：綠色圖片區域 */}
      <div
        className="relative overflow-hidden"
        style={{
          width: '223px',
          height: item.id === 'fire_extinguisher' ? '233px' : '239px',
          flexShrink: 0,
          borderRadius: '20px',
          background: '#01E083'
        }}
      >
        {hasImages ? (
          <img
            src={item.exampleImages[currentImageIndex]}
            alt={`${item.name} 佐證範例 ${currentImageIndex + 1}`}
            style={{
              position: 'absolute',
              left: '16px',
              top: '64px',
              width: '192px',
              height: '115px',
              flexShrink: 0,
              borderRadius: '8px',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-center text-sm">
            佐證範例
          </div>
        )}

        {/* 左下角放大鏡圖標 */}
        <div
          style={{
            position: 'absolute',
            left: '12px',
            top: '14px',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e1e1e" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <path d="M11 8v6" />
            <path d="M8 11h6" />
          </svg>
        </div>
      </div>

      {/* 右側：上下兩個框框 */}
      <div className="flex flex-col gap-[10px]">
        {/* 右上：灰色資訊區域 */}
        <div
          className="overflow-hidden relative"
          style={{
            width: '222px',
            height: item.id === 'fire_extinguisher' ? '102px' : '143px',
            flexShrink: 0,
            borderRadius: '20px',
            background: '#EBEDF0'
          }}
        >
          <h3
            style={{
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 600,
              lineHeight: item.id === 'other_fuel' ? '1.2' : 'normal',
              position: 'absolute',
              left: '20px',
              top: '20px',
              width: '194px',
              height: '52px',
              flexShrink: 0
            }}
          >
            {item.id === 'other_fuel' ? (
              <>
                其他使用能源
                <br />
                <span style={{
                  fontSize: '16px'
                }}>
                  重油 / 燃料油 / 煤
                </span>
              </>
            ) : (
              item.name
            )}
          </h3>
          <p
            style={{
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '15px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '120%',
              position: 'absolute',
              left: '17px',
              right: '10px',
              bottom: '10px',
              width: '195px',
              height: '55px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              flexShrink: 0
            }}
          >
            {item.description}
          </p>
        </div>

        {/* 右下：黑色佐證提示區域 */}
        <div
          className="overflow-hidden"
          style={{
            width: '222px',
            height: item.id === 'fire_extinguisher' ? '121px' : '86px',
            flexShrink: 0,
            borderRadius: '20px',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '14px'
          }}
        >
          <ul
            style={{
              color: '#FFF',
              fontFamily: 'Inter',
              fontSize: '15px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: 'normal',
              listStyle: 'none',
              padding: 0,
              margin: 0,
              textAlign: 'left'
            }}
          >
            {item.requiredDocuments.map((doc, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                • {doc}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
