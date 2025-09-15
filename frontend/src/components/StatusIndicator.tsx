import React from 'react'
import { EntryStatus } from './StatusSwitcher'

interface StatusIndicatorProps {
  status: EntryStatus
  className?: string
  showText?: boolean
}

const statusConfig = {
  draft: { 
    color: '#6b7280', 
    text: '草稿' 
  },
  submitted: { 
    color: '#3b82f6', 
    text: '已提交' 
  },
  approved: { 
    color: '#10b981', 
    text: '已通過' 
  },
  rejected: { 
    color: '#ef4444', 
    text: '已退回' 
  }
}

export default function StatusIndicator({ 
  status, 
  className = '',
  showText = true 
}: StatusIndicatorProps) {
  const config = statusConfig[status]
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div 
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: config.color }}
      />
      {showText && (
        <span 
          className="text-sm font-medium whitespace-nowrap"
          style={{ color: config.color }}
        >
          {config.text}
        </span>
      )}
    </div>
  )
}