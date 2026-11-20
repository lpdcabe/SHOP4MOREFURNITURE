import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import SuppliersPage from './pages/SuppliersPage.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage.jsx';
import ReceivingPage from './pages/ReceivingPage.jsx';
import DeliveryPage from './pages/DeliveryPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AbcAnalysisPage from './pages/AbcAnalysisPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

function ProtectedRoute({ children }) {
  const user = localStorage.getItem('shop4more_user');
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/stock-in" element={<Navigate to="/inventory?tab=stock-in" replace />} />
          <Route path="/stock-out" element={<Navigate to="/inventory?tab=stock-out" replace />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/receiving" element={<ReceivingPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/abc-analysis" element={<AbcAnalysisPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
