/**
 * useSF6DeviceManager - SF6 設備管理 Hook
 *
 * 功能：
 * - 管理當前編輯中的設備資料
 * - 管理已保存的設備列表
 * - 處理設備的新增、編輯、刪除邏輯
 */

import { useState } from 'react'
import { generateRecordId } from '../../../utils/idGenerator'
import { SF6Record, SF6EditingGroup } from '../common/mobileEnergyTypes'
import { MemoryFile } from '../../../components/FileDropzone'
import { getFileUrl } from '../../../api/files'

export interface UseSF6DeviceManagerReturn {
  // 狀態
  currentEditingGroup: SF6EditingGroup
  savedDevices: SF6Record[]

  // 狀態更新
  setCurrentEditingGroup: React.Dispatch<React.SetStateAction<SF6EditingGroup>>
  setSavedDevices: React.Dispatch<React.SetStateAction<SF6Record[]>>

  // 設備操作
  updateCurrentDevice: (field: keyof SF6Record, value: any) => void
  saveCurrentDevice: (onSuccess?: (message: string) => void, onError?: (message: string) => void) => void
  loadDeviceToEditor: (groupId: string, onSuccess?: (message: string) => void) => void
  deleteSavedDevice: (groupId: string, onSuccess?: (message: string) => void) => void

  // 檔案操作
  updateNameplateFiles: (files: MemoryFile[]) => void
  updateCertificateFiles: (files: MemoryFile[]) => void
}

export function useSF6DeviceManager(): UseSF6DeviceManagerReturn {
  // 當前編輯的設備（單一設備，不是多筆記錄）
  const [currentEditingGroup, setCurrentEditingGroup] = useState<SF6EditingGroup>({
    groupId: null,
    record: {
      id: generateRecordId(),
      location: '',
      sf6Weight: 0,
      model: '',
      leakageRate: 0,
    },
    memoryNameplateFiles: [],   // GCB 氣體斷路器銘牌照片
    memoryCertificateFiles: []  // SF6 氣體重量/ 年洩漏率證明文件
  })

  // 已保存的設備列表
  const [savedDevices, setSavedDevices] = useState<SF6Record[]>([])

  /**
   * 更新當前編輯設備的欄位
   */
  const updateCurrentDevice = (field: keyof SF6Record, value: any) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      record: { ...prev.record, [field]: value }
    }))
  }

  /**
   * 保存設備：新增或更新
   */
  const saveCurrentDevice = (
    onSuccess?: (message: string) => void,
    onError?: (message: string) => void
  ) => {
    const { groupId, record, memoryNameplateFiles, memoryCertificateFiles } = currentEditingGroup

    console.log('🔍 [saveCurrentDevice] 當前編輯狀態:', {
      groupId,
      isEditMode: groupId !== null,
      recordId: record.id,
      memoryNameplateFilesCount: memoryNameplateFiles.length,
      memoryCertificateFilesCount: memoryCertificateFiles.length,
      memoryNameplateFiles,
      memoryCertificateFiles
    })

    // 判斷是編輯模式還是新增模式
    const isEditMode = groupId !== null

    // 驗證：新增和編輯都要至少有一個欄位有值
    const hasValidData =
      record.location.trim() !== '' ||
      record.sf6Weight > 0 ||
      record.model.trim() !== '' ||
      record.leakageRate > 0

    if (!hasValidData) {
      onError?.('請至少填寫一個欄位')
      return
    }

    const targetGroupId = isEditMode ? groupId : generateRecordId()

    // 將 groupId 和 memoryFiles 套用到記錄
    const deviceWithGroupId: SF6Record = {
      ...record,
      groupId: targetGroupId,
      memoryNameplateFiles: [...memoryNameplateFiles],
      memoryCertificateFiles: [...memoryCertificateFiles]
    }

    console.log('💾 [saveCurrentDevice] 準備保存的設備:', {
      isEditMode,
      targetGroupId,
      deviceWithGroupId
    })

    if (isEditMode) {
      // 編輯模式：更新該設備
      setSavedDevices(prev => {
        const updated = prev.map(d => d.groupId === groupId ? deviceWithGroupId : d)
        console.log('✅ [saveCurrentDevice] 編輯模式更新後:', updated)
        return updated
      })
      onSuccess?.('設備已更新')
    } else {
      // 新增模式：加入已保存列表
      setSavedDevices(prev => {
        const updated = [deviceWithGroupId, ...prev]
        console.log('✅ [saveCurrentDevice] 新增模式更新後:', updated)
        return updated
      })
      onSuccess?.('設備已新增')
    }

    // 清空編輯區（準備下一個設備）
    setCurrentEditingGroup({
      groupId: null,
      record: {
        id: generateRecordId(),
        location: '',
        sf6Weight: 0,
        model: '',
        leakageRate: 0,
      },
      memoryNameplateFiles: [],
      memoryCertificateFiles: []
    })
  }

  /**
   * 載入設備到編輯區（點「編輯」）
   */
  const loadDeviceToEditor = async (
    groupId: string,
    onSuccess?: (message: string) => void
  ) => {
    console.log('📖 [loadDeviceToEditor] 開始載入設備:', groupId)

    // 檢查當前編輯區是否有未保存的資料
    const currentHasData =
      currentEditingGroup.record.location.trim() !== '' ||
      currentEditingGroup.record.sf6Weight > 0 ||
      currentEditingGroup.record.model.trim() !== '' ||
      currentEditingGroup.record.leakageRate > 0 ||
      currentEditingGroup.memoryNameplateFiles.length > 0 ||
      currentEditingGroup.memoryCertificateFiles.length > 0

    // 如果有未保存的資料，提示用戶
    if (currentHasData && currentEditingGroup.groupId === null) {
      if (!window.confirm('目前編輯區有未保存的資料，是否先保存後再載入其他設備？')) {
        return
      }
      saveCurrentDevice(onSuccess)
    }

    // 從 savedDevices 找出該設備（用 id 或 groupId 找）
    const device = savedDevices.find(d => d.id === groupId || d.groupId === groupId)

    if (!device) {
      console.error('❌ [loadDeviceToEditor] 找不到設備:', groupId)
      return
    }

    console.log('📋 [loadDeviceToEditor] 找到設備:', {
      device,
      nameplateFilesCount: device.nameplateFiles?.length || 0,
      certificateFilesCount: device.certificateFiles?.length || 0,
      memoryNameplateFilesCount: device.memoryNameplateFiles?.length || 0,
      memoryCertificateFilesCount: device.memoryCertificateFiles?.length || 0
    })

    // 優先使用記憶體檔案（新上傳的），沒有才轉換資料庫檔案（舊的）
    let memoryFile1: MemoryFile[] = []
    let memoryFile2: MemoryFile[] = []

    if (device.memoryNameplateFiles && device.memoryNameplateFiles.length > 0) {
      // 有記憶體檔案，直接用
      memoryFile1 = device.memoryNameplateFiles
    } else if (device.nameplateFiles && device.nameplateFiles.length > 0) {
      // 沒有記憶體檔案，轉換資料庫檔案
      memoryFile1 = await Promise.all(
        device.nameplateFiles.map(async (f) => {
          let previewUrl = ''
          if (f.mime_type.startsWith('image/')) {
            try {
              previewUrl = await getFileUrl(f.file_path)
            } catch (error) {
              console.warn('Failed to load preview for', f.file_name, error)
            }
          }
          return {
            id: f.id,
            file: new File([], f.file_name, { type: f.mime_type }),
            preview: previewUrl,
            file_name: f.file_name,
            file_size: f.file_size || 0,
            mime_type: f.mime_type
          }
        })
      )
    }

    if (device.memoryCertificateFiles && device.memoryCertificateFiles.length > 0) {
      // 有記憶體檔案，直接用
      memoryFile2 = device.memoryCertificateFiles
    } else if (device.certificateFiles && device.certificateFiles.length > 0) {
      // 沒有記憶體檔案，轉換資料庫檔案
      memoryFile2 = await Promise.all(
        device.certificateFiles.map(async (f) => {
          let previewUrl = ''
          if (f.mime_type.startsWith('image/')) {
            try {
              previewUrl = await getFileUrl(f.file_path)
            } catch (error) {
              console.warn('Failed to load preview for', f.file_name, error)
            }
          }
          return {
            id: f.id,
            file: new File([], f.file_name, { type: f.mime_type }),
            preview: previewUrl,
            file_name: f.file_name,
            file_size: f.file_size || 0,
            mime_type: f.mime_type
          }
        })
      )
    }

    setCurrentEditingGroup({
      groupId: device.groupId || device.id,
      record: device,
      memoryNameplateFiles: memoryFile1,
      memoryCertificateFiles: memoryFile2
    })

    onSuccess?.('設備已載入到編輯區')
  }

  /**
   * 刪除已保存的設備
   */
  const deleteSavedDevice = (
    groupId: string,
    onSuccess?: (message: string) => void
  ) => {
    // 同時比對 id 和 groupId（舊資料可能沒有 groupId）
    setSavedDevices(prev => prev.filter(d => d.groupId !== groupId && d.id !== groupId))
    onSuccess?.('設備已刪除')
  }

  /**
   * 更新銘牌檔案
   */
  const updateNameplateFiles = (files: MemoryFile[]) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      memoryNameplateFiles: files
    }))
  }

  /**
   * 更新證明文件
   */
  const updateCertificateFiles = (files: MemoryFile[]) => {
    setCurrentEditingGroup(prev => ({
      ...prev,
      memoryCertificateFiles: files
    }))
  }

  return {
    // 狀態
    currentEditingGroup,
    savedDevices,

    // 狀態更新
    setCurrentEditingGroup,
    setSavedDevices,

    // 設備操作
    updateCurrentDevice,
    saveCurrentDevice,
    loadDeviceToEditor,
    deleteSavedDevice,

    // 檔案操作
    updateNameplateFiles,
    updateCertificateFiles
  }
}
