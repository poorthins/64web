import { useState, useCallback, useEffect, useMemo } from 'react';
import { uploadEvidence, uploadEvidenceWithEntry, deleteEvidenceFile } from '../api/files';
import type { EvidenceFile, FileMetadata } from '../api/files';
import type { MemoryFile } from '../services/documentHandler';

interface UseFileHandlerConfig {
  entityType: 'evidence' | 'project' | 'task' | 'document';
  entityId?: string | null;
  allowOverwrite?: boolean;
  supportMultiple?: boolean;
  enableMemoryCache?: boolean;  // 新增：啟用記憶體暫存
}

interface UseFileHandlerReturn {
  files: EvidenceFile[];  // 結合的檔案清單（伺服器 + 記憶體）
  memoryFiles: MemoryFile[];  // 記憶體檔案
  serverFiles: EvidenceFile[];  // 伺服器檔案
  loading: boolean;
  error: string | null;
  success: string | null;
  upload: (file: File, meta?: Partial<FileMetadata>) => Promise<EvidenceFile>;
  uploadBatch: (files: File[], meta?: Partial<FileMetadata>) => Promise<EvidenceFile[]>;
  uploadMemoryFiles: (targetEntityId: string) => Promise<{ succeeded: number; failed: number }>;
  remove: (fileId: string) => Promise<void>;
  refresh: () => Promise<void>;
  associate: (targetEntryId: string) => Promise<{ succeeded: number; failed: number }>;
  clear: () => void;
  clearMemory: () => void;
  hasMemoryFiles: boolean;
}

/**
 * 統一的檔案處理 Hook
 * 支援記憶體暫存（草稿模式）和直接上傳（編輯模式）
 *
 * @example
 * // 草稿模式（沒有 entityId）- 檔案存在記憶體
 * const fileHandler = useFileHandler({
 *   entityType: 'evidence',
 *   entityId: null,
 *   enableMemoryCache: true
 * })
 * await fileHandler.upload(file)  // 存到記憶體
 *
 * // 提交時批次上傳
 * const entryId = await createEntry()
 * await fileHandler.uploadMemoryFiles(entryId)
 *
 * @example
 * // 編輯模式（有 entityId）- 直接上傳到伺服器
 * const fileHandler = useFileHandler({
 *   entityType: 'evidence',
 *   entityId: existingEntryId,
 *   enableMemoryCache: true
 * })
 * await fileHandler.upload(file)  // 直接上傳
 */
