import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSubmitGuard } from '../useSubmitGuard'

describe('useSubmitGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ========================================
  // 基本功能測試
  // ========================================
  describe('基本功能', () => {
    it('應該初始化 submitting = false', () => {
      const { result } = renderHook(() => useSubmitGuard())
      expect(result.current.submitting).toBe(false)
    })

    it('應該成功執行單次提交', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      const mockFn = vi.fn().mockResolvedValue(undefined)

      await act(async () => {
        await result.current.executeSubmit(mockFn)
      })

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(result.current.submitting).toBe(false)
    })

    it('提交中應設定 submitting = true', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      let resolvePromise: () => void
      const mockFn = vi.fn(() => new Promise<void>(resolve => {
        resolvePromise = resolve
      }))

      // 開始提交（不等待）
      act(() => {
        result.current.executeSubmit(mockFn)
      })

      // 提交中應該是 true
      expect(result.current.submitting).toBe(true)

      // 完成提交
      await act(async () => {
        resolvePromise!()
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      expect(result.current.submitting).toBe(false)
    })
  })

  // ========================================
  // 重複提交防護測試（核心功能）
  // ========================================
  describe('重複提交防護', () => {
    it('應該忽略重複提交（快速點擊 2 次）', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      let resolvePromise: () => void
      const mockFn = vi.fn(() => new Promise<void>(resolve => {
        resolvePromise = resolve
      }))

      // 第一次點擊
      act(() => {
        result.current.executeSubmit(mockFn)
      })

      // 第二次點擊（在第一次完成前）
      act(() => {
        result.current.executeSubmit(mockFn)
      })

      // 應該只執行一次
      expect(mockFn).toHaveBeenCalledTimes(1)

      // 完成提交
      await act(async () => {
        resolvePromise!()
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      expect(result.current.submitting).toBe(false)
    })

    it('應該忽略快速點擊 6 次（真實 Bug 案例）', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      let resolvePromise: () => void
      const mockFn = vi.fn(() => new Promise<void>(resolve => {
        resolvePromise = resolve
      }))

      // 模擬使用者快速點擊 6 次
      act(() => {
        result.current.executeSubmit(mockFn)
        result.current.executeSubmit(mockFn)
        result.current.executeSubmit(mockFn)
        result.current.executeSubmit(mockFn)
        result.current.executeSubmit(mockFn)
        result.current.executeSubmit(mockFn)
      })

      // 應該只執行一次（不是 6 次）
      expect(mockFn).toHaveBeenCalledTimes(1)

      // 完成提交
      await act(async () => {
        resolvePromise!()
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      expect(result.current.submitting).toBe(false)
    })

    it('完成後應該允許再次提交', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      const mockFn = vi.fn().mockResolvedValue(undefined)

      // 第一次提交
      await act(async () => {
        await result.current.executeSubmit(mockFn)
      })

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(result.current.submitting).toBe(false)

      // 第二次提交（第一次完成後）
      await act(async () => {
        await result.current.executeSubmit(mockFn)
      })

      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(result.current.submitting).toBe(false)
    })
  })

  // ========================================
  // 錯誤處理測試
  // ========================================
  describe('錯誤處理', () => {
    it('提交失敗後應重置 submitting', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      const mockError = new Error('提交失敗')
      const mockFn = vi.fn().mockRejectedValue(mockError)

      await act(async () => {
        try {
          await result.current.executeSubmit(mockFn)
        } catch (error) {
          // 預期拋出錯誤
        }
      })

      // 失敗後應重置狀態
      expect(result.current.submitting).toBe(false)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('失敗後應該允許重新提交', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      const mockError = new Error('提交失敗')
      const mockFn = vi.fn()
        .mockRejectedValueOnce(mockError)  // 第一次失敗
        .mockResolvedValueOnce(undefined)   // 第二次成功

      // 第一次提交（失敗）
      await act(async () => {
        try {
          await result.current.executeSubmit(mockFn)
        } catch (error) {
          // 預期拋出錯誤
        }
      })

      expect(result.current.submitting).toBe(false)
      expect(mockFn).toHaveBeenCalledTimes(1)

      // 第二次提交（成功）
      await act(async () => {
        await result.current.executeSubmit(mockFn)
      })

      expect(result.current.submitting).toBe(false)
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('拋出的錯誤應該被重新拋出', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      const mockError = new Error('提交失敗')
      const mockFn = vi.fn().mockRejectedValue(mockError)

      await act(async () => {
        await expect(result.current.executeSubmit(mockFn)).rejects.toThrow('提交失敗')
      })

      expect(result.current.submitting).toBe(false)
    })
  })

  // ========================================
  // Race Condition 防護測試
  // ========================================
  describe('Race Condition 防護', () => {
    it('應該使用 ref 做同步檢查（立即生效）', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      const executionOrder: string[] = []

      let resolvePromise: () => void
      const mockFn = vi.fn(() => {
        executionOrder.push('執行開始')
        return new Promise<void>(resolve => {
          resolvePromise = resolve
        })
      })

      // 快速連續呼叫
      act(() => {
        result.current.executeSubmit(mockFn)
        executionOrder.push('第一次呼叫後')
        result.current.executeSubmit(mockFn)
        executionOrder.push('第二次呼叫後')
      })

      // 驗證執行順序
      expect(executionOrder).toEqual([
        '執行開始',      // 第一次呼叫成功執行
        '第一次呼叫後',
        '第二次呼叫後'   // 第二次呼叫被忽略（沒有 '執行開始'）
      ])

      expect(mockFn).toHaveBeenCalledTimes(1)

      // 完成提交
      await act(async () => {
        resolvePromise!()
        await new Promise(resolve => setTimeout(resolve, 10))
      })
    })

    it('應該在 React 渲染前阻擋重複提交', async () => {
      const { result } = renderHook(() => useSubmitGuard())
      const consoleSpy = vi.spyOn(console, 'log')

      let resolvePromise: () => void
      const mockFn = vi.fn(() => new Promise<void>(resolve => {
        resolvePromise = resolve
      }))

      // 快速連續呼叫（模擬 setState 還沒更新 UI 的情況）
      act(() => {
        result.current.executeSubmit(mockFn)
        result.current.executeSubmit(mockFn)
        result.current.executeSubmit(mockFn)
      })

      // 驗證 console 警告
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ [useSubmitGuard] 忽略重複提交')
      expect(consoleSpy).toHaveBeenCalledTimes(2) // 第 2、3 次呼叫被忽略

      // 完成提交
      await act(async () => {
        resolvePromise!()
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      consoleSpy.mockRestore()
    })
  })

  // ========================================
  // 歷史 Bug 防護測試
  // ========================================
  describe('歷史 Bug 防護', () => {
    it('[Bug #1] 防止檔案被重複上傳（6 個相同檔案問題）', async () => {
      // 模擬真實場景：使用者點擊 6 次提交按鈕
      const { result } = renderHook(() => useSubmitGuard())
      const uploadedFiles: string[] = []

      let resolvePromise: () => void
      const mockUploadFn = vi.fn(() => {
        uploadedFiles.push('test.pdf')
        return new Promise<void>(resolve => {
          resolvePromise = resolve
        })
      })

      // 使用者快速點擊 6 次
      act(() => {
        result.current.executeSubmit(mockUploadFn)
        result.current.executeSubmit(mockUploadFn)
        result.current.executeSubmit(mockUploadFn)
        result.current.executeSubmit(mockUploadFn)
        result.current.executeSubmit(mockUploadFn)
        result.current.executeSubmit(mockUploadFn)
      })

      // 完成提交
      await act(async () => {
        resolvePromise!()
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // ⭐ 應該只上傳 1 個檔案，不是 6 個
      expect(uploadedFiles).toHaveLength(1)
      expect(mockUploadFn).toHaveBeenCalledTimes(1)
    })
  })
})
