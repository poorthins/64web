import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { NavigationProvider } from '../contexts/NavigationContext'
import LoginSimple from '../pages/LoginSimple'
import ProtectedLayout from '../layouts/ProtectedLayout'
import AdminLayout from '../layouts/AdminLayout'
import DashboardPage from '../pages/Dashboard'
import MyEntriesPage from '../pages/MyEntriesPage'
import HelpPage from '../pages/HelpPage'
import HomePage from '../pages/HomePage'
import CarbonCalculatorPage from '../pages/CarbonCalculatorPage'
import ReportsPage from '../pages/ReportsPage'
import WD40Page from '../pages/Category1/WD40Page'
import AcetylenePage from '../pages/Category1/AcetylenePage'
import RefrigerantPage from '../pages/Category1/RefrigerantPage'
import ErrorBoundary from '../components/ErrorBoundary'
import SepticTankPage from '../pages/Category1/SepticTankPage'
import NaturalGasPage from '../pages/Category1/NaturalGasPage'
import UreaPage from '../pages/Category1/UreaPage'
import GasolinePage from '../pages/Category1/GasolinePage'
import DieselPage from '../pages/Category1/DieselPage'
import DieselGeneratorPage from '../pages/Category1/DieselGeneratorPage'
import LPGPage from '../pages/Category1/LPGPage'
import WeldingRodPage from '../pages/Category1/WeldingRodPage'
import FireExtinguisherPage from '../pages/Category1/FireExtinguisherPage'
import ElectricityBillPage from '../pages/Category2/ElectricityBillPage'
import CommutePage from '../pages/Category3/CommuteePage'
import PingPage from '../pages/PingPage'
import AdminPage from '../pages/AdminPage'
import UserDetail from '../pages/admin/UserDetail'
import AdminDashboard from '../pages/admin/AdminDashboard'
import CreateUser from '../pages/admin/CreateUser'
import EditUser from '../pages/admin/EditUser'
import AdminRoute from '../components/AdminRoute'
import UserRoute from '../components/UserRoute'
import FixUserRoles from '../pages/FixUserRoles'
import RoleBasedHomePage from '../components/RoleBasedHomePage'
import '../utils/roleDebug' // 載入診斷工具

function AppRouter() {
  return (
    <Router>
      <AuthProvider>
        <NavigationProvider>
          <Routes>
            <Route path="/" element={<LoginSimple />} />
            <Route path="/login" element={<LoginSimple />} />
            
            {/* 管理員專用頁面 - 使用獨立的 AdminLayout（無側邊欄） */}
            <Route path="/app/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users/:userId" element={<UserDetail />} />
              <Route path="create" element={<CreateUser />} />
              <Route path="edit/:userId" element={<EditUser />} />
            </Route>

            <Route path="/app" element={<ProtectedLayout />}>
              {/* 根據用戶角色決定首頁內容 - 修復死循環問題 */}
              <Route index element={<RoleBasedHomePage />} />

              {/* 只有一般用戶可以訪問的頁面 */}
              <Route path="my/entries" element={
                <UserRoute>
                  <MyEntriesPage />
                </UserRoute>
              } />
              <Route path="help" element={
                <UserRoute>
                  <HelpPage />
                </UserRoute>
              } />
              <Route path="home" element={
                <UserRoute>
                  <HomePage />
                </UserRoute>
              } />
              <Route path="calculator" element={
                <UserRoute>
                  <CarbonCalculatorPage />
                </UserRoute>
              } />
              <Route path="reports" element={
                <UserRoute>
                  <ReportsPage />
                </UserRoute>
              } />
              <Route path="wd40" element={
                <UserRoute energyCategory="wd40">
                  <WD40Page />
                </UserRoute>
              } />
              <Route path="acetylene" element={
                <UserRoute energyCategory="acetylene">
                  <AcetylenePage />
                </UserRoute>
              } />
              <Route path="electricity" element={
                <UserRoute energyCategory="electricity">
                  <ElectricityBillPage />
                </UserRoute>
              } />
              <Route path="employee_commute" element={
                <UserRoute energyCategory="employee_commute">
                  <CommutePage />
                </UserRoute>
              } />
              <Route path="refrigerant" element={
                <UserRoute energyCategory="refrigerant">
                  <ErrorBoundary>
                    <RefrigerantPage />
                  </ErrorBoundary>
                </UserRoute>
              } />
              {/* Fixed: unified page_key to 'septic_tank' */}
              <Route path="septic_tank" element={
                <UserRoute energyCategory="septic_tank">
                  <SepticTankPage />
                </UserRoute>
              } />
              <Route path="natural_gas" element={
                <UserRoute energyCategory="natural_gas">
                  <NaturalGasPage />
                </UserRoute>
              } />
              <Route path="urea" element={
                <UserRoute energyCategory="urea">
                  <UreaPage />
                </UserRoute>
              } />
              <Route path="gasoline" element={
                <UserRoute energyCategory="gasoline">
                  <GasolinePage />
                </UserRoute>
              } />
              <Route path="diesel" element={
                <UserRoute energyCategory="diesel">
                  <DieselPage />
                </UserRoute>
              } />
              <Route path="diesel_generator" element={
                <UserRoute energyCategory="diesel_generator">
                  <DieselGeneratorPage />
                </UserRoute>
              } />
              <Route path="lpg" element={
                <UserRoute energyCategory="lpg">
                  <LPGPage />
                </UserRoute>
              } />
              <Route path="welding_rod" element={
                <UserRoute energyCategory="welding_rod">
                  <WeldingRodPage />
                </UserRoute>
              } />
              <Route path="fire_extinguisher" element={
                <UserRoute energyCategory="fire_extinguisher">
                  <FireExtinguisherPage />
                </UserRoute>
              } />
              <Route path="ping" element={<PingPage />} />
              <Route path="fix-user-roles" element={<FixUserRoles />} />
            </Route>
          </Routes>
        </NavigationProvider>
      </AuthProvider>
    </Router>
  )
}

export default AppRouter
