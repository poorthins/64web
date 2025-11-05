import React from 'react'

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

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
      >
        ✕
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handlePrevious()
            }}
            className="absolute left-4 text-white text-4xl hover:text-gray-300"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="absolute right-4 text-white text-4xl hover:text-gray-300"
          >
            ›
          </button>
        </>
      )}

      <img
        src={images[currentIndex]}
        alt={`Image ${currentIndex + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