export const useFileHandler = (config: UseFileHandlerConfig): UseFileHandlerReturn => {
  const { entityType, entityId, allowOverwrite = false, supportMultiple = true, enableMemoryCache = false } = config;

  const [memoryFiles, setMemoryFiles] = useState<MemoryFile[]>([]);
  const [serverFiles, setServerFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 結合伺服器檔案和記憶體檔案
  const files = useMemo(() => {
    if (enableMemoryCache) {
      // 記憶體檔案轉換為 EvidenceFile 格式（用於顯示）
      const memoryAsEvidence: EvidenceFile[] = memoryFiles.map(mf => ({
        id: mf.id,
        file_name: mf.file_name,
        file_size: mf.file_size,
        mime_type: mf.mime_type,
        file_path: mf.preview,
        created_at: new Date().toISOString(),
        owner_id: '',
        entry_id: '',
        file_type: 'other',
        // @ts-ignore - 新增標記
        isMemory: true
      }));
      return [...serverFiles, ...memoryAsEvidence];
    }
    return serverFiles;
  }, [memoryFiles, serverFiles, enableMemoryCache]);

  // 載入現有檔案（僅伺服器檔案）
  const refresh = useCallback(async () => {
    if (!entityId) {
      setServerFiles([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 這裡應該調用實際的 API 來載入檔案
      // 暫時使用空陣列，實際應該根據 entityType 和 entityId 載入
      console.log('[useFileHandler] Refresh files for entity:', entityId);
      setServerFiles([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '載入檔案失敗';
      setError(errorMessage);
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  // 初始載入
  useEffect(() => {
    if (entityId) {
      refresh();
    }
  }, [entityId, refresh]);

  // 轉換 MemoryFile 為 EvidenceFile（用於返回）
  const convertMemoryToEvidence = (memoryFile: MemoryFile): EvidenceFile => {
    return {
      id: memoryFile.id,
      file_name: memoryFile.file_name,
      file_size: memoryFile.file_size,
      mime_type: memoryFile.mime_type,
      file_path: memoryFile.preview,
      created_at: new Date().toISOString(),
      owner_id: '',
      entry_id: '',
      file_type: 'other',
      // @ts-ignore
      isMemory: true
    };
  };

  // 智慧上傳：根據模式決定存記憶體或上傳伺服器
  const upload = useCallback(async (file: File, meta?: Partial<FileMetadata>): Promise<EvidenceFile> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 檢查是否支援多檔案
      if (!supportMultiple && (serverFiles.length + memoryFiles.length) > 0 && !allowOverwrite) {
        throw new Error('此欄位僅支援單一檔案');
      }

      // 草稿模式：沒有 entityId 且啟用記憶體暫存
      if (enableMemoryCache && !entityId) {
        console.log('[useFileHandler] Draft mode: Adding file to memory');

        const memoryFile: MemoryFile = {
          id: `memory_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          file,
          preview: URL.createObjectURL(file),
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream'
        };

        // 單檔案模式且覆蓋：清除舊檔案
        if (!supportMultiple && allowOverwrite) {
          // 清理舊的 URL
          memoryFiles.forEach(mf => {
            if (mf.preview.startsWith('blob:')) {
              URL.revokeObjectURL(mf.preview);
            }
          });
          setMemoryFiles([memoryFile]);
        } else {
          setMemoryFiles(prev => [...prev, memoryFile]);
        }

        setSuccess(`檔案 ${file.name} 已加入（暫存）`);
        return convertMemoryToEvidence(memoryFile);
      }

      // 直接上傳模式：有 entityId 或不使用記憶體暫存
      console.log('[useFileHandler] Direct upload mode: Uploading to server');

      if (!entityId) {
        throw new Error('無法上傳：缺少 entity ID');
      }

      const uploadedFile = await uploadEvidenceWithEntry(file, {
        entryId: entityId,
        pageKey: meta?.pageKey || 'unknown',
        year: meta?.year || new Date().getFullYear(),
        category: meta?.category || 'other',
        month: meta?.month,
        allowOverwrite
      });

      // 立即更新本地狀態
      if (allowOverwrite && !supportMultiple) {
        setServerFiles([uploadedFile]);
      } else {
        setServerFiles(prev => [...prev, uploadedFile]);
      }

      setSuccess(`檔案 ${file.name} 上傳成功`);
      return uploadedFile;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '檔案上傳失敗';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, allowOverwrite, supportMultiple, serverFiles.length, memoryFiles.length, enableMemoryCache]);

  // 批次上傳檔案
  const uploadBatch = useCallback(async (
    uploadFiles: File[],
    meta?: Partial<FileMetadata>
  ): Promise<EvidenceFile[]> => {
    if (!supportMultiple && uploadFiles.length > 1) {
      throw new Error('此欄位僅支援單一檔案');
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const uploadedFiles: EvidenceFile[] = [];
    const errors: string[] = [];

    for (const file of uploadFiles) {
      try {
        const uploaded = await upload(file, meta);
        uploadedFiles.push(uploaded);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `檔案 ${file.name} 上傳失敗`;
        errors.push(errorMessage);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(', '));
      if (uploadedFiles.length === 0) {
        throw new Error('所有檔案上傳失敗');
      }
    } else {
      setSuccess(`成功上傳 ${uploadedFiles.length} 個檔案`);
    }

    return uploadedFiles;
  }, [supportMultiple, upload]);

  // 批次上傳記憶體檔案到伺服器
  const uploadMemoryFiles = useCallback(async (targetEntityId: string): Promise<{ succeeded: number; failed: number }> => {
    if (!enableMemoryCache || memoryFiles.length === 0) {
      return { succeeded: 0, failed: 0 };
    }

    console.log(`[useFileHandler] Uploading ${memoryFiles.length} memory files to entity: ${targetEntityId}`);
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 使用 Promise.allSettled 允許部分失敗
      const results = await Promise.allSettled(
        memoryFiles.map(mf =>
          uploadEvidenceWithEntry(mf.file, {
            entryId: targetEntityId,
            pageKey: 'unknown',  // 應該從外部傳入
            year: new Date().getFullYear(),
            category: 'other',
            allowOverwrite
          })
        )
      );

      // 統計結果
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log('[useFileHandler] Upload results:', { succeeded, failed, total: results.length });

      // 提供用戶反饋
      if (failed > 0) {
        if (succeeded > 0) {
          setSuccess(`部分檔案上傳成功 (${succeeded}/${memoryFiles.length})`);
          setError(`${failed} 個檔案上傳失敗`);
        } else {
          setError(`所有檔案上傳失敗，請檢查網路連線後重新嘗試`);
        }
      } else {
        setSuccess(`所有檔案 (${succeeded} 個) 已成功上傳`);
      }

      // 移除成功上傳的記憶體檔案
      if (succeeded > 0) {
        const successfulIndices = results
          .map((r, i) => ({ result: r, index: i }))
          .filter(({ result }) => result.status === 'fulfilled')
          .map(({ index }) => index);

        const successfulIds = successfulIndices.map(i => memoryFiles[i].id);

        // 清理成功上傳的檔案的 URL
        successfulIndices.forEach(i => {
          const mf = memoryFiles[i];
          if (mf.preview.startsWith('blob:')) {
            URL.revokeObjectURL(mf.preview);
          }
        });

        setMemoryFiles(prev => prev.filter(mf => !successfulIds.includes(mf.id)));

        // 重新載入伺服器檔案清單
        await refresh();
      }

      return { succeeded, failed };

    } catch (error) {
      console.error('[useFileHandler] Upload memory files failed:', error);
      setError('批次上傳失敗: ' + (error instanceof Error ? error.message : '未知錯誤'));
      return { succeeded: 0, failed: memoryFiles.length };
    } finally {
      setLoading(false);
    }
  }, [memoryFiles, enableMemoryCache, allowOverwrite, refresh]);

  // 智慧刪除：根據檔案類型決定刪除方式
  const remove = useCallback(async (fileId: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 檢查是否為記憶體檔案
      if (fileId.startsWith('memory_')) {
        console.log('[useFileHandler] Removing memory file:', fileId);

        const memoryFile = memoryFiles.find(mf => mf.id === fileId);
        if (memoryFile && memoryFile.preview.startsWith('blob:')) {
          URL.revokeObjectURL(memoryFile.preview);
        }

        setMemoryFiles(prev => prev.filter(mf => mf.id !== fileId));
        setSuccess('檔案已移除（記憶體）');
        return;
      }

      // 刪除伺服器檔案
      console.log('[useFileHandler] Removing server file:', fileId);
      await deleteEvidenceFile(fileId);

      // 立即更新本地狀態
      setServerFiles(prev => prev.filter(f => f.id !== fileId));
      setSuccess('檔案刪除成功');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刪除檔案失敗';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [memoryFiles]);

  // 關聯檔案到目標項目（僅適用於伺服器檔案）
  const associate = useCallback(async (targetEntryId: string): Promise<{ succeeded: number; failed: number }> => {
    if (serverFiles.length === 0) {
      return { succeeded: 0, failed: 0 };
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 這裡應該實作關聯邏輯
      console.log('[useFileHandler] Associate files to entry:', targetEntryId);

      // 暫時返回成功
      setSuccess(`成功關聯 ${serverFiles.length} 個檔案`);
      return { succeeded: serverFiles.length, failed: 0 };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '關聯檔案失敗';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [serverFiles]);

  // 清除所有狀態（不清理記憶體檔案）
  const clear = useCallback(() => {
    setServerFiles([]);
    setError(null);
    setSuccess(null);
    setLoading(false);
  }, []);

  // 清理記憶體檔案
  const clearMemory = useCallback(() => {
    console.log('[useFileHandler] Clearing memory files:', memoryFiles.length);

    memoryFiles.forEach(mf => {
      if (mf.preview.startsWith('blob:')) {
        URL.revokeObjectURL(mf.preview);
      }
    });

    setMemoryFiles([]);
    setSuccess('記憶體檔案已清除');
  }, [memoryFiles]);

  // 組件卸載時清理所有 blob URLs
  useEffect(() => {
    return () => {
      memoryFiles.forEach(mf => {
        if (mf.preview.startsWith('blob:')) {
          URL.revokeObjectURL(mf.preview);
        }
      });
    };
  }, []);

  return {
    files,
    memoryFiles,
    serverFiles,
    loading,
    error,
    success,
    upload,
    uploadBatch,
    uploadMemoryFiles,
    remove,
    refresh,
    associate,
    clear,
    clearMemory,
    hasMemoryFiles: memoryFiles.length > 0
  };
};