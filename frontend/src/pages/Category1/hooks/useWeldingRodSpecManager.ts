/**
 * useWeldingRodSpecManager - 焊條規格管理 Hook
 *
 * 功能：
 * - 管理規格列表狀態
 * - 管理當前編輯規格
 * - 提供 CRUD 操作
 * - 驗證規格名稱唯一性
 */

import { useState } from 'react'
import { generateRecordId } from '../../../utils/idGenerator'
import type { MemoryFile } from '../../../services/documentHandler'
import { EvidenceFile } from '../../../api/files'

export interface WeldingRodSpec {
  id: string
  name: string            // 品項清單（格式：品名_單位重量 (KG/瓶)）
  memoryFiles: MemoryFile[]
  evidenceFiles?: EvidenceFile[]
}

const createEmptySpec = (): WeldingRodSpec => ({
  id: generateRecordId(),
  name: '',
  memoryFiles: [],
  evidenceFiles: []
})

export function useWeldingRodSpecManager() {
  const [savedSpecs, setSavedSpecs] = useState<WeldingRodSpec[]>([])
  const [currentEditingSpec, setCurrentEditingSpec] = useState<WeldingRodSpec>(createEmptySpec())
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null)

  // 更新當前編輯規格的欄位
  const updateCurrentSpec = (field: keyof WeldingRodSpec, value: any) => {
    setCurrentEditingSpec(prev => ({ ...prev, [field]: value }))
  }

  // 保存當前規格
  const saveCurrentSpec = () => {
    const spec = currentEditingSpec
    const trimmedName = spec.name.trim()

    // ✅ Linus 驗證 1：空名稱檢查
    if (!trimmedName) {
      throw new Error('請輸入品項清單')
    }

    // ✅ Linus 驗證 2：名稱重複檢查（排除自己）
    const isDuplicate = savedSpecs.some(
      s => s.name.trim() === trimmedName && s.id !== editingSpecId
    )

    if (isDuplicate) {
      throw new Error('品項清單重複，請使用不同名稱')
    }

    const isEditMode = editingSpecId !== null

    if (isEditMode) {
      // 編輯模式：更新規格
      setSavedSpecs(prev => prev.map(s =>
        s.id === editingSpecId ? { ...spec, name: trimmedName } : s
      ))
    } else {
      // 新增模式：加入規格
      setSavedSpecs(prev => [...prev, { ...spec, name: trimmedName }])
    }

    // 清空編輯區
    setEditingSpecId(null)
    setCurrentEditingSpec(createEmptySpec())

    return isEditMode ? '品項已更新' : '品項已新增'
  }

  // 載入規格到編輯區
  const editSpec = (id: string) => {
    const spec = savedSpecs.find(s => s.id === id)
    if (!spec) return

    setCurrentEditingSpec(spec)
    setEditingSpecId(id)
    return '品項已載入到編輯區'
  }

  // 刪除規格
  // ⚠️ 注意：外部調用前需要檢查是否有使用記錄（在 WeldingRodPage 處理）
  const deleteSpec = (id: string) => {
    setSavedSpecs(prev => prev.filter(s => s.id !== id))
    return '品項已刪除'
  }

  // 取消編輯（清空編輯區）
  const cancelEdit = () => {
    setEditingSpecId(null)
    setCurrentEditingSpec(createEmptySpec())
  }

  return {
    savedSpecs,
    setSavedSpecs,
    currentEditingSpec,
    editingSpecId,
    updateCurrentSpec,
    saveCurrentSpec,
    editSpec,
    deleteSpec,
    cancelEdit
  }
}
