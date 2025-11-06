import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { StatusType } from './StatusCard'

interface EnergyItem {
  id: string
  name: string
  route: string
}

interface StatusModalProps {
  isOpen: boolean
  onClose: () => void
  type: StatusType
  items: EnergyItem[]
  onItemClick: (route: string) => void
}

const MODAL_CONFIG = {
  pending: {
    title: '待填寫項目',
    bgColor: 'bg-gray-50',
    buttonBg: 'bg-gray-200 hover:bg-gray-300',
    buttonText: 'text-black'
  },
  submitted: {
    title: '已提交項目',
    bgColor: 'bg-figma-darkGreen',
    buttonBg: 'bg-white/20 hover:bg-white/30',
    buttonText: 'text-white'
  },
  approved: {
    title: '已通過項目',
    bgColor: 'bg-figma-lightBlue',
    buttonBg: 'bg-white/20 hover:bg-white/30',
    buttonText: 'text-white'
  },
  rejected: {
    title: '已退回項目',
    bgColor: 'bg-figma-yellowGreen',
    buttonBg: 'bg-white/20 hover:bg-white/30',
    buttonText: 'text-black'
  }
}

const StatusModal: React.FC<StatusModalProps> = ({
  isOpen,
  onClose,
  type,
  items,
  onItemClick
}) => {
  if (!isOpen) return null

  const config = MODAL_CONFIG[type]

  const handleItemClick = (route: string) => {
    onItemClick(route)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 20000 }}
      onClick={onClose}
    >
      <div
        className={`${config.bgColor} rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${type === 'pending' || type === 'rejected' ? 'border-black/20' : 'border-white/20'}`}>
            <h2 className={`text-2xl font-bold ${type === 'pending' || type === 'rejected' ? 'text-black' : 'text-white'}`}>
              {config.title}
            </h2>
            <button
              onClick={onClose}
              className={`${type === 'pending' || type === 'rejected' ? 'text-black hover:bg-gray-200' : 'text-white hover:bg-white/20'} rounded-full p-2 transition-colors`}
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {items.length === 0 ? (
              <p className={`text-center py-8 ${type === 'pending' || type === 'rejected' ? 'text-gray-500' : 'text-white/80'}`}>
                目前沒有{config.title.replace('項目', '')}的項目
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.route)}
                    className={`
                      ${config.buttonBg} ${config.buttonText}
                      px-6 py-4 rounded-lg font-medium
                      transition-all
                      hover:shadow-md
                      text-left
                    `}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>,
    document.body
  )
}

export default StatusModal
