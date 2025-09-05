import { supabase } from '../lib/supabaseClient'
import { validateAuth, handleAPIError } from '../utils/authHelpers'

export interface DraftPayload {
  year?: number
  unitCapacity?: number
  carbonRate?: number
  monthly?: { [key: string]: number }
  extraNotes?: string
  [key: string]: any
}

export interface FormDraft {
  id?: string
  owner_id: string
  page_key: string
  payload: DraftPayload
  updated_at: string
}

/**
 * 讀取指定頁面的最新草稿
 */
export async function loadDraft(pageKey: string): Promise<DraftPayload | null> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    const { data, error } = await supabase
      .from('form_drafts')
      .select('payload, updated_at')
      .eq('owner_id', user.id)
      .eq('page_key', pageKey)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 沒有找到記錄，返回 null
        return null
      }
      console.error('Error loading draft:', error)
      throw handleAPIError(error, '載入草稿失敗')
    }

    return data?.payload || null
  } catch (error) {
    console.error('Error in loadDraft:', error)
    if (error instanceof Error && error.message.includes('載入草稿失敗')) {
      throw error
    }
    // 如果是其他錯誤（如表格不存在），返回 null 而不拋出錯誤
    return null
  }
}

/**
 * 保存草稿到雲端
 */
export async function saveDraft(pageKey: string, payload: DraftPayload): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    const { error } = await supabase
      .from('form_drafts')
      .upsert({
        owner_id: user.id,
        page_key: pageKey,
        payload: payload,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'owner_id,page_key'
      })

    if (error) {
      console.error('Error saving draft:', error)
      throw handleAPIError(error, '保存草稿失敗')
    }
  } catch (error) {
    console.error('Error in saveDraft:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('保存草稿時發生未知錯誤')
  }
}

/**
 * 從本機 localStorage 讀取草稿（備援機制）
 */
export function loadLocalDraft(pageKey: string): DraftPayload | null {
  try {
    const stored = localStorage.getItem(`draft_${pageKey}`)
    if (!stored) return null
    
    const parsed = JSON.parse(stored)
    return parsed.payload || null
  } catch (error) {
    console.error('Error loading local draft:', error)
    return null
  }
}

/**
 * 保存草稿到本機 localStorage（備援機制）
 */
export function saveLocalDraft(pageKey: string, payload: DraftPayload): void {
  try {
    const draftData = {
      payload,
      updated_at: new Date().toISOString()
    }
    localStorage.setItem(`draft_${pageKey}`, JSON.stringify(draftData))
  } catch (error) {
    console.error('Error saving local draft:', error)
  }
}

/**
 * 清除本機草稿
 */
export function clearLocalDraft(pageKey: string): void {
  try {
    localStorage.removeItem(`draft_${pageKey}`)
  } catch (error) {
    console.error('Error clearing local draft:', error)
  }
}

/**
 * 綜合載入草稿（雲端優先，本機備援）
 */
export async function loadDraftWithFallback(pageKey: string): Promise<DraftPayload | null> {
  try {
    // 先嘗試從雲端載入
    const cloudDraft = await loadDraft(pageKey)
    if (cloudDraft) {
      return cloudDraft
    }

    // 雲端沒有，嘗試從本機載入
    const localDraft = loadLocalDraft(pageKey)
    if (localDraft) {
      // 如果本機有草稿，同步到雲端
      try {
        await saveDraft(pageKey, localDraft)
      } catch (error) {
        console.warn('Failed to sync local draft to cloud:', error)
      }
      return localDraft
    }

    return null
  } catch (error) {
    console.error('Error in loadDraftWithFallback:', error)
    // 如果雲端載入失敗，嘗試本機備援
    return loadLocalDraft(pageKey)
  }
}

/**
 * 綜合保存草稿（雲端 + 本機）
 */
export async function saveDraftWithBackup(pageKey: string, payload: DraftPayload): Promise<void> {
  // 先保存到本機（快速響應）
  saveLocalDraft(pageKey, payload)

  try {
    // 再保存到雲端
    await saveDraft(pageKey, payload)
  } catch (error) {
    console.warn('Failed to save draft to cloud, kept in local storage:', error)
    // 雲端保存失敗不拋出錯誤，因為本機已保存
  }
}

/**
 * 清除雲端草稿
 */
export async function clearDraft(pageKey: string): Promise<void> {
  try {
    const authResult = await validateAuth()
    if (authResult.error || !authResult.user) {
      throw authResult.error || new Error('使用者未登入')
    }
    const user = authResult.user

    const { error } = await supabase
      .from('form_drafts')
      .delete()
      .eq('owner_id', user.id)
      .eq('page_key', pageKey)

    if (error) {
      console.error('Error clearing draft:', error)
      throw handleAPIError(error, '清除草稿失敗')
    }
  } catch (error) {
    console.error('Error in clearDraft:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('清除草稿時發生未知錯誤')
  }
}

/**
 * 提交後自動清理資料（清除草稿和本機儲存）
 * 在成功提交到後端後呼叫此函式，避免累積不必要的草稿資料
 */
export async function cleanupAfterSubmission(pageKey: string): Promise<void> {
  try {
    // 1. 清除雲端草稿
    await clearDraft(pageKey)
    
    // 2. 清除本機草稿
    clearLocalDraft(pageKey)
    
    console.log(`Successfully cleaned up drafts for page: ${pageKey}`)
  } catch (error) {
    // 清理失敗不應該影響提交流程，只記錄警告
    console.warn('Failed to cleanup drafts after submission:', error)
  }
}
