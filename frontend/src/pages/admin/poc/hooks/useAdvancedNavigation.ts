import { useNavigate } from 'react-router-dom'
import { useKeyboardShortcuts, KeyboardShortcut, showShortcutToast } from './useKeyboardShortcuts'

interface AdvancedNavigationOptions {
  currentPage?: 'dashboard' | 'edit-user' | 'review' | 'statistics'
  userId?: string
  category?: string
  enabled?: boolean
}

export const useAdvancedNavigation = (options: AdvancedNavigationOptions = {}) => {
  const navigate = useNavigate()
  const { currentPage, userId, category, enabled = true } = options

  const createNavigationShortcuts = (): KeyboardShortcut[] => {
    const shortcuts: KeyboardShortcut[] = []

    // Universal shortcuts (available on all pages)
    shortcuts.push(
      {
        key: 'h',
        ctrlKey: true,
        altKey: true,
        action: () => navigate('/app/admin/poc'),
        description: 'Ctrl+Alt+H: 返回 POC 首頁',
        preventDefault: true
      },
      {
        key: 's',
        ctrlKey: true,
        altKey: true,
        action: () => navigate('/app/admin/poc/statistics'),
        description: 'Ctrl+Alt+S: 統計頁面',
        preventDefault: true
      },
      {
        key: 'c',
        ctrlKey: true,
        altKey: true,
        action: () => navigate('/app/admin/poc/create'),
        description: 'Ctrl+Alt+C: 建立用戶',
        preventDefault: true
      },
      {
        key: '?',
        shiftKey: true,
        action: () => {
          const allShortcuts = createNavigationShortcuts()
          showShortcutToast(allShortcuts)
        },
        description: '?: 顯示快捷鍵說明',
        preventDefault: true
      }
    )

    // Page-specific shortcuts
    if (currentPage === 'edit-user' && userId) {
      // Energy category shortcuts (1-9, 0, -, =)
      const energyCategories = [
        { key: '1', category: 'wd40', name: 'WD40' },
        { key: '2', category: 'acetylene', name: '乙炔' },
        { key: '3', category: 'refrigerant', name: '冷媒' },
        { key: '4', category: 'septic_tank', name: '化糞池' },
        { key: '5', category: 'natural_gas', name: '天然氣' },
        { key: '6', category: 'urea', name: '尿素' },
        { key: '7', category: 'diesel_generator', name: '柴油(發電機)' },
        { key: '8', category: 'diesel', name: '柴油' },
        { key: '9', category: 'gasoline', name: '汽油' },
        { key: '0', category: 'lpg', name: '液化石油氣' },
        { key: '-', category: 'fire_extinguisher', name: '滅火器' },
        { key: '=', category: 'welding_rod', name: '焊條' }
      ]

      energyCategories.forEach(({ key, category, name }) => {
        shortcuts.push({
          key,
          altKey: true,
          action: () => navigate(`/app/admin/poc/users/${userId}/review/${category}`),
          description: `Alt+${key}: 審核${name}`,
          preventDefault: true
        })
      })

      // Special categories (Shift + number)
      shortcuts.push(
        {
          key: '1',
          altKey: true,
          shiftKey: true,
          action: () => navigate(`/app/admin/poc/users/${userId}/review/electricity`),
          description: 'Alt+Shift+1: 審核外購電力',
          preventDefault: true
        },
        {
          key: '2',
          altKey: true,
          shiftKey: true,
          action: () => navigate(`/app/admin/poc/users/${userId}/review/employee_commute`),
          description: 'Alt+Shift+2: 審核員工通勤',
          preventDefault: true
        }
      )
    }

    // Review page shortcuts
    if (currentPage === 'review' && userId && category) {
      shortcuts.push(
        {
          key: 'a',
          ctrlKey: true,
          action: () => {
            // Trigger approve action
            const approveButton = document.querySelector('[data-action="approve"]') as HTMLButtonElement
            if (approveButton && !approveButton.disabled) {
              approveButton.click()
            }
          },
          description: 'Ctrl+A: 核准審核',
          preventDefault: true
        },
        {
          key: 'r',
          ctrlKey: true,
          action: () => {
            // Trigger reject action
            const rejectButton = document.querySelector('[data-action="reject"]') as HTMLButtonElement
            if (rejectButton && !rejectButton.disabled) {
              rejectButton.click()
            }
          },
          description: 'Ctrl+R: 退回審核',
          preventDefault: true
        },
        {
          key: 'n',
          ctrlKey: true,
          action: () => {
            // Navigate to next category for review
            const categories = [
              'wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea',
              'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher', 'welding_rod',
              'electricity', 'employee_commute'
            ]
            const currentIndex = categories.indexOf(category)
            const nextIndex = (currentIndex + 1) % categories.length
            const nextCategory = categories[nextIndex]
            navigate(`/app/admin/poc/users/${userId}/review/${nextCategory}`)
          },
          description: 'Ctrl+N: 下一個審核類別',
          preventDefault: true
        },
        {
          key: 'p',
          ctrlKey: true,
          action: () => {
            // Navigate to previous category for review
            const categories = [
              'wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea',
              'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher', 'welding_rod',
              'electricity', 'employee_commute'
            ]
            const currentIndex = categories.indexOf(category)
            const prevIndex = currentIndex === 0 ? categories.length - 1 : currentIndex - 1
            const prevCategory = categories[prevIndex]
            navigate(`/app/admin/poc/users/${userId}/review/${prevCategory}`)
          },
          description: 'Ctrl+P: 上一個審核類別',
          preventDefault: true
        }
      )
    }

    // Dashboard specific shortcuts
    if (currentPage === 'dashboard') {
      shortcuts.push(
        {
          key: 'f',
          ctrlKey: true,
          action: () => {
            const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
            if (searchInput) {
              searchInput.focus()
            }
          },
          description: 'Ctrl+F: 搜尋用戶',
          preventDefault: true
        },
        {
          key: 'Tab',
          action: () => {
            const statusFilters = document.querySelectorAll('[data-status-filter]')
            if (statusFilters.length > 0) {
              const firstFilter = statusFilters[0] as HTMLElement
              firstFilter.focus()
            }
          },
          description: 'Tab: 切換狀態篩選',
          preventDefault: false
        }
      )
    }

    // Statistics page shortcuts
    if (currentPage === 'statistics') {
      shortcuts.push(
        {
          key: 'e',
          ctrlKey: true,
          action: () => {
            // Trigger export functionality
            const exportButton = document.querySelector('[data-action="export"]') as HTMLButtonElement
            if (exportButton) {
              exportButton.click()
            }
          },
          description: 'Ctrl+E: 匯出資料',
          preventDefault: true
        },
        {
          key: 'd',
          ctrlKey: true,
          action: () => {
            // Focus on date filter
            const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
            if (dateInput) {
              dateInput.focus()
            }
          },
          description: 'Ctrl+D: 日期篩選',
          preventDefault: true
        }
      )
    }

    return shortcuts
  }

  const shortcuts = createNavigationShortcuts()
  useKeyboardShortcuts({ shortcuts, enabled })

  return {
    shortcuts,
    showHelp: () => showShortcutToast(shortcuts)
  }
}

// Helper function to get category name in Chinese
export const getCategoryDisplayName = (categoryId: string): string => {
  const categoryMap: Record<string, string> = {
    wd40: 'WD40',
    acetylene: '乙炔',
    refrigerant: '冷媒',
    septic_tank: '化糞池',
    natural_gas: '天然氣',
    urea: '尿素',
    diesel_generator: '柴油(發電機)',
    diesel: '柴油',
    gasoline: '汽油',
    lpg: '液化石油氣',
    fire_extinguisher: '滅火器',
    welding_rod: '焊條',
    electricity: '外購電力',
    employee_commute: '員工通勤'
  }

  return categoryMap[categoryId] || categoryId
}

// Toast notification for navigation actions
export const showNavigationToast = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
  const toast = document.createElement('div')
  const bgColor = {
    success: 'rgba(34, 197, 94, 0.9)',
    info: 'rgba(59, 130, 246, 0.9)',
    warning: 'rgba(245, 158, 11, 0.9)'
  }[type]

  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    z-index: 9999;
    max-width: 300px;
    animation: slideInDown 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  `

  // Add animation styles
  if (!document.getElementById('navigation-toast-styles')) {
    const style = document.createElement('style')
    style.id = 'navigation-toast-styles'
    style.textContent = `
      @keyframes slideInDown {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes slideOutUp {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-100%); opacity: 0; }
      }
    `
    document.head.appendChild(style)
  }

  toast.textContent = message
  document.body.appendChild(toast)

  // Auto-close after 2 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOutUp 0.3s ease-in'
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove()
      }
    }, 300)
  }, 2000)
}