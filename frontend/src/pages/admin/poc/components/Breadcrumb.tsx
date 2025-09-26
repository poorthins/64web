import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  const navigate = useNavigate();

  const handleItemClick = (item: BreadcrumbItem) => {
    if (item.path && !item.isActive) {
      navigate(item.path);
    }
  };

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="麵包屑導航">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-gray-400 select-none" aria-hidden="true">
              /
            </span>
          )}

          {item.isActive ? (
            <span
              className="text-gray-900 font-medium cursor-default"
              aria-current="page"
            >
              {item.label}
            </span>
          ) : (
            <button
              onClick={() => handleItemClick(item)}
              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
              disabled={!item.path}
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// 常用麵包屑設定
export const getBreadcrumbItems = (currentPage: string, userId?: string): BreadcrumbItem[] => {
  const baseItems: BreadcrumbItem[] = [
    { label: '首頁', path: '/' },
    { label: '管理員', path: '/app/admin' },
    { label: 'POC 控制台', path: '/app/admin/poc' }
  ];

  switch (currentPage) {
    case 'dashboard':
      return [
        ...baseItems.slice(0, -1),
        { label: 'POC 控制台', isActive: true }
      ];

    case 'create':
      return [
        ...baseItems,
        { label: '新增用戶', isActive: true }
      ];

    case 'edit':
      return [
        ...baseItems,
        { label: '編輯用戶', isActive: true }
      ];

    case 'statistics':
      return [
        ...baseItems,
        { label: '統計詳情', isActive: true }
      ];

    case 'export':
      return [
        ...baseItems,
        { label: '匯出測試', isActive: true }
      ];

    default:
      return baseItems;
  }
};