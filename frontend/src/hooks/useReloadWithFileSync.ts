import { useCallback } from 'react'

/**
 * 處理 reload 後的檔案同步問題
 *
 * ## 為什麼需要這個 Hook？
 *
 * reload() 觸發異步載入 → useEffect 處理檔案 → 我們才能清空 memoryFiles
 * 如果立即清空，useEffect 還沒跑完，UI 會顯示空白。
 *
 * ## 問題時間線
 *
 * ```
 * T0:      reload() 觸發 → setFiles(loadedFiles)
 * T0:      useEffect 監聽到 loadedFiles 變化
 * T0:      開始執行 cleanAndAssignFiles() (異步)
 * T0:      cleanFiles() 驗證每個檔案是否存在
 * T0-800ms: 如果有幽靈檔案，等 800ms 重試 (useGhostFileCleaner)
 * T100:     我們的延遲完成 → 清空 memoryFiles ✅
 * T800:     cleanFiles() 完成 → setMsdsFiles() / setMonthlyData()
 * ```
 *
 * ## ⚠️ 重要：這是「修補設計缺陷」，不是根本解決方案
 *
 * **真正的問題：** memoryFiles 和 serverFiles 是兩個獨立狀態，需要手動同步。
 * **根本解決：** 統一管理檔案狀態，消除手動同步需求（長期重構目標）。
 * **當前方案：** 用延遲緩解競態條件，允許 useEffect 完成處理。
 *
 * ## 已知風險
 *
 * ### 風險 A: useGhostFileCleaner 的 800ms 延遲
 * - `cleanFiles()` 可能需要 800ms（有幽靈檔案時）
 * - 我們的 100ms 延遲不夠等它完成
 * - **但實際上沒問題**：因為 memoryFiles 和 serverFiles 分開
 * - serverFiles 會在 cleanFiles() 完成後正確更新
 *
 * ### 風險 B: 多個 useEffect 同時觸發
 * - 如果你的頁面有 useEffect 監聽 memoryFiles
 * - 清空後會觸發該 useEffect
 * - **解決方法**：確保你的 useEffect 邏輯能處理空陣列
 *
 * ### 風險 C: useFileHandler 的衝突
 * - 不要同時呼叫 useFileHandler.refresh() 和 reload()
 * - 選擇其中一個作為 single source of truth
 *
 * ### 風險 D: useRecordFileMapping 的衝突
 * - 不要在 reload 過程中呼叫 uploadRecordFiles()
 * - 等 reloadAndSync() 完成後再上傳
 *
 * @param reloadFn - useEnergyData 的 reload 函式
 * @param delayMs - 延遲時間（預設 100ms），可根據頁面需求調整
 * @returns reloadAndSync - 包含延遲的 reload 函式
 *
 * @example
 * 基本用法
 * ```typescript
 * const { reload } = useEnergyData(pageKey, year)
 * const { reloadAndSync } = useReloadWithFileSync(reload)
 *
 * // 提交成功後
 * await reloadAndSync()
 * setMsdsMemoryFiles([])
 * setMonthlyMemoryFiles([])
 * ```
 *
 * @example
 * 自訂延遲時間（大量檔案時）
 * ```typescript
 * // 如果你的頁面檔案很多（>20 個），可能需要更長延遲
 * const { reloadAndSync } = useReloadWithFileSync(reload, 300)
 * ```
 */
export function useReloadWithFileSync(
  reloadFn: () => Promise<void>,
  delayMs: number = 100
) {
  const reloadAndSync = useCallback(async () => {
    // 重新載入後端資料
    await reloadFn()

    // 等待 useEffect 處理載入的檔案
    // 100ms 足夠讓 React 完成一個 render cycle
    // 如果頁面有大量檔案（>20）或使用 useGhostFileCleaner 遇到幽靈檔案，
    // 可能需要更長時間，但這通常不影響功能
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }, [reloadFn, delayMs])

  return { reloadAndSync }
}
