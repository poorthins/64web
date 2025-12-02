import { useEffect } from 'react'
import AppRouter from './AppRouter'
import './index.css'
import { setupAuthStateMonitoring } from './utils/authDiagnostics'

function App() {
  useEffect(() => {
    // 設置全域認證狀態監控
    const cleanup = setupAuthStateMonitoring()

    // 組件卸載時清理監控
    return () => {
      cleanup()
    }
  }, [])

  return <AppRouter />
}

export default App
