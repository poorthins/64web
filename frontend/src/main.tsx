import React from 'react'
import ReactDOM from 'react-dom/client'
import AppRouter from './routes/AppRouter.tsx'
import './index.css'

// 開發環境載入測試工具
if (import.meta.env.DEV) {
  import('./utils/completeWorkflowTest')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)