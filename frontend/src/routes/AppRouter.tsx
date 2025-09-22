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
import UserDetailPage from '../pages/admin/UserDetailPage'
import { AdminDashboardPOC, CreateUserPOC, EditUserPOC, StatisticsDetailPOC } from '../pages/admin/poc'
import AdminRoute from '../components/AdminRoute'
import UserRoute from '../components/UserRoute'
import TestUserCheck from '../pages/TestUserCheck'
import TestReviewAPI from '../pages/TestReviewAPI'
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
            
            <Route path="/app" element={<ProtectedLayout />}>
              {/* 根據用戶角色決定首頁內容 - 修復死循環問題 */}
              <Route index element={<RoleBasedHomePage />} />
              
              {/* 管理員專用頁面 */}
              <Route path="admin" element={
                <AdminRoute fallback={<DashboardPage />}>
                  <AdminPage />
                </AdminRoute>
              } />
              <Route path="admin/users/:userId" element={
                <AdminRoute fallback={<DashboardPage />}>
                  <UserDetailPage />
                </AdminRoute>
              } />
              <Route path="admin/poc" element={
                <AdminRoute fallback={<DashboardPage />}>
                  <AdminDashboardPOC />
                </AdminRoute>
              } />
              <Route path="admin/poc/create" element={
                <AdminRoute fallback={<DashboardPage />}>
                  <CreateUserPOC />
                </AdminRoute>
              } />
              <Route path="admin/poc/edit/:userId" element={
                <AdminRoute fallback={<DashboardPage />}>
                  <EditUserPOC />
                </AdminRoute>
              } />
              <Route path="admin/poc/statistics" element={
                <AdminRoute fallback={<DashboardPage />}>
                  <StatisticsDetailPOC />
                </AdminRoute>
              } />
              
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
                <UserRoute>
                  <WD40Page />
                </UserRoute>
              } />
              <Route path="acetylene" element={
                <UserRoute>
                  <AcetylenePage />
                </UserRoute>
              } />
              <Route path="electricity_bill" element={
                <UserRoute>
                  <ElectricityBillPage />
                </UserRoute>
              } />
              <Route path="employee_commute" element={
                <UserRoute>
                  <CommutePage />
                </UserRoute>
              } />
              <Route path="refrigerant" element={
                <UserRoute>
                  <RefrigerantPage />
                </UserRoute>
              } />
              <Route path="septictank" element={
                <UserRoute>
                  <SepticTankPage />
                </UserRoute>
              } />
              <Route path="natural_gas" element={
                <UserRoute>
                  <NaturalGasPage />
                </UserRoute>
              } />
              <Route path="urea" element={
                <UserRoute>
                  <UreaPage />
                </UserRoute>
              } />
              <Route path="gasoline" element={
                <UserRoute>
                  <GasolinePage />
                </UserRoute>
              } />
              <Route path="diesel" element={
                <UserRoute>
                  <DieselPage />
                </UserRoute>
              } />
              <Route path="diesel_generator" element={
                <UserRoute>
                  <DieselGeneratorPage />
                </UserRoute>
              } />
              <Route path="lpg" element={<LPGPage />} />
              <Route path="welding_rod" element={
                <UserRoute>
                  <WeldingRodPage />
                </UserRoute>
              } />
              <Route path="fire_extinguisher" element={
                <UserRoute>
                  <FireExtinguisherPage />
                </UserRoute>
              } />
              <Route path="ping" element={<PingPage />} />
              <Route path="test-users" element={<TestUserCheck />} />
              <Route path="test-review-api" element={<TestReviewAPI />} />
              <Route path="fix-user-roles" element={<FixUserRoles />} />
            </Route>
          </Routes>
        </NavigationProvider>
      </AuthProvider>
    </Router>
  )
}

export default AppRouter
