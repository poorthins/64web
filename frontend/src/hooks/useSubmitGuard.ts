import { useRef, useState, useCallback } from 'react'

/**
 * 防止重複提交的 Hook
 *
 * 使用 ref 做同步檢查，防止 React state 非同步更新導致的 race condition
 *
 * @example
 * const { executeSubmit, submitting } = useSubmitGuard()
 *
 * const handleSubmit = async () => {
 *   await executeSubmit(async () => {
 *     // 原本的提交邏輯
 *     await uploadFiles()
 *     await saveData()
 *   })
 * }
 */
export function useSubmitGuard() {
  const guardRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)

  const executeSubmit = useCallback(async (fn: () => Promise<void>) => {
    // 同步檢查：立即生效，不等 React 渲染
    if (guardRef.current) {
      console.log('⚠️ [useSubmitGuard] 忽略重複提交')
      return
    }

    guardRef.current = true
    setSubmitting(true)

    try {
      await fn()
    } catch (error) {
      // 重新拋出錯誤,讓上層可以處理
      throw error
    } finally {
      guardRef.current = false
      setSubmitting(false)
    }
  }, [])

  return { executeSubmit, submitting }
}
