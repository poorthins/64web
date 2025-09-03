import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { NavigationProvider } from './contexts/NavigationContext'
import { AuthProvider } from './contexts/AuthContext'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import HomePage from './pages/HomePage'
import CarbonCalculatorPage from './pages/CarbonCalculatorPage'
import ReportsPage from './pages/ReportsPage'
import WD40Page from './pages/Category1/WD40Page'
import AcetylenePage from './pages/Category1/AcetylenePage'
import RefrigerantPage from './pages/Category1/RefrigerantPage'
import ElectricityBillPage from './pages/Category2/ElectricityBillPage'
import CommutePage from './pages/Category3/CommuteePage'
import SepticTankPage from './pages/Category1/SepticTankPage'
import PingPage from './pages/PingPage'

function App() {
  return (
    <Router>
      <AuthProvider>
        <NavigationProvider>
        <div className="min-h-screen w-full h-screen bg-gray-50 flex overflow-hidden">
          <Sidebar />
          
          <Routes>
            <Route path="/" element={
              <MainContent>
                <HomePage />
              </MainContent>
            } />
            <Route path="/calculator" element={
              <MainContent title="碳排放計算">
                <CarbonCalculatorPage />
              </MainContent>
            } />
            <Route path="/reports" element={
              <MainContent title="報告管理">
                <ReportsPage />
              </MainContent>
            } />
            <Route path="/wd40" element={
              <MainContent title="WD-40 碳排放計算">
                <WD40Page />
              </MainContent>
            } />
            <Route path="/acetylene" element={
              <MainContent title="乙炔 碳排放計算">
                <AcetylenePage />
              </MainContent>
            } />
            <Route path="/electricity_bill" element={
              <MainContent title="外購電力">
                <ElectricityBillPage />
              </MainContent>
            } />
            <Route path="/employee_commute" element={
              <MainContent title="員工通勤 碳排放計算">
                <CommutePage />
              </MainContent>
            } />
            <Route path="/refrigerant" element={
              <MainContent title="冷媒 碳排放計算">
                <RefrigerantPage />
              </MainContent>
            } />
            <Route path="/septictank" element={
              <MainContent title="化糞池工時填報">
                <SepticTankPage />
              </MainContent>
            } />
            <Route path="/ping" element={<PingPage />} />
          </Routes>
        </div>
        </NavigationProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
