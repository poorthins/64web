import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation, SidebarItem } from '../contexts/NavigationContext';
import { useRole } from '../hooks/useRole';

interface SidebarItemWithIcon extends SidebarItem {
  icon?: React.ReactNode;
}

const sidebarData: SidebarItemWithIcon[] = [
  {
    id: 'category1',
    title: '範疇一（直接排放）',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 011-1h1m-1 1h1m-1 1h1" />
      </svg>
    ),
    children: [
      { id: 'wd40', title: 'WD-40' },
      { id: 'acetylene', title: '乙炔' },
      { id: 'refrigerant', title: '冷媒' },
      { id: 'septictank', title: '化糞池' },
      { id: 'urea', title: '尿素' },
      { id: 'diesel_generator', title: '柴油(發電機)' },
      { id: 'diesel', title: '柴油' },
      { id: 'gasoline', title: '汽油' },
      { id: 'lpg', title: '液化石油氣' },
      { id: 'fire_extinguisher', title: '滅火器' },
      { id: 'welding_rod', title: '焊條' }
    ]
  },
  {
    id: 'category2',
    title: '範疇二（間接排放）',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    children: [
      { id: 'electricity_bill', title: '外購電力' }
    ]
  },
  {
    id: 'category3',
    title: '範疇三（其他間接）',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    children: [
      { id: 'employee_commute', title: '員工通勤' }
    ]
  }
];

export default function Sidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { selectItem } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  const { role, loadingRole } = useRole();
  
  // 檢查是否為管理員
  const isAdmin = !loadingRole && role === 'admin';

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
              const parent = level > 0 ? sidebarData.find(cat => 
                cat.children?.some(child => child.id === item.id)
              ) : undefined;
              selectItem(item, parent);
              navigate(`/app/${item.id}`);
            }
          }}
          className={`
            w-full text-left transition-all duration-300 rounded-lg mx-2 my-1 relative overflow-hidden group
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
        
        {hasChildren && (
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="py-2 space-y-1">
              {item.children!.map(child => renderSidebarItem(child, level + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 xl:w-64 lg:w-56 md:w-48 sm:w-44 bg-gradient-to-b from-brand-500 to-brand-600 h-screen fixed left-0 top-0 shadow-2xl overflow-y-auto z-10">
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
          {/* 只有非管理員才顯示範疇一、二、三 */}
          {!isAdmin && sidebarData.map(item => renderSidebarItem(item))}
          
          {/* 管理員顯示簡化的導航 */}
          {isAdmin && (
            <div className="text-center py-8">
              <div className="text-white/60 text-sm">
                管理員模式
              </div>
              <div className="mt-2 text-white/40 text-xs">
                系統管理功能
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
