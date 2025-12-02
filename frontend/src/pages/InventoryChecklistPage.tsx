import React, { useState } from 'react'
import { inventoryItems } from '../config/inventoryData'
import { InventoryCard } from '../components/inventory/InventoryCard'
import { ImageLightbox } from '../components/inventory/ImageLightbox'
import SharedPageLayout from '../layouts/SharedPageLayout'

interface LightboxState {
  images: string[]
  initialIndex: number
}

export const InventoryChecklistPage: React.FC = () => {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const handleImageClick = (images: string[], initialIndex: number) => {
    setLightbox({ images, initialIndex })
  }

  return (
    <SharedPageLayout showActionButton={false}>
      {/* Hero Section */}
      <div
        className="relative h-[493px] flex flex-col items-center justify-center text-center px-4"
        style={{
          background: 'linear-gradient(60deg, #FFF 15.23%, #96F2CC 45.32%, rgba(1, 224, 131, 0.90) 69.68%)'
        }}
      >
        <h1
          style={{
            color: '#000',
            textAlign: 'center',
            fontFamily: 'Inter',
            fontSize: '64px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: 'normal',
            marginBottom: '12px'
          }}
        >
          溫室氣體盤查項目
        </h1>
        <p
          style={{
            color: '#000',
            textAlign: 'center',
            fontFamily: 'Inter',
            fontSize: '24px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: 'normal'
          }}
        >
          Greenhouse Gas Inventory Project
        </p>
      </div>

      {/* 排放源方格 Grid */}
      <div className="mx-auto px-[248px]" style={{ maxWidth: '1920px', paddingTop: '61px', paddingBottom: '48px' }}>
        <div className="grid grid-cols-3 gap-[30px]">
          {inventoryItems.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onImageClick={handleImageClick}
            />
          ))}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          initialIndex={lightbox.initialIndex}
          onClose={() => setLightbox(null)}
        />
      )}
    </SharedPageLayout>
  )
}

export default InventoryChecklistPage
