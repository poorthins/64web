import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  message?: string;
  enabled?: boolean;
}

export const useUnsavedChanges = ({
  hasUnsavedChanges,
  message = '您有未儲存的變更，確定要離開此頁面嗎？',
  enabled = true
}: UseUnsavedChangesOptions) => {
  const navigate = useNavigate();
  const navigationBlockedRef = useRef(false);

  // 處理瀏覽器重新整理或關閉
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message, enabled]);

  // 攔截導航
  const confirmNavigation = useCallback((callback: () => void) => {
    if (!enabled || !hasUnsavedChanges) {
      callback();
      return;
    }

    if (window.confirm(message)) {
      callback();
    }
  }, [hasUnsavedChanges, message, enabled]);

  // 安全導航函數
  const navigateWithConfirmation = useCallback((path: string) => {
    confirmNavigation(() => {
      navigate(path);
    });
  }, [navigate, confirmNavigation]);

  return {
    confirmNavigation,
    navigateWithConfirmation
  };
};