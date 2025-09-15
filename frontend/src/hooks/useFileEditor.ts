import { useState, useCallback } from 'react'
import { EvidenceFile } from '../api/files'
import { uploadEvidence, deleteEvidenceFile, updateFileEntryAssociation } from '../api/files'

interface FileEditorState {
  // 當前顯示的檔案
  currentFiles: EvidenceFile[]
  // 原始檔案（用於還原）
  originalFiles: EvidenceFile[]
  // 待刪除的檔案 ID
  pendingDeletes: string[]
  // 待上傳的新檔案
  pendingUploads: File[]
  // 是否有未儲存的變更
  hasChanges: boolean
}

interface UseFileEditorProps {
  entryId?: string
  pageKey: string
  month?: number
  fileType?: 'msds' | 'usage_evidence'
}

interface SyncResult {
  success: boolean
  uploadedCount: number
  deletedCount: number
  failedUploads: Array<{ file: File; error: string }>
  failedDeletes: Array<{ fileId: string; error: string }>
  error?: string
}

export function useFileEditor({ entryId, pageKey, month, fileType = 'usage_evidence' }: UseFileEditorProps) {
  const [state, setState] = useState<FileEditorState>({
    currentFiles: [],
    originalFiles: [],
    pendingDeletes: [],
    pendingUploads: [],
    hasChanges: false
  })

  // 初始化檔案列表
  const initializeFiles = useCallback((files: EvidenceFile[]) => {
    setState({
      currentFiles: [...files],
      originalFiles: [...files],
      pendingDeletes: [],
      pendingUploads: [],
      hasChanges: false
    })
  }, [])

  // 標記檔案為刪除（前端暫存）
  const markForDeletion = useCallback((fileId: string) => {
    setState(prev => ({
      ...prev,
      currentFiles: prev.currentFiles.filter(f => f.id !== fileId),
      pendingDeletes: [...prev.pendingDeletes, fileId],
      hasChanges: true
    }))
  }, [])

  // 新增待上傳檔案（前端暫存）
  const addPendingUpload = useCallback((files: File[]) => {
    setState(prev => ({
      ...prev,
      pendingUploads: [...prev.pendingUploads, ...files],
      hasChanges: true
    }))
  }, [])

  // 移除待上傳檔案
  const removePendingUpload = useCallback((fileIndex: number) => {
    setState(prev => ({
      ...prev,
      pendingUploads: prev.pendingUploads.filter((_, index) => index !== fileIndex),
      hasChanges: prev.pendingDeletes.length > 0 || prev.pendingUploads.length > 1
    }))
  }, [])

  // 同步變更到 Supabase
  const syncChanges = useCallback(async (): Promise<SyncResult> => {
    if (!entryId || !state.hasChanges) {
      return { 
        success: false, 
        uploadedCount: 0, 
        deletedCount: 0, 
        failedUploads: [], 
        failedDeletes: [],
        error: 'No changes to sync or missing entry ID' 
      }
    }

    const result: SyncResult = {
      success: true,
      uploadedCount: 0,
      deletedCount: 0,
      failedUploads: [],
      failedDeletes: []
    }

    try {
      // 1. 執行刪除操作
      if (state.pendingDeletes.length > 0) {
        const deleteResults = await Promise.allSettled(
          state.pendingDeletes.map(id => {
            // Find the file to get its file_path
            const fileToDelete = state.originalFiles.find(f => f.id === id)
            return deleteEvidenceFile(id)
          })
        )
        
        deleteResults.forEach((deleteResult, index) => {
          const fileId = state.pendingDeletes[index]
          if (deleteResult.status === 'fulfilled') {
            result.deletedCount++
          } else {
            result.failedDeletes.push({
              fileId,
              error: deleteResult.reason?.message || 'Delete failed'
            })
          }
        })
      }

      // 2. 執行上傳操作
      const uploadedFiles: EvidenceFile[] = []
      if (state.pendingUploads.length > 0) {
        const uploadResults = await Promise.allSettled(
          state.pendingUploads.map(async (file) => {
            const uploaded = await uploadEvidence(file, {
              pageKey,
              year: new Date().getFullYear(),
              category: fileType === 'msds' ? 'msds' : 'usage_evidence',
              month,
              entryId
            })
            return uploaded
          })
        )

        uploadResults.forEach((uploadResult, index) => {
          const file = state.pendingUploads[index]
          if (uploadResult.status === 'fulfilled') {
            uploadedFiles.push(uploadResult.value)
            result.uploadedCount++
          } else {
            result.failedUploads.push({
              file,
              error: uploadResult.reason?.message || 'Upload failed'
            })
          }
        })
      }

      // 3. 更新狀態
      const newCurrentFiles = [
        ...state.currentFiles,
        ...uploadedFiles
      ]

      setState(prev => ({
        currentFiles: newCurrentFiles,
        originalFiles: newCurrentFiles,
        pendingDeletes: result.failedDeletes.map(f => f.fileId),
        pendingUploads: result.failedUploads.map(f => f.file),
        hasChanges: result.failedDeletes.length > 0 || result.failedUploads.length > 0
      }))

      // 如果有任何失敗，標記為部分成功
      if (result.failedDeletes.length > 0 || result.failedUploads.length > 0) {
        result.success = false
        result.error = `部分操作失敗：${result.failedDeletes.length} 個刪除失敗，${result.failedUploads.length} 個上傳失敗`
      }

      return result
    } catch (error) {
      console.error('Sync failed:', error)
      return {
        success: false,
        uploadedCount: 0,
        deletedCount: 0,
        failedUploads: [],
        failedDeletes: [],
        error: error instanceof Error ? error.message : 'Sync failed'
      }
    }
  }, [entryId, pageKey, month, state])

  // 取消所有變更
  const cancelChanges = useCallback(() => {
    setState(prev => ({
      currentFiles: [...prev.originalFiles],
      originalFiles: prev.originalFiles,
      pendingDeletes: [],
      pendingUploads: [],
      hasChanges: false
    }))
  }, [])

  return {
    files: state.currentFiles,
    hasChanges: state.hasChanges,
    pendingDeletes: state.pendingDeletes,
    pendingUploads: state.pendingUploads,
    changeCount: {
      deletes: state.pendingDeletes.length,
      uploads: state.pendingUploads.length,
      total: state.pendingDeletes.length + state.pendingUploads.length
    },
    initializeFiles,
    markForDeletion,
    addPendingUpload,
    removePendingUpload,
    syncChanges,
    cancelChanges
  }
}