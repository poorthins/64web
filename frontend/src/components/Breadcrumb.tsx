import { useNavigation } from '../contexts/NavigationContext';

export default function Breadcrumb() {
  const { navigationState } = useNavigation();

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {navigationState.breadcrumb.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {index > 0 && (
              <svg className="w-3 h-3 mx-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span className={`
              ${index === navigationState.breadcrumb.length - 1 
                ? 'text-brand-600 font-medium' 
                : 'text-gray-500 hover:text-brand-600'
              } 
              text-sm transition-colors duration-200
            `}>
              {item}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}