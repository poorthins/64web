/**
 * useRefrigerantDeviceManager - 冷媒設備管理 Hook
 *
 * 功能：
 * - 管理設備列表狀態
 * - 管理當前編輯設備
 * - 提供 CRUD 操作
 */

import { useState } from 'react'
import { generateRecordId } from '../../../utils/idGenerator'
import { MemoryFile } from '../../../components/FileDropzone'
import { EvidenceFile } from '../../../api/files'

export interface RefrigerantDevice {
  id: string
  brandModel: string
  equipmentType: string
  equipmentLocation: string
  refrigerantType: string
  fillAmount: number
  unit: 'gram' | 'kg'
  memoryFiles: MemoryFile[]
  evidenceFiles?: EvidenceFile[]
}

const createEmptyDevice = (): RefrigerantDevice => ({
  id: generateRecordId(),
  brandModel: '',
  equipmentType: '',
  equipmentLocation: '',
  refrigerantType: '',
  fillAmount: 0,
  unit: 'kg',
  memoryFiles: []
})

export function useRefrigerantDeviceManager() {
  const [savedDevices, setSavedDevices] = useState<RefrigerantDevice[]>([])
  const [currentEditingDevice, setCurrentEditingDevice] = useState<RefrigerantDevice>(createEmptyDevice())
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)

  // 更新當前編輯設備的欄位
  const updateCurrentDevice = (field: keyof RefrigerantDevice, value: any) => {
    setCurrentEditingDevice(prev => ({ ...prev, [field]: value }))
  }

  // 保存當前設備
  const saveCurrentDevice = () => {
    const device = currentEditingDevice

    // 驗證：至少要有一個欄位有值
    const hasValidData =
      device.brandModel.trim() !== '' ||
      device.equipmentLocation.trim() !== '' ||
      device.refrigerantType.trim() !== '' ||
      device.fillAmount > 0

    if (!hasValidData) {
      throw new Error('請至少填寫一個欄位')
    }

    const isEditMode = editingDeviceId !== null

    if (isEditMode) {
      // 編輯模式：更新設備
      setSavedDevices(prev => prev.map(d =>
        d.id === editingDeviceId ? device : d
      ))
    } else {
      // 新增模式：加入設備
      setSavedDevices(prev => [...prev, device])
    }

    // 清空編輯區
    setEditingDeviceId(null)
    setCurrentEditingDevice(createEmptyDevice())

    return isEditMode ? '設備已更新' : '設備已新增'
  }

  // 載入設備到編輯區
  const editDevice = (id: string) => {
    const device = savedDevices.find(d => d.id === id)
    if (!device) return

    setCurrentEditingDevice(device)
    setEditingDeviceId(id)
    return '設備已載入到編輯區'
  }

  // 刪除設備
  const deleteDevice = (id: string) => {
    setSavedDevices(prev => prev.filter(d => d.id !== id))
    return '設備已刪除'
  }

  return {
    savedDevices,
    setSavedDevices,
    currentEditingDevice,
    editingDeviceId,
    updateCurrentDevice,
    saveCurrentDevice,
    editDevice,
    deleteDevice
  }
}
