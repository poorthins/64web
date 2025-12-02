import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // 忽略在輸入框中的按鍵
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    for (const shortcut of shortcuts) {
      const { key, ctrlKey = false, altKey = false, shiftKey = false, action, preventDefault = true } = shortcut;

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrlKey &&
        event.altKey === altKey &&
        event.shiftKey === shiftKey
      ) {
        if (preventDefault) {
          event.preventDefault();
        }
        action();
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return shortcuts;
};

// 常用快捷鍵組合
export const createCommonShortcuts = (actions: {
  save?: () => void;
  cancel?: () => void;
  refresh?: () => void;
  back?: () => void;
  search?: () => void;
  help?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.save) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      action: actions.save,
      description: 'Ctrl+S: 儲存'
    });
  }

  if (actions.cancel) {
    shortcuts.push({
      key: 'Escape',
      action: actions.cancel,
      description: 'Esc: 取消'
    });
  }

  if (actions.refresh) {
    shortcuts.push({
      key: 'F5',
      action: actions.refresh,
      description: 'F5: 重新整理'
    });
  }

  if (actions.back) {
    shortcuts.push({
      key: 'ArrowLeft',
      altKey: true,
      action: actions.back,
      description: 'Alt+←: 返回'
    });
  }

  if (actions.search) {
    shortcuts.push({
      key: 'f',
      ctrlKey: true,
      action: actions.search,
      description: 'Ctrl+F: 搜尋'
    });
  }

  if (actions.help) {
    shortcuts.push({
      key: 'F1',
      action: actions.help,
      description: 'F1: 說明'
    });
  }

  return shortcuts;
};

// Toast 提示快捷鍵說明
export const showShortcutToast = (shortcuts: KeyboardShortcut[]) => {
  const shortcutList = shortcuts
    .map(s => s.description)
    .join('\n');

  // 創建臨時的快捷鍵提示
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.5;
    z-index: 9999;
    max-width: 300px;
    white-space: pre-line;
    animation: slideInUp 0.3s ease-out;
  `;

  // 添加動畫樣式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideOutDown {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  toast.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px; color: #60a5fa;">⌨️ 快捷鍵說明</div>
    ${shortcutList}
    <div style="margin-top: 8px; font-size: 10px; color: #9ca3af;">按任意鍵關閉</div>
  `;

  document.body.appendChild(toast);

  // 點擊或按鍵關閉
  const closeToast = () => {
    toast.style.animation = 'slideOutDown 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
      style.remove();
    }, 300);
  };

  toast.addEventListener('click', closeToast);

  const handleKeyPress = () => {
    closeToast();
    document.removeEventListener('keydown', handleKeyPress);
  };

  setTimeout(() => {
    document.addEventListener('keydown', handleKeyPress);
  }, 100);

  // 5 秒後自動關閉
  setTimeout(closeToast, 5000);
};