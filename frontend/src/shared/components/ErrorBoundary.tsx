import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 錯誤邊界組件
 * 捕獲子組件中的 JavaScript 錯誤，記錄錯誤並顯示備用 UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能夠顯示降級後的 UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 記錄錯誤到錯誤報告服務
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 更新狀態
    this.setState({
      error,
      errorInfo,
    });

    // 調用自定義錯誤處理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 在生產環境中，可以將錯誤發送到錯誤追蹤服務
    if (import.meta.env.PROD) {
      // TODO: 發送錯誤到 Sentry 或其他錯誤追蹤服務
      // sendErrorToService(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定義的 fallback UI，使用它
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      // 默認的錯誤 UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <h1 className="mt-4 text-xl font-semibold text-center text-gray-900">
              糟糕！出現了一些問題
            </h1>
            
            <p className="mt-2 text-sm text-center text-gray-600">
              應用程式遇到了意外錯誤。請嘗試重新整理頁面或返回首頁。
            </p>

            {/* 開發環境顯示錯誤詳情 */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 p-4 bg-gray-100 rounded-md">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  錯誤詳情（僅開發環境可見）
                </summary>
                <div className="mt-2 text-xs text-gray-600">
                  <p className="font-semibold">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重試
              </button>
              
              <a
                href="/"
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Home className="w-4 h-4 mr-2" />
                返回首頁
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 錯誤邊界 Hook
 * 用於函數組件中處理錯誤
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack: string }) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // 在生產環境中發送錯誤到追蹤服務
    if (import.meta.env.PROD) {
      // TODO: 發送錯誤到 Sentry 或其他錯誤追蹤服務
      // sendErrorToService(error, errorInfo);
    }
    
    // 可以在這裡添加其他錯誤處理邏輯
    // 例如：顯示通知、記錄到本地存儲等
  };
}

/**
 * 異步錯誤邊界組件
 * 用於處理異步操作中的錯誤
 */
export function AsyncErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode; 
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={fallback || <DefaultAsyncErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('Async error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * 默認的異步錯誤回退 UI
 */
function DefaultAsyncErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        載入失敗
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        無法載入所需的資料。請檢查您的網路連接並重試。
      </p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        重新載入
      </button>
    </div>
  );
}

export default ErrorBoundary;
