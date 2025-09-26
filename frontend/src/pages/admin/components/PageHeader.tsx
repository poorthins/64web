import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb, getBreadcrumbItems } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  currentPage: string;
  userId?: string;
  showBackButton?: boolean;
  backPath?: string;
  className?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  currentPage,
  userId,
  showBackButton = true,
  backPath = '/app/admin',
  className = '',
  children
}) => {
  const navigate = useNavigate();

  // 設定 document.title
  useEffect(() => {
    document.title = `${title} - 管理控制台`;

    return () => {
      document.title = '管理控制台';
    };
  }, [title]);

  const breadcrumbItems = getBreadcrumbItems(currentPage, userId);

  const handleBackClick = () => {
    navigate(backPath);
  };

  return (
    <div className={`mb-6 ${className}`}>
      {/* 麵包屑導航 */}
      <div className="mb-4">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* 返回按鈕和標題 */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className="flex items-center text-blue-600 hover:text-blue-800 mb-4 group transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1 -ml-2"
              title="返回上一頁 (Alt+←)"
            >
              <span className="mr-2 group-hover:transform group-hover:-translate-x-1 transition-transform duration-200">←</span>
              返回
            </button>
          )}

          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-600 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* 額外的動作按鈕 */}
        {children && (
          <div className="flex-shrink-0 ml-6">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};