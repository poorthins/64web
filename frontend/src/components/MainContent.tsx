import { ReactNode } from 'react';

interface MainContentProps {
  children: ReactNode;
  title?: string;
}

export default function MainContent({ children, title }: MainContentProps) {
  return (
    <div className="flex-1 h-screen bg-gray-50 overflow-y-auto ml-64 xl:ml-64 lg:ml-56 md:ml-48 sm:ml-44">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8 xl:px-8 lg:px-6 md:px-4 sm:px-3">
          {title && (
            <div className="mb-8">
              <h1 className="text-3xl xl:text-3xl lg:text-2xl md:text-xl sm:text-lg font-bold text-gray-800 mb-3">{title}</h1>
              <div className="h-1 w-20 bg-brand-500 rounded"></div>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 xl:p-8 lg:p-6 md:p-4 sm:p-3 w-full min-h-96">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}