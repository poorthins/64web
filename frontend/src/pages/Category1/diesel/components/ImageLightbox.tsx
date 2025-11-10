/**
 * ImageLightbox - 圖片放大檢視元件
 *
 * 使用 createPortal 渲染到 body，支援 Escape 關閉
 */

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface ImageLightboxProps {
  src: string | null
  zIndex?: number
  onClose: () => void
}

export function ImageLightbox({ src, zIndex = 20000, onClose }: ImageLightboxProps) {
  // Escape 監聽
  useEffect(() => {
    if (!src) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [src, onClose])

  if (!src) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70"
      style={{ zIndex }}
      onClick={onClose}
    >
      <img
        src={src}
        alt="佐證放大"
        className="max-w-[90vw] max-h-[90vh] rounded shadow-xl cursor-zoom-out"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="w-8 h-8" />
      </button>
    </div>,
    document.body
  )
}