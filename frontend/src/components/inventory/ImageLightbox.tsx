import React from 'react'
import { createPortal } from 'react-dom'

interface ImageLightboxProps {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  initialIndex,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex)

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
  }

  // 某些图片需要显示得更小
  const smallerImages = [
    '/佐證/柴油(移動源)1.png',
    '/佐證/尿素添加紀錄表.png',
    '/佐證/氣體斷路器銘牌.png',
    '/佐證/SF6填充量、洩漏佐證.png'
  ]

  const currentImage = images[currentIndex]
  const isSmaller = smallerImages.includes(currentImage)

  return createPortal(
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center"
      style={{ zIndex: 20000 }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
      >
        ✕
      </button>

      {/* 圖片和箭頭容器 */}
      <div className="relative flex items-center">
        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrevious()
            }}
            className="absolute left-[-60px] text-white text-7xl hover:text-gray-300"
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          >
            ‹
          </button>
        )}

        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className={isSmaller ? "max-w-[60vw] max-h-[60vh] object-contain" : "max-w-[90vw] max-h-[90vh] object-contain"}
          onClick={(e) => e.stopPropagation()}
        />

        {images.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="absolute right-[-60px] text-white text-7xl hover:text-gray-300"
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          >
            ›
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>,
    document.body
  )
}
