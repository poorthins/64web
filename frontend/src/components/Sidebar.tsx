import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation, SidebarItem } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentUserPermissions } from '../hooks/useCurrentUserPermissions';
import { ENERGY_CATEGORIES_BY_SCOPE, SCOPE_LABELS } from '../utils/energyCategories';

interface SidebarItemWithIcon extends SidebarItem {
  icon?: React.ReactNode;
}

// 能源類別的顯示名稱映射
const ENERGY_CATEGORY_LABELS: Record<string, string> = {
  wd40: 'WD-40',
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
  electricity_bill: '外購電力',
  employee_commute: '員工通勤'
};

// 範疇圖示配置
const SCOPE_ICONS = {
  scope1: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 011-1h1m-1 1h1m-1 1h1" />
    </svg>
  ),
  scope2: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  scope3: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
};

export default function Sidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>(['scope1']);
  const { selectItem } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, loadingRole } = useAuth();
  const { hasPermissionSync, getVisibleScopes, isLoading: isPermissionsLoading } = useCurrentUserPermissions();

  // 根據權限動態生成 sidebar 資料
  const sidebarData = useMemo((): SidebarItemWithIcon[] => {
    // 載入中時返回空陣列
    if (loadingRole || isPermissionsLoading) {
      return [];
    }

    const visibleScopes = getVisibleScopes();

    return visibleScopes.map(scope => ({
      id: scope,
      title: SCOPE_LABELS[scope],
      icon: SCOPE_ICONS[scope],
      children: ENERGY_CATEGORIES_BY_SCOPE[scope]
        .filter(category => isAdmin || hasPermissionSync(category)) // 管理員看所有，一般用戶看有權限的
        .map(category => ({
          id: category,
          title: ENERGY_CATEGORY_LABELS[category]
        }))
    })).filter(scope => scope.children.length > 0); // 過濾掉沒有子項目的範疇
  }, [isAdmin, loadingRole, isPermissionsLoading, hasPermissionSync, getVisibleScopes]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isItemActive = (itemId: string) => {
    return location.pathname === `/app/${itemId}`;
  };

  const renderSidebarItem = (item: SidebarItemWithIcon, level = 0) => {
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isActive = isItemActive(item.id);

    return (
      <div key={item.id} className="mb-1">
        <button
          onClick={() => {
            if (hasChildren && level === 0) {
              toggleExpand(item.id);
            } else {
              // 尋找父範疇（動態）
              const parent = level > 0 ? sidebarData.find(scope =>
                scope.children?.some(child => child.id === item.id)
              ) : undefined;
              selectItem(item, parent);
              navigate(`/app/${item.id}`);
            }
          }}
          className={`
            w-full text-left transition-all duration-300 rounded-lg mr-2 my-1 relative overflow-hidden group
            ${level === 0 
              ? `px-4 py-4 text-white font-medium text-sm
                 ${hasChildren ? 'flex items-center justify-between' : ''}
                 hover:bg-brand-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]` 
              : `px-4 py-3 ml-4 text-brand-100 text-sm
                 ${isActive ? 'bg-brand-700 border-l-4 border-brand-300 font-medium' : 'hover:bg-brand-700 hover:border-l-4 hover:border-brand-400'}
                 hover:pl-6 border-l-4 border-transparent`
            }
          `}
        >
          {level === 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          )}
          
          <div className="flex items-center space-x-3 relative z-10">
            {level === 0 && item.icon && (
              <div className="flex-shrink-0">
                {item.icon}
              </div>
            )}
            {level > 0 && (
              <div className="w-2 h-2 bg-brand-300 rounded-full flex-shrink-0"></div>
            )}
            <span className="flex-1">{item.title}</span>
          </div>
          
          {hasChildren && level === 0 && (
            <div className="relative z-10">
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </button>
        
        {hasChildren && isExpanded && (
          <div className="py-2 space-y-1">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 xl:w-64 lg:w-56 md:w-48 sm:w-44 bg-gradient-to-b from-brand-500 to-brand-600 h-screen fixed left-0 top-0 shadow-2xl overflow-y-auto overflow-x-hidden z-10">
      <div className="p-6 border-b border-brand-400/30 backdrop-blur-sm">
        <button 
          onClick={() => navigate('/app')}
          className="text-xl lg:text-xl md:text-lg sm:text-base font-bold text-white hover:text-brand-100 transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 relative group"
        >
          <span className="relative z-10">碳盤查系統</span>
          <div className="absolute inset-0 bg-white/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        </button>
      </div>
      
      <nav className="mt-6 px-3">
        <div className="space-y-2">
          {/* 動態顯示有權限的範疇和類別 */}
          {loadingRole || isPermissionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <div className="ml-3 text-white/60 text-sm">載入權限中...</div>
            </div>
          ) : sidebarData.length > 0 ? (
            sidebarData.map(item => renderSidebarItem(item))
          ) : (
            <div className="text-center py-8">
              <div className="text-white/60 text-sm">
                暫無可用的能源類別
              </div>
              <div className="text-white/40 text-xs mt-1">
                請聯繫管理員開通權限
              </div>
            </div>
          )}
          
          {/* 管理員顯示導航選項 */}
          {isAdmin && (
            <div className="mt-8 py-4 border-t border-brand-400/30">
              <div className="text-center mb-4">
                <div className="text-white/60 text-sm">
                  管理員模式
                </div>
                <div className="mt-1 text-white/40 text-xs">
                  具備系統管理功能
                </div>
              </div>

              {/* 管理員導航選項 */}
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/app/admin')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                    location.pathname.startsWith('/app/admin')
                      ? 'bg-brand-700 text-white font-medium'
                      : 'text-brand-100 hover:bg-brand-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span>🛡️</span>
                    <span>管理控制台</span>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/app/admin/create')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                    location.pathname === '/app/admin/create'
                      ? 'bg-brand-700 text-white font-medium'
                      : 'text-brand-100 hover:bg-brand-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span>👤</span>
                    <span>新增用戶</span>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/app/admin/statistics')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                    location.pathname === '/app/admin/statistics'
                      ? 'bg-brand-700 text-white font-medium'
                      : 'text-brand-100 hover:bg-brand-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span>📊</span>
                    <span>統計詳情</span>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/app/admin/submissions')}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                    location.pathname === '/app/admin/submissions'
                      ? 'bg-brand-700 text-white font-medium'
                      : 'text-brand-100 hover:bg-brand-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span>📝</span>
                    <span>填報管理</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
