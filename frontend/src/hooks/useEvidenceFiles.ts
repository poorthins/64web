import { useState, useCallback, useEffect } from 'react'
import { uploadEvidenceWithEntry, deleteEvidenceFile, getEntryFiles, type EvidenceFile } from '../api/files'

/**
 * 統一的佐證檔案管理 Hook
 *
 * 設計原則 (Linus style):
 * 1. 消除特殊情況：不區分 memory vs server，都是 EvidenceFile[]
 * 2. 單一資料來源：files 是唯一的狀態
 * 3. 簡潔明確：只有 3 個核心操作
 *
 * @param entryId - entry ID，null = 暫存模式
 */
export function useEvidenceFiles(entryId: string | null) {
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 載入已上傳的檔案
  const loadFiles = useCallback(async () => {
    if (!entryId) {
      setFiles([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const loadedFiles = await getEntryFiles(entryId)

      // 去重
      const uniqueFiles = Array.from(
        new Map(loadedFiles.map(f => [f.id, f])).values()
      )

      setFiles(uniqueFiles)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入檔案失敗'
      setError(errorMessage)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [entryId])

  // 初始化載入
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // 1. 新增檔案（暫存）
  const addFiles = useCallback((newFiles: File[]) => {
    const memoryFiles: EvidenceFile[] = newFiles.map(file => {
      // 創建預覽 URL
      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : ''

      return {
        id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        file_path: preview,
        created_at: new Date().toISOString(),
        owner_id: '',
        entry_id: '',
        file_type: 'usage_evidence',
        // @ts-ignore - 標記為暫存
        _raw: file,  // 保留原始 File 物件
        _isMemory: true
      }
    })

    setFiles(prev => [...prev, ...memoryFiles])
  }, [])

  // 2. 刪除檔案
  const removeFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    // @ts-ignore
    const isMemory = file._isMemory || fileId.startsWith('memory-')

    if (isMemory) {
      // 記憶體檔案：直接移除
      if (file.file_path && file.file_path.startsWith('blob:')) {
        URL.revokeObjectURL(file.file_path)
      }
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } else {
      // 伺服器檔案：先刪除再移除
      setLoading(true)
      try {
        await deleteEvidenceFile(fileId)
        setFiles(prev => prev.filter(f => f.id !== fileId))
        setError(null)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '刪除失敗'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    }
  }, [files])

  // 3. 上傳所有暫存檔案
  const uploadAll = useCallback(async (targetEntryId: string, metadata?: any) => {
    // @ts-ignore
    const memoryFiles = files.filter(f => f._isMemory || f.id.startsWith('memory-'))

    if (memoryFiles.length === 0) {
      return { succeeded: 0, failed: 0 }
    }

    setLoading(true)
    setError(null)

    let succeeded = 0
    let failed = 0

    try {
      const uploadPromises = memoryFiles.map(async (memFile) => {
        try {
          // @ts-ignore
          const rawFile = memFile._raw
          if (!rawFile) {
            throw new Error('找不到原始檔案')
          }

          await uploadEvidenceWithEntry(rawFile, targetEntryId, {
            pageKey: metadata?.pageKey || '',
            year: metadata?.year || new Date().getFullYear(),
            category: metadata?.category || 'usage_evidence',
            month: metadata?.month,
            record_ids: metadata?.record_ids
          })

          succeeded++
        } catch (err) {
          console.error('Upload failed:', memFile.file_name, err)
          failed++
        }
      })

      await Promise.all(uploadPromises)

      // 清除暫存檔案的預覽 URL
      memoryFiles.forEach(f => {
        if (f.file_path && f.file_path.startsWith('blob:')) {
          URL.revokeObjectURL(f.file_path)
        }
      })

      // 重新載入（會顯示已上傳的檔案）
      await loadFiles()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上傳失敗'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }

    return { succeeded, failed }
  }, [files, loadFiles])

  // 4. 清空所有
  const clear = useCallback(() => {
    // 清理所有預覽 URL
    files.forEach(f => {
      if (f.file_path && f.file_path.startsWith('blob:')) {
        URL.revokeObjectURL(f.file_path)
      }
    })
    setFiles([])
  }, [files])

  return {
    files,
    loading,
    error,

    // 操作
    addFiles,
    removeFile,
    uploadAll,
    clear,
    reload: loadFiles,

    // 工具
    hasMemoryFiles: files.some(f =>
      // @ts-ignore
      f._isMemory || f.id.startsWith('memory-')
    )
  }
}
