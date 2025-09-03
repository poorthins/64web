import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { NavigationProvider } from '../contexts/NavigationContext'
import LoginSimple from '../pages/LoginSimple'
import ProtectedLayout from '../layouts/ProtectedLayout'
import DashboardPage from '../pages/Dashboard'
import MyEntriesPage from '../pages/MyEntriesPage'
import HelpPage from '../pages/HelpPage'
import HomePage from '../pages/HomePage'
import CarbonCalculatorPage from '../pages/CarbonCalculatorPage'
import ReportsPage from '../pages/ReportsPage'
import WD40Page from '../pages/Category1/WD40Page'
import AcetylenePage from '../pages/Category1/AcetylenePage'
import RefrigerantPage from '../pages/Category1/RefrigerantPage'
import ElectricityBillPage from '../pages/Category2/ElectricityBillPage'
import CommutePage from '../pages/Category3/CommuteePage'
import SepticTankPage from '../pages/Category1/SepticTankPage'
import PingPage from '../pages/PingPage'
import AdminPage from '../pages/AdminPage'
import AdminRoute from '../components/AdminRoute'

function AppRouter() {
  return (
    <Router>
      <AuthProvider>
        <NavigationProvider>
          <Routes>
            <Route path="/" element={<LoginSimple />} />
            <Route path="/login" element={<LoginSimple />} />
            
            <Route path="/app" element={<ProtectedLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="my/entries" element={<MyEntriesPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="home" element={<HomePage />} />
              <Route path="calculator" element={<CarbonCalculatorPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="wd40" element={<WD40Page />} />
              <Route path="acetylene" element={<AcetylenePage />} />
              <Route path="electricity_bill" element={<ElectricityBillPage />} />
              <Route path="employee_commute" element={<CommutePage />} />
              <Route path="refrigerant" element={<RefrigerantPage />} />
              <Route path="septictank" element={<SepticTankPage />} />
              <Route path="ping" element={<PingPage />} />
              <Route 
                path="admin" 
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                } 
              />
            </Route>
          </Routes>
        </NavigationProvider>
      </AuthProvider>
    </Router>
  )
}

export default AppRouter