import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useEditPermissions,
  canEditStatus,
  canUploadFilesForStatus,
  isReadonlyStatus,
  getSubmitButtonText
} from '../useEditPermissions'
import type { EntryStatus } from '../../components/StatusSwitcher'

describe('useEditPermissions', () => {
  describe('一般用戶模式', () => {
    it('saved 狀態應該完全可編輯', () => {
      const { result } = renderHook(() => useEditPermissions('saved', false, 'user'))

      expect(result.current.canEdit).toBe(true)
      expect(result.current.canUploadFiles).toBe(true)
      expect(result.current.canDeleteFiles).toBe(true)
      expect(result.current.isReadonly).toBe(false)
      expect(result.current.submitButtonText).toBe('提交填報')
      expect(result.current.statusDescription).toBe('已暫存，可完全編輯')
    })

    it('rejected 狀態應該完全可編輯', () => {
      const { result } = renderHook(() => useEditPermissions('rejected', false, 'user'))

      expect(result.current.canEdit).toBe(true)
      expect(result.current.canUploadFiles).toBe(true)
      expect(result.current.canDeleteFiles).toBe(true)
      expect(result.current.isReadonly).toBe(false)
      expect(result.current.submitButtonText).toBe('重新提交')
      expect(result.current.statusDescription).toBe('可完全編輯，修正後重新提交')
    })

    it('submitted 狀態應該可編輯', () => {
      const { result } = renderHook(() => useEditPermissions('submitted', false, 'user'))

      expect(result.current.canEdit).toBe(true)
      expect(result.current.canUploadFiles).toBe(true)
      expect(result.current.canDeleteFiles).toBe(true)
      expect(result.current.isReadonly).toBe(false)
      expect(result.current.submitButtonText).toBe('更新提交')
      expect(result.current.statusDescription).toBe('可編輯並更新，等待審核')
    })

    it('approved 狀態應該完全唯讀', () => {
      const { result } = renderHook(() => useEditPermissions('approved', false, 'user'))

      expect(result.current.canEdit).toBe(false)
      expect(result.current.canUploadFiles).toBe(false)
      expect(result.current.canDeleteFiles).toBe(false)
      expect(result.current.isReadonly).toBe(true)
      expect(result.current.submitButtonText).toBe('已核准')
      expect(result.current.statusDescription).toBe('完全唯讀，無法編輯')
    })

    it('draft 狀態應該完全可編輯', () => {
      const { result } = renderHook(() => useEditPermissions('draft' as EntryStatus, false, 'user'))

      expect(result.current.canEdit).toBe(true)
      expect(result.current.canUploadFiles).toBe(true)
      expect(result.current.canDeleteFiles).toBe(true)
      expect(result.current.isReadonly).toBe(false)
      expect(result.current.submitButtonText).toBe('提交填報')
      expect(result.current.statusDescription).toBe('草稿狀態，可完全編輯')
    })
  })

  describe('審核模式 - 非管理員', () => {
    it('應該強制唯讀，無論狀態為何', () => {
      const statuses: EntryStatus[] = ['saved', 'submitted', 'rejected', 'approved']

      statuses.forEach(status => {
        const { result } = renderHook(() => useEditPermissions(status, true, 'user'))

        expect(result.current.canEdit).toBe(false)
        expect(result.current.canUploadFiles).toBe(false)
        expect(result.current.canDeleteFiles).toBe(false)
        expect(result.current.isReadonly).toBe(true)
        expect(result.current.submitButtonText).toBe('審核模式')
        expect(result.current.statusDescription).toBe('審核模式 - 唯讀')
      })
    })
  })

  describe('審核模式 - 管理員', () => {
    it('saved 狀態應該可編輯', () => {
      const { result } = renderHook(() => useEditPermissions('saved', true, 'admin'))

      expect(result.current.canEdit).toBe(true)
      expect(result.current.canUploadFiles).toBe(true)
      expect(result.current.canDeleteFiles).toBe(true)
      expect(result.current.isReadonly).toBe(false)
    })

    it('submitted 狀態應該可編輯', () => {
      const { result } = renderHook(() => useEditPermissions('submitted', true, 'admin'))

      expect(result.current.canEdit).toBe(true)
      expect(result.current.canUploadFiles).toBe(true)
      expect(result.current.canDeleteFiles).toBe(true)
      expect(result.current.isReadonly).toBe(false)
    })

    it('rejected 狀態應該可編輯', () => {
      const { result } = renderHook(() => useEditPermissions('rejected', true, 'admin'))

      expect(result.current.canEdit).toBe(true)
      expect(result.current.canUploadFiles).toBe(true)
      expect(result.current.canDeleteFiles).toBe(true)
      expect(result.current.isReadonly).toBe(false)
    })

    it('approved 狀態應該唯讀（即使是管理員）', () => {
      const { result } = renderHook(() => useEditPermissions('approved', true, 'admin'))

      expect(result.current.canEdit).toBe(false)
      expect(result.current.canUploadFiles).toBe(false)
      expect(result.current.canDeleteFiles).toBe(false)
      expect(result.current.isReadonly).toBe(true)
    })
  })

  describe('輔助函式', () => {
    describe('canEditStatus()', () => {
      it('除了 approved 外都應該可編輯', () => {
        expect(canEditStatus('saved')).toBe(true)
        expect(canEditStatus('submitted')).toBe(true)
        expect(canEditStatus('rejected')).toBe(true)
        expect(canEditStatus('approved')).toBe(false)
      })
    })

    describe('canUploadFilesForStatus()', () => {
      it('除了 approved 外都應該可上傳', () => {
        expect(canUploadFilesForStatus('saved')).toBe(true)
        expect(canUploadFilesForStatus('submitted')).toBe(true)
        expect(canUploadFilesForStatus('rejected')).toBe(true)
        expect(canUploadFilesForStatus('approved')).toBe(false)
      })
    })

    describe('isReadonlyStatus()', () => {
      it('只有 approved 應該是唯讀', () => {
        expect(isReadonlyStatus('saved')).toBe(false)
        expect(isReadonlyStatus('submitted')).toBe(false)
        expect(isReadonlyStatus('rejected')).toBe(false)
        expect(isReadonlyStatus('approved')).toBe(true)
      })
    })

    describe('getSubmitButtonText()', () => {
      it('應該返回正確的按鈕文字', () => {
        expect(getSubmitButtonText('saved')).toBe('提交填報')
        expect(getSubmitButtonText('rejected')).toBe('重新提交')
        expect(getSubmitButtonText('submitted')).toBe('更新提交')
        expect(getSubmitButtonText('approved')).toBe('已核准')
        expect(getSubmitButtonText('draft' as EntryStatus)).toBe('提交填報')
      })
    })
  })

  describe('useMemo 快取行為', () => {
    it('相同參數應該返回相同的物件參考', () => {
      const { result, rerender } = renderHook(
        ({ status, isReviewMode, role }) => useEditPermissions(status, isReviewMode, role),
        {
          initialProps: { status: 'saved' as EntryStatus, isReviewMode: false, role: 'user' }
        }
      )

      const firstResult = result.current

      // 重新渲染但參數不變
      rerender({ status: 'saved', isReviewMode: false, role: 'user' })

      // 應該返回相同的物件參考（useMemo）
      expect(result.current).toBe(firstResult)
    })

    it('參數改變應該返回新的物件', () => {
      const { result, rerender } = renderHook(
        ({ status, isReviewMode, role }) => useEditPermissions(status, isReviewMode, role),
        {
          initialProps: { status: 'saved' as EntryStatus, isReviewMode: false, role: 'user' }
        }
      )

      const firstResult = result.current

      // 改變狀態
      rerender({ status: 'approved', isReviewMode: false, role: 'user' })

      // 應該返回新的物件參考
      expect(result.current).not.toBe(firstResult)
      expect(result.current.canEdit).toBe(false)
      expect(firstResult.canEdit).toBe(true)
    })
  })
})