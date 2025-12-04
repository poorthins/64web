import React from 'react'

interface TextLightboxProps {
  title: string
  content: string | string[]
  onClose: () => void
}

export const TextLightbox: React.FC<TextLightboxProps> = ({
  title,
  content,
  onClose
}) => {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          width: '800px',
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '32px',
            height: '32px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '24px',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        {/* Title */}
        <h2
          style={{
            fontFamily: 'Inter',
            fontSize: '32px',
            fontWeight: 600,
            color: '#000',
            marginBottom: '24px',
            lineHeight: '1.3',
            paddingRight: '40px'
          }}
        >
          {title}
        </h2>

        {/* Content */}
        {Array.isArray(content) ? (
          <ul
            style={{
              fontFamily: 'Inter',
              fontSize: '20px',
              fontWeight: 400,
              color: '#000',
              lineHeight: '1.6',
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}
          >
            {content.map((item, index) => (
              <li key={index} style={{ marginBottom: '12px' }}>
                • {item}
              </li>
            ))}
          </ul>
        ) : (
          <p
            style={{
              fontFamily: 'Inter',
              fontSize: '20px',
              fontWeight: 400,
              color: '#000',
              lineHeight: '1.6',
              margin: 0
            }}
          >
            {content}
          </p>
        )}
      </div>
    </div>
  )
}
