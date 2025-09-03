import { createContext, useContext, useState, ReactNode } from 'react';

export interface SidebarItem {
  id: string;
  title: string;
  children?: SidebarItem[];
}

interface NavigationState {
  selectedCategory: SidebarItem | null;
  selectedSubCategory: SidebarItem | null;
  breadcrumb: string[];
}

interface NavigationContextType {
  navigationState: NavigationState;
  selectItem: (item: SidebarItem, parent?: SidebarItem) => void;
  setBreadcrumb: (breadcrumb: string[]) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    selectedCategory: null,
    selectedSubCategory: null,
    breadcrumb: ['首頁']
  });

  const selectItem = (item: SidebarItem, parent?: SidebarItem) => {
    if (parent) {
      setNavigationState({
        selectedCategory: parent,
        selectedSubCategory: item,
        breadcrumb: ['首頁', parent.title, item.title]
      });
    } else {
      setNavigationState({
        selectedCategory: item,
        selectedSubCategory: null,
        breadcrumb: ['首頁', item.title]
      });
    }
  };

  const setBreadcrumb = (breadcrumb: string[]) => {
    setNavigationState(prev => ({ ...prev, breadcrumb }));
  };

  return (
    <NavigationContext.Provider value={{ navigationState, selectItem, setBreadcrumb }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}