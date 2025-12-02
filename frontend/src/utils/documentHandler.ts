export interface MemoryFile {
  id: string
  file: File
  preview: string
  file_name: string
  file_size: number
  mime_type: string
}

export interface ClearOptions {
  currentStatus?: string
  title?: string
  message?: string
  onClear: () => void
}

export class DocumentHandler {
  static handleClear(options: ClearOptions): boolean {
    if (options.currentStatus === 'approved') {
      alert('已通過的資料無法清除')
      return false
    }

    const message = options.message || '確定要清除所有數據嗎？此操作無法復原。'
    if (window.confirm(message)) {
      options.onClear()
      return true
    }
    return false
  }

  static clearAllMemoryFiles(memoryFiles: MemoryFile[]): void {
    memoryFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
  }
}