/**
 * useWD40SpecManager 測試
 *
 * 測試策略（Linus 實用主義）：
 * - 只測核心邏輯：驗證規則
 * - 不測 React 狀態管理（那是 React 的責任）
 * - 不測 UI 互動（那是 E2E 的責任）
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWD40SpecManager } from '../useWD40SpecManager'

describe('useWD40SpecManager - 驗證邏輯', () => {
  describe('saveCurrentSpec()', () => {
    it('空名稱應拋出錯誤', () => {
      const { result } = renderHook(() => useWD40SpecManager())

      // 設定空名稱
      act(() => {
        result.current.updateCurrentSpec('name', '')
      })

      // 嘗試保存，應該拋錯
      expect(() => {
        act(() => {
          result.current.saveCurrentSpec()
        })
      }).toThrow('請輸入品項名稱')
    })

    it('空白名稱應拋出錯誤', () => {
      const { result } = renderHook(() => useWD40SpecManager())

      // 設定只有空白的名稱
      act(() => {
        result.current.updateCurrentSpec('name', '   ')
      })

      // 應該 trim 後檢查，仍然拋錯
      expect(() => {
        act(() => {
          result.current.saveCurrentSpec()
        })
      }).toThrow('請輸入品項名稱')
    })

    it('重複名稱應拋出錯誤', () => {
      const { result } = renderHook(() => useWD40SpecManager())

      // 先新增一個規格
      act(() => {
        result.current.updateCurrentSpec('name', 'WD-40 多用途潤滑劑')
      })

      act(() => {
        result.current.saveCurrentSpec()
      })

      // 嘗試新增重複名稱
      act(() => {
        result.current.updateCurrentSpec('name', 'WD-40 多用途潤滑劑')
      })

      expect(() => {
        act(() => {
          result.current.saveCurrentSpec()
        })
      }).toThrow('品項名稱重複，請使用不同名稱')
    })

    it('重複名稱（忽略空白）應拋出錯誤', () => {
      const { result } = renderHook(() => useWD40SpecManager())

      // 先新增一個規格
      act(() => {
        result.current.updateCurrentSpec('name', '  WD-40  ')
      })

      act(() => {
        result.current.saveCurrentSpec()
      })

      // 嘗試新增名稱相同但有額外空白的規格
      act(() => {
        result.current.updateCurrentSpec('name', 'WD-40')
      })

      expect(() => {
        act(() => {
          result.current.saveCurrentSpec()
        })
      }).toThrow('品項名稱重複，請使用不同名稱')
    })

    it('編輯模式：保留原名稱應該成功', () => {
      const { result } = renderHook(() => useWD40SpecManager())

      // 先新增一個規格
      act(() => {
        result.current.updateCurrentSpec('name', 'WD-40 原品項')
      })

      act(() => {
        result.current.saveCurrentSpec()
      })

      const specId = result.current.savedSpecs[0].id

      // 進入編輯模式
      act(() => {
        result.current.editSpec(specId)
      })

      // 修改其他欄位但保留名稱
      act(() => {
        result.current.updateCurrentSpec('name', 'WD-40 原品項')
      })

      // 保存應該成功（不應視為重複）
      expect(() => {
        act(() => {
          result.current.saveCurrentSpec()
        })
      }).not.toThrow()

      // 驗證：應該仍然只有 1 個規格
      expect(result.current.savedSpecs).toHaveLength(1)
      expect(result.current.savedSpecs[0].name).toBe('WD-40 原品項')
    })

    it('編輯模式：改成其他規格的名稱應拋出錯誤', () => {
      const { result } = renderHook(() => useWD40SpecManager())

      // 新增兩個規格
      act(() => {
        result.current.updateCurrentSpec('name', '品項 A')
      })

      act(() => {
        result.current.saveCurrentSpec()
      })

      act(() => {
        result.current.updateCurrentSpec('name', '品項 B')
      })

      act(() => {
        result.current.saveCurrentSpec()
      })

      const specAId = result.current.savedSpecs[0].id

      // 編輯品項 A
      act(() => {
        result.current.editSpec(specAId)
      })

      // 嘗試改成品項 B 的名稱
      act(() => {
        result.current.updateCurrentSpec('name', '品項 B')
      })

      expect(() => {
        act(() => {
          result.current.saveCurrentSpec()
        })
      }).toThrow('品項名稱重複，請使用不同名稱')
    })
  })

  describe('editSpec() / cancelEdit()', () => {
    it('editSpec 應該載入規格到編輯區', () => {
      const { result } = renderHook(() => useWD40SpecManager())

      // 新增一個規格
      act(() => {
        result.current.updateCurrentSpec('name', '測試品項')
      })

      act(() => {
        result.current.saveCurrentSpec()
      })

      const specId = result.current.savedSpecs[0].id

      // 編輯
      act(() => {
        result.current.editSpec(specId)
      })

      expect(result.current.editingSpecId).toBe(specId)
      expect(result.current.currentEditingSpec.name).toBe('測試品項')
    })

    it('cancelEdit 應該清空編輯區', () => {
      const { result } = renderHook(() => useWD40SpecManager())

      // 新增並編輯一個規格
      act(() => {
        result.current.updateCurrentSpec('name', '測試品項')
      })

      act(() => {
        result.current.saveCurrentSpec()
      })

      const specId = result.current.savedSpecs[0].id

      act(() => {
        result.current.editSpec(specId)
      })

      // 取消編輯
      act(() => {
        result.current.cancelEdit()
      })

      expect(result.current.editingSpecId).toBeNull()
      expect(result.current.currentEditingSpec.name).toBe('')
    })
  })

  describe('deleteSpec()', () => {
    it('應該成功刪除規格', () => {
      const { result } = renderHook(() => useWD40SpecManager())

      // 新增一個規格
      act(() => {
        result.current.updateCurrentSpec('name', '待刪除品項')
      })

      act(() => {
        result.current.saveCurrentSpec()
      })

      const specId = result.current.savedSpecs[0].id

      // 刪除
      act(() => {
        result.current.deleteSpec(specId)
      })

      expect(result.current.savedSpecs).toHaveLength(0)
    })
  })
})
