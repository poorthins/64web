import { useState, useEffect } from 'react'
import { X, Download, ZoomIn, ZoomOut, RotateCcw, RotateCw, FileText, File } from 'lucide-react'
import { EvidenceFile, getFileUrl } from '../api/files'
import { MemoryFile } from './EvidenceUpload'

interface FilePreviewProps {
  file: EvidenceFile | MemoryFile | null
  isOpen: boolean
  onClose: () => void
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, isOpen, onClose }) => {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  // 檢查是否為記憶體檔案
  const isMemoryFile = (f: EvidenceFile | MemoryFile): f is MemoryFile => {
    return 'file' in f && 'preview' in f
  }

  useEffect(() => {
    if (!file || !isOpen) {
      setImageUrl('')
      setError(null)
      setZoom(1)
      setRotation(0)
      return
    }

    const loadFileUrl = async () => {
      if (isMemoryFile(file)) {
        // 記憶體檔案直接使用預覽URL
        if (file.preview) {
          setImageUrl(file.preview)
        }
        return
      }

      // 已上傳檔案需要從API獲取URL
      if (file.mime_type.startsWith('image/')) {
        setLoading(true)
        setError(null)
        try {
          const url = await getFileUrl(file.file_path)
          setImageUrl(url)
        } catch (err) {
          console.error('Failed to load file URL:', err)
          setError('無法載入檔案預覽')
        } finally {
          setLoading(false)
        }
      }
    }

    loadFileUrl()
  }, [file, isOpen])

  // ESC鍵關閉預覽
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  const handleDownload = async () => {
    if (!file) return

    try {
      let downloadUrl = ''
      let fileName = ''

      if (isMemoryFile(file)) {
        // 記憶體檔案直接下載
        downloadUrl = URL.createObjectURL(file.file)
        fileName = file.file_name
      } else {
        // 已上傳檔案從API獲取
        downloadUrl = await getFileUrl(file.file_path)
        fileName = file.file_name
      }

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 清理記憶體檔案的臨時URL
      if (isMemoryFile(file)) {
        URL.revokeObjectURL(downloadUrl)
      }
    } catch (err) {
      console.error('Download failed:', err)
      alert('下載失敗')
    }
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25))
  const handleRotateLeft = () => setRotation(prev => prev - 90)
  const handleRotateRight = () => setRotation(prev => prev + 90)
  const handleResetView = () => {
    setZoom(1)
    setRotation(0)
  }

  if (!isOpen || !file) return null

  const isImage = file.mime_type.startsWith('image/')
  const isPDF = file.mime_type === 'application/pdf'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      {/* 關閉背景 */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* 預覽容器 */}
      <div className="relative max-w-[90vw] max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* 頂部工具列 */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isImage ? (
                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                </div>
              ) : isPDF ? (
                <FileText className="w-6 h-6 text-red-500" />
              ) : (
                <File className="w-6 h-6 text-gray-500" />
              )}
              <div>
                <div className="font-medium text-gray-900 truncate max-w-[300px]" title={file.file_name}>
                  {file.file_name}
                </div>
                <div className="text-xs text-gray-500">
                  {(file.file_size / 1024 / 1024).toFixed(2)} MB
                  {isMemoryFile(file) && <span className="ml-2 text-orange-600">(暫存)</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isImage && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="縮小"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 min-w-[50px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="放大"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-gray-300"></div>
                <button
                  onClick={handleRotateLeft}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="向左旋轉"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotateRight}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="向右旋轉"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetView}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="重置檢視"
                >
                  重置
                </button>
                <div className="w-px h-6 bg-gray-300"></div>
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              title="下載檔案"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              title="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 內容區域 */}
        <div className="relative overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">載入中...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center p-8 text-red-600">
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && isImage && imageUrl && (
            <div className="flex items-center justify-center p-4">
              <img
                src={imageUrl}
                alt={file.file_name}
                className="max-w-none"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out',
                  maxHeight: '70vh',
                  maxWidth: '80vw'
                }}
                draggable={false}
              />
            </div>
          )}

          {!loading && !error && isPDF && (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">PDF 檔案預覽</p>
                <p className="text-sm text-gray-500 mb-4">
                  請下載檔案以查看完整內容
                </p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>下載 PDF</span>
                </button>
              </div>
            </div>
          )}

          {!loading && !error && !isImage && !isPDF && (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <File className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">無法預覽此檔案類型</p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>下載檔案</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FilePreview